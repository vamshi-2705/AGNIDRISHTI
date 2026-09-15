"""
AGNIDRISHTI - Downwind Community Exposure Engine & Live OpenStreetMap Sensitive Receptors
Sources:
  1. Live OpenStreetMap Overpass API (place=village|town|suburb|hamlet, amenity=school|hospital)
  2. Spatially-cached geographic grid (24-hour TTL to prevent Overpass API hammering)
  3. Curated industrial-belt offline baseline (strictly labeled as CURATED_OFFLINE_COVERAGE when live Overpass is unreachable)
"""

import math
import time
import requests
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("agnidrishti.receptors")

# Grid cache for OSM sensitive receptors: key is "grid_{round(lat, 1)}_{round(lon, 1)}"
_OSM_RECEPTOR_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 86400  # 24 hours

# Curated reference locations for offline fallback coverage
CURATED_OFFLINE_RECEPTORS: List[Dict[str, Any]] = [
    {
        "id": "CUR-JAM-SET-001",
        "name": "Moti Khavdi Village",
        "type": "settlement",
        "category": "Village Settlement",
        "latitude": 22.3780,
        "longitude": 69.8920,
        "district": "Jamnagar",
        "state": "Gujarat",
        "population_est": 8500,
        "source": "Curated receptor coverage - demonstration dataset",
        "is_live_osm": False
    },
    {
        "id": "CUR-JAM-SCH-001",
        "name": "Khavdi Secondary Vidyalaya",
        "type": "school",
        "category": "Educational Institution",
        "latitude": 22.3810,
        "longitude": 69.8890,
        "district": "Jamnagar",
        "state": "Gujarat",
        "capacity_est": 650,
        "source": "Curated receptor coverage - demonstration dataset",
        "is_live_osm": False
    },
    {
        "id": "CUR-JAM-HOS-001",
        "name": "Community Health Centre, Moti Khavdi",
        "type": "hospital",
        "category": "Healthcare Facility",
        "latitude": 22.3840,
        "longitude": 69.8850,
        "district": "Jamnagar",
        "state": "Gujarat",
        "beds_est": 40,
        "source": "Curated receptor coverage - demonstration dataset",
        "is_live_osm": False
    },
    {
        "id": "CUR-HAZ-SET-001",
        "name": "Hazira Coastal Township",
        "type": "settlement",
        "category": "Township",
        "latitude": 21.1250,
        "longitude": 72.6780,
        "district": "Surat",
        "state": "Gujarat",
        "population_est": 18200,
        "source": "Curated receptor coverage - demonstration dataset",
        "is_live_osm": False
    },
    {
        "id": "CUR-MAN-SET-001",
        "name": "Manali New Town Sector 3",
        "type": "settlement",
        "category": "Urban Settlement",
        "latitude": 13.1790,
        "longitude": 80.2740,
        "district": "Chennai",
        "state": "Tamil Nadu",
        "population_est": 24500,
        "source": "Curated receptor coverage - demonstration dataset",
        "is_live_osm": False
    }
]

# Backward compatibility alias for tests
SENSITIVE_LOCATIONS = CURATED_OFFLINE_RECEPTORS


def point_in_polygon(lon: float, lat: float, polygon_coords: List[List[float]]) -> bool:
    """Ray-casting algorithm to test if (lon, lat) is inside a GeoJSON polygon ring."""
    n = len(polygon_coords)
    inside = False
    p1x, p1y = polygon_coords[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon_coords[i % n]
        if min(p1y, p2y) < lat <= max(p1y, p2y):
            if lon <= max(p1x, p2x):
                if p1y != p2y:
                    xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                if p1x == p2x or lon <= xinters:
                    inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two coordinates in kilometers."""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def fetch_osm_receptors_for_area(lat: float, lon: float, radius_km: float = 12.0) -> List[Dict[str, Any]]:
    """
    Retrieves live sensitive receptors (settlements, schools, hospitals) from OpenStreetMap
    around an event coordinate, with grid caching to prevent repeated API calls.
    """
    grid_key = f"grid_{round(lat, 1)}_{round(lon, 1)}"
    now = time.time()

    if grid_key in _OSM_RECEPTOR_CACHE:
        cached = _OSM_RECEPTOR_CACHE[grid_key]
        if now - cached["timestamp"] < CACHE_TTL_SECONDS:
            return cached["receptors"]

    radius_m = int(radius_km * 1000)
    query = f"""[out:json][timeout:3];
(
  node["place"~"village|town|suburb|hamlet"](around:{radius_m},{lat},{lon});
  node["amenity"="school"](around:{radius_m},{lat},{lon});
  node["amenity"="hospital"](around:{radius_m},{lat},{lon});
);
out center 15;"""

    receptors: List[Dict[str, Any]] = []
    mirrors = [
        "https://lz4.overpass-api.de/api/interpreter",
        "https://overpass-api.de/api/interpreter"
    ]

    for mirror in mirrors:
        try:
            resp = requests.post(
                mirror,
                data={"data": query},
                timeout=2.0,
                headers={"User-Agent": "Agnidrishti-SIH26162-Receptors/1.0"}
            )
            if resp.status_code == 200:
                data = resp.json()
                for el in data.get("elements", []):
                    tags = el.get("tags", {})
                    name = tags.get("name") or tags.get("name:en")
                    if not name:
                        continue

                    e_lat = el.get("lat") or el.get("center", {}).get("lat")
                    e_lon = el.get("lon") or el.get("center", {}).get("lon")
                    if not e_lat or not e_lon:
                        continue

                    amenity = tags.get("amenity")
                    place = tags.get("place")
                    if amenity == "school":
                        r_type = "school"
                        category = "Educational Institution"
                    elif amenity == "hospital":
                        r_type = "hospital"
                        category = "Healthcare Facility"
                    else:
                        r_type = "settlement"
                        category = f"{place.capitalize()} Settlement" if place else "Populated Settlement"

                    receptors.append({
                        "id": f"OSM-{el.get('id')}",
                        "name": name,
                        "type": r_type,
                        "category": category,
                        "latitude": float(e_lat),
                        "longitude": float(e_lon),
                        "district": tags.get("addr:district") or tags.get("is_in:district") or "Surrounding District",
                        "state": tags.get("addr:state") or "India",
                        "source": "OPENSTREETMAP_OVERPASS_LIVE",
                        "is_live_osm": True
                    })

                if receptors:
                    _OSM_RECEPTOR_CACHE[grid_key] = {
                        "receptors": receptors,
                        "timestamp": now,
                        "source": "OPENSTREETMAP_OVERPASS_LIVE"
                    }
                    return receptors
        except Exception:
            continue

    # Fallback to curated reference if within radius
    matching_curated = [
        c for c in CURATED_OFFLINE_RECEPTORS
        if haversine_km(lat, lon, c["latitude"], c["longitude"]) <= radius_km
    ]
    _OSM_RECEPTOR_CACHE[grid_key] = {
        "receptors": matching_curated,
        "timestamp": now,
        "source": "Curated receptor coverage — demonstration dataset"
    }
    return matching_curated


def evaluate_community_exposure(
    fire_lat: float,
    fire_lon: float,
    frp: float,
    anomaly_ratio: float,
    is_emergency: bool,
    category: str,
    plume_polygon_coords: List[List[float]],
    hazard_length_km: float = 10.0,
    allow_live_network: bool = False
) -> Dict[str, Any]:
    """
    Evaluates downwind community exposure risk dynamically by querying receptors
    and calculating geometric intersection with the Gaussian plume dispersion corridor.
    Uses high-speed local spatial caching to prevent blocking live map rendering.
    """
    search_radius_km = max(hazard_length_km + 3.0, 12.0)
    grid_key = f"grid_{round(fire_lat, 1)}_{round(fire_lon, 1)}"

    # Only perform live Overpass network queries on explicit demand for selected events
    if allow_live_network and (is_emergency or frp >= 50.0 or "INDUSTRIAL" in category):
        nearby_receptors = fetch_osm_receptors_for_area(fire_lat, fire_lon, radius_km=search_radius_km)
    elif grid_key in _OSM_RECEPTOR_CACHE:
        nearby_receptors = _OSM_RECEPTOR_CACHE[grid_key]["receptors"]
    else:
        nearby_receptors = [
            c for c in CURATED_OFFLINE_RECEPTORS
            if haversine_km(fire_lat, fire_lon, c["latitude"], c["longitude"]) <= search_radius_km
        ]
        _OSM_RECEPTOR_CACHE[grid_key] = {
            "receptors": nearby_receptors,
            "timestamp": time.time(),
            "source": "Curated receptor coverage — demonstration dataset"
        }

    intersecting_settlements = []
    intersecting_schools = []
    intersecting_hospitals = []

    for loc in nearby_receptors:
        dist_km = haversine_km(fire_lat, fire_lon, loc["latitude"], loc["longitude"])
        if dist_km <= search_radius_km:
            in_plume = point_in_polygon(loc["longitude"], loc["latitude"], plume_polygon_coords)
            info = {
                **loc,
                "distance_km": dist_km,
                "in_dispersion_corridor": in_plume
            }
            if in_plume:
                if loc["type"] == "settlement":
                    intersecting_settlements.append(info)
                elif loc["type"] == "school":
                    intersecting_schools.append(info)
                elif loc["type"] == "hospital":
                    intersecting_hospitals.append(info)

    intersecting_settlements.sort(key=lambda x: x["distance_km"])
    intersecting_schools.sort(key=lambda x: x["distance_km"])
    intersecting_hospitals.sort(key=lambda x: x["distance_km"])

    total_sensitive_in_corridor = len(intersecting_settlements) + len(intersecting_schools) + len(intersecting_hospitals)
    live_receptors_count = sum(1 for r in (intersecting_settlements + intersecting_schools + intersecting_hospitals) if r.get("is_live_osm"))

    reasons: List[str] = []
    if is_emergency or category == "CRITICAL_INDUSTRIAL_EMERGENCY" or frp >= 100.0:
        if total_sensitive_in_corridor >= 2:
            risk_level = "CRITICAL"
            reasons.append(f"Elevated thermal radiative anomaly ({frp:.1f} MW)")
            reasons.append(f"{anomaly_ratio:.2f}× historical operational baseline")
            reasons.append(f"Dispersion cone intersects {len(intersecting_settlements)} populated place(s)")
            if intersecting_schools:
                reasons.append(f"Educational facility exposure: {', '.join([s['name'] for s in intersecting_schools[:2]])}")
            if intersecting_hospitals:
                reasons.append(f"Healthcare facility in corridor: {', '.join([h['name'] for h in intersecting_hospitals[:2]])}")
        elif total_sensitive_in_corridor >= 1:
            risk_level = "HIGH"
            reasons.append(f"High-intensity thermal source ({frp:.1f} MW)")
            reasons.append(f"Dispersion corridor intersects {len(intersecting_settlements)} settlement(s)")
        else:
            risk_level = "MEDIUM"
            reasons.append(f"Critical thermal anomaly ({frp:.1f} MW)")
            reasons.append("Zero mapped sensitive settlements intersect the immediate downwind corridor")
    elif total_sensitive_in_corridor >= 1:
        risk_level = "MEDIUM"
        reasons.append(f"Routine operational thermal source ({frp:.1f} MW)")
        reasons.append(f"Downwind perimeter intersects {total_sensitive_in_corridor} mapped receptor(s)")
    else:
        risk_level = "LOW"
        reasons.append(f"Nominal thermal detection ({frp:.1f} MW)")
        reasons.append("No sensitive human settlements or educational facilities in downwind corridor")

    return {
        "risk_level": risk_level,
        "hazard_length_km": hazard_length_km,
        "total_sensitive_in_corridor": total_sensitive_in_corridor,
        "live_osm_receptors_count": live_receptors_count,
        "affected_settlements_count": len(intersecting_settlements),
        "affected_schools_count": len(intersecting_schools),
        "affected_hospitals_count": len(intersecting_hospitals),
        "intersecting_settlements": intersecting_settlements,
        "intersecting_schools": intersecting_schools,
        "intersecting_hospitals": intersecting_hospitals,
        "nearby_receptors_evaluated": len(nearby_receptors),
        "exposure_reasons": reasons,
        "authority_review_required": (risk_level in ["HIGH", "CRITICAL"]),
        "receptor_source": (
            "OPENSTREETMAP_OVERPASS_LIVE"
            if live_receptors_count > 0
            else ("Curated receptor coverage - demonstration dataset" if total_sensitive_in_corridor > 0 else "OPENSTREETMAP_QUERY_ZERO_CORRIDOR_MATCH")
        ),
        "recommended_action": (
            "Verify ground telemetry, notify local industrial emergency command post, and prepare community warning."
            if risk_level in ["HIGH", "CRITICAL"]
            else "Continue automated satellite monitoring and log in regulatory registry."
        )
    }


def get_sensitive_locations_geojson() -> Dict[str, Any]:
    """Returns standard GeoJSON FeatureCollection of sensitive receptors."""
    features = []
    # Collect all cached live OSM receptors plus curated items
    all_receptors = list(CURATED_OFFLINE_RECEPTORS)
    for cached in _OSM_RECEPTOR_CACHE.values():
        for r in cached.get("receptors", []):
            if r["id"] not in {x["id"] for x in all_receptors}:
                all_receptors.append(r)

    for loc in all_receptors:
        features.append({
            "type": "Feature",
            "id": loc["id"],
            "geometry": {
                "type": "Point",
                "coordinates": [loc["longitude"], loc["latitude"]]
            },
            "properties": {
                "name": loc["name"],
                "type": loc["type"],
                "category": loc["category"],
                "district": loc.get("district", "India"),
                "state": loc.get("state", "India"),
                "source": loc.get("source", "Curated receptor coverage - demonstration dataset"),
                "is_live": loc.get("is_live_osm", False),
                "metric": loc.get("population_est") or loc.get("capacity_est") or loc.get("beds_est")
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "total": len(features),
            "source": "Curated receptor coverage - demonstration dataset & OpenStreetMap Live Overpass",
            "is_curated_demonstration": True
        },
        "features": features
    }
