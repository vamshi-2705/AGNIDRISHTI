import pytest
from plume_service import fetch_live_wind, calculate_plume_cone

def test_missing_wind_fallback(monkeypatch):
    # Simulate network exception in fetch_live_wind
    def mock_get(*args, **kwargs):
        raise ConnectionError("Network unreachable")

    import requests
    monkeypatch.setattr(requests, "get", mock_get)

    wind = fetch_live_wind(22.3582, 69.8695)
    assert wind["source"] == "METEOROLOGY_UNAVAILABLE"
    assert wind["is_live"] is False

    plume = calculate_plume_cone(
        lat=22.3582,
        lon=69.8695,
        frp=150.0,
        wind_speed_kmh=wind["wind_speed_kmh"],
        wind_direction_deg=wind["wind_direction_deg"]
    )
    assert plume["type"] == "Feature"
    assert plume["geometry"]["type"] == "Polygon"
