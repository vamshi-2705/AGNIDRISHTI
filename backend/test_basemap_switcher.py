import os
import re
import pytest

def test_basemap_providers_defined():
    jsx_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "components", "GisMapViewer.jsx"))
    assert os.path.exists(jsx_path), "GisMapViewer.jsx does not exist"
    
    with open(jsx_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify storage key
    assert "BASE_MAP_STORAGE_KEY = 'agnidrishti.mapBaseLayer'" in content
    
    # Verify providers
    for provider in ["dark", "satellite", "streets", "topographic", "light"]:
        assert f"id: '{provider}'" in content, f"Provider '{provider}' missing from GisMapViewer"

    # Verify Esri Canvas muted charcoal dark base and reference layers
    assert "World_Dark_Gray_Base/MapServer" in content
    assert "World_Dark_Gray_Reference/MapServer" in content

    # Verify Esri Canvas soft light gray base and reference layers
    assert "World_Light_Gray_Base/MapServer" in content
    assert "World_Light_Gray_Reference/MapServer" in content

    # Verify Satellite, Streets, and Topographic sources
    assert "World_Imagery/MapServer" in content
    assert "World_Street_Map/MapServer" in content
    assert "World_Topo_Map/MapServer" in content
    assert "Esri" in content

    # Verify optional VITE_MAP_API_KEY environment lookup with no-key default
    assert "VITE_MAP_API_KEY" in content

def test_basemap_ui_and_persistence_integration():
    jsx_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "components", "GisMapViewer.jsx"))
    with open(jsx_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify localStorage reading and writing
    assert "localStorage.getItem(BASE_MAP_STORAGE_KEY)" in content
    assert "localStorage.setItem(BASE_MAP_STORAGE_KEY, key)" in content

    # Verify tile loading indicator
    assert "LOADING MAP TILES..." in content
    assert "setIsTileLoading(true)" in content
    assert "setIsTileLoading(false)" in content

    # Verify analysis overlays controls
    assert "showThermalEvents" in content
    assert "showFacilities" in content
    assert "showPlume" in content
    assert "showExposure" in content
    assert "showOsmContext" in content

    # Verify labels in Layer Control
    assert "Thermal Events" in content
    assert "Industrial Facilities" in content
    assert "Estimated Dispersion" in content
    assert "Community Exposure" in content
    assert "OSM Context" in content
    assert "Base Map" in content
    assert "Analysis Overlays" in content

def test_basemap_pane_hierarchy_and_zero_flicker():
    jsx_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "components", "GisMapViewer.jsx"))
    with open(jsx_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify Leaflet Pane elements with strict z-indices (Section 10)
    assert 'name="tile-base-pane"' in content
    assert 'name="tile-reference-pane"' in content
    assert 'name="facilities-pane"' in content
    assert 'name="dispersion-pane"' in content
    assert 'name="exposure-pane"' in content
    assert 'name="thermal-events-pane"' in content
    assert 'name="selected-event-pane"' in content

    # Verify pane assignment on elements
    assert 'pane="facilities-pane"' in content
    assert 'pane="dispersion-pane"' in content
    assert 'pane="exposure-pane"' in content
    assert 'pane={isSelected ? "selected-event-pane" : "thermal-events-pane"}' in content

    # Verify BaseMapLayersManager component exists
    assert "BaseMapLayersManager" in content
    assert "prevProvider" in content

    # Verify Mobile trigger button and click-outside handler
    assert "handleClickOutside" in content
    assert "sm:hidden" in content
    assert "Open Map Layers" in content
