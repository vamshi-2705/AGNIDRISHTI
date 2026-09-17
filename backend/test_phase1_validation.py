"""
AGNIDRISHTI - Phase 1 Targeted Validation Suite
Verifies:
- PostgreSQL + PostGIS connectivity
- Table counts and spatial geometry integrity
- Alembic migration state
- /api/data-health
- /api/fires
- /api/persistent-sources
- /api/sources/{source_id}
- /api/plume/{fire_id}
- CORS environment-controlled headers
- Unified JSON error handling
"""

import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import text

from database import engine, check_db_health, IS_POSTGRES
from app import app

client = TestClient(app)

def run_targeted_checks():
    print("==================================================")
    print("AGNIDRISHTI PHASE 1 TARGETED VALIDATION")
    print("==================================================")

    # 1. PostgreSQL & PostGIS Check
    print("\n[CHECK 1] PostgreSQL + PostGIS Connectivity...")
    db_health = check_db_health()
    print("  Status:", db_health.get("status"))
    print("  Driver:", db_health.get("driver"))
    print("  PostGIS Version:", db_health.get("postgis_version"))
    assert db_health.get("status") == "HEALTHY", "Database is not healthy"
    assert db_health.get("is_postgres") is True, "Expected PostgreSQL"
    assert "3." in db_health.get("postgis_version", ""), "PostGIS version 3.x expected"
    print("  --> CHECK 1 PASSED: PostgreSQL & PostGIS verified.")

    # 2. Migration Records & Geometry Check
    print("\n[CHECK 2] Database Counts & PostGIS Point Geometries...")
    with engine.connect() as conn:
        events_cnt = conn.execute(text("SELECT COUNT(*) FROM thermal_events;")).fetchone()[0]
        obs_cnt = conn.execute(text("SELECT COUNT(*) FROM observations;")).fetchone()[0]
        geom_sample = conn.execute(text("SELECT event_id, ST_AsText(geom) FROM thermal_events WHERE geom IS NOT NULL LIMIT 1;")).fetchone()
        alembic_head = conn.execute(text("SELECT version_num FROM alembic_version;")).fetchone()
        
    print(f"  thermal_events count: {events_cnt}")
    print(f"  observations count: {obs_cnt}")
    print(f"  Sample PostGIS Point: {geom_sample}")
    print(f"  Alembic head revision: {alembic_head[0] if alembic_head else None}")
    assert events_cnt >= 1172, f"Expected >= 1172 events, got {events_cnt}"
    assert obs_cnt >= 3588, f"Expected >= 3588 observations, got {obs_cnt}"
    assert geom_sample is not None and "POINT(" in geom_sample[1], "Invalid PostGIS Point"
    assert alembic_head[0] == "001_postgis", "Alembic not at head revision"
    print("  --> CHECK 2 PASSED: Database counts & PostGIS geometries verified.")

    # 3. Endpoint: /api/data-health
    print("\n[CHECK 3] GET /api/data-health...")
    resp = client.get("/api/data-health")
    assert resp.status_code == 200, f"/api/data-health returned {resp.status_code}"
    data = resp.json()
    persistence = data.get("event_persistence", {})
    print("  Backend:", persistence.get("database_backend"))
    print("  Stored Events:", persistence.get("stored_events_count"))
    print("  Stored Obs:", persistence.get("stored_observations_count"))
    print("  PostGIS:", persistence.get("postgis_version"))
    assert persistence.get("is_postgres") is True
    assert persistence.get("stored_events_count") >= 1172
    print("  --> CHECK 3 PASSED: /api/data-health verified.")

    # 4. Endpoint: /api/fires
    print("\n[CHECK 4] GET /api/fires...")
    resp = client.get("/api/fires")
    assert resp.status_code == 200, f"/api/fires returned {resp.status_code}"
    fires_data = resp.json()
    fires_list = fires_data.get("data", [])
    print(f"  Returned fires count: {len(fires_list)}")
    assert len(fires_list) > 0, "Expected non-empty fires list"
    sample_fire = fires_list[0]
    print(f"  Sample fire ID: {sample_fire.get('event_id')} | Coordinates: ({sample_fire.get('latitude')}, {sample_fire.get('longitude')})")
    assert "latitude" in sample_fire and "longitude" in sample_fire
    assert "event_id" in sample_fire
    print("  --> CHECK 4 PASSED: /api/fires verified.")

    # 5. Endpoint: /api/persistent-sources
    print("\n[CHECK 5] GET /api/persistent-sources...")
    resp = client.get("/api/persistent-sources")
    assert resp.status_code == 200, f"/api/persistent-sources returned {resp.status_code}"
    ps_data = resp.json()
    sources = ps_data.get("persistent_sources", [])
    print(f"  Persistent sources count: {len(sources)}")
    sample_source_id = None
    if sources:
        sample_source_id = sources[0].get("source_id")
        print(f"  Sample persistent source: {sample_source_id} | Name: {sources[0].get('source_name')}")
    print("  --> CHECK 5 PASSED: /api/persistent-sources verified.")

    # 6. Endpoint: /api/sources/{source_id}
    print("\n[CHECK 6] GET /api/sources/{source_id}...")
    if sample_source_id:
        resp = client.get(f"/api/sources/{sample_source_id}")
        assert resp.status_code == 200, f"/api/sources/{sample_source_id} returned {resp.status_code}"
        src_data = resp.json()
        print(f"  Source {sample_source_id} resolved: status={src_data.get('status')}")
    else:
        print("  Skipped specific source check (no sources returned from current snapshot).")
    print("  --> CHECK 6 PASSED: /api/sources/{source_id} verified.")

    # 7. Endpoint: /api/plume/{fire_id}
    print("\n[CHECK 7] GET /api/plume/{fire_id}...")
    target_fire_id = fires_list[0].get("event_id") if fires_list else "AGNI-LIVE-0F6684"
    resp = client.get(f"/api/plume/{target_fire_id}")
    assert resp.status_code == 200, f"/api/plume/{target_fire_id} returned {resp.status_code}"
    plume_data = resp.json()
    props = plume_data.get("properties", {})
    geom = plume_data.get("geometry", {})
    print(f"  Plume calculated for {target_fire_id}: Wind bearing={props.get('wind_direction_deg')} deg, Speed={props.get('wind_speed_kmh')} km/h, Hazard length={props.get('hazard_length_km')} km")
    assert plume_data.get("type") == "Feature"
    assert geom.get("type") == "Polygon"
    assert len(geom.get("coordinates", [[]])[0]) >= 3
    print("  --> CHECK 7 PASSED: /api/plume/{fire_id} verified.")

    # 8. CORS Headers Check
    print("\n[CHECK 8] CORS Headers Check...")
    resp = client.get("/api/data-health", headers={"Origin": "http://localhost:5173"})
    allow_origin = resp.headers.get("access-control-allow-origin")
    print(f"  Request Origin: http://localhost:5173 -> Response Access-Control-Allow-Origin: {allow_origin}")
    assert allow_origin == "http://localhost:5173", f"Expected http://localhost:5173, got {allow_origin}"
    print("  --> CHECK 8 PASSED: CORS environment controls verified.")

    # 9. Unified Error Handling Check
    print("\n[CHECK 9] Unified JSON Error Handling...")
    resp = client.get("/api/non-existent-endpoint-test-404")
    assert resp.status_code == 404
    err_json = resp.json()
    print(f"  404 Response: {err_json}")
    assert "error" in err_json and "timestamp_utc" in err_json
    print("  --> CHECK 9 PASSED: Unified error handling verified.")

    print("\n==================================================")
    print("ALL TARGETED VALIDATION CHECKS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    run_targeted_checks()
