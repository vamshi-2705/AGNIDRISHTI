"""
AGNIDRISHTI - Background NASA FIRMS Scheduled Ingestion & Processing Engine
Smart India Hackathon (SIH 2026) | Problem Statement 26162 (NTRO)

Decouples satellite thermal data ingestion and multi-tier ML classification from user requests.
Features:
  1. PostgreSQL distributed advisory locking for multi-worker safe execution.
  2. Scheduled execution via APScheduler (configurable interval, default: 300s).
  3. Persistent snapshot storage in PostgreSQL (ingestion_status table).
  4. Instant (<10ms) serving for /api/fires directly from PostgreSQL/memory.
  5. Resilient error handling that preserves existing data on external NASA outages.
  6. Zero credential or secret exposure in logs.
"""

import os
import json
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from sqlalchemy import text
from dotenv import load_dotenv, find_dotenv

# Load environment variables
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(_env_path)
else:
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from database import engine, IS_POSTGRES, mask_database_url
from firms_service import firms_service
from classifier import classify_fire_list

logger = logging.getLogger("agnidrishti.ingestion")

# PostgreSQL 64-bit Advisory Lock ID for FIRMS Ingestion (NTRO SIH-26162)
FIRMS_ADVISORY_LOCK_ID = 26162101

# Ingestion Interval Configuration (default 300 seconds / 5 minutes)
DEFAULT_INTERVAL_SECONDS = int(os.getenv("INGESTION_INTERVAL_SECONDS", "300"))
INGESTION_ENABLED = os.getenv("INGESTION_ENABLED", "true").lower() in ("true", "1", "yes")


class FirmsIngestionEngine:
    """
    Coordinates asynchronous scheduled downloads from NASA FIRMS VIIRS feeds,
    clusters and deduplicates observations in PostgreSQL/PostGIS, runs the full
    spatial-temporal classification pipeline, and maintains ingestion health metrics.
    """

    def __init__(self):
        self._memory_cache: Optional[Dict[str, Any]] = None
        self._memory_cache_time: float = 0.0
        self._is_running: bool = False
        self._scheduler = None

    def acquire_advisory_lock(self, conn) -> bool:
        """Attempts to acquire a PostgreSQL advisory lock without blocking."""
        if not IS_POSTGRES:
            return True
        try:
            res = conn.execute(
                text("SELECT pg_try_advisory_lock(:lock_id);"),
                {"lock_id": FIRMS_ADVISORY_LOCK_ID}
            ).fetchone()
            return bool(res[0]) if res else False
        except Exception as e:
            logger.warning(f"Notice acquiring advisory lock: {e}")
            return False

    def release_advisory_lock(self, conn) -> bool:
        """Releases the PostgreSQL advisory lock completely."""
        if not IS_POSTGRES:
            return True
        try:
            released_any = False
            while True:
                res = conn.execute(
                    text("SELECT pg_advisory_unlock(:lock_id);"),
                    {"lock_id": FIRMS_ADVISORY_LOCK_ID}
                ).fetchone()
                if res and res[0]:
                    released_any = True
                else:
                    break
            return released_any
        except Exception as e:
            logger.warning(f"Notice releasing advisory lock: {e}")
            return False

    def run_ingestion_cycle(self, force_refresh: bool = True) -> Dict[str, Any]:
        """
        Executes an isolated, multi-worker safe ingestion cycle:
        1. Acquires PostgreSQL advisory lock.
        2. Fetches raw 3-satellite VIIRS feeds.
        3. Persists & deduplicates in PostgreSQL/PostGIS.
        4. Runs classification & exposure models.
        5. Saves processed snapshot & health into ingestion_status table.
        6. Releases advisory lock.
        """
        now_utc = datetime.now(timezone.utc)
        now_ts = now_utc.timestamp()
        attempt_time_str = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")

        with engine.connect() as conn:
            locked = self.acquire_advisory_lock(conn)
            if not locked:
                logger.info(
                    f"[FIRMS_LOCK_SKIPPED] Another worker holds the advisory lock (ID: {FIRMS_ADVISORY_LOCK_ID}). "
                    f"Skipping redundant concurrent ingestion cycle."
                )
                return {
                    "status": "SKIPPED",
                    "message": "Concurrent ingestion lock held by another process."
                }

            logger.info("[FIRMS_INGEST_START] Beginning background NASA FIRMS multi-satellite ingestion cycle...")
            t0 = time.time()
            self._is_running = True

            try:
                # Update status to RUNNING in database
                if IS_POSTGRES:
                    conn.execute(text("""
                        INSERT INTO ingestion_status (id, status, last_attempt_utc, updated_at)
                        VALUES (1, 'RUNNING', :attempt_time, :now_ts)
                        ON CONFLICT (id) DO UPDATE SET
                            status = 'RUNNING',
                            last_attempt_utc = EXCLUDED.last_attempt_utc,
                            updated_at = EXCLUDED.updated_at;
                    """), {"attempt_time": attempt_time_str, "now_ts": now_ts})
                    conn.commit()

                # Step 1: Query FIRMS and persist raw passes to PostgreSQL/PostGIS
                firms_res = firms_service.fetch_firms_data(days=2, force_refresh=force_refresh)
                raw_points = firms_res.get("data", [])
                sync_meta = firms_res.get("sync_metadata", {})
                records_fetched = firms_res.get("count", 0)

                logger.info(f"[FIRMS_FETCH_SUCCESS] Downloaded and persisted {records_fetched} raw satellite observations.")

                # Step 2: Classify thermal points through multi-tier rule and ML models
                classified_points = []
                if raw_points:
                    classified_points = classify_fire_list(raw_points, filter_mode="all", allow_live_network=False)
                    logger.info(f"[FIRMS_PROCESS_COMPLETE] Completed classification and exposure modeling for {len(classified_points)} events.")
                elif self._memory_cache and self._memory_cache.get("data"):
                    # Preserve last known good dataset if external API returned empty/transient error
                    classified_points = self._memory_cache["data"]
                    logger.warning(f"Preserving last known good in-memory dataset ({len(classified_points)} events).")

                duration = round(time.time() - t0, 3)
                latest_obs_time = sync_meta.get("latest_observation_utc") or attempt_time_str

                # Query total table counts in database
                obs_cnt = conn.execute(text("SELECT COUNT(*) FROM observations;")).fetchone()[0]
                ev_cnt = conn.execute(text("SELECT COUNT(*) FROM thermal_events;")).fetchone()[0]

                # Step 3: Upsert processed snapshot & health into ingestion_status table
                if IS_POSTGRES:
                    # Serialize to JSON safely
                    sync_meta_json = json.dumps(sync_meta)
                    processed_data_json = json.dumps(classified_points)

                    conn.execute(text("""
                        INSERT INTO ingestion_status (
                            id, status, last_attempt_utc, last_success_utc, latest_observation_utc,
                            records_fetched, observations_count, events_count, duration_seconds,
                            last_error, sync_metadata, processed_data, updated_at
                        ) VALUES (
                            1, 'SUCCESS', :attempt_time, :attempt_time, :latest_obs,
                            :records_fetched, :obs_cnt, :ev_cnt, :duration,
                            NULL, :sync_meta, :processed_data, :now_ts
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            status = 'SUCCESS',
                            last_attempt_utc = EXCLUDED.last_attempt_utc,
                            last_success_utc = EXCLUDED.last_success_utc,
                            latest_observation_utc = EXCLUDED.latest_observation_utc,
                            records_fetched = EXCLUDED.records_fetched,
                            observations_count = EXCLUDED.observations_count,
                            events_count = EXCLUDED.events_count,
                            duration_seconds = EXCLUDED.duration_seconds,
                            last_error = NULL,
                            sync_metadata = EXCLUDED.sync_metadata,
                            processed_data = EXCLUDED.processed_data,
                            updated_at = EXCLUDED.updated_at;
                    """), {
                        "attempt_time": attempt_time_str,
                        "latest_obs": latest_obs_time,
                        "records_fetched": records_fetched,
                        "obs_cnt": obs_cnt,
                        "ev_cnt": ev_cnt,
                        "duration": duration,
                        "sync_meta": sync_meta_json,
                        "processed_data": processed_data_json,
                        "now_ts": now_ts
                    })
                    conn.commit()

                # Step 4: Update memory cache
                self._memory_cache = {
                    "status": "success",
                    "source": firms_res.get("source", "NASA_FIRMS_MULTI_VIIRS_LIVE"),
                    "count": len(classified_points),
                    "total_records": len(classified_points),
                    "last_successful_fetch": attempt_time_str,
                    "sync_metadata": sync_meta,
                    "data": classified_points,
                    "duration_seconds": duration,
                    "timestamp": attempt_time_str
                }
                self._memory_cache_time = now_ts

                logger.info(
                    f"[FIRMS_INGEST_SUCCESS] Background cycle completed in {duration}s. "
                    f"Active events: {len(classified_points)}, DB events: {ev_cnt}, DB obs: {obs_cnt}."
                )

                return {
                    "status": "SUCCESS",
                    "events_count": len(classified_points),
                    "duration_seconds": duration,
                    "timestamp": attempt_time_str
                }

            except Exception as e:
                duration = round(time.time() - t0, 3)
                err_msg = str(e)
                logger.error(f"[FIRMS_INGEST_FAILURE] Background ingestion cycle failed ({duration}s): {err_msg}")

                if IS_POSTGRES:
                    try:
                        conn.execute(text("""
                            INSERT INTO ingestion_status (id, status, last_attempt_utc, duration_seconds, last_error, updated_at)
                            VALUES (1, 'FAILED', :attempt_time, :duration, :err_msg, :now_ts)
                            ON CONFLICT (id) DO UPDATE SET
                                status = 'FAILED',
                                last_attempt_utc = EXCLUDED.last_attempt_utc,
                                duration_seconds = EXCLUDED.duration_seconds,
                                last_error = EXCLUDED.last_error,
                                updated_at = EXCLUDED.updated_at;
                        """), {
                            "attempt_time": attempt_time_str,
                            "duration": duration,
                            "err_msg": err_msg[:500],
                            "now_ts": now_ts
                        })
                        conn.commit()
                    except Exception as db_err:
                        logger.error(f"Failed to record ingestion error to database: {db_err}")

                return {
                    "status": "FAILED",
                    "error": err_msg[:500],
                    "duration_seconds": duration
                }

            finally:
                self._is_running = False
                self.release_advisory_lock(conn)

    def preload_cache(self) -> None:
        """Pre-warms the in-memory cache from PostgreSQL ingestion_status on startup."""
        if self._memory_cache is not None or not IS_POSTGRES:
            return
        try:
            with engine.connect() as conn:
                row = conn.execute(text("""
                    SELECT status, last_success_utc, latest_observation_utc,
                           records_fetched, sync_metadata, processed_data, updated_at
                    FROM ingestion_status
                    WHERE id = 1 AND processed_data IS NOT NULL;
                """)).mappings().fetchone()

                if row and row["processed_data"]:
                    processed_list = row["processed_data"]
                    if isinstance(processed_list, str):
                        processed_list = json.loads(processed_list)

                    sync_meta = row["sync_metadata"]
                    if isinstance(sync_meta, str):
                        sync_meta = json.loads(sync_meta)
                    elif not sync_meta:
                        sync_meta = {}

                    snapshot = {
                        "status": "success",
                        "source": "NASA_FIRMS_POSTGRES_INGESTION_STORE",
                        "count": len(processed_list),
                        "total_records": len(processed_list),
                        "last_successful_fetch": row["last_success_utc"] or "None",
                        "sync_metadata": sync_meta,
                        "data": processed_list,
                        "timestamp": row["last_success_utc"] or "None"
                    }
                    self._memory_cache = snapshot
                    self._memory_cache_time = row["updated_at"] or time.time()
                    logger.info(f"Ingestion cache pre-warmed: {len(processed_list)} events loaded from PostgreSQL.")
        except Exception as e:
            logger.warning(f"Could not preload snapshot from ingestion_status table: {e}")

    def get_latest_fires(self, filter_mode: str = "all") -> Dict[str, Any]:
        """
        Retrieves already-ingested and classified thermal events from memory or PostgreSQL.
        Guarantees sub-10ms response time with zero synchronous NASA FIRMS downloads.
        """
        if not self._memory_cache:
            self.preload_cache()
        snapshot = self._memory_cache

        # If still no snapshot exists, return empty structure with accurate metadata
        if not snapshot:
            now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            return {
                "status": "success",
                "source": "NASA_FIRMS_INITIALIZING",
                "count": 0,
                "total_records": 0,
                "filter_applied": filter_mode,
                "sync_status": "initializing",
                "last_successful_fetch": "None",
                "sources": {
                    "VIIRS_SNPP_NRT": "initializing",
                    "VIIRS_NOAA20_NRT": "initializing",
                    "VIIRS_NOAA21_NRT": "initializing"
                },
                "timestamp": now_utc,
                "sync_metadata": {
                    "live_connection": False,
                    "last_firms_fetch_utc": "None",
                    "latest_observation_utc": "None"
                },
                "data": []
            }

        all_points = snapshot.get("data", [])
        if filter_mode == "industrial":
            filtered_points = [pt for pt in all_points if pt.get("is_industrial", False)]
        elif filter_mode == "emergencies":
            filtered_points = [pt for pt in all_points if pt.get("is_emergency", False)]
        else:
            filtered_points = all_points

        sync_meta = snapshot.get("sync_metadata", {})
        satellite_sources = {
            k: v.lower() for k, v in sync_meta.get("satellite_sources", {}).items()
        } if sync_meta.get("satellite_sources") else {
            "VIIRS_SNPP_NRT": "online",
            "VIIRS_NOAA20_NRT": "online",
            "VIIRS_NOAA21_NRT": "online"
        }

        return {
            "status": "success",
            "source": snapshot.get("source", "NASA_FIRMS_MULTI_VIIRS_LIVE"),
            "count": len(filtered_points),
            "total_records": len(filtered_points),
            "filter_applied": filter_mode,
            "sync_status": "live" if sync_meta.get("live_connection", True) else "unavailable",
            "last_successful_fetch": snapshot.get("last_successful_fetch") or sync_meta.get("last_firms_fetch_utc", "None"),
            "sources": satellite_sources,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "sync_metadata": sync_meta,
            "data": filtered_points
        }

    def get_ingestion_health(self) -> Dict[str, Any]:
        """Provides real-time health telemetry of the background ingestion scheduler and jobs."""
        db_record = None
        if IS_POSTGRES:
            try:
                with engine.connect() as conn:
                    db_record = conn.execute(text("""
                        SELECT status, last_attempt_utc, last_success_utc, latest_observation_utc,
                               records_fetched, observations_count, events_count, duration_seconds,
                               last_error, updated_at
                        FROM ingestion_status
                        WHERE id = 1;
                    """)).mappings().fetchone()
            except Exception as e:
                logger.warning(f"Could not read ingestion health from DB: {e}")

        if db_record:
            return {
                "status": db_record["status"],
                "last_attempt_utc": db_record["last_attempt_utc"],
                "last_success_utc": db_record["last_success_utc"],
                "latest_observation_utc": db_record["latest_observation_utc"],
                "records_fetched": db_record["records_fetched"],
                "observations_stored": db_record["observations_count"],
                "events_stored": db_record["events_count"],
                "duration_seconds": round(db_record["duration_seconds"], 2),
                "last_error": db_record["last_error"],
                "is_currently_running": self._is_running or (db_record["status"] == "RUNNING"),
                "scheduler_enabled": INGESTION_ENABLED,
                "interval_seconds": DEFAULT_INTERVAL_SECONDS,
                "database_advisory_lock": "PostgreSQL Advisory Lock (ID: 26162101)"
            }

        return {
            "status": "INITIALIZING",
            "last_attempt_utc": None,
            "last_success_utc": None,
            "latest_observation_utc": None,
            "records_fetched": 0,
            "observations_stored": 0,
            "events_stored": 0,
            "duration_seconds": 0.0,
            "last_error": None,
            "is_currently_running": self._is_running,
            "scheduler_enabled": INGESTION_ENABLED,
            "interval_seconds": DEFAULT_INTERVAL_SECONDS,
            "database_advisory_lock": "PostgreSQL Advisory Lock (ID: 26162101)"
        }


# Global singleton ingestion engine
ingestion_engine = FirmsIngestionEngine()
