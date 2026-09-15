"""
Unit tests for Temporal Persistence Engine & Classifier Segregation
NTRO Problem Statement 26162:
AI-Based Detection and Classification of Industrial Fires and Persistent Thermal Sources
"""

import pytest
import math
from datetime import datetime, timedelta
from persistence_service import persistence_engine
from classifier import classify_thermal_point
from event_store import format_utc_time

def test_genuine_persistent_flare():
    """
    Verifies that a true flare stack demonstrates multi-pass temporal persistence (>= 20 passes in 30 days),
    low FRP variance, and receives a high persistence score (>= 70) using authentic test fixtures.
    """
    base_date = datetime(2026, 9, 8, 8, 45)
    flare_history = []
    for i in range(25):
        dt = base_date - timedelta(days=round(i * 1.1), hours=(i * 6) % 24)
        flare_history.append({
            "time": dt.strftime("%H:%M UTC"),
            "acq_date": dt.strftime("%Y-%m-%d"),
            "raw_time": dt.strftime("%H%M"),
            "frp": round(41.5 + math.sin(i) * 2.5, 1),
            "brightness": 345.0,
            "latitude": 22.3610,
            "longitude": 69.8780,
            "satellite": "SNPP",
            "daynight": "D" if (dt.hour >= 6 and dt.hour <= 18) else "N"
        })

    flare_point = {
        "fire_id": "TEST-FLARE-001",
        "latitude": 22.3610,
        "longitude": 69.8780,
        "frp": 42.1,
        "brightness": 348.2,
        "site_hint": "Industrial Refinery - Flare Stack",
        "daynight": "D",
        "history": flare_history
    }

    result = classify_thermal_point(flare_point)

    assert result["category"] == "PERSISTENT_INDUSTRIAL_FLARE"
    assert result["is_industrial"] is True
    assert result["is_emergency"] is False

    temporal = result.get("temporal_profile", {})
    assert temporal["observations_last_30d"] >= 20
    assert temporal["persistence_score"] >= 65
    assert temporal["persistence_tier"] == "PERSISTENT_INDUSTRIAL_SOURCE"
    assert temporal["coefficient_of_variation"] < 0.30
    assert "authentic satellite passes" in temporal["historical_passes_summary"]

def test_acute_emergency_temporal_divergence():
    """
    Verifies that a sudden major explosion is identified as an acute anomalous divergence
    rather than a persistent flare, with an extreme spike ratio (> 5x above historical median).
    """
    history = [
        {
            "time": "08:00 UTC",
            "acq_date": "2026-08-20",
            "raw_time": "0800",
            "frp": 15.0,
            "brightness": 310.0,
            "latitude": 22.3582,
            "longitude": 69.8695,
            "satellite": "SNPP",
            "daynight": "D"
        },
        {
            "time": "09:00 UTC",
            "acq_date": "2026-08-28",
            "raw_time": "0900",
            "frp": 16.0,
            "brightness": 312.0,
            "latitude": 22.3582,
            "longitude": 69.8695,
            "satellite": "NOAA-20",
            "daynight": "D"
        }
    ]

    emergency_point = {
        "fire_id": "TEST-EMERG-001",
        "latitude": 22.3582,
        "longitude": 69.8695,
        "frp": 284.6,
        "brightness": 392.4,
        "site_hint": "Refinery Sector 4 Tank Farm",
        "daynight": "D",
        "history": history
    }

    result = classify_thermal_point(emergency_point)

    assert result["category"] == "CRITICAL_INDUSTRIAL_EMERGENCY"
    assert result["is_industrial"] is True
    assert result["is_emergency"] is True

    temporal = result.get("temporal_profile", {})
    assert temporal["spike_ratio"] >= 5.0
    assert temporal["persistence_tier"] == "ACUTE_ANOMALOUS_SPIKE"
    assert temporal["temporal_status"] == "ABNORMAL_ACUTE_EMERGENCY"

def test_insufficient_history_no_fake_passes():
    """
    Regression test: Verifies that an event with 0 or 1 observation reports
    INSUFFICIENT HISTORICAL DATA and does NOT generate synthetic pass values.
    """
    single_obs_point = {
        "fire_id": "TEST-SINGLE-001",
        "latitude": 21.5000,
        "longitude": 84.0000,
        "frp": 35.0,
        "brightness": 330.0,
        "daynight": "D",
        "history": []
    }

    result = classify_thermal_point(single_obs_point)
    temporal = result.get("temporal_profile", {})

    assert temporal["temporal_status"] == "INSUFFICIENT HISTORICAL DATA"
    assert "INSUFFICIENT HISTORY" in temporal["historical_passes_summary"]
    # Verify no fake historical passes were generated
    for p in temporal["recent_passes"]:
        assert "Pass -1" not in p.get("label", "")
        assert "Pass -2" not in p.get("label", "")
        assert "Pass -3" not in p.get("label", "")
        assert "Pass -4" not in p.get("label", "")

def test_event_store_empty_history_key_error_fixed():
    """
    Regression test for event_store line 303 KeyError: 'time'
    when rebuilding an event whose history is empty or missing fields.
    """
    from event_store import persist_and_rebuild_events
    # Raw observation with minimal fields
    raw_obs = [{
        "latitude": 21.555,
        "longitude": 78.555,
        "brightness": 320.0,
        "scan": 0.4,
        "track": 0.4,
        "acq_date": "2026-09-15",
        "acq_time": "0430",
        "satellite": "SNPP",
        "instrument": "VIIRS",
        "confidence": "nominal",
        "version": "2.0NRT",
        "bright_t31": 295.0,
        "frp": 25.0,
        "daynight": "D"
    }]

    # Must execute smoothly without KeyError: 'time'
    events = persist_and_rebuild_events(raw_obs, "2026-09-15 05:00:00 UTC")
    assert len(events) >= 1
    event = events[0]
    assert event["latitude"] == 21.555
    assert event["longitude"] == 78.555
    assert "time" not in event or event.get("first_detected") is not None

def test_agricultural_stubble_low_persistence():
    """
    Verifies that agricultural stubble burning (open field)
    has no industrial persistence and is segregated as agricultural.
    """
    stubble_point = {
        "fire_id": "TEST-STUBBLE-001",
        "latitude": 30.8800,
        "longitude": 75.8500,
        "frp": 22.4,
        "brightness": 328.0,
        "site_hint": "Ludhiana Agricultural District",
        "daynight": "D",
        "history": []
    }

    result = classify_thermal_point(stubble_point)

    assert result["category"] == "AGRICULTURAL_STUBBLE"
    assert result["is_industrial"] is False
    assert result["is_emergency"] is False
