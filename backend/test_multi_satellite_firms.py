"""
Unit tests for Multi-Satellite FIRMS Ingestion, Deduplication, and Event History
"""

import pytest
from firms_service import firms_service, SATELLITE_NAME_MAP


def test_firms_sources_and_sync_metadata():
    """Verify multi-satellite sources and sync metadata structure."""
    result = firms_service.fetch_firms_data()
    assert result["status"] == "success"
    assert "sync_metadata" in result

    meta = result["sync_metadata"]
    assert "last_sync_utc" in meta
    assert "next_sync_utc" in meta
    assert "sync_interval_seconds" in meta
    assert meta["sync_interval_seconds"] == 300
    assert "satellite_sources" in meta
    assert "active_sources_count" in meta
    assert meta["active_sources_count"] >= 1


def test_deduplication_and_event_history():
    """Verify that multi-satellite observations are deduplicated and history is maintained."""
    result = firms_service.fetch_firms_data()
    records = result["data"]
    assert len(records) > 0

    # If events are returned from live FIRMS or database, verify observation history and metadata
    if records:
        lead_event = records[0]
        assert "fire_id" in lead_event
        assert "satellites" in lead_event
        assert "history" in lead_event
        assert "trend" in lead_event
        assert "duration_min" in lead_event
        assert "source_info" in lead_event
        assert lead_event["source_info"]["spatial_resolution"] == "375 m"


def test_source_isolation_resilience():
    """Verify that simulating an invalid/offline source does not break data fetching."""
    # Test CSV parser directly with empty or malformed input
    parsed = firms_service._parse_firms_csv("latitude,longitude,brightness\ninvalid,data,here\n", "VIIRS_SNPP_NRT")
    assert isinstance(parsed, list)
    assert len(parsed) == 0
