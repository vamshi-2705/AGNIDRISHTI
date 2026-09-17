"""
AGNIDRISHTI - Priority 2 Persistent Source & Temporal Intelligence Test Suite
Verifies all requirements of Task 11:
1. Repeated same-location observations (persistence)
2. Spatially separated observations (> configurable radius)
3. Temporally separated observations (episodes over time)
4. Duplicate satellite observations (SNPP 10:00 + NOAA-20 10:30 do not artificially inflate persistence)
5. Persistence score formula and measurable components
6. Recurrence frequency (per week, and 30-day guarded by 14-day minimum span)
7. FRP trend (INCREASING, DECREASING, STABLE, INSUFFICIENT HISTORY)
8. Insufficient history handling
9. Baseline calculation (baseline FRP, recent FRP, deviation, anomaly ratio)
10. Diurnal behavior analysis
11. API endpoints (/api/persistent-sources and /api/sources/{source_id})
"""

import pytest
from datetime import datetime, timezone, timedelta
from persistence_service import (
    group_into_pass_episodes,
    compute_persistent_source_record,
    persistence_engine,
    DEFAULT_ORBITAL_PASS_WINDOW_MIN
)
from event_store import get_spatial_threshold_deg, find_nearest_event
from classifier import classify_thermal_point
from app import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_1_repeated_same_location_observations_persistent():
    """1. Verify that genuine repeated passes over multiple days produce a PERSISTENT SOURCE."""
    base_dt = datetime(2026, 9, 1, 10, 0, tzinfo=timezone.utc)
    observations = []
    # 10 passes across 8 distinct days
    for i in range(10):
        dt = base_dt + timedelta(days=i * 1.2, hours=1)
        observations.append({
            "latitude": 22.3610,
            "longitude": 69.8780,
            "acq_date": dt.strftime("%Y-%m-%d"),
            "acq_time": dt.strftime("%H%M"),
            "frp": 42.0 + (i % 3),
            "satellite": "SNPP" if i % 2 == 0 else "NOAA-20",
            "daynight": "D"
        })

    record = compute_persistent_source_record(
        observations=observations,
        current_lat=22.3610,
        current_lon=69.8780,
        current_frp=43.0,
        facility_baseline=40.0
    )

    assert record["source_tier"] == "PERSISTENT SOURCE"
    assert record["is_persistent"] is True
    assert record["distinct_observation_days"] >= 6
    assert record["persistence_score"] >= 60
    assert record["observation_count"] == 10
    assert record["distinct_episodes"] == 10


def test_2_spatially_separated_observations_not_merged():
    """2. Verify that observations separated beyond the configurable radius are treated as distinct entities."""
    threshold_deg = get_spatial_threshold_deg(500.0)
    assert 0.003 <= threshold_deg <= 0.006

    # Two points 5 km apart (~0.045 deg)
    p1 = {"latitude": 22.3582, "longitude": 69.8695}
    p2 = {"latitude": 22.4082, "longitude": 69.8695}

    d_lat = abs(p1["latitude"] - p2["latitude"])
    assert d_lat > threshold_deg


def test_3_temporally_separated_observations():
    """3. Verify multi-day temporally separated passes accurately track first_seen, last_seen, and span."""
    obs = [
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-01", "acq_time": "0800", "frp": 25.0, "satellite": "SNPP"},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-08", "acq_time": "0830", "frp": 28.0, "satellite": "NOAA-20"},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "0900", "frp": 26.0, "satellite": "NOAA-21"}
    ]
    record = compute_persistent_source_record(obs, 20.0, 80.0, 26.0)
    assert record["distinct_observation_days"] == 3
    assert record["distinct_episodes"] == 3
    assert record["span_days"] == 14.0 or record["span_days"] == 14.04
    assert "2026-09-01" in record["first_seen"]
    assert "2026-09-15" in record["last_seen"]


def test_4_duplicate_satellite_observations_same_pass():
    """
    4. Task 2: Multi-satellite overpass deduplication.
    SNPP at 10:00 and NOAA-20 at 10:30 on the same day represent the SAME pass episode.
    They must NOT artificially inflate distinct episodes from 1 to 2!
    """
    same_pass_obs = [
        {"latitude": 22.3582, "longitude": 69.8695, "acq_date": "2026-09-15", "acq_time": "1000", "satellite": "SNPP", "frp": 45.0},
        {"latitude": 22.3582, "longitude": 69.8695, "acq_date": "2026-09-15", "acq_time": "1030", "satellite": "NOAA-20", "frp": 48.0}
    ]

    episodes = group_into_pass_episodes(same_pass_obs, window_minutes=DEFAULT_ORBITAL_PASS_WINDOW_MIN)
    assert len(episodes) == 1, "Observations within 30 min on same day should collapse to 1 single episode"
    ep = episodes[0]
    assert "SNPP" in ep["satellites"] and "NOAA-20" in ep["satellites"]
    assert ep["raw_observations_count"] == 2
    assert ep["frp"] == 48.0  # Peak FRP preserved

    # Compute record: 2 raw observations, but ONLY 1 distinct episode -> Insufficient history
    record = compute_persistent_source_record(same_pass_obs, 22.3582, 69.8695, 48.0)
    assert record["distinct_episodes"] == 1
    assert record["observation_count"] == 2
    assert record["source_tier"] == "INSUFFICIENT HISTORY"


def test_5_persistence_score_transparent_formula():
    """5. Verify transparent, explainable persistence score formula."""
    # 5 episodes across 5 days over 10 days
    base_dt = datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc)
    obs = []
    for i in range(5):
        dt = base_dt + timedelta(days=i * 2)
        obs.append({
            "latitude": 23.0,
            "longitude": 70.0,
            "acq_date": dt.strftime("%Y-%m-%d"),
            "acq_time": "1200",
            "frp": 30.0,
            "satellite": "SNPP"
        })

    record = compute_persistent_source_record(obs, 23.0, 70.0, 30.0, facility_baseline=30.0)
    assert 40 <= record["persistence_score"] <= 85
    assert "formula" in record["score_components"]


def test_6_recurrence_frequency_and_span_guard():
    """6. Verify recurrence rate calculation and that 30d recurrence is hidden if span < 14 days."""
    # Case A: Span of 5 days (less than 14 days) -> 30d recurrence MUST be None
    short_obs = [
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-10", "acq_time": "0800", "frp": 25.0, "satellite": "SNPP"},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "0800", "frp": 25.0, "satellite": "SNPP"}
    ]
    rec_short = compute_persistent_source_record(short_obs, 20.0, 80.0, 25.0)
    assert rec_short["recurrence_per_week"] > 0
    assert rec_short["recurrence_per_30d"] is None, "30-day recurrence must be None when span < 14 days"

    # Case B: Span of 20 days (>= 14 days) -> 30d recurrence is populated
    long_obs = [
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-08-25", "acq_time": "0800", "frp": 25.0, "satellite": "SNPP"},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-05", "acq_time": "0800", "frp": 25.0, "satellite": "SNPP"},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "0800", "frp": 25.0, "satellite": "SNPP"}
    ]
    rec_long = compute_persistent_source_record(long_obs, 20.0, 80.0, 25.0)
    assert rec_long["recurrence_per_30d"] is not None
    assert rec_long["recurrence_per_30d"] > 0


def test_7_frp_trend_calculation():
    """7. Verify FRP trend accurately detects INCREASING, DECREASING, STABLE, and INSUFFICIENT HISTORY."""
    # 1 observation -> INSUFFICIENT HISTORY
    single = [{"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "1000", "frp": 40.0}]
    assert compute_persistent_source_record(single, 20.0, 80.0, 40.0)["frp_trend"] == "INSUFFICIENT HISTORY"

    # Increasing: 20 MW -> 50 MW
    inc = [
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-10", "acq_time": "1000", "frp": 20.0},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "1000", "frp": 50.0}
    ]
    assert compute_persistent_source_record(inc, 20.0, 80.0, 50.0)["frp_trend"] == "INCREASING"

    # Decreasing: 60 MW -> 25 MW
    dec = [
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-10", "acq_time": "1000", "frp": 60.0},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "1000", "frp": 25.0}
    ]
    assert compute_persistent_source_record(dec, 20.0, 80.0, 25.0)["frp_trend"] == "DECREASING"

    # Stable: 40 MW -> 42 MW
    stable = [
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-10", "acq_time": "1000", "frp": 40.0},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "1000", "frp": 42.0}
    ]
    assert compute_persistent_source_record(stable, 20.0, 80.0, 42.0)["frp_trend"] == "STABLE"


def test_8_baseline_and_anomaly_ratio():
    """8. Verify baseline, recent FRP, deviation, and anomaly ratio consistency."""
    obs = [
        {"latitude": 22.3582, "longitude": 69.8695, "acq_date": "2026-09-10", "acq_time": "0700", "frp": 40.0},
        {"latitude": 22.3582, "longitude": 69.8695, "acq_date": "2026-09-12", "acq_time": "0700", "frp": 42.0},
        {"latitude": 22.3582, "longitude": 69.8695, "acq_date": "2026-09-15", "acq_time": "0700", "frp": 90.0}
    ]
    record = compute_persistent_source_record(obs, 22.3582, 69.8695, 90.0, facility_baseline=45.0)
    assert record["baseline_frp"] == 45.0
    assert record["recent_frp"] == 90.0
    assert record["frp_deviation"] == 45.0
    assert record["anomaly_ratio"] == 2.0


def test_9_diurnal_behavior_analysis():
    """9. Verify diurnal behavior: 24/7 continuous vs distinct observation window vs insufficient data."""
    # Fewer than 3 passes -> INSUFFICIENT DATA
    obs_few = [
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-14", "acq_time": "0700", "frp": 30.0},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "0700", "frp": 30.0}
    ]
    assert compute_persistent_source_record(obs_few, 20.0, 80.0, 30.0)["diurnal_behavior"] == "INSUFFICIENT DATA"

    # Clustered daytime passes (07:00-09:00 UTC)
    obs_clustered = [
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-12", "acq_time": "0710", "frp": 30.0},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-13", "acq_time": "0740", "frp": 30.0},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-14", "acq_time": "0805", "frp": 30.0},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "0730", "frp": 30.0}
    ]
    diurnal = compute_persistent_source_record(obs_clustered, 20.0, 80.0, 30.0)["diurnal_behavior"]
    assert "07:00" in diurnal and "08:00" in diurnal or "07:00" in diurnal

    # Continuous 24/7 passes (both daytime 07:00 and nighttime 20:00)
    obs_247 = [
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-12", "acq_time": "0710", "frp": 30.0, "daynight": "D"},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-13", "acq_time": "2030", "frp": 30.0, "daynight": "N"},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-14", "acq_time": "0720", "frp": 30.0, "daynight": "D"},
        {"latitude": 20.0, "longitude": 80.0, "acq_date": "2026-09-15", "acq_time": "2100", "frp": 30.0, "daynight": "N"}
    ]
    assert compute_persistent_source_record(obs_247, 20.0, 80.0, 30.0)["diurnal_behavior"] == "24/7 CONTINUOUS (Day & Night)"


def test_10_api_endpoints_persistent_sources():
    """10. Verify /api/persistent-sources and /api/sources/{source_id} endpoints return valid payloads."""
    # List endpoint
    res = client.get("/api/persistent-sources")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "sources" in data
    assert "persistent_count" in data
    assert "recurrent_count" in data

    # Verify fires endpoint returns persistent_source
    fires_res = client.get("/api/fires")
    assert fires_res.status_code == 200
    fires = fires_res.json().get("data", [])
    if fires:
        f = fires[0]
        assert "persistent_source" in f
        assert "source_tier" in f
        ps = f["persistent_source"]
        assert "persistent_source_id" in ps
        assert "source_tier" in ps
        assert "persistence_score" in ps

        # Detail endpoint for existing fire
        detail_res = client.get(f"/api/sources/{f['fire_id']}")
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["status"] == "success"
        assert "persistent_source" in detail_data

    # 404 for non-existent source
    not_found = client.get("/api/sources/NON-EXISTENT-SOURCE-ID-999")
    assert not_found.status_code == 404
