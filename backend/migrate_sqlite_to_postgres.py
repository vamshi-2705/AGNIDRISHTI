"""
AGNIDRISHTI - SQLite to PostgreSQL + PostGIS Migration Utility
Production Phase 1 Database Migration
Smart India Hackathon (SIH 2026) | Problem Statement 26162 (NTRO)

Transfers legitimate thermal events and multi-satellite observations from
agnidrishti_events.db into PostgreSQL with PostGIS GEOMETRY(Point, 4326)
and GiST spatial indexes.
Duplicate-safe and idempotent. Zero synthetic records.
"""

import os
import sqlite3
import logging
from typing import Tuple

from dotenv import load_dotenv, find_dotenv

# Load environment variables
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(_env_path)
else:
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from sqlalchemy import text
from database import engine, get_db_session

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("agnidrishti.migration")

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "agnidrishti_events.db")


def run_migration() -> Tuple[int, int]:
    if not os.path.exists(SQLITE_PATH):
        raise FileNotFoundError(f"Source SQLite database not found at {SQLITE_PATH}")

    logger.info(f"Opening source SQLite database at: {SQLITE_PATH}")
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # 1. Fetch thermal_events (excluding any demo records)
    sqlite_cur.execute("""
        SELECT * FROM thermal_events 
        WHERE event_id NOT LIKE '%DEMO%'
        ORDER BY event_id ASC;
    """)
    sqlite_events = sqlite_cur.fetchall()
    logger.info(f"Found {len(sqlite_events)} legitimate thermal_events in SQLite.")

    # 2. Fetch observations (excluding any demo records)
    sqlite_cur.execute("""
        SELECT * FROM observations 
        WHERE event_id NOT LIKE '%DEMO%'
        ORDER BY acq_date ASC, acq_time ASC;
    """)
    sqlite_obs = sqlite_cur.fetchall()
    logger.info(f"Found {len(sqlite_obs)} legitimate observations in SQLite.")

    events_migrated = 0
    obs_migrated = 0

    with engine.begin() as pg_conn:
        # Migrate thermal_events
        event_upsert_stmt = text("""
            INSERT INTO thermal_events (
                event_id, centroid_lat, centroid_lon, geom,
                first_detected, latest_detection, first_acq_date, latest_acq_date,
                peak_frp, latest_frp, latest_brightness, observation_count,
                trend, trend_direction, duration_min, active_satellites, updated_at
            ) VALUES (
                :event_id, :centroid_lat, :centroid_lon,
                ST_SetSRID(ST_MakePoint(:centroid_lon, :centroid_lat), 4326),
                :first_detected, :latest_detection, :first_acq_date, :latest_acq_date,
                :peak_frp, :latest_frp, :latest_brightness, :observation_count,
                :trend, :trend_direction, :duration_min, :active_satellites, :updated_at
            )
            ON CONFLICT (event_id) DO UPDATE SET
                centroid_lat = EXCLUDED.centroid_lat,
                centroid_lon = EXCLUDED.centroid_lon,
                geom = EXCLUDED.geom,
                latest_detection = EXCLUDED.latest_detection,
                latest_acq_date = EXCLUDED.latest_acq_date,
                peak_frp = EXCLUDED.peak_frp,
                latest_frp = EXCLUDED.latest_frp,
                latest_brightness = EXCLUDED.latest_brightness,
                observation_count = EXCLUDED.observation_count,
                trend = EXCLUDED.trend,
                trend_direction = EXCLUDED.trend_direction,
                duration_min = EXCLUDED.duration_min,
                active_satellites = EXCLUDED.active_satellites,
                updated_at = EXCLUDED.updated_at;
        """)

        event_batch = []
        for row in sqlite_events:
            event_batch.append({
                "event_id": row["event_id"],
                "centroid_lat": float(row["centroid_lat"]) if row["centroid_lat"] is not None else 0.0,
                "centroid_lon": float(row["centroid_lon"]) if row["centroid_lon"] is not None else 0.0,
                "first_detected": row["first_detected"],
                "latest_detection": row["latest_detection"],
                "first_acq_date": row["first_acq_date"],
                "latest_acq_date": row["latest_acq_date"],
                "peak_frp": float(row["peak_frp"]) if row["peak_frp"] is not None else None,
                "latest_frp": float(row["latest_frp"]) if row["latest_frp"] is not None else None,
                "latest_brightness": float(row["latest_brightness"]) if row["latest_brightness"] is not None else None,
                "observation_count": int(row["observation_count"]) if row["observation_count"] is not None else 1,
                "trend": row["trend"] or "INSUFFICIENT DATA",
                "trend_direction": row["trend_direction"] or "flat",
                "duration_min": int(row["duration_min"]) if row["duration_min"] is not None else 0,
                "active_satellites": row["active_satellites"],
                "updated_at": float(row["updated_at"]) if row["updated_at"] is not None else None
            })

        if event_batch:
            pg_conn.execute(event_upsert_stmt, event_batch)
            events_migrated = len(event_batch)
            logger.info(f"Successfully migrated/upserted {events_migrated} thermal_events into PostgreSQL.")

        # Migrate observations in batches of 500
        obs_upsert_stmt = text("""
            INSERT INTO observations (
                obs_id, event_id, latitude, longitude, geom,
                brightness, scan, track, acq_date, acq_time,
                satellite, instrument, confidence, version,
                bright_t31, frp, daynight, source, received_at
            ) VALUES (
                :obs_id, :event_id, :latitude, :longitude,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326),
                :brightness, :scan, :track, :acq_date, :acq_time,
                :satellite, :instrument, :confidence, :version,
                :bright_t31, :frp, :daynight, :source, :received_at
            )
            ON CONFLICT (obs_id) DO NOTHING;
        """)

        obs_batch = []
        batch_size = 500
        for row in sqlite_obs:
            obs_batch.append({
                "obs_id": row["obs_id"],
                "event_id": row["event_id"],
                "latitude": float(row["latitude"]) if row["latitude"] is not None else 0.0,
                "longitude": float(row["longitude"]) if row["longitude"] is not None else 0.0,
                "brightness": float(row["brightness"]) if row["brightness"] is not None else None,
                "scan": float(row["scan"]) if row["scan"] is not None else None,
                "track": float(row["track"]) if row["track"] is not None else None,
                "acq_date": row["acq_date"],
                "acq_time": str(row["acq_time"]) if row["acq_time"] is not None else None,
                "satellite": row["satellite"],
                "instrument": row["instrument"] or "VIIRS (375m)",
                "confidence": str(row["confidence"]) if row["confidence"] is not None else None,
                "version": row["version"] or "2.0NRT",
                "bright_t31": float(row["bright_t31"]) if row["bright_t31"] is not None else None,
                "frp": float(row["frp"]) if row["frp"] is not None else None,
                "daynight": row["daynight"] or "D",
                "source": row["source"] or "NASA FIRMS NRT",
                "received_at": row["received_at"]
            })
            if len(obs_batch) >= batch_size:
                pg_conn.execute(obs_upsert_stmt, obs_batch)
                obs_migrated += len(obs_batch)
                obs_batch = []
                logger.info(f"Migrated {obs_migrated}/{len(sqlite_obs)} observations...")

        if obs_batch:
            pg_conn.execute(obs_upsert_stmt, obs_batch)
            obs_migrated += len(obs_batch)
            logger.info(f"Final batch: total {obs_migrated} observations migrated.")

    sqlite_conn.close()
    return events_migrated, obs_migrated


if __name__ == "__main__":
    print("Starting AGNIDRISHTI SQLite to PostgreSQL + PostGIS Migration...")
    events_count, obs_count = run_migration()
    print(f"Migration Complete: {events_count} thermal_events and {obs_count} observations imported to PostgreSQL/PostGIS.")
