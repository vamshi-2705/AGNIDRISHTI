"""
AGNIDRISHTI - Persistent SQLite Thermal Event & Multi-Satellite Observation Store
Zero-dependency, thread-safe persistence for authentic NASA FIRMS satellite observations.
Stores real chronological passes so history, duration, and trend evolve legitimately over time.
"""

import sqlite3
import os
import math
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "agnidrishti_events.db")

SATELLITE_SHORT_MAP = {
    "VIIRS_SNPP": "SNPP",
    "SNPP": "SNPP",
    "N": "SNPP",
    "VIIRS_NOAA20": "NOAA-20",
    "NOAA20": "NOAA-20",
    "N20": "NOAA-20",
    "J1": "NOAA-20",
    "VIIRS_NOAA21": "NOAA-21",
    "NOAA21": "NOAA-21",
    "N21": "NOAA-21",
    "J2": "NOAA-21"
}


def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    with conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS thermal_events (
            event_id TEXT PRIMARY KEY,
            centroid_lat REAL,
            centroid_lon REAL,
            first_detected TEXT,
            latest_detection TEXT,
            first_acq_date TEXT,
            latest_acq_date TEXT,
            peak_frp REAL,
            latest_frp REAL,
            latest_brightness REAL,
            observation_count INTEGER DEFAULT 1,
            trend TEXT DEFAULT 'INSUFFICIENT DATA',
            trend_direction TEXT DEFAULT 'flat',
            duration_min INTEGER DEFAULT 0,
            active_satellites TEXT,
            updated_at REAL
        );
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS observations (
            obs_id TEXT PRIMARY KEY,
            event_id TEXT,
            latitude REAL,
            longitude REAL,
            brightness REAL,
            scan REAL,
            track REAL,
            acq_date TEXT,
            acq_time TEXT,
            satellite TEXT,
            instrument TEXT,
            confidence TEXT,
            version TEXT,
            bright_t31 REAL,
            frp REAL,
            daynight TEXT,
            source TEXT,
            received_at TEXT,
            FOREIGN KEY(event_id) REFERENCES thermal_events(event_id)
        );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_obs_event ON observations(event_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_obs_datetime ON observations(acq_date, acq_time);")
    conn.close()


init_db()


def generate_event_id(lat: float, lon: float) -> str:
    """Generates a clean, deterministic, stable event identifier from rounded coordinates."""
    coord_hash = hashlib.md5(f"{round(lat, 3)}_{round(lon, 3)}".encode("utf-8")).hexdigest()[:6].upper()
    return f"AGNI-LIVE-{coord_hash}"


def generate_obs_id(obs: Dict[str, Any]) -> str:
    key = f"{obs.get('latitude'):.4f}_{obs.get('longitude'):.4f}_{obs.get('acq_date')}_{obs.get('acq_time')}_{obs.get('satellite')}"
    return "OBS-" + hashlib.md5(key.encode("utf-8")).hexdigest()[:12]


DEFAULT_SPATIAL_RADIUS_M = 500.0


def get_spatial_threshold_deg(radius_m: Optional[float] = None) -> float:
    """Converts a configurable geographic radius in meters to approximate decimal degrees (~111km/deg)."""
    r_m = radius_m if radius_m is not None else float(os.getenv("PERSISTENCE_SPATIAL_RADIUS_M", str(DEFAULT_SPATIAL_RADIUS_M)))
    return max(0.001, round(r_m / 111000.0, 5))


def find_nearest_event(lat: float, lon: float, threshold_deg: Optional[float] = None) -> Optional[sqlite3.Row]:
    if threshold_deg is None:
        threshold_deg = get_spatial_threshold_deg()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM thermal_events")
    rows = cursor.fetchall()
    conn.close()

    best_row = None
    best_dist = threshold_deg
    for r in rows:
        c_lat = r["centroid_lat"]
        c_lon = r["centroid_lon"]
        d_lat = abs(lat - c_lat)
        d_lon = abs(lon - c_lon) * math.cos(math.radians(c_lat))
        dist = math.hypot(d_lat, d_lon)
        if dist <= best_dist:
            best_dist = dist
            best_row = r

    return best_row


def format_utc_time(acq_time_raw: str) -> str:
    raw = str(acq_time_raw).strip()
    if len(raw) == 3:
        raw = "0" + raw
    if len(raw) == 4 and raw.isdigit():
        return f"{raw[:2]}:{raw[2:]} UTC"
    return f"{raw} UTC"


def persist_and_rebuild_events(raw_records: List[Dict[str, Any]], sync_time_str: str) -> List[Dict[str, Any]]:
    """
    Persists authentic NASA FIRMS observations into SQLite database,
    linking them to nearest geographic clusters (~550m envelope),
    and builds authentic event entities with real observation histories.
    """
    if not raw_records:
        return []

    conn = get_db_connection()
    now_ts = datetime.now(timezone.utc).timestamp()

    # In-memory clustering of incoming batch to assign consistent event_ids
    clusters: List[List[Dict[str, Any]]] = []
    spatial_threshold_deg = get_spatial_threshold_deg()

    for rec in raw_records:
        lat = rec["latitude"]
        lon = rec["longitude"]
        matched_cluster = None
        for cluster in clusters:
            c_lat = cluster[0]["latitude"]
            c_lon = cluster[0]["longitude"]
            d_lat = abs(lat - c_lat)
            d_lon = abs(lon - c_lon) * math.cos(math.radians(c_lat))
            if math.hypot(d_lat, d_lon) <= spatial_threshold_deg:
                matched_cluster = cluster
                break
        if matched_cluster is not None:
            matched_cluster.append(rec)
        else:
            clusters.append([rec])

    deduped_events: List[Dict[str, Any]] = []

    with conn:
        for idx, cluster in enumerate(clusters):
            # Sort observations in cluster chronologically
            cluster.sort(key=lambda x: (x.get("acq_date", ""), x.get("acq_time", "")))
            lead_obs = cluster[-1]
            lat = lead_obs["latitude"]
            lon = lead_obs["longitude"]

            # Check if this cluster matches an existing event in SQLite
            existing_event = find_nearest_event(lat, lon, spatial_threshold_deg)
            if existing_event:
                event_id = existing_event["event_id"]
            else:
                # Generate clean, stable event identifier from coordinate hash
                event_id = generate_event_id(lat, lon)

            # Insert or ignore individual observations
            for obs in cluster:
                obs_id = generate_obs_id(obs)
                conn.execute("""
                INSERT OR IGNORE INTO observations (
                    obs_id, event_id, latitude, longitude, brightness, scan, track,
                    acq_date, acq_time, satellite, instrument, confidence, version,
                    bright_t31, frp, daynight, source, received_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    obs_id,
                    event_id,
                    obs.get("latitude"),
                    obs.get("longitude"),
                    obs.get("brightness"),
                    obs.get("scan"),
                    obs.get("track"),
                    obs.get("acq_date"),
                    obs.get("acq_time"),
                    obs.get("satellite"),
                    obs.get("instrument", "VIIRS (375m)"),
                    obs.get("confidence"),
                    obs.get("version", "2.0NRT"),
                    obs.get("bright_t31"),
                    obs.get("frp"),
                    obs.get("daynight"),
                    obs.get("source", "NASA FIRMS NRT"),
                    sync_time_str
                ))

            # Fetch all authentic stored observations for this event
            cur = conn.cursor()
            cur.execute("""
            SELECT * FROM observations WHERE event_id = ? ORDER BY acq_date ASC, acq_time ASC;
            """, (event_id,))
            stored_rows = cur.fetchall()

            history = []
            satellites_set = set()
            peak_frp = None

            for row in stored_rows:
                raw_frp = row["frp"]
                frp_val = round(float(raw_frp), 1) if raw_frp is not None else None
                if frp_val is not None:
                    peak_frp = max(peak_frp, frp_val) if peak_frp is not None else frp_val
                raw_sat = row["satellite"] or "SNPP"
                short_sat = SATELLITE_SHORT_MAP.get(raw_sat, raw_sat)
                satellites_set.add(short_sat)

                history.append({
                    "time": format_utc_time(row["acq_time"]) if row["acq_time"] else None,
                    "acq_date": row["acq_date"],
                    "raw_time": str(row["acq_time"]) if row["acq_time"] else None,
                    "frp": frp_val,
                    "brightness": round(float(row["brightness"]), 1) if row["brightness"] is not None else None,
                    "satellite": raw_sat,
                    "satellite_short": short_sat,
                    "confidence": row["confidence"],
                    "latitude": float(row["latitude"]) if row["latitude"] is not None else None,
                    "longitude": float(row["longitude"]) if row["longitude"] is not None else None,
                    "daynight": row["daynight"] if ("daynight" in row.keys() and row["daynight"]) else "D",
                    "source": "NASA FIRMS NRT",
                    "received_at": row["received_at"]
                })

            satellites_list = sorted(list(satellites_set))
            satellites_display = " + ".join(satellites_list) if satellites_list else "VIIRS"

            # Authentic trend and duration calculation based purely on stored observations
            if not history:
                raw_time = str(lead_obs.get("acq_time", ""))
                formatted_time = format_utc_time(raw_time) if raw_time else None
                first_obs = {
                    "frp": float(lead_obs.get("frp", 0.0)),
                    "acq_date": lead_obs.get("acq_date"),
                    "raw_time": raw_time,
                    "time": formatted_time,
                    "brightness": float(lead_obs.get("brightness", 0.0))
                }
                last_obs = first_obs
            else:
                first_obs = history[0]
                last_obs = history[-1]
            first_frp = first_obs.get("frp", 0.0)
            last_frp = last_obs.get("frp", 0.0)

            if len(history) < 2:
                trend = "INSUFFICIENT DATA"
                trend_direction = "flat"
                duration_min = 0
            else:
                ratio = last_frp / max(first_frp, 1.0)
                if ratio >= 1.3:
                    trend = "↑ RAPIDLY INCREASING"
                    trend_direction = "up"
                elif ratio <= 0.7:
                    trend = "↓ DECREASING"
                    trend_direction = "down"
                else:
                    trend = "STEADY / CONTROLLED"
                    trend_direction = "flat"

                try:
                    t1_str = str(first_obs.get("raw_time", ""))
                    t2_str = str(last_obs.get("raw_time", ""))
                    if len(t1_str) >= 4 and len(t2_str) >= 4:
                        t1_m = int(t1_str[:2]) * 60 + int(t1_str[2:4])
                        t2_m = int(t2_str[:2]) * 60 + int(t2_str[2:4])
                        duration_min = max(0, t2_m - t1_m)
                    else:
                        duration_min = 0
                except Exception:
                    duration_min = 0

            # Update or insert into thermal_events table
            conn.execute("""
            INSERT INTO thermal_events (
                event_id, centroid_lat, centroid_lon, first_detected, latest_detection,
                first_acq_date, latest_acq_date, peak_frp, latest_frp, latest_brightness,
                observation_count, trend, trend_direction, duration_min, active_satellites, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(event_id) DO UPDATE SET
                centroid_lat=excluded.centroid_lat,
                centroid_lon=excluded.centroid_lon,
                latest_detection=excluded.latest_detection,
                latest_acq_date=excluded.latest_acq_date,
                peak_frp=excluded.peak_frp,
                latest_frp=excluded.latest_frp,
                latest_brightness=excluded.latest_brightness,
                observation_count=excluded.observation_count,
                trend=excluded.trend,
                trend_direction=excluded.trend_direction,
                duration_min=excluded.duration_min,
                active_satellites=excluded.active_satellites,
                updated_at=excluded.updated_at;
            """, (
                event_id,
                lat,
                lon,
                first_obs.get("time"),
                last_obs.get("time"),
                first_obs.get("acq_date"),
                last_obs.get("acq_date"),
                peak_frp,
                last_frp,
                last_obs.get("brightness", 0.0),
                len(history),
                trend,
                trend_direction,
                duration_min,
                satellites_display,
                now_ts
            ))

            unified_event = {
                **lead_obs,
                "event_id": event_id,
                "fire_id": event_id,
                "latitude": lat,
                "longitude": lon,
                "frp": last_frp,
                "brightness": last_obs.get("brightness"),
                "confidence": lead_obs.get("confidence"),
                "acq_date": last_obs.get("acq_date") or lead_obs.get("acq_date"),
                "acq_time": last_obs.get("raw_time") or lead_obs.get("acq_time"),
                "satellites": satellites_list,
                "satellites_display": satellites_display,
                "observation_count": len(history),
                "history": history,
                "duration_min": duration_min,
                "first_detected": first_obs.get("time"),
                "latest_detection": last_obs.get("time"),
                "trend": trend,
                "trend_direction": trend_direction,
                "received_at": sync_time_str,
                "source_info": {
                    "satellite": satellites_display,
                    "source": "NASA FIRMS NRT",
                    "spatial_resolution": "375 m",
                    "observed_time": last_obs.get("time"),
                    "received_time": sync_time_str,
                    "synced_time": sync_time_str
                }
            }
            deduped_events.append(unified_event)

    conn.close()
    return deduped_events


def get_data_store_health() -> Dict[str, Any]:
    """Provides storage health metrics for the /api/data-health endpoint."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM thermal_events;")
    total_events = cur.fetchone()["cnt"]
    cur.execute("SELECT COUNT(*) as cnt FROM observations;")
    total_obs = cur.fetchone()["cnt"]
    cur.execute("SELECT MAX(acq_date) as max_d, MAX(acq_time) as max_t FROM observations;")
    latest = cur.fetchone()
    conn.close()

    latest_time = f"{latest['max_d']} {format_utc_time(latest['max_t'])}" if latest and latest["max_d"] else "None"
    return {
        "sqlite_database": "agnidrishti_events.db",
        "stored_events_count": total_events,
        "stored_observations_count": total_obs,
        "latest_observation_in_store": latest_time
    }
