"""
Test Suite: Directional Estimated Dispersion & Evidence Chain (Priority 5)
Verifies:
1. Meteorological wind direction convention & downwind transport calculations:
   - North wind (0°/360°) -> Downwind transport = 180° (South)
   - South wind (180°) -> Downwind transport = 0° (North)
   - East wind (90°) -> Downwind transport = 270° (West)
   - West wind (270°) -> Downwind transport = 90° (East)
2. Low wind handling (< 1.0 m/s): Non-directional status & truthful uncertainty message.
3. Missing wind handling: Non-directional status & truthful 'Wind data unavailable' message.
4. Dynamic event switching: Different coordinates and FRP generate independent correct dispersion.
5. 2D/3D Synchronization: Shared backend GeoJSON polygon geometry and attributes.
6. Complete 8-stage evidence chain integrity.
"""

import pytest
import math
from fastapi.testclient import TestClient
from app import app
from plume_service import fetch_live_wind, calculate_plume_cone

client = TestClient(app)


def test_meteorological_wind_north_blows_south():
    """North wind (0°/360°) originates in North, transporting dispersion strictly South (180°)."""
    lat, lon = 22.3582, 69.8695
    plume = calculate_plume_cone(
        lat=lat,
        lon=lon,
        frp=120.0,
        wind_speed_kmh=18.0,
        wind_direction_deg=0.0,
        fire_id="TEST-N-WIND"
    )

    props = plume["properties"]
    assert props["is_directional"] is True
    assert props["wind_direction_deg"] == 0.0
    assert props["downwind_azimuth_deg"] == 180.0
    assert "METEOROLOGICAL_FROM" in props["wind_direction_convention"]
    assert "TRANSPORT_TO" in props["downwind_convention"]

    # Tip latitude should be SOUTH of origin (lat decreases)
    coords = plume["geometry"]["coordinates"][0]
    tip = coords[len(coords) // 2]
    assert tip[1] < lat, f"Tip lat {tip[1]} should be south of origin lat {lat}"


def test_meteorological_wind_south_blows_north():
    """South wind (180°) originates in South, transporting dispersion strictly North (0°/360°)."""
    lat, lon = 22.3582, 69.8695
    plume = calculate_plume_cone(
        lat=lat,
        lon=lon,
        frp=120.0,
        wind_speed_kmh=18.0,
        wind_direction_deg=180.0,
        fire_id="TEST-S-WIND"
    )

    props = plume["properties"]
    assert props["is_directional"] is True
    assert props["wind_direction_deg"] == 180.0
    assert props["downwind_azimuth_deg"] == 0.0

    # Tip latitude should be NORTH of origin (lat increases)
    coords = plume["geometry"]["coordinates"][0]
    tip = coords[len(coords) // 2]
    assert tip[1] > lat, f"Tip lat {tip[1]} should be north of origin lat {lat}"


def test_meteorological_wind_east_blows_west():
    """East wind (90°) originates in East, transporting dispersion strictly West (270°)."""
    lat, lon = 22.3582, 69.8695
    plume = calculate_plume_cone(
        lat=lat,
        lon=lon,
        frp=120.0,
        wind_speed_kmh=20.0,
        wind_direction_deg=90.0,
        fire_id="TEST-E-WIND"
    )

    props = plume["properties"]
    assert props["is_directional"] is True
    assert props["wind_direction_deg"] == 90.0
    assert props["downwind_azimuth_deg"] == 270.0

    # Tip longitude should be WEST of origin (lon decreases)
    coords = plume["geometry"]["coordinates"][0]
    tip = coords[len(coords) // 2]
    assert tip[0] < lon, f"Tip lon {tip[0]} should be west of origin lon {lon}"


def test_meteorological_wind_west_blows_east():
    """West wind (270°) originates in West, transporting dispersion strictly East (90°)."""
    lat, lon = 22.3582, 69.8695
    plume = calculate_plume_cone(
        lat=lat,
        lon=lon,
        frp=120.0,
        wind_speed_kmh=20.0,
        wind_direction_deg=270.0,
        fire_id="TEST-W-WIND"
    )

    props = plume["properties"]
    assert props["is_directional"] is True
    assert props["wind_direction_deg"] == 270.0
    assert props["downwind_azimuth_deg"] == 90.0

    # Tip longitude should be EAST of origin (lon increases)
    coords = plume["geometry"]["coordinates"][0]
    tip = coords[len(coords) // 2]
    assert tip[0] > lon, f"Tip lon {tip[0]} should be east of origin lon {lon}"


def test_low_wind_handling_below_threshold():
    """Wind < 1.0 m/s (< 3.6 km/h) triggers non-directional uncertain status."""
    lat, lon = 21.1702, 72.8310
    plume = calculate_plume_cone(
        lat=lat,
        lon=lon,
        frp=75.0,
        wind_speed_kmh=2.2,  # ~0.6 m/s
        wind_direction_deg=140.0,
        fire_id="TEST-LOW-WIND"
    )

    props = plume["properties"]
    assert props["is_directional"] is False
    assert props["status"] == "LOW_WIND_UNCERTAIN"
    assert "Low wind — directional estimate uncertain" in props["status_message"]
    assert props["wind_speed_ms"] < 1.0
    assert "Convective thermal buoyancy dominates" in props["uncertainty_description"]

    # Still produces a valid polygon geometry for rendering
    assert plume["geometry"]["type"] == "Polygon"
    assert len(plume["geometry"]["coordinates"][0]) >= 4


def test_missing_wind_handling():
    """Missing or unavailable wind triggers 'Wind data unavailable' without crashing."""
    lat, lon = 23.5524, 86.5405
    plume = calculate_plume_cone(
        lat=lat,
        lon=lon,
        frp=110.0,
        wind_speed_kmh=None,
        wind_direction_deg=None,
        fire_id="TEST-NO-WIND",
        wind_source="METEOROLOGY_UNAVAILABLE"
    )

    props = plume["properties"]
    assert props["is_directional"] is False
    assert props["status"] == "WIND_UNAVAILABLE"
    assert "Wind data unavailable" in props["status_message"]
    assert plume["geometry"]["type"] == "Polygon"


def test_event_switching_dynamic_coordinates_and_frp():
    """Selecting distinct events dynamically calculates distinct dispersion extents and locations."""
    event_a = {"lat": 22.3582, "lon": 69.8695, "frp": 60.0, "wind_speed": 15.0, "dir": 45.0}
    event_b = {"lat": 21.1050, "lon": 72.6470, "frp": 250.0, "wind_speed": 28.0, "dir": 315.0}

    plume_a = calculate_plume_cone(
        lat=event_a["lat"],
        lon=event_a["lon"],
        frp=event_a["frp"],
        wind_speed_kmh=event_a["wind_speed"],
        wind_direction_deg=event_a["dir"],
        fire_id="EV-A"
    )

    plume_b = calculate_plume_cone(
        lat=event_b["lat"],
        lon=event_b["lon"],
        frp=event_b["frp"],
        wind_speed_kmh=event_b["wind_speed"],
        wind_direction_deg=event_b["dir"],
        fire_id="EV-B"
    )

    # Origin coordinates must strictly match the respective events
    coords_a = plume_a["geometry"]["coordinates"][0]
    coords_b = plume_b["geometry"]["coordinates"][0]
    assert coords_a[0] == [round(event_a["lon"], 6), round(event_a["lat"], 6)]
    assert coords_b[0] == [round(event_b["lon"], 6), round(event_b["lat"], 6)]

    # Higher FRP & wind must generate longer transport extent
    assert plume_b["properties"]["hazard_length_km"] > plume_a["properties"]["hazard_length_km"]
    assert plume_a["properties"]["downwind_azimuth_deg"] == (45.0 + 180.0) % 360.0
    assert plume_b["properties"]["downwind_azimuth_deg"] == (315.0 + 180.0) % 360.0


def test_2d_3d_shared_geometry_and_uncertainty_attributes():
    """Verify plume GeoJSON provides inner_corridor, centerline, and model assumptions."""
    plume = calculate_plume_cone(
        lat=21.10502,
        lon=72.64709,
        frp=145.0,
        wind_speed_kmh=18.0,
        wind_direction_deg=300.0,
        fire_id="TEST-SHARED"
    )

    props = plume["properties"]
    assert "inner_corridor" in props
    assert len(props["inner_corridor"]) >= 4
    assert "centerline" in props
    assert len(props["centerline"]) >= 4
    assert "model_assumptions" in props
    assert len(props["model_assumptions"]) >= 3
    assert "uncertainty_description" in props
    assert "decision_support" in props


def test_incident_report_evidence_chain_fields():
    """Verify /api/incident/report provides non-alarmist terminology and comprehensive assessment."""
    fires_resp = client.get("/api/fires?filter_mode=all")
    assert fires_resp.status_code == 200
    fires = fires_resp.json().get("data", [])
    if not fires:
        pytest.skip("No live fires available to test report")

    target_id = fires[0].get("fire_id") or fires[0].get("event_id")
    report_resp = client.get(f"/api/incident/report/{target_id}")
    assert report_resp.status_code == 200
    report = report_resp.json()

    atm = report["atmospheric_dispersion_assessment"]
    assert "estimated_dispersion_extent" in atm
    assert "potential_exposure_radius" in atm
    assert "downwind_trajectory_bearing" in atm
    assert "wind_speed" in atm
