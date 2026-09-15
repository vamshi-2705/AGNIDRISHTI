import pytest
from event_store import persist_and_rebuild_events

def test_spatial_deduplication_and_history():
    # 2 observations within 300 meters (~0.0025 deg)
    raw_obs = [
        {
            "latitude": 22.3580,
            "longitude": 69.8690,
            "frp": 50.0,
            "brightness": 340.0,
            "acq_date": "2026-09-08",
            "acq_time": "0810",
            "satellite": "SNPP",
            "fire_id": "TEST-1"
        },
        {
            "latitude": 22.3585,
            "longitude": 69.8695,
            "frp": 120.0,
            "brightness": 370.0,
            "acq_date": "2026-09-08",
            "acq_time": "0835",
            "satellite": "NOAA20",
            "fire_id": "TEST-2"
        },
        # 1 observation far away
        {
            "latitude": 13.1800,
            "longitude": 80.2700,
            "frp": 30.0,
            "brightness": 320.0,
            "acq_date": "2026-09-08",
            "acq_time": "0815",
            "satellite": "SNPP",
            "fire_id": "TEST-3"
        }
    ]

    deduped = persist_and_rebuild_events(raw_obs, "08:40:00 UTC")
    assert len(deduped) == 2  # First two clustered together, third separate

    clustered = next(e for e in deduped if e["latitude"] == 22.3585)
    assert clustered["observation_count"] == 2
    assert "SNPP" in clustered["satellites_display"] and "NOAA-20" in clustered["satellites_display"]
    assert clustered["trend"] == "↑ RAPIDLY INCREASING"
    assert clustered["trend_direction"] == "up"
    assert clustered["duration_min"] == 25
    assert len(clustered["history"]) == 2
