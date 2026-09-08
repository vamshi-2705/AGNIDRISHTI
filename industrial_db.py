"""
ASTRAFIRE - OpenStreetMap (OSM) Indian Industrial Infrastructure Database
Source: OpenStreetMap Overpass API (https://overpass-turbo.eu)
Tags: industrial=oil_refinery, landuse=industrial, power=plant, man_made=storage_tank

This module stores geographic boundaries, operational thermal baselines,
hazard radii, and emergency response metadata for critical Indian industrial complexes.
"""

from typing import List, Dict, Any, Optional

INDUSTRIAL_FACILITIES: List[Dict[str, Any]] = [
    {
        "facility_id": "IND-FAC-001",
        "name": "Reliance Jamnagar Refining & Petrochemical Complex",
        "category": "Petrochemical & Crude Refining",
        "state": "Gujarat",
        "district": "Jamnagar",
        "baseline_frp_mw": 45.0,        # Nominal operational flare output
        "max_normal_frp_mw": 80.0,      # Upper threshold before declaring major emergency
        "critical_chemicals": ["Crude Hydrocarbons", "Benzene", "Toluene", "Hydrogen Sulfide", "Naphtha"],
        "hazard_radius_km": 5.0,
        "emergency_contact": {
            "ndrf_battalion": "6th Bn NDRF (Vadodara)",
            "control_room": "+91-265-2830491",
            "state_emergency_center": "1070"
        },
        "bbox": [22.3300, 69.8400, 22.3850, 69.9100],  # [min_lat, min_lon, max_lat, max_lon]
        "polygon": [
            [69.8400, 22.3300],
            [69.9100, 22.3300],
            [69.9100, 22.3850],
            [69.8400, 22.3850],
            [69.8400, 22.3300]
        ]
    },
    {
        "facility_id": "IND-FAC-002",
        "name": "Hazira Petrochemical & Gas Processing Zone (ONGC / RIL)",
        "category": "Natural Gas & Polymer Manufacturing",
        "state": "Gujarat",
        "district": "Surat",
        "baseline_frp_mw": 40.0,
        "max_normal_frp_mw": 75.0,
        "critical_chemicals": ["Methane", "LPG", "Propylene", "Ethylene Glycol", "Sulfur Dioxide"],
        "hazard_radius_km": 4.5,
        "emergency_contact": {
            "ndrf_battalion": "6th Bn NDRF (Vadodara)",
            "control_room": "+91-261-2860100",
            "state_emergency_center": "1070"
        },
        "bbox": [21.0900, 72.6200, 21.1350, 72.6750],
        "polygon": [
            [72.6200, 21.0900],
            [72.6750, 21.0900],
            [72.6750, 21.1350],
            [72.6200, 21.1350],
            [72.6200, 21.0900]
        ]
    },
    {
        "facility_id": "IND-FAC-003",
        "name": "Manali Petrochemical & Fertilizer Industrial Corridor",
        "category": "Petrochemicals & Bulk Chemical Storage",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "baseline_frp_mw": 30.0,
        "max_normal_frp_mw": 60.0,
        "critical_chemicals": ["Propylene Oxide", "Propylene Glycol", "Ammonia", "Chlorine"],
        "hazard_radius_km": 4.0,
        "emergency_contact": {
            "ndrf_battalion": "4th Bn NDRF (Arakkonam)",
            "control_room": "+91-44-25941200",
            "state_emergency_center": "1070"
        },
        "bbox": [13.1500, 80.2400, 13.1900, 80.2850],
        "polygon": [
            [80.2400, 13.1500],
            [80.2850, 13.1500],
            [80.2850, 13.1900],
            [80.2400, 13.1900],
            [80.2400, 13.1500]
        ]
    },
    {
        "facility_id": "IND-FAC-004",
        "name": "Visakhapatnam Industrial SEZ & HPCL Refinery",
        "category": "Coastal Refinery & Hydrocarbon Storage",
        "state": "Andhra Pradesh",
        "district": "Visakhapatnam",
        "baseline_frp_mw": 45.0,
        "max_normal_frp_mw": 80.0,
        "critical_chemicals": ["Gasoline", "Aviation Turbine Fuel", "Diesel", "Benzene"],
        "hazard_radius_km": 4.5,
        "emergency_contact": {
            "ndrf_battalion": "10th Bn NDRF (Guntur)",
            "control_room": "+91-891-2578500",
            "state_emergency_center": "1070"
        },
        "bbox": [17.6700, 83.2300, 17.7150, 83.2750],
        "polygon": [
            [83.2300, 17.6700],
            [83.2750, 17.6700],
            [83.2750, 17.7150],
            [83.2300, 17.7150],
            [83.2300, 17.6700]
        ]
    },
    {
        "facility_id": "IND-FAC-005",
        "name": "IOCL Paradeep Integrated Refinery Complex",
        "category": "Heavy Crude Refining & Polypropylene",
        "state": "Odisha",
        "district": "Jagatsinghpur",
        "baseline_frp_mw": 50.0,
        "max_normal_frp_mw": 90.0,
        "critical_chemicals": ["High-Sulfur Crude", "Polypropylene", "Monoethylene Glycol"],
        "hazard_radius_km": 5.0,
        "emergency_contact": {
            "ndrf_battalion": "3rd Bn NDRF (Mundali)",
            "control_room": "+91-6722-252000",
            "state_emergency_center": "1070"
        },
        "bbox": [20.2600, 86.6200, 20.3100, 86.6700],
        "polygon": [
            [86.6200, 20.2600],
            [86.6700, 20.2600],
            [86.6700, 20.3100],
            [86.6200, 20.3100],
            [86.6200, 20.2600]
        ]
    },
    {
        "facility_id": "IND-FAC-006",
        "name": "Panipat IOCL Refinery & Naphtha Cracker Complex",
        "category": "Petrochemical Cracker & Synthetic Rubber",
        "state": "Haryana",
        "district": "Panipat",
        "baseline_frp_mw": 48.0,
        "max_normal_frp_mw": 85.0,
        "critical_chemicals": ["Naphtha", "Polybutadiene Rubber", "Butadiene", "Styrene"],
        "hazard_radius_km": 4.5,
        "emergency_contact": {
            "ndrf_battalion": "8th Bn NDRF (Ghaziabad)",
            "control_room": "+91-180-2572000",
            "state_emergency_center": "1070"
        },
        "bbox": [29.4450, 76.9000, 29.4900, 76.9500],
        "polygon": [
            [76.9000, 29.4450],
            [76.9500, 29.4450],
            [76.9500, 29.4900],
            [76.9000, 29.4900],
            [76.9000, 29.4450]
        ]
    },
    {
        "facility_id": "IND-FAC-007",
        "name": "Jharia Opencast Coalfield Mining Complex (BCCL)",
        "category": "Subterranean Coal Mining & Methane Venting",
        "state": "Jharkhand",
        "district": "Dhanbad",
        "baseline_frp_mw": 60.0,
        "max_normal_frp_mw": 110.0,
        "critical_chemicals": ["Carbon Monoxide", "Coal Dust", "Sulfur Dioxide", "Methane"],
        "hazard_radius_km": 3.5,
        "emergency_contact": {
            "ndrf_battalion": "2nd Bn NDRF (Haringhata)",
            "control_room": "+91-326-2230050",
            "state_emergency_center": "1070"
        },
        "bbox": [23.7200, 86.3800, 23.7750, 86.4500],
        "polygon": [
            [86.3800, 23.7200],
            [86.4500, 23.7200],
            [86.4500, 23.7750],
            [86.3800, 23.7750],
            [86.3800, 23.7200]
        ]
    }
]


def point_in_polygon(lat: float, lon: float, polygon_coords: List[List[float]]) -> bool:
    """
    Ray-casting algorithm to determine if a point (lat, lon) is inside a polygon.
    Polygon coordinates format: [[lon, lat], [lon, lat], ...]
    """
    inside = False
    n = len(polygon_coords)
    if n < 3:
        return False

    p1x, p1y = polygon_coords[0]
    for i in range(n + 1):
        p2x, p2y = polygon_coords[i % n]
        if min(p1y, p2y) < lat <= max(p1y, p2y):
            if lon <= max(p1x, p2x):
                if p1y != p2y:
                    xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                if p1x == p2x or lon <= xinters:
                    inside = not inside
        p1x, p1y = p2x, p2y

    return inside


def find_facility_for_point(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Checks if a thermal point (lat, lon) lies within any registered OSM industrial facility.
    First tests bounding box for speed, then executes ray-casting polygon containment.
    """
    for facility in INDUSTRIAL_FACILITIES:
        min_lat, min_lon, max_lat, max_lon = facility["bbox"]
        # Fast bounding box screening
        if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
            # Exact polygon verification
            if point_in_polygon(lat, lon, facility["polygon"]):
                return facility
    return None


def get_facilities_geojson() -> Dict[str, Any]:
    """
    Generates a standard GeoJSON FeatureCollection of all Indian industrial facility boundaries.
    Ready for zero-overhead overlay onto Leaflet or Mapbox GL map viewports.
    """
    features = []
    for fac in INDUSTRIAL_FACILITIES:
        features.append({
            "type": "Feature",
            "id": fac["facility_id"],
            "properties": {
                "facility_id": fac["facility_id"],
                "name": fac["name"],
                "category": fac["category"],
                "state": fac["state"],
                "district": fac["district"],
                "baseline_frp_mw": fac["baseline_frp_mw"],
                "max_normal_frp_mw": fac["max_normal_frp_mw"],
                "critical_chemicals": fac["critical_chemicals"],
                "hazard_radius_km": fac["hazard_radius_km"],
                "emergency_contact": fac["emergency_contact"]
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [fac["polygon"]]
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "total_facilities": len(features),
            "source": "OpenStreetMap Indian Industrial Infrastructure",
            "crs": "EPSG:4326"
        },
        "features": features
    }
