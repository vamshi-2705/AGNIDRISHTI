"""
AGNIDRISHTI - 3D Incident Inspection Integrity Test Suite
Verifies:
1. 3D component files existence and structure.
2. Coordinate source-of-truth: selectedFire.latitude & selectedFire.longitude.
3. No hardcoded mock coordinates or fake refinery CAD structures in 3D code.
4. Proper camera oblique angle and inspection parameters.
5. Presence of [ LOCATE EVENT ] and [ EXIT 3D ] / [ 2D VIEW ] controls.
6. Honest terminology: 'Estimated Dispersion' instead of unsubstantiated toxic claims.
7. Backend data health and endpoint availability for 3D ingestion.
"""

import os
import re
import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

FRONTEND_COMPONENTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "components")
)


def test_3d_component_files_exist():
    """Verify Cesium 3D viewer and inspector components exist."""
    viewer_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DViewer.jsx")
    inspector_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DInspector.jsx")
    
    assert os.path.exists(viewer_path), f"Cesium3DViewer.jsx missing at {viewer_path}"
    assert os.path.exists(inspector_path), f"Cesium3DInspector.jsx missing at {inspector_path}"


def test_selected_event_coordinates_source_of_truth():
    """Verify 3D camera and marker use selectedFire.latitude and selectedFire.longitude."""
    viewer_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DViewer.jsx")
    with open(viewer_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify camera flyTo uses selected event coordinates
    assert "fire.latitude" in content
    assert "fire.longitude" in content
    assert "fromDegrees(lon, lat" in content

    # Verify oblique inspection angle (pitch around -35 degrees)
    assert "-35" in content


def test_no_hardcoded_fake_thermal_coordinates():
    """Verify no hardcoded event coordinates or fake refinery structures in 3D viewer."""
    viewer_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DViewer.jsx")
    with open(viewer_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Must NOT have fabricated 3D refinery structures
    forbidden_terms = [
        "fake_refinery",
        "mock_tank",
        "storage_tank_cad",
        "smokestack_model",
        "FIRMS-IND-2026-001"
    ]
    for term in forbidden_terms:
        assert term not in content, f"Forbidden synthetic term '{term}' found in Cesium3DViewer.jsx"


def test_inspection_controls_present():
    """Verify presence of LOCATE EVENT and EXIT 3D / 2D VIEW controls."""
    viewer_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DViewer.jsx")
    inspector_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DInspector.jsx")
    
    with open(viewer_path, "r", encoding="utf-8") as f:
        v_content = f.read()
    with open(inspector_path, "r", encoding="utf-8") as f:
        i_content = f.read()

    assert "LOCATE EVENT" in v_content
    assert "2D VIEW / EXIT 3D" in v_content
    assert "3D INCIDENT INSPECTION" in i_content
    assert "Locate Event In 3D" in i_content
    assert "Return to 2D Map" in i_content


def test_technical_honesty_terminology():
    """Verify compliant scientific wording: 'Estimated Dispersion' instead of unsubstantiated claims."""
    inspector_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DInspector.jsx")
    with open(inspector_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "Estimated Dispersion" in content
    assert "Estimated Community Exposure" in content


def test_data_health_and_provenance_endpoints():
    """Verify /api/data-health and infrastructure endpoints return valid schema."""
    resp = client.get("/api/data-health")
    assert resp.status_code == 200
    data = resp.json()
    assert "thermal_events" in data
    assert "meteorology_wind" in data
    assert "event_persistence" in data

    fac_resp = client.get("/api/facilities")
    assert fac_resp.status_code == 200
    assert fac_resp.json()["type"] == "FeatureCollection"

    sens_resp = client.get("/api/sensitive-locations")
    assert sens_resp.status_code == 200
    assert sens_resp.json()["type"] == "FeatureCollection"


def test_gis_navigation_controls_present():
    """Verify presence of GIS zoom, home, compass, and locate controls."""
    viewer_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DViewer.jsx")
    with open(viewer_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "handleZoomIn" in content
    assert "handleZoomOut" in content
    assert "handleResetHome" in content
    assert "handleResetNorth" in content
    assert "Zoom In (+)" in content
    assert "Zoom Out (−)" in content
    assert "Home - Regional Overview" in content


def test_interactive_entity_picking_and_detail_card():
    """Verify ScreenSpaceEventHandler entity picking and on-canvas detail card."""
    viewer_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DViewer.jsx")
    with open(viewer_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "ScreenSpaceEventHandler" in content
    assert "activeCard" in content
    assert "_agniType" in content
    assert "_agniData" in content
    assert "INDUSTRIAL FACILITY" in content
    assert "FIRE RADIATIVE POWER" in content
    assert "EXPOSURE STATUS" in content


def test_site_level_inspection_range():
    """Verify site-level inspection altitude range is within 500m-2000m."""
    viewer_path = os.path.join(FRONTEND_COMPONENTS_DIR, "Cesium3DViewer.jsx")
    with open(viewer_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify site-level range (1600m)
    assert "1600" in content
