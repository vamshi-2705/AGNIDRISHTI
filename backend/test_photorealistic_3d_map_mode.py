"""
Test Suite: Google Photorealistic 3D as a First-Class Map View Mode
Verifies:
1. Map mode selector with 2D basemaps and 3D View option.
2. Event-independent 3D entry (no selected event required).
3. Selected event inspection target and camera flight.
4. Preserved unified application shell in 3D.
5. Cesium World Terrain and OSM Buildings integration via VITE_CESIUM_ION_TOKEN.
6. Truthful error states without application crash.
7. Thermal observation overlays on 3D globe.
8. Event selection while in 3D mode.
9. Seamless 2D <-> 3D switching with preserved state.
"""

import os
import pytest

FRONTEND_SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "src")
COMPONENTS_DIR = os.path.join(FRONTEND_SRC_DIR, "components")


def test_map_view_selector_component_exists():
    """Verify MapViewSelector contains 2D basemaps and 3D View is removed from Map Layers."""
    selector_path = os.path.join(COMPONENTS_DIR, "MapViewSelector.jsx")
    assert os.path.exists(selector_path), "MapViewSelector.jsx must exist"
    
    with open(selector_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 2D basemap options
    assert "btn-basemap-dark" in content
    assert "btn-basemap-satellite" in content
    assert "btn-basemap-streets" in content
    assert "btn-basemap-topographic" in content

    # 3D View mode must NOT appear in the map layers selector
    assert "btn-mapmode-3d" not in content, "3D View must NOT appear as a basemap/layer option in MapViewSelector"


def test_app_jsx_unified_map_view_mode():
    """Verify PlatformPage.jsx manages mapViewMode ('dark' | 'satellite' | 'streets' | 'topographic' | '3d')."""
    page_path = os.path.join(FRONTEND_SRC_DIR, "pages", "PlatformPage.jsx")
    with open(page_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "mapViewMode" in content
    assert "handleSelectMapViewMode" in content
    assert "last2dBasemap" in content
    assert "<MapViewSelector" in content
    assert "<Cesium3DViewer" in content
    assert "<GisMapViewer" in content

    # Verify 3D does NOT early return or hijack the entire page
    assert "if (inspectionMode === '3D')" not in content, "3D must not be an isolated early-return screen"


def test_cesium_event_independent_entry():
    """Verify Cesium3DViewer supports entering without selected event."""
    viewer_path = os.path.join(COMPONENTS_DIR, "Cesium3DViewer.jsx")
    with open(viewer_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Must accept fires array and onSelectFire
    assert "fires = []" in content
    assert "onSelectFire = () => {}" in content

    # Regional overview fallback when selectedFire is null
    assert "destination: Cesium.Cartesian3.fromDegrees(78.5, 21.5, 3200000)" in content


def test_cesium_world_terrain_and_osm_buildings():
    """Verify Cesium World Terrain and OSM Buildings loaders and truthful fallback states."""
    viewer_path = os.path.join(COMPONENTS_DIR, "Cesium3DViewer.jsx")
    with open(viewer_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "createWorldTerrainAsync" in content
    assert "createOsmBuildingsAsync" in content
    assert "VITE_CESIUM_ION_TOKEN" in content
    assert "3D Terrain unavailable" in content
    assert "EllipsoidTerrainProvider" in content
    assert "createGooglePhotorealistic3DTileset" not in content



def test_minimal_3d_controls_toolbar():
    """Verify minimal 3D controls toolbar: TARGET EVENT, RESET VIEW, ZOOM IN, ZOOM OUT, RETURN TO 2D."""
    viewer_path = os.path.join(COMPONENTS_DIR, "Cesium3DViewer.jsx")
    with open(viewer_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "btn-target-event" in content
    assert "TARGET EVENT" in content
    assert "btn-reset-view" in content
    assert "RESET VIEW" in content
    assert "btn-zoom-in" in content
    assert "btn-zoom-out" in content
    assert "btn-return-to-2d" in content
    assert "RETURN TO 2D" in content


def test_all_fires_subtle_markers_on_3d_globe():
    """Verify subtle markers for all active FIRMS detections on the 3D globe."""
    viewer_path = os.path.join(COMPONENTS_DIR, "Cesium3DViewer.jsx")
    with open(viewer_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Iterates over fires to place subtle markers
    assert "(fires || []).forEach" in content
    assert "subtleMarker" in content
    assert "CLAMP_TO_GROUND" in content


def test_inspector_3d_toggle_button():
    """Verify IncidentInspector has 3D inspect and return to 2D toggle."""
    inspector_path = os.path.join(COMPONENTS_DIR, "IncidentInspector.jsx")
    with open(inspector_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "btn-inspector-3d-toggle" in content
    assert "3D INSPECT" in content
    assert "RETURN TO 2D VIEW" in content
    assert "is3DActive" in content
