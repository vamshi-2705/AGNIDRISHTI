"""
Unit tests for Temporal Persistence Engine & Classifier Segregation
NTRO Problem Statement 26162:
AI-Based Detection and Classification of Industrial Fires and Persistent Thermal Sources
"""

import pytest
from persistence_service import persistence_engine
from classifier import classify_thermal_point

def test_genuine_persistent_flare():
    """
    Verifies that a true flare stack (e.g. Jamnagar Flare Stack Bravo)
    demonstrates multi-pass temporal persistence (>= 20 passes in 30 days),
    low FRP variance, and receives a high persistence score (>= 70).
    """
    flare_point = {
        "fire_id": "FIRMS-IND-2026-002",
        "latitude": 22.3610,
        "longitude": 69.8780,
        "frp": 42.1,
        "brightness": 348.2,
        "site_hint": "Reliance Jamnagar Refinery - Flare Stack Bravo",
        "daynight": "D"
    }

    result = classify_thermal_point(flare_point)

    assert result["category"] == "PERSISTENT_INDUSTRIAL_FLARE"
    assert result["is_industrial"] is True
    assert result["is_emergency"] is False

    temporal = result.get("temporal_profile", {})
    assert temporal["observations_last_30d"] >= 20
    assert temporal["persistence_score"] >= 70
    assert temporal["persistence_tier"] == "PERSISTENT_INDUSTRIAL_SOURCE"
    assert temporal["coefficient_of_variation"] < 0.30
    assert "24/7 continuity" in temporal["historical_passes_summary"]

def test_acute_emergency_temporal_divergence():
    """
    Verifies that a sudden major explosion (e.g. Jamnagar Tank Farm)
    is identified as an acute anomalous divergence rather than a persistent flare,
    with an extreme spike ratio (> 5x above historical median).
    """
    emergency_point = {
        "fire_id": "FIRMS-IND-2026-001",
        "latitude": 22.3582,
        "longitude": 69.8695,
        "frp": 284.6,
        "brightness": 392.4,
        "site_hint": "Reliance Jamnagar Refinery - Sector 4 Tank Farm",
        "daynight": "D"
    }

    result = classify_thermal_point(emergency_point)

    assert result["category"] == "CRITICAL_INDUSTRIAL_EMERGENCY"
    assert result["is_industrial"] is True
    assert result["is_emergency"] is True

    temporal = result.get("temporal_profile", {})
    assert temporal["spike_ratio"] >= 5.0
    assert temporal["persistence_tier"] == "ACUTE_ANOMALOUS_SPIKE"
    assert temporal["temporal_status"] == "ABNORMAL_ACUTE_EMERGENCY"

def test_coal_seam_continuous_persistence():
    """
    Verifies that subterranean coal seam fires (Jharia)
    exhibit high multi-pass frequency (> 25 passes in 30 days) and continuous day/night presence.
    """
    coal_point = {
        "fire_id": "FIRMS-IND-2026-008",
        "latitude": 23.7480,
        "longitude": 86.4190,
        "frp": 68.4,
        "brightness": 362.0,
        "site_hint": "Jharia Opencast Coal Basin",
        "daynight": "D"
    }

    result = classify_thermal_point(coal_point)

    assert result["category"] == "COAL_MINING_FIRE"
    assert result["is_industrial"] is True
    assert result["is_emergency"] is False

    temporal = result.get("temporal_profile", {})
    assert temporal["observations_last_30d"] >= 25
    assert temporal["day_night_consistency_pct"] >= 50.0

def test_agricultural_stubble_low_persistence():
    """
    Verifies that agricultural stubble burning (open field)
    has no industrial persistence and is segregated as agricultural.
    """
    stubble_point = {
        "fire_id": "FIRMS-IND-2026-007",
        "latitude": 30.8800,
        "longitude": 75.8500,
        "frp": 22.4,
        "brightness": 328.0,
        "site_hint": "Ludhiana Agricultural District",
        "daynight": "D"
    }

    result = classify_thermal_point(stubble_point)

    assert result["category"] == "AGRICULTURAL_STUBBLE"
    assert result["is_industrial"] is False
    assert result["is_emergency"] is False

if __name__ == "__main__":
    test_genuine_persistent_flare()
    test_acute_emergency_temporal_divergence()
    test_coal_seam_continuous_persistence()
    test_agricultural_stubble_low_persistence()
    print("ALL 4 TEMPORAL PERSISTENCE TESTS PASSED.")
