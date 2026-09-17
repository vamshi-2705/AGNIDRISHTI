"""
AGNIDRISHTI - Directional Estimated Dispersion Model
Source: Real-time Atmospheric Wind Vectors (Open-Meteo API) + Deterministic Gaussian Dispersion Proxy
Strictly data-driven: no fabricated meteorological values or unsubstantiated toxic gas claims.

MODEL ASSUMPTIONS & TRANSPARENCY:
1. Steady-State Neutral Boundary Layer:
   Approximates atmospheric transport under neutral surface layer stability (Pasquill-Gifford Class C/D).
2. Lateral Gaussian Expansion:
   Corridor half-width widens with downwind distance d following W(d) = W0 + k * sqrt(d),
   where W0 = 0.04 km near origin, k = 0.32 km / sqrt(km).
3. Transport Distance Scaling:
   Estimated screening distance is derived deterministically from VIIRS Fire Radiative Power (FRP in MW)
   as a proxy for convective heat release, combined with 10m surface advection velocity.
4. Low Wind & Missing Data Thresholds:
   If wind < 1.0 m/s (3.6 km/h) or meteorological data is unavailable, directional transport is uncertain
   due to dominating vertical convective lift; a non-directional local screening area is produced.
5. Scope of Application:
   Intended solely as a screening-level decision support heuristic for prioritizing visual verification
   and sensitive receptor awareness. Does not claim Eulerian photochemical grid modeling or complex
   aerodynamic building wake simulation.
"""

import math
import time
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

_WIND_CACHE: Dict[str, Dict[str, Any]] = {}
_WIND_CACHE_TTL = 600  # 10 minutes


def fetch_live_wind(lat: float, lon: float, allow_network: bool = True) -> Dict[str, Any]:
    """
    Fetches real-time atmospheric wind velocity and direction from Open-Meteo API.
    Does not invent fake meteorological values if network fails.
    Uses regional grid caching (~11km) to ensure instantaneous response across nearby hotspots.

    DIRECTION CONVENTION:
    - Open-Meteo returns wind_direction_10m using meteorological convention:
      The azimuth in degrees (0°-360°) FROM which the wind is blowing.
      (0° = North wind blowing South, 90° = East wind blowing West,
       180° = South wind blowing North, 270° = West wind blowing East).
    - Downwind transport travels TOWARD: (wind_direction + 180°) % 360°.
    """
    cache_key = f"{round(lat, 1)}_{round(lon, 1)}"
    now_ts = time.time()
    if cache_key in _WIND_CACHE:
        entry = _WIND_CACHE[cache_key]
        if now_ts - entry.get("timestamp_ts", 0) < _WIND_CACHE_TTL:
            return entry["data"]

    now_utc = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
    if allow_network:
        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast?"
                f"latitude={round(lat, 4)}&longitude={round(lon, 4)}"
                f"&current=wind_speed_10m,wind_direction_10m"
            )
            resp = requests.get(url, timeout=2.5)
            if resp.status_code == 200:
                curr = resp.json().get("current", {})
                speed_kmh = float(curr.get("wind_speed_10m", 0.0))
                dir_deg = float(curr.get("wind_direction_10m", 0.0))
                speed_ms = round(speed_kmh / 3.6, 1)

                res = {
                    "wind_speed_kmh": round(speed_kmh, 1),
                    "wind_speed_ms": speed_ms,
                    "wind_direction_deg": round(dir_deg, 1),
                    "direction_convention": "METEOROLOGICAL_FROM",
                    "downwind_azimuth_deg": round((dir_deg + 180.0) % 360.0, 1),
                    "source": "OPEN_METEO_LIVE",
                    "is_live": True,
                    "updated_at_utc": now_utc
                }
                _WIND_CACHE[cache_key] = {"data": res, "timestamp_ts": now_ts}
                return res
        except Exception:
            pass

    fallback_res = {
        "wind_speed_kmh": 0.0,
        "wind_speed_ms": 0.0,
        "wind_direction_deg": 0.0,
        "direction_convention": "METEOROLOGICAL_FROM",
        "downwind_azimuth_deg": 0.0,
        "source": "METEOROLOGY_UNAVAILABLE",
        "is_live": False,
        "updated_at_utc": now_utc
    }
    if allow_network:
        _WIND_CACHE[cache_key] = {"data": fallback_res, "timestamp_ts": now_ts}
    return fallback_res


def _geodesic_dest(origin_lat: float, origin_lon: float, b_deg: float, dist_km: float) -> List[float]:
    """Calculates spherical destination point on Earth [longitude, latitude]."""
    R = 6371.0
    delta = dist_km / R
    theta = math.radians(b_deg)
    phi1 = math.radians(origin_lat)
    lambda1 = math.radians(origin_lon)
    sin_phi2 = math.sin(phi1) * math.cos(delta) + math.cos(phi1) * math.sin(delta) * math.cos(theta)
    phi2 = math.asin(max(-1.0, min(1.0, sin_phi2)))
    y = math.sin(theta) * math.sin(delta) * math.cos(phi1)
    x = math.cos(delta) - math.sin(phi1) * math.sin(phi2)
    lambda2 = lambda1 + math.atan2(y, x)
    lat2 = math.degrees(phi2)
    lon2 = ((math.degrees(lambda2) + 540.0) % 360.0) - 180.0
    return [round(lon2, 6), round(lat2, 6)]


def _generate_radial_buffer(lat: float, lon: float, radius_km: float = 0.8, num_points: int = 24) -> List[List[float]]:
    """Generates an omnidirectional circular polygon ring for calm or unavailable wind."""
    ring: List[List[float]] = []
    for i in range(num_points):
        az = (i / float(num_points)) * 360.0
        ring.append(_geodesic_dest(lat, lon, az, radius_km))
    # Close ring
    ring.append(ring[0])
    return ring


def calculate_plume_cone(
    lat: float,
    lon: float,
    frp: float,
    wind_speed_kmh: Optional[float] = 0.0,
    wind_direction_deg: Optional[float] = 0.0,
    fire_id: str = "FIRMS-UNKNOWN",
    category: str = "CRITICAL_INDUSTRIAL_EMERGENCY",
    wind_source: str = "OPEN_METEO_LIVE",
    dispersion_length_km: Optional[float] = None,
    dispersion_angle_deg: float = 30.0
) -> Dict[str, Any]:
    """
    Computes a directional estimated dispersion corridor polygon from the thermal observation coordinate.
    Originates exactly at the thermal observation and widens with distance following deterministic
    atmospheric diffusion assumptions.

    LOW/NO WIND HANDLING (TASK 4):
    - If wind is missing or unavailable: outputs non-directional local area with 'Wind data unavailable'.
    - If wind speed < 1.0 m/s (< 3.6 km/h): outputs non-directional local area with
      'Low wind — directional estimate uncertain'.
    """
    now_utc = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
    speed_kmh = float(wind_speed_kmh) if wind_speed_kmh is not None else 0.0
    speed_ms = round(speed_kmh / 3.6, 1)
    dir_deg = float(wind_direction_deg) if wind_direction_deg is not None else 0.0

    # Task 4 Check 1: Missing or unavailable meteorology
    if wind_source == "METEOROLOGY_UNAVAILABLE" or wind_speed_kmh is None:
        buffer_coords = _generate_radial_buffer(lat, lon, radius_km=0.6)
        return {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [buffer_coords]
            },
            "properties": {
                "fire_id": fire_id,
                "category": category,
                "hazard_tier": "ESTIMATED DISPERSION (UNAVAILABLE)",
                "hazard_length_km": 0.6,
                "wind_speed_kmh": 0.0,
                "wind_speed_ms": 0.0,
                "wind_direction_deg": None,
                "wind_direction_convention": "METEOROLOGICAL_FROM",
                "downwind_azimuth_deg": None,
                "is_directional": False,
                "status": "WIND_UNAVAILABLE",
                "status_message": "Wind data unavailable",
                "calculated_at_utc": now_utc,
                "meteorology_source": "METEOROLOGY_UNAVAILABLE",
                "fill_color": "#94A3B8",
                "fill_opacity": 0.18,
                "stroke_color": "#64748B",
                "uncertainty_description": "Meteorological wind data unavailable; directional dispersion corridor cannot be calculated.",
                "warning": "Wind data unavailable: directional dispersion cannot be determined. Conduct localized on-site assessment.",
                "decision_support": "Visual and instrument inspection recommended at source coordinate. Directional screening unavailable."
            }
        }

    # Task 4 Check 2: Extremely low wind (< 1.0 m/s or < 3.6 km/h)
    if speed_kmh < 3.6:
        buffer_coords = _generate_radial_buffer(lat, lon, radius_km=0.8)
        return {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [buffer_coords]
            },
            "properties": {
                "fire_id": fire_id,
                "category": category,
                "hazard_tier": "ESTIMATED DISPERSION (LOW WIND)",
                "hazard_length_km": 0.8,
                "wind_speed_kmh": round(speed_kmh, 1),
                "wind_speed_ms": speed_ms,
                "wind_direction_deg": round(dir_deg, 1),
                "wind_direction_convention": "METEOROLOGICAL_FROM",
                "downwind_azimuth_deg": None,
                "is_directional": False,
                "status": "LOW_WIND_UNCERTAIN",
                "status_message": "Low wind — directional estimate uncertain",
                "calculated_at_utc": now_utc,
                "meteorology_source": wind_source,
                "fill_color": "#F59E0B",
                "fill_opacity": 0.20,
                "stroke_color": "#D97706",
                "uncertainty_description": f"Wind speed ({speed_ms} m/s) is below 1.0 m/s threshold. Convective thermal buoyancy dominates; directional transport is uncertain.",
                "warning": "Low wind — directional estimate uncertain. Plume buoyancy may cause localized atmospheric stagnation near origin.",
                "decision_support": "Expect localized convective pooling within ~1 km radius. Directional corridor uncertain due to calm surface conditions."
            }
        }

    # Task 1 & 2: Valid directional wind (>= 1.0 m/s)
    # Wind direction convention: dir_deg is FROM which wind blows. Downwind transport moves TOWARD (dir_deg + 180) % 360
    downwind_deg = (dir_deg + 180.0) % 360.0

    # Configurable / dynamic length
    if dispersion_length_km and dispersion_length_km > 0:
        hazard_length_km = round(float(dispersion_length_km), 2)
    else:
        effective_wind = max(3.6, speed_kmh)
        base_length = (frp / 25.0) * (0.8 + (effective_wind / 30.0))
        hazard_length_km = max(1.5, min(30.0, round(base_length, 2)))

    left_cross_deg = (downwind_deg - 90.0 + 360.0) % 360.0
    right_cross_deg = (downwind_deg + 90.0) % 360.0

    # Point 0: Origin exactly at thermal observation
    coords: List[List[float]] = [[round(lon, 6), round(lat, 6)]]

    # Sample points along downwind centerline: distance d from 0 to L
    # Width increases as Gaussian diffusion: W(d) = 0.04 + 0.32 * sqrt(d)
    num_steps = 12
    distances = [hazard_length_km * (i / float(num_steps)) for i in range(1, num_steps + 1)]

    # 1. Left Flank: from near source to far field
    left_flank: List[List[float]] = []
    for d in distances:
        c_lon, c_lat = _geodesic_dest(lat, lon, downwind_deg, d)
        half_w = 0.04 + 0.32 * math.sqrt(d)
        pt_lon, pt_lat = _geodesic_dest(c_lat, c_lon, left_cross_deg, half_w)
        left_flank.append([pt_lon, pt_lat])
    coords.extend(left_flank)

    # 2. Leading Downwind Front (Smooth rounded aerodynamic nose around plume tip)
    tip_lon, tip_lat = _geodesic_dest(lat, lon, downwind_deg, hazard_length_km * 1.02)
    coords.append([tip_lon, tip_lat])

    # 3. Right Flank: returning from far field back toward source
    right_flank: List[List[float]] = []
    for d in reversed(distances):
        c_lon, c_lat = _geodesic_dest(lat, lon, downwind_deg, d)
        half_w = 0.04 + 0.32 * math.sqrt(d)
        pt_lon, pt_lat = _geodesic_dest(c_lat, c_lon, right_cross_deg, half_w)
        right_flank.append([pt_lon, pt_lat])
    coords.extend(right_flank)

    # 4. Close polygon loop back to origin
    coords.append([round(lon, 6), round(lat, 6)])

    # Construct Inner Core Corridor (50% width) for uncertainty visualization
    inner_coords: List[List[float]] = [[round(lon, 6), round(lat, 6)]]
    core_dist = hazard_length_km * 0.70
    core_distances = [core_dist * (i / 8.0) for i in range(1, 9)]
    for d in core_distances:
        c_lon, c_lat = _geodesic_dest(lat, lon, downwind_deg, d)
        half_w = 0.02 + 0.16 * math.sqrt(d)
        inner_coords.append(_geodesic_dest(c_lat, c_lon, left_cross_deg, half_w))
    inner_coords.append(_geodesic_dest(lat, lon, downwind_deg, core_dist * 1.01))
    for d in reversed(core_distances):
        c_lon, c_lat = _geodesic_dest(lat, lon, downwind_deg, d)
        half_w = 0.02 + 0.16 * math.sqrt(d)
        inner_coords.append(_geodesic_dest(c_lat, c_lon, right_cross_deg, half_w))
    inner_coords.append([round(lon, 6), round(lat, 6)])

    # Centerline track
    centerline = [_geodesic_dest(lat, lon, downwind_deg, d) for d in distances]

    # Terminology adhering to Task 7: Objective, non-alarmist scientific phrasing
    if frp >= 100.0 or category == "CRITICAL_INDUSTRIAL_EMERGENCY":
        fill_color = "#DC2626"
        warning = "Estimated high-radiance thermal event. Screen downwind corridor for potential particulate and combustion byproducts."
        decision_support = f"Prioritize immediate ground verification of facility assets. Screen receptors along downwind azimuth {round(downwind_deg)}° to {hazard_length_km} km."
    elif category == "COAL_MINING_FIRE":
        fill_color = "#EAB308"
        warning = "Subsurface coal seam combustion profile. Screen downwind sector for CO and particulate dispersion."
        decision_support = f"Check overburden ventilation and fire suppression lines downwind ({round(downwind_deg)}°, {hazard_length_km} km)."
    elif category in ["PERSISTENT_INDUSTRIAL_FLARE", "INTERMITTENT_INDUSTRIAL_FLARE"]:
        fill_color = "#F97316"
        warning = "Elevated industrial flare combustion profile. Directional dispersion corridor estimated for standard monitoring."
        decision_support = f"Cross-reference facility flaring logs with VIIRS detection timestamp. Downwind transport: {round(downwind_deg)}°."
    else:
        fill_color = "#22C55E"
        warning = "Biomass / open vegetation thermal signature. Screen downwind trajectory for smoke and particulate impact."
        decision_support = f"Monitor agricultural or wildland boundary downwind ({round(downwind_deg)}°, {hazard_length_km} km)."

    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [coords]
        },
        "properties": {
            "fire_id": fire_id,
            "category": category,
            "hazard_tier": "ESTIMATED DISPERSION CORRIDOR",
            "hazard_length_km": hazard_length_km,
            "wind_speed_kmh": round(speed_kmh, 1),
            "wind_speed_ms": speed_ms,
            "wind_direction_deg": round(dir_deg, 1),
            "wind_direction_convention": "METEOROLOGICAL_FROM (direction from which wind blows)",
            "downwind_azimuth_deg": round(downwind_deg, 1),
            "downwind_convention": "TRANSPORT_TO (azimuth toward which dispersion moves)",
            "is_directional": True,
            "status": "ESTIMATED",
            "status_message": "Estimated Directional Dispersion",
            "calculated_at_utc": now_utc,
            "meteorology_source": wind_source,
            "fill_color": fill_color,
            "fill_opacity": 0.22,
            "stroke_color": fill_color,
            "centerline": centerline,
            "inner_corridor": inner_coords,
            "model_assumptions": [
                "Steady-state neutral atmospheric surface layer approximation.",
                "Lateral expansion follows Pasquill-Gifford diffusion approximation W(d) = W0 + k*sqrt(d).",
                "Transport reach estimated from VIIRS thermal radiative power (FRP) and 10m surface advection.",
                "Deterministic screening heuristic: does not model photochemical reactions or complex 3D urban turbulence."
            ],
            "uncertainty_description": "Directional screening estimate. Actual dispersion varies with micro-topography, thermal boundary height, and atmospheric stability.",
            "warning": warning,
            "decision_support": decision_support
        }
    }
