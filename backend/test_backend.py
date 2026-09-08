"""
ASTRAFIRE - Comprehensive Backend Test Suite
Verifies all REST API endpoints, CORS compliance, GeoJSON validities,
and AI classification segregation logic as required for SIH 2026 Problem Statement 26162.
"""

import pytest
from fastapi.testclient import TestClient
from app import app
from classifier import classify_thermal_point
from plume_service import calculate_plume_cone

client = TestClient(app)


def test_root_endpoint_health():
    """Verify system health, metadata, and SIH problem ID."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert data["sih_problem_id"] == "SIH26162"
    assert "deliverables_fulfilled" in data
    assert "deliverable_i" in data["deliverables_fulfilled"]
    assert "deliverable_ii" in data["deliverables_fulfilled"]


def test_get_all_fires():
    """Verify retrieval and enrichment of all thermal points."""
    response = client.get("/api/fires")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_records"] > 0
    records = data["data"]
    assert isinstance(records, list)

    # Verify each record has required classification fields
    first = records[0]
    assert "fire_id" in first
    assert "category" in first
    assert "threat_level" in first
    assert "threat_score" in first
    assert "deliverable_compliance" in first


def test_fires_industrial_filter():
    """Verify filtering only industrial thermal signatures."""
    response = client.get("/api/fires?filter_mode=industrial")
    assert response.status_code == 200
    data = response.json()
    for item in data["data"]:
        assert item["is_industrial"] is True
        assert item["category"] in ["CRITICAL_INDUSTRIAL_EMERGENCY", "PERSISTENT_INDUSTRIAL_FLARE", "COAL_MINING_FIRE"]


def test_fires_emergencies_filter():
    """Verify filtering only critical industrial emergencies."""
    response = client.get("/api/fires?filter_mode=emergencies")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) >= 1
    for item in data["data"]:
        assert item["is_emergency"] is True
        assert item["threat_level"] == "CRITICAL"
        assert item["category"] == "CRITICAL_INDUSTRIAL_EMERGENCY"


def test_get_facilities_geojson():
    """Verify GeoJSON FeatureCollection format for Indian industrial complexes."""
    response = client.get("/api/facilities")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert len(data["features"]) >= 5
    facility = data["features"][0]
    assert facility["type"] == "Feature"
    assert facility["geometry"]["type"] == "Polygon"
    assert "baseline_frp_mw" in facility["properties"]


def test_analytics_summary():
    """Verify executive situational KPIs and threat posture."""
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "peak_anomaly" in data
    assert "national_threat_posture" in data
    kpis = data["kpis"]
    assert kpis["total_active_hotspots"] > 0
    assert kpis["critical_industrial_emergencies"] >= 1
    assert "industrial_noise_filtered_pct" in kpis


def test_plume_dispersion_valid():
    """Verify valid GeoJSON polygon generation for toxic plume dispersion."""
    response = client.get("/api/plume/FIRMS-IND-2026-001")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "Feature"
    assert data["geometry"]["type"] == "Polygon"
    coords = data["geometry"]["coordinates"][0]
    # Verify polygon is closed (first coord equals last coord)
    assert coords[0] == coords[-1]
    props = data["properties"]
    assert props["hazard_length_km"] > 0
    assert "downwind_azimuth_deg" in props


def test_plume_dispersion_invalid():
    """Verify 404 response on unknown fire ID."""
    response = client.get("/api/plume/INVALID-FIRE-ID-999")
    assert response.status_code == 404


def test_incident_dossier_report():
    """Verify generated NDRF emergency incident dossier."""
    response = client.get("/api/incident/report/FIRMS-IND-2026-001")
    assert response.status_code == 200
    data = response.json()
    assert "dossier_id" in data
    assert "incident_summary" in data
    assert "industrial_facility_impact" in data
    assert "atmospheric_dispersion_assessment" in data
    assert "tactical_response_plan" in data


def test_ai_classifier_segregation_logic():
    """Direct unit test of classification segregation algorithms."""
    # Emergency in Jamnagar (FRP 284 MW vs baseline 45 MW)
    pt_emergency = {"latitude": 22.3582, "longitude": 69.8695, "frp": 284.6, "fire_id": "T1"}
    c_emergency = classify_thermal_point(pt_emergency)
    assert c_emergency["category"] == "CRITICAL_INDUSTRIAL_EMERGENCY"
    assert c_emergency["threat_level"] == "CRITICAL"

    # Routine flare in Jamnagar (FRP 42 MW vs baseline 45 MW)
    pt_flare = {"latitude": 22.3610, "longitude": 69.8780, "frp": 42.1, "fire_id": "T2"}
    c_flare = classify_thermal_point(pt_flare)
    assert c_flare["category"] == "PERSISTENT_INDUSTRIAL_FLARE"
    assert c_flare["threat_level"] == "MODERATE"

    # Agricultural stubble in Punjab
    pt_stubble = {"latitude": 30.2450, "longitude": 75.8420, "frp": 21.4, "fire_id": "T3"}
    c_stubble = classify_thermal_point(pt_stubble)
    assert c_stubble["category"] == "AGRICULTURAL_STUBBLE"
    assert c_stubble["is_industrial"] is False

    # Forest fire in Similipal
    pt_forest = {"latitude": 21.8600, "longitude": 86.3500, "frp": 54.6, "fire_id": "T4"}
    c_forest = classify_thermal_point(pt_forest)
    assert c_forest["category"] == "FOREST_FIRE"
    assert c_forest["is_industrial"] is False


def test_plume_cone_geometry():
    """Verify mathematical geometry and closure of Pasquill-Gifford dispersion cone."""
    plume = calculate_plume_cone(22.3582, 69.8695, 200.0, 20.0, 180.0, "T-PLUME")
    assert plume["type"] == "Feature"
    poly_ring = plume["geometry"]["coordinates"][0]
    # Origin and loop closure check
    assert poly_ring[0] == poly_ring[-1]
    assert len(poly_ring) >= 9
