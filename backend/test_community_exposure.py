import pytest
from community_exposure import (
    point_in_polygon,
    haversine_km,
    evaluate_community_exposure,
    get_sensitive_locations_geojson,
    SENSITIVE_LOCATIONS
)
from plume_service import calculate_plume_cone
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_point_in_polygon():
    square = [[0.0, 0.0], [10.0, 0.0], [10.0, 10.0], [0.0, 10.0], [0.0, 0.0]]
    assert point_in_polygon(5.0, 5.0, square) is True
    assert point_in_polygon(15.0, 5.0, square) is False

def test_haversine_km():
    dist = haversine_km(22.3582, 69.8695, 22.3780, 69.8920)
    assert 2.0 < dist < 5.0

def test_community_exposure_evaluation():
    # Jamnagar Emergency with northward wind (blows towards north/northeast where Khavdi is)
    plume = calculate_plume_cone(
        lat=22.3582,
        lon=69.8695,
        frp=284.6,
        wind_speed_kmh=20.0,
        wind_direction_deg=210.0,  # blowing toward ~30 deg NE
        fire_id="TEST-JAM",
        category="CRITICAL_INDUSTRIAL_EMERGENCY"
    )
    coords = plume["geometry"]["coordinates"][0]
    hazard_length_km = plume["properties"]["hazard_length_km"]

    exposure = evaluate_community_exposure(
        fire_lat=22.3582,
        fire_lon=69.8695,
        frp=284.6,
        anomaly_ratio=6.32,
        is_emergency=True,
        category="CRITICAL_INDUSTRIAL_EMERGENCY",
        plume_polygon_coords=coords,
        hazard_length_km=hazard_length_km
    )

    assert exposure["risk_level"] in ["HIGH", "CRITICAL"]
    assert exposure["authority_review_required"] is True
    assert len(exposure["exposure_reasons"]) > 0
    assert "recommended_action" in exposure

def test_sensitive_locations_geojson_endpoint():
    resp = client.get("/api/sensitive-locations")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) >= 5
    first = data["features"][0]
    assert first["geometry"]["type"] == "Point"
    assert "name" in first["properties"]
    assert "category" in first["properties"]
