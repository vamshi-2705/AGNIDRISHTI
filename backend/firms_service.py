"""
AGNIDRISHTI - Real-Time NASA FIRMS Multi-Satellite Ingestion Engine
Authentic Satellite Feeds:
  1. VIIRS_SNPP_NRT (Suomi-NPP 375m)
  2. VIIRS_NOAA20_NRT (NOAA-20 / JPSS-1 375m)
  3. VIIRS_NOAA21_NRT (NOAA-21 / JPSS-2 375m)
Area: India Subcontinent Bounding Box (68°E, 6°N to 97°E, 37°N)

Strict Rules:
  - NO mock or benchmark data injection.
  - If FIRMS returns 0 records, returns 0 records.
  - Authentic multi-satellite deduplication & persistence via SQLite event store.
  - Transparent tracking of API connectivity, satellite contribution, and observation latency.
"""

import os
import csv
import time
import logging
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv, find_dotenv
from event_store import persist_and_rebuild_events, format_utc_time

# Load local .env from current or parent directories
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(_env_path)
else:
    _parent_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    _backend_env = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(_backend_env):
        load_dotenv(_backend_env)
    elif os.path.exists(_parent_env):
        load_dotenv(_parent_env)

logger = logging.getLogger("agnidrishti.firms")
logging.basicConfig(level=logging.INFO)

# Satellite raw identifier map from NASA FIRMS CSV output
SATELLITE_NAME_MAP = {
    "N": "VIIRS_SNPP",
    "SNPP": "VIIRS_SNPP",
    "VIIRS_SNPP": "VIIRS_SNPP",
    "1": "VIIRS_NOAA20",
    "N20": "VIIRS_NOAA20",
    "J1": "VIIRS_NOAA20",
    "NOAA20": "VIIRS_NOAA20",
    "VIIRS_NOAA20": "VIIRS_NOAA20",
    "2": "VIIRS_NOAA21",
    "N21": "VIIRS_NOAA21",
    "J2": "VIIRS_NOAA21",
    "NOAA21": "VIIRS_NOAA21",
    "VIIRS_NOAA21": "VIIRS_NOAA21"
}


class MultiSatelliteFirmsService:
    """
    Ingests and merges near real-time thermal observations across India from
    Suomi-NPP, NOAA-20, and NOAA-21 VIIRS instruments without synthetic data.
    """

    BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
    SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"]

    def __init__(self, map_key: Optional[str] = None):
        # Strictly load from environment variable NASA_FIRMS_MAP_KEY (or constructor override)
        raw_key = os.getenv("NASA_FIRMS_MAP_KEY", map_key)
        self.map_key = raw_key.strip() if raw_key and raw_key.strip() else None
        self._cache = None
        self._cache_time = 0.0
        self._cache_ttl = 300.0  # 5-minute synchronization cycle
        self._source_status: Dict[str, str] = {src: "DISCONNECTED" for src in self.SOURCES}
        self._last_event_ids = set()
        self._last_successful_fetch_utc = None
        self._latest_observation_utc = None

    def _fetch_single_source(self, source: str, days: int) -> Dict[str, Any]:
        """Fetches and parses a single NASA FIRMS satellite CSV stream with strict individual timeout."""
        t0 = time.time()
        url = f"{self.BASE_URL}/{self.map_key}/{source}/68,6,97,37/{days}"
        try:
            logger.info(f"Querying authentic NASA FIRMS endpoint: {source}")
            resp = requests.get(url, timeout=4.5)
            duration = round(time.time() - t0, 2)
            if resp.status_code == 200 and "latitude" in resp.text:
                parsed = self._parse_firms_csv(resp.text, source)
                return {
                    "source": source,
                    "status": "ONLINE",
                    "data": parsed,
                    "duration_s": duration
                }
            else:
                logger.warning(f"NASA FIRMS {source} status {resp.status_code} ({duration}s): {resp.text[:60]}")
                return {
                    "source": source,
                    "status": "EMPTY_OR_RATE_LIMITED",
                    "data": [],
                    "duration_s": duration
                }
        except requests.exceptions.Timeout:
            duration = round(time.time() - t0, 2)
            logger.warning(f"NASA FIRMS {source} timed out after {duration}s.")
            return {
                "source": source,
                "status": "TIMEOUT",
                "data": [],
                "duration_s": duration
            }
        except Exception as e:
            duration = round(time.time() - t0, 2)
            logger.warning(f"NASA FIRMS {source} error ({duration}s): {e}")
            return {
                "source": source,
                "status": "UNAVAILABLE",
                "data": [],
                "duration_s": duration
            }

    def fetch_firms_data(self, days: int = 2, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetches authentic thermal anomalies across India from NASA FIRMS using concurrent satellite workers.
        Enforces 5-minute backend cache unless force_refresh is requested.
        """
        now = time.time()
        if not force_refresh and self._cache and (now - self._cache_time < self._cache_ttl):
            return self._cache

        all_raw_records: List[Dict[str, Any]] = []
        sources_succeeded = 0
        now_utc = datetime.now(timezone.utc)
        sync_time_str = now_utc.strftime("%H:%M:%S UTC")
        last_sync_full = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")
        next_sync_utc = datetime.fromtimestamp(now + self._cache_ttl, timezone.utc).strftime("%H:%M:%S UTC")

        active_contributing_satellites = set()
        timing_breakdown: Dict[str, str] = {}
        concurrent_fetch_time = 0.0

        if self.map_key:
            fetch_start = time.time()
            # Requirement 5: Concurrent multi-satellite queries in parallel
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_to_source = {
                    executor.submit(self._fetch_single_source, src, days): src
                    for src in self.SOURCES
                }
                for future in as_completed(future_to_source):
                    res = future.result()
                    src = res["source"]
                    self._source_status[src] = res["status"]
                    timing_breakdown[src] = f"{res['duration_s']}s"
                    if res["status"] == "ONLINE":
                        sources_succeeded += 1
                        all_raw_records.extend(res["data"])
                        if res["data"]:
                            active_contributing_satellites.add(src.replace("_NRT", "").replace("VIIRS_", ""))

            concurrent_fetch_time = round(time.time() - fetch_start, 2)
            logger.info(
                f"[FIRMS TIMING] Concurrent fetch finished in {concurrent_fetch_time}s | "
                f"SNPP: {timing_breakdown.get('VIIRS_SNPP_NRT', 'N/A')}, "
                f"NOAA-20: {timing_breakdown.get('VIIRS_NOAA20_NRT', 'N/A')}, "
                f"NOAA-21: {timing_breakdown.get('VIIRS_NOAA21_NRT', 'N/A')}"
            )
        else:
            logger.warning("NASA_FIRMS_MAP_KEY environment variable is not configured. Live satellite fetch aborted.")
            for source in self.SOURCES:
                self._source_status[source] = "MISSING_KEY"

        if sources_succeeded > 0:
            self._last_successful_fetch_utc = sync_time_str

        # If records exist, persist and rebuild events using SQLite
        if all_raw_records:
            t_persist = time.time()
            deduped_events = persist_and_rebuild_events(all_raw_records, sync_time_str)
            persist_duration = round(time.time() - t_persist, 3)
            logger.info(f"[FIRMS TIMING] SQLite deduplication & persistence: {persist_duration}s ({len(deduped_events)} events)")
            data_source = "NASA_FIRMS_MULTI_VIIRS_LIVE"

            # Determine newest authentic observation time in dataset
            latest_obs_dt = max(
                (r.get("acq_date", "2026-01-01") + " " + format_utc_time(r.get("acq_time", "0000"))
                 for r in all_raw_records),
                default="N/A"
            )
            self._latest_observation_utc = latest_obs_dt
        elif sources_succeeded == 0 and self._cache and self._cache.get("data"):
            # Requirement 18: Preserve last successful real dataset during temporary network drops
            deduped_events = self._cache["data"]
            data_source = "NASA_FIRMS_DATA_SOURCE_UNAVAILABLE_RETAINED_CACHE"
            logger.warning(f"External NASA FIRMS unreachable. Retaining last verified dataset ({len(deduped_events)} events).")
        else:
            # Zero fake data fallback: report genuine empty or unavailable state
            if sources_succeeded > 0:
                deduped_events = []
                data_source = "NASA_FIRMS_ZERO_EVENTS_DETECTED"
            else:
                deduped_events = []
                data_source = "NASA_FIRMS_DATA_SOURCE_UNAVAILABLE"

        current_ids = {e["fire_id"] for e in deduped_events}
        new_events_count = len(current_ids - self._last_event_ids) if self._last_event_ids else 0
        self._last_event_ids = current_ids

        result = {
            "status": "success" if (sources_succeeded > 0 or (self._cache and self._cache.get("data"))) else "unavailable",
            "source": data_source,
            "count": len(deduped_events),
            "data": deduped_events,
            "sync_metadata": {
                "last_sync_utc": sync_time_str,
                "last_sync_full": last_sync_full,
                "last_firms_fetch_utc": self._last_successful_fetch_utc or "None",
                "latest_observation_utc": self._latest_observation_utc or "None",
                "next_sync_utc": next_sync_utc,
                "sync_interval_seconds": int(self._cache_ttl),
                "satellite_sources": self._source_status,
                "active_satellites_list": sorted(list(active_contributing_satellites)),
                "active_sources_count": sum(1 for v in self._source_status.values() if v == "ONLINE"),
                "new_events_detected": new_events_count,
                "live_connection": sources_succeeded > 0,
                "fetch_timings": timing_breakdown,
                "concurrent_fetch_time_s": concurrent_fetch_time
            }
        }

        self._cache = result
        self._cache_time = now
        logger.info(f"Synchronized {len(deduped_events)} authentic FIRMS thermal events. Sources active: {sources_succeeded}/{len(self.SOURCES)}")
        return result

    def _parse_firms_csv(self, csv_text: str, source_name: str) -> List[Dict[str, Any]]:
        """Parses authentic NASA FIRMS CSV rows into normalized dictionary records."""
        parsed_records = []
        reader = csv.DictReader(csv_text.strip().splitlines())
        sat_key = source_name.replace("_NRT", "")

        for idx, row in enumerate(reader):
            try:
                lat_str = row.get("latitude")
                lon_str = row.get("longitude")
                if not lat_str or not lon_str:
                    continue
                lat = float(lat_str)
                lon = float(lon_str)
                if lat == 0.0 and lon == 0.0:
                    continue

                raw_sat = row.get("satellite", "")
                norm_sat = SATELLITE_NAME_MAP.get(raw_sat, sat_key)
                acq_time_raw = str(row.get("acq_time", "")).strip()
                if len(acq_time_raw) == 3:
                    acq_time_raw = "0" + acq_time_raw

                # Brightness: preserve raw float or None if missing, do not fabricate default
                raw_bright = row.get("bright_ti4") or row.get("brightness")
                brightness = float(raw_bright) if raw_bright not in (None, "", "null") else None

                # FRP: preserve raw float or None if missing, do not fabricate default
                raw_frp = row.get("frp")
                frp = float(raw_frp) if raw_frp not in (None, "", "null") else None

                # Brightness T31: preserve raw float or None if missing
                raw_t31 = row.get("bright_ti5") or row.get("bright_t31")
                bright_t31 = float(raw_t31) if raw_t31 not in (None, "", "null") else None

                # Confidence: preserve raw string or None if missing, do not fabricate 'nominal'
                raw_conf = row.get("confidence")
                confidence = str(raw_conf).strip() if raw_conf not in (None, "", "null") else None

                record = {
                    "fire_id": f"FIRMS-RAW-{idx+1:04d}",
                    "latitude": lat,
                    "longitude": lon,
                    "brightness": brightness,
                    "scan": float(row["scan"]) if row.get("scan") not in (None, "") else None,
                    "track": float(row["track"]) if row.get("track") not in (None, "") else None,
                    "acq_date": row.get("acq_date"),
                    "acq_time": acq_time_raw or None,
                    "satellite": norm_sat,
                    "instrument": row.get("instrument") or "VIIRS (375m)",
                    "confidence": confidence,
                    "version": row.get("version") or "2.0NRT",
                    "bright_t31": bright_t31,
                    "frp": frp,
                    "daynight": row.get("daynight") or "D",
                    "source": "NASA FIRMS NRT"
                }
                parsed_records.append(record)
            except (ValueError, KeyError):
                continue

        return parsed_records


firms_service = MultiSatelliteFirmsService()
