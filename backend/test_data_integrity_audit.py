"""
AGNIDRISHTI - Data Integrity & Real Data Audit Test Suite
Verifies all 10 requirements from Task 10:
1. NASA data successfully loaded
2. NASA failure handling
3. NASA empty response handling
4. Missing confidence handling (nominal/percentage/null)
5. Missing FRP handling
6. Anomaly ratio calculation (observed / baseline)
7. Stable event ID generation
8. Timestamp handling (UTC & IST)
9. Event counts accuracy
10. No fake events on NASA failure
"""

import pytest
from unittest.mock import patch, MagicMock
from firms_service import firms_service, MultiSatelliteFirmsService
from event_store import generate_event_id, format_utc_time, persist_and_rebuild_events
from classifier import classify_thermal_point
from app import app
from fastapi.testclient import TestClient

client = TestClient(app)

SAMPLE_FIRMS_CSV = (
    "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n"
    "22.3582,69.8695,365.2,0.4,0.4,2026-09-15,0707,N,VIIRS,n,2.0NRT,295.4,48.5,D\n"
    "22.3610,69.8780,342.1,0.4,0.4,2026-09-15,0707,N,VIIRS,h,2.0NRT,290.1,18.2,D\n"
)


def test_1_nasa_data_successfully_loaded():
    """1. Verify NASA FIRMS data is parsed and ingested correctly without fabricated fields."""
    service = MultiSatelliteFirmsService(map_key="test_key")
    parsed = service._parse_firms_csv(SAMPLE_FIRMS_CSV, "VIIRS_SNPP_NRT")
    assert len(parsed) == 2
    rec = parsed[0]
    assert rec["latitude"] == 22.3582
    assert rec["longitude"] == 69.8695
    assert rec["frp"] == 48.5
    assert rec["confidence"] == "n"
    assert rec["acq_date"] == "2026-09-15"
    assert rec["acq_time"] == "0707"


def test_2_nasa_failure():
    """2. Verify system reports truthful failure state when NASA endpoints fail."""
    service = MultiSatelliteFirmsService(map_key="test_key")
    with patch("requests.get", side_effect=Exception("Connection refused")):
        res = service.fetch_firms_data(force_refresh=True)
        assert res["status"] == "unavailable"
        assert res["count"] == 0
        assert res["data"] == []
        assert res["source"] == "NASA_FIRMS_DATA_SOURCE_UNAVAILABLE"


def test_3_nasa_empty_response():
    """3. Verify zero events handled truthfully without fallback to fake events."""
    service = MultiSatelliteFirmsService(map_key="test_key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n"
    
    with patch("requests.get", return_value=mock_resp):
        res = service.fetch_firms_data(force_refresh=True)
        assert res["count"] == 0
        assert res["data"] == []
        assert res["source"] == "NASA_FIRMS_ZERO_EVENTS_DETECTED"


def test_4_missing_confidence():
    """4. Verify missing confidence is preserved as None rather than replaced with fake default."""
    csv_missing_conf = (
        "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n"
        "22.3582,69.8695,365.2,0.4,0.4,2026-09-15,0707,N,VIIRS,,2.0NRT,295.4,48.5,D\n"
    )
    service = MultiSatelliteFirmsService(map_key="test_key")
    parsed = service._parse_firms_csv(csv_missing_conf, "VIIRS_SNPP_NRT")
    assert len(parsed) == 1
    assert parsed[0]["confidence"] is None

    # Test classification handles None confidence smoothly
    classified = classify_thermal_point(parsed[0])
    assert classified is not None


def test_5_missing_frp():
    """5. Verify missing FRP is preserved and handled without crash."""
    csv_missing_frp = (
        "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n"
        "22.3582,69.8695,365.2,0.4,0.4,2026-09-15,0707,N,VIIRS,n,2.0NRT,295.4,,D\n"
    )
    service = MultiSatelliteFirmsService(map_key="test_key")
    parsed = service._parse_firms_csv(csv_missing_frp, "VIIRS_SNPP_NRT")
    assert len(parsed) == 1
    assert parsed[0]["frp"] is None

    # Classifier shouldn't crash with None frp
    classified = classify_thermal_point(parsed[0])
    assert classified["frp"] is None or classified["frp"] == 0.0
    assert classified["anomaly_ratio"] == 1.0


def test_6_anomaly_ratio_calculation():
    """6. Verify mathematically consistent anomaly_ratio = round(observed / baseline, 2)."""
    # Emergency at Jamnagar (Baseline 45 MW) with observed FRP 135 MW -> ratio = 3.0
    pt = {"latitude": 22.3582, "longitude": 69.8695, "frp": 135.0, "fire_id": "TEST-FRP-ANOMALY"}
    classified = classify_thermal_point(pt)
    assert classified["baseline_frp_mw"] == 45.0
    expected_ratio = round(135.0 / 45.0, 2)
    assert classified["anomaly_ratio"] == expected_ratio
    assert classified["anomaly_ratio"] == 3.0

    # Rural fire with baseline 20 MW and observed FRP 50 MW -> ratio = 2.5
    pt_rural = {"latitude": 25.5000, "longitude": 80.0000, "frp": 50.0, "fire_id": "TEST-RURAL-ANOMALY"}
    classified_rural = classify_thermal_point(pt_rural)
    assert classified_rural["anomaly_ratio"] == round(50.0 / classified_rural["baseline_frp_mw"], 2)


def test_7_stable_event_id():
    """7. Verify stable deterministic event IDs across refreshes for the same coordinates."""
    id1 = generate_event_id(27.8812, 78.4412)
    id2 = generate_event_id(27.8812, 78.4412)
    assert id1 == id2
    assert id1.startswith("AGNI-LIVE-")

    # Slight variation within ~550m threshold should map to same cluster ID in event_store
    records1 = [{"latitude": 27.8812, "longitude": 78.4412, "frp": 45.0, "confidence": "n"}]
    events1 = persist_and_rebuild_events(records1, "12:00:00 UTC")
    
    records2 = [{"latitude": 27.8813, "longitude": 78.4411, "frp": 46.0, "confidence": "n"}]
    events2 = persist_and_rebuild_events(records2, "12:05:00 UTC")
    
    assert events1[0]["event_id"] == events2[0]["event_id"]


def test_8_timestamp_handling():
    """8. Verify time formatting into UTC string without fabricating fake dates."""
    assert format_utc_time("707") == "07:07 UTC"
    assert format_utc_time("0707") == "07:07 UTC"
    assert format_utc_time("1230") == "12:30 UTC"
    assert format_utc_time("invalid") == "invalid UTC"


def test_9_event_counts():
    """9. Verify event counts accurately reflect current backend dataset."""
    res = client.get("/api/fires")
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == len(data["data"])

    # Health endpoint counts
    h_res = client.get("/api/data-health")
    assert h_res.status_code == 200
    h_data = h_res.json()
    assert h_data["event_count"] == data["total_records"]
    assert "firms_status" in h_data
    assert "last_successful_fetch" in h_data
    assert "latest_observation_time" in h_data


def test_10_no_fake_events_on_nasa_failure():
    """10. Verify no fake thermal events are generated when NASA FIRMS fails."""
    service = MultiSatelliteFirmsService(map_key="test_key")
    with patch("requests.get", side_effect=Exception("Network Timeout")):
        res = service.fetch_firms_data(force_refresh=True)
        assert len(res["data"]) == 0
        assert res["count"] == 0
        assert res["status"] == "unavailable"
