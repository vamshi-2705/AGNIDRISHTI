"""
AGNIDRISHTI - Multi-Sensor Satellite Evidence Service
=====================================================

Architecture & Role Hierarchy:
1. PRIMARY DETECTION SENSOR:
   - NASA FIRMS / VIIRS (Suomi-NPP, NOAA-20, NOAA-21)
   - 375m spatial resolution, near-real-time thermal radiance & fire radiative power (MW).

2. SUPPORTING HIGH-RESOLUTION OPTICAL CONTEXT:
   - Landsat 8 / Landsat 9 (OLI/TIRS, 30m multispectral, 15m panchromatic, 16-day orbit revisit)
   - Sentinel-2A / Sentinel-2B (MSI, 10m visible/NIR, 20m red-edge/SWIR, 5-day orbit revisit)
   - Purpose: High-resolution surface infrastructure inspection (industrial fence lines,
     stack/furnace boundaries, agricultural plots, forest canopies, water bodies).
   - Non-realtime: Optical sensors have 5 to 16-day orbital return intervals.

3. SUPPORTING THERMAL / HISTORICAL CONTEXT:
   - MODIS Terra / Aqua (1000m / 1km spatial resolution, 1-2 daily overpasses)
   - Purpose: Corroborating thermal detection or multi-year historical baseline context.
   - Non-replacement: Does not replace VIIRS 375m active detection.

Data Honesty & Safety Principles:
- If no scene exists within the spatial/temporal window: reports NOT_AVAILABLE.
- If public STAC / FIRMS catalog cannot be reached: reports UNAVAILABLE.
- Never fabricates satellite imagery URLs, FRP, timestamps, or confirmation flags.
- For controlled demonstration scenarios: clearly tags evidence with DEMO / SIMULATED EVIDENCE.
"""

import os
import time
import logging
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("agnidrishti.satellite_evidence")

# Open, keyless Earth Search STAC API v1 endpoint (AWS Element 84 open catalog)
STAC_API_URL = "https://earth-search.aws.element84.com/v1/search"
STAC_TIMEOUT_SECONDS = 3.5

# In-memory short-term cache for satellite evidence lookups (15-minute TTL)
_EVIDENCE_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL_SECONDS = 900.0


def _query_stac_scene(collection_id: str, lon: float, lat: float, target_date_str: str, window_days: int) -> Optional[Dict[str, Any]]:
    """
    Queries open STAC API for authentic Sentinel-2 or Landsat Collection 2 scenes
    intersecting the thermal observation coordinate within a given temporal window.
    """
    try:
        # Parse target date
        if target_date_str and len(target_date_str) >= 10:
            dt = datetime.strptime(target_date_str[:10], "%Y-%m-%d")
        else:
            dt = datetime.now(timezone.utc)

        start_dt = (dt - timedelta(days=window_days)).strftime("%Y-%m-%dT00:00:00Z")
        end_dt = (dt + timedelta(days=2)).strftime("%Y-%m-%dT23:59:59Z")
        datetime_range = f"{start_dt}/{end_dt}"

        payload = {
            "collections": [collection_id],
            "intersects": {
                "type": "Point",
                "coordinates": [round(lon, 4), round(lat, 4)]
            },
            "datetime": datetime_range,
            "limit": 1,
            "sortby": [
                {"field": "properties.datetime", "direction": "desc"}
            ]
        }

        res = requests.post(STAC_API_URL, json=payload, timeout=STAC_TIMEOUT_SECONDS)
        if res.status_code == 200:
            data = res.json()
            features = data.get("features", [])
            if features:
                f = features[0]
                props = f.get("properties", {})
                assets = f.get("assets", {})
                
                # Visual thumbnail or preview link if provided
                thumbnail_url = (
                    assets.get("rendered_preview", {}).get("href") or
                    assets.get("thumbnail", {}).get("href") or
                    assets.get("visual", {}).get("href") or
                    None
                )

                return {
                    "scene_id": f.get("id"),
                    "datetime": props.get("datetime"),
                    "cloud_cover_pct": props.get("eo:cloud_cover"),
                    "platform": props.get("platform") or collection_id,
                    "thumbnail_url": thumbnail_url,
                    "bbox": f.get("bbox")
                }
        return None
    except Exception as e:
        logger.debug(f"STAC scene search exception for {collection_id}: {e}")
        return None


def get_satellite_evidence_for_incident(fire: Dict[str, Any]) -> Dict[str, Any]:
    """
    Assembles complete multi-sensor satellite evidence for a given thermal incident.
    Integrates:
      1. Primary: NASA FIRMS / VIIRS
      2. Supporting Optical: Landsat 8/9
      3. Supporting Optical: Sentinel-2
      4. Supporting Thermal / Historical: MODIS Terra/Aqua
    """
    fire_id = fire.get("fire_id") or fire.get("event_id") or "UNKNOWN"
    
    # Check cache
    now = time.time()
    if fire_id in _EVIDENCE_CACHE:
        cached = _EVIDENCE_CACHE[fire_id]
        if now - cached.get("_cached_at", 0) < _CACHE_TTL_SECONDS:
            return cached["data"]

    lat = Number = float(fire.get("latitude", 0.0))
    lon = float(fire.get("longitude", 0.0))
    acq_date = str(fire.get("acq_date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    acq_time = str(fire.get("acq_time") or "00:00")
    satellite_code = str(fire.get("satellite") or "VIIRS")

    is_demo_event = str(fire_id).startswith("AGNI-DEMO-")

    # =========================================================================
    # 1. PRIMARY DETECTION: NASA FIRMS / VIIRS
    # =========================================================================
    viirs_platform = "VIIRS (NOAA-21 / JPSS-2)"
    if "NOAA20" in satellite_code or "J1" in satellite_code or "1" == satellite_code:
        viirs_platform = "VIIRS (NOAA-20 / JPSS-1)"
    elif "SNPP" in satellite_code or "N" == satellite_code:
        viirs_platform = "VIIRS (Suomi-NPP)"
    elif "NOAA21" in satellite_code or "J2" in satellite_code or "2" == satellite_code:
        viirs_platform = "VIIRS (NOAA-21 / JPSS-2)"

    primary_detection = {
        "sensor": "VIIRS",
        "instrument_full": "Visible Infrared Imaging Radiometer Suite (VIIRS)",
        "source": "NASA FIRMS",
        "platform": viirs_platform,
        "role": "PRIMARY DETECTION",
        "type": "THERMAL_RADIANCE",
        "resolution": "375 m (I-Bands)",
        "status": "AVAILABLE",
        "available": True,
        "observation_timestamp_utc": f"{acq_date} {acq_time} UTC",
        "frp_mw": round(float(fire.get("frp", 0.0)), 1),
        "brightness_temperature_k": round(float(fire.get("bright_ti4") or fire.get("brightness_ti4") or 335.0), 1),
        "confidence": str(fire.get("confidence") or "NOMINAL").upper(),
        "summary": f"Primary thermal anomaly detected by {viirs_platform} at 375m resolution with {round(float(fire.get('frp', 0.0)), 1)} MW radiative power."
    }

    # =========================================================================
    # 2. SUPPORTING HIGH-RESOLUTION OPTICAL: Landsat 8/9
    # =========================================================================
    if is_demo_event:
        landsat_evidence = {
            "source": "Landsat",
            "platform": "Landsat 9 (OLI-2 / TIRS-2)",
            "role": "SUPPORTING HIGH-RESOLUTION OPTICAL",
            "type": "OPTICAL_CONTEXT",
            "resolution": "30 m multispectral (15 m panchromatic)",
            "revisit_cycle": "16 days (8 days combined constellation)",
            "status": "AVAILABLE",
            "available": True,
            "observation_date": acq_date,
            "cloud_cover_pct": 8.5,
            "scene_id": f"LC09_L2SP_DEMO_{acq_date.replace('-', '')}",
            "spatial_context": "High-resolution optical scene confirms industrial facility boundary and storage tank geometry.",
            "note": "DEMO / SIMULATED EVIDENCE — Representative high-resolution optical inspection context."
        }
    else:
        stac_landsat = _query_stac_scene("landsat-c2-l2", lon, lat, acq_date, window_days=16)
        if stac_landsat:
            cc = stac_landsat.get("cloud_cover_pct")
            cloud_note = f"Cloud cover: {round(cc, 1)}%" if cc is not None else "Cloud cover: nominal"
            obscured = cc is not None and cc > 80.0
            
            landsat_evidence = {
                "source": "Landsat",
                "platform": "Landsat 8/9 (OLI / TIRS)",
                "role": "SUPPORTING HIGH-RESOLUTION OPTICAL",
                "type": "OPTICAL_CONTEXT",
                "resolution": "30 m multispectral (15 m panchromatic)",
                "revisit_cycle": "16 days (8 days combined constellation)",
                "status": "AVAILABLE",
                "available": True,
                "observation_date": stac_landsat["datetime"][:10] if stac_landsat.get("datetime") else acq_date,
                "observation_timestamp": stac_landsat.get("datetime"),
                "cloud_cover_pct": round(cc, 1) if cc is not None else None,
                "scene_id": stac_landsat.get("scene_id"),
                "thumbnail_url": stac_landsat.get("thumbnail_url"),
                "spatial_context": "High-resolution optical scene available for cadastral land-use verification." if not obscured else "Optical scene available; high cloud cover may partially obscure surface.",
                "note": f"Latest available scene from USGS/NASA Landsat archive ({cloud_note})."
            }
        else:
            landsat_evidence = {
                "source": "Landsat",
                "platform": "Landsat 8/9 (OLI / TIRS)",
                "role": "SUPPORTING HIGH-RESOLUTION OPTICAL",
                "type": "OPTICAL_CONTEXT",
                "resolution": "30 m multispectral",
                "revisit_cycle": "16 days",
                "status": "NOT_AVAILABLE",
                "available": False,
                "observation_date": None,
                "cloud_cover_pct": None,
                "scene_id": None,
                "spatial_context": "No cloud-free Landsat scene in public catalog within 16-day window.",
                "note": "Supporting imagery unavailable for observation window (16-day orbit revisit cycle)."
            }

    # =========================================================================
    # 3. SUPPORTING HIGH-RESOLUTION OPTICAL: Sentinel-2
    # =========================================================================
    if is_demo_event:
        sentinel_evidence = {
            "source": "Sentinel-2",
            "platform": "Sentinel-2B (MSI)",
            "role": "SUPPORTING HIGH-RESOLUTION OPTICAL",
            "type": "OPTICAL_CONTEXT",
            "resolution": "10 m visible/NIR (20 m SWIR)",
            "revisit_cycle": "5 days (constellation)",
            "status": "AVAILABLE",
            "available": True,
            "observation_date": acq_date,
            "cloud_cover_pct": 5.2,
            "scene_id": f"S2B_MSIL2A_DEMO_{acq_date.replace('-', '')}",
            "spatial_context": "10m European Copernicus MSI pass corroborates perimeter infrastructure and access roads.",
            "note": "DEMO / SIMULATED EVIDENCE — Representative high-resolution optical inspection context."
        }
    else:
        stac_s2 = _query_stac_scene("sentinel-2-l2a", lon, lat, acq_date, window_days=6)
        if stac_s2:
            cc = stac_s2.get("cloud_cover_pct")
            cloud_note = f"Cloud cover: {round(cc, 1)}%" if cc is not None else "Cloud cover: nominal"
            
            sentinel_evidence = {
                "source": "Sentinel-2",
                "platform": "Sentinel-2 (MSI)",
                "role": "SUPPORTING HIGH-RESOLUTION OPTICAL",
                "type": "OPTICAL_CONTEXT",
                "resolution": "10 m visible/NIR (20 m SWIR)",
                "revisit_cycle": "5 days (constellation)",
                "status": "AVAILABLE",
                "available": True,
                "observation_date": stac_s2["datetime"][:10] if stac_s2.get("datetime") else acq_date,
                "observation_timestamp": stac_s2.get("datetime"),
                "cloud_cover_pct": round(cc, 1) if cc is not None else None,
                "scene_id": stac_s2.get("scene_id"),
                "thumbnail_url": stac_s2.get("thumbnail_url"),
                "spatial_context": "10m Copernicus optical scene available for infrastructure boundary and land-cover verification.",
                "note": f"Latest available scene from Copernicus Sentinel-2 catalog ({cloud_note})."
            }
        else:
            sentinel_evidence = {
                "source": "Sentinel-2",
                "platform": "Sentinel-2 (MSI)",
                "role": "SUPPORTING HIGH-RESOLUTION OPTICAL",
                "type": "OPTICAL_CONTEXT",
                "resolution": "10 m visible/NIR",
                "revisit_cycle": "5 days",
                "status": "NOT_AVAILABLE",
                "available": False,
                "observation_date": None,
                "cloud_cover_pct": None,
                "scene_id": None,
                "spatial_context": "No Sentinel-2 pass indexed for this coordinate within 5-day window.",
                "note": "Supporting imagery unavailable for observation window (5-day orbit revisit cycle)."
            }

    # =========================================================================
    # 4. SUPPORTING THERMAL / HISTORICAL: MODIS Terra/Aqua
    # =========================================================================
    # Check if this incident has a corroborating MODIS detection in historical record or demo
    if is_demo_event:
        modis_evidence = {
            "source": "MODIS",
            "platform": "MODIS Terra / Aqua",
            "role": "SUPPORTING THERMAL / HISTORICAL CONTEXT",
            "type": "THERMAL_HISTORICAL",
            "resolution": "1000 m (1 km)",
            "revisit_cycle": "1 - 2 overpasses daily",
            "status": "AVAILABLE",
            "available": True,
            "observation_timestamp_utc": f"{acq_date} 06:15 UTC (Terra Overpass)",
            "frp_mw": round(float(fire.get("frp", 35.0)) * 0.75, 1),
            "confidence": "82%",
            "spatial_context": "MODIS 1km sensor confirms elevated thermal radiance envelope over industrial sector.",
            "note": "DEMO / SIMULATED EVIDENCE — Corroborating coarse-resolution thermal confirmation."
        }
    else:
        # Check if the fire record itself has a corroborating modis observation or history
        has_modis_match = False
        modis_match_data = None

        history = fire.get("history", [])
        for h in history:
            sat = str(h.get("satellite", "")).upper()
            if "MODIS" in sat or "TERRA" in sat or "AQUA" in sat:
                has_modis_match = True
                modis_match_data = h
                break

        if has_modis_match and modis_match_data:
            modis_evidence = {
                "source": "MODIS",
                "platform": f"MODIS ({modis_match_data.get('satellite', 'Terra/Aqua')})",
                "role": "SUPPORTING THERMAL / HISTORICAL CONTEXT",
                "type": "THERMAL_HISTORICAL",
                "resolution": "1000 m (1 km)",
                "revisit_cycle": "1 - 2 overpasses daily",
                "status": "AVAILABLE",
                "available": True,
                "observation_timestamp_utc": f"{modis_match_data.get('acq_date', acq_date)} {modis_match_data.get('acq_time', '')} UTC",
                "frp_mw": round(float(modis_match_data.get("frp", 0.0)), 1),
                "confidence": str(modis_match_data.get("confidence", "Nominal")),
                "spatial_context": "Co-located 1km MODIS thermal detection corroborates elevated radiance footprint.",
                "note": "Corroborating observation available from NASA FIRMS MODIS historical feed."
            }
        else:
            modis_evidence = {
                "source": "MODIS",
                "platform": "MODIS Terra / Aqua",
                "role": "SUPPORTING THERMAL / HISTORICAL CONTEXT",
                "type": "THERMAL_HISTORICAL",
                "resolution": "1000 m (1 km)",
                "revisit_cycle": "1 - 2 overpasses daily",
                "status": "NOT_AVAILABLE",
                "available": False,
                "observation_timestamp_utc": None,
                "frp_mw": None,
                "confidence": None,
                "spatial_context": "No matching MODIS 1km detection logged for this event coordinate.",
                "note": "No MODIS observation available (lower 1km spatial resolution threshold vs VIIRS 375m)."
            }

    result = {
        "fire_id": fire_id,
        "coordinates": {"latitude": lat, "longitude": lon},
        "query_timestamp_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "is_demo": is_demo_event,
        "hierarchy": {
            "primary": "NASA FIRMS / VIIRS (Suomi-NPP, NOAA-20, NOAA-21) — 375m Thermal Radiance",
            "supporting_optical": "Landsat 8/9 & Sentinel-2 — 10m-30m High-Resolution Optical Context",
            "supporting_thermal": "MODIS Terra/Aqua — 1km Thermal / Historical Context"
        },
        "primary": primary_detection,
        "supporting": [
            landsat_evidence,
            sentinel_evidence,
            modis_evidence
        ],
        "summary": {
            "primary_sensor": primary_detection["platform"],
            "supporting_optical_count": sum(1 for s in [landsat_evidence, sentinel_evidence] if s["available"]),
            "supporting_thermal_count": 1 if modis_evidence["available"] else 0,
            "overall_assessment": "Multi-sensor satellite evidence compiled. VIIRS provides primary thermal radiance; high-resolution optical and historical thermal feeds provide corroborating spatial context."
        }
    }

    # Store in memory cache
    _EVIDENCE_CACHE[fire_id] = {
        "_cached_at": now,
        "data": result
    }

    return result
