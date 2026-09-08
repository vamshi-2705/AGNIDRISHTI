"""
ASTRAFIRE - Downwind Gaussian Toxic Smoke Plume Dispersion Model
Source: Meteorological Wind Vectors (NOAA GFS / OpenWeather) + Pasquill-Gifford Plume Dispersion
GeoJSON GIS Overlay for Evacuation Planning & NDRF Response
"""

import math
from typing import Dict, Any, List

def calculate_plume_cone(
    lat: float,
    lon: float,
    frp: float,
    wind_speed_kmh: float = 18.0,
    wind_direction_deg: float = 225.0,
    fire_id: str = "FIRMS-UNKNOWN",
    category: str = "CRITICAL_INDUSTRIAL_EMERGENCY"
) -> Dict[str, Any]:
    """
    Computes a downwind toxic gas & smoke dispersion cone polygon.
    Wind direction is the direction the wind blows FROM; plume travels toward the downwind azimuth.
    Plume length and lateral spread are scaled according to FRP (thermal energy) and wind velocity.
    """
    # Downwind travel direction
    downwind_deg = (wind_direction_deg + 180.0) % 360.0
    downwind_rad = math.radians(downwind_deg)

    # Dynamic Plume Reach (km) based on thermal intensity and wind speed
    # Greater FRP produces higher buoyant thermal column; high wind drives faster downwind advection
    base_length = (frp / 25.0) * (0.8 + (wind_speed_kmh / 30.0))
    hazard_length_km = max(2.5, min(28.0, round(base_length, 2)))

    # Lateral dispersion half-angle (Pasquill-Gifford Class D/C neutral dispersion ~22.5 degrees)
    spread_deg = 22.5
    spread_rad = math.radians(spread_deg)

    # Convert km offsets to degrees latitude and longitude (WGS84 approx)
    km_per_lat = 111.32
    km_per_lon = 111.32 * math.cos(math.radians(lat))
    if km_per_lon == 0:
        km_per_lon = 111.32

    # Vector angles for the cone boundaries
    angle_center = downwind_rad
    angle_left = downwind_rad - spread_rad
    angle_right = downwind_rad + spread_rad

    # Point 0: Origin (Fire Source)
    coords: List[List[float]] = [[round(lon, 6), round(lat, 6)]]

    # Arc steps along the downwind dispersion front (curved boundary)
    num_arc_points = 8
    for step in range(num_arc_points + 1):
        frac = step / float(num_arc_points)
        curr_angle = angle_left + frac * (angle_right - angle_left)
        # Distance at edge can be slightly smaller than center to simulate parabolic Gaussian envelope
        r_km = hazard_length_km * (0.88 + 0.12 * math.cos(curr_angle - angle_center))
        d_lat = (r_km * math.cos(curr_angle)) / km_per_lat
        d_lon = (r_km * math.sin(curr_angle)) / km_per_lon
        coords.append([round(lon + d_lon, 6), round(lat + d_lat, 6)])

    # Close the polygon loop back to the fire origin
    coords.append([round(lon, 6), round(lat, 6)])

    # Determine hazard tier
    if frp >= 100.0 or category == "CRITICAL_INDUSTRIAL_EMERGENCY":
        hazard_tier = "TIER-1 CRITICAL TOXIC HAZARD"
        fill_color = "#DC2626"
        warning = "IMMEDIATE EVACUATION MANDATED: High toxic combustion density and thermal buoyancy."
    elif category == "COAL_MINING_FIRE":
        hazard_tier = "TIER-2 CO/SO2 SEAM DISPERSION"
        fill_color = "#EAB308"
        warning = "RESPIRATORY CAUTION: Continuous subsurface gas venting into downwind basin."
    elif category == "PERSISTENT_INDUSTRIAL_FLARE":
        hazard_tier = "TIER-3 ROUTINE INDUSTRIAL FLUE PLUME"
        fill_color = "#F97316"
        warning = "MONITORED DISPERSION: Controlled hydrocarbon combustion within regulatory limits."
    else:
        hazard_tier = "TIER-4 BIOMASS PARTICULATE SMOKE"
        fill_color = "#22C55E"
        warning = "AIR QUALITY ALERT: Elevated PM2.5 and PM10 downwind trajectory."

    return {
        "type": "Feature",
        "properties": {
            "fire_id": fire_id,
            "category": category,
            "hazard_tier": hazard_tier,
            "hazard_length_km": hazard_length_km,
            "wind_speed_kmh": wind_speed_kmh,
            "wind_direction_deg": wind_direction_deg,
            "downwind_azimuth_deg": round(downwind_deg, 1),
            "fill_color": fill_color,
            "fill_opacity": 0.35,
            "stroke_color": fill_color,
            "stroke_width": 2,
            "warning": warning
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [coords]
        }
    }
