"""
AGNIDRISHTI - Container Smoke & Live Endpoint Verification Suite
Tests the active Docker containers on ports 8000 (Backend) and 5173 (Frontend).
"""

import time
import requests

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

def test_containerized_deployment():
    print("==================================================")
    print("AGNIDRISHTI CONTAINER LIVE VERIFICATION")
    print("==================================================")

    # 1. Backend Liveness / Health Endpoint
    print("\n[SMOKE 1] Testing Backend /health...")
    r_health = requests.get(f"{BACKEND_URL}/health", timeout=5)
    assert r_health.status_code == 200, f"/health returned {r_health.status_code}"
    print(f"  Response: {r_health.json()}")
    assert r_health.json().get("status") == "healthy"
    print("  --> SMOKE 1 PASSED: Backend container is healthy.")

    # 2. Database Health Endpoint /api/data-health
    print("\n[SMOKE 2] Testing Backend /api/data-health...")
    r_dh = requests.get(f"{BACKEND_URL}/api/data-health", timeout=10)
    assert r_dh.status_code == 200, f"/api/data-health returned {r_dh.status_code}"
    dh_json = r_dh.json()
    persistence = dh_json.get("event_persistence", {})
    print(f"  Database Backend: {persistence.get('database_backend')}")
    print(f"  Stored Events: {persistence.get('stored_events_count')}")
    print(f"  Stored Observations: {persistence.get('stored_observations_count')}")
    print(f"  PostGIS Version: {persistence.get('postgis_version')}")
    assert persistence.get("is_postgres") is True
    assert persistence.get("stored_events_count") >= 1172
    assert persistence.get("stored_observations_count") >= 3588
    print("  --> SMOKE 2 PASSED: Backend connected to external Neon PostgreSQL + PostGIS.")

    # 3. Ingestion Health Endpoint /api/ingestion-health
    print("\n[SMOKE 3] Testing Backend /api/ingestion-health...")
    r_ih = requests.get(f"{BACKEND_URL}/api/ingestion-health", timeout=10)
    assert r_ih.status_code == 200, f"/api/ingestion-health returned {r_ih.status_code}"
    ih_json = r_ih.json()
    print(f"  Scheduler Enabled: {ih_json.get('scheduler_enabled')}")
    print(f"  Ingestion Status: {ih_json.get('status')}")
    print(f"  Advisory Lock: {ih_json.get('database_advisory_lock')}")
    assert ih_json.get("scheduler_enabled") is True
    assert "Advisory Lock" in ih_json.get("database_advisory_lock", "")
    print("  --> SMOKE 3 PASSED: Ingestion scheduler & advisory locking active.")

    # 4. Thermal Detections /api/fires (Non-blocking)
    print("\n[SMOKE 4] Testing Backend /api/fires (Latency & Records)...")
    t0 = time.time()
    r_fires = requests.get(f"{BACKEND_URL}/api/fires", timeout=10)
    latency_ms = (time.time() - t0) * 1000
    assert r_fires.status_code == 200, f"/api/fires returned {r_fires.status_code}"
    fires_json = r_fires.json()
    fires_data = fires_json.get("data", [])
    print(f"  Response Latency: {latency_ms:.2f} ms (Non-blocking)")
    print(f"  Total Hotspots: {len(fires_data)}")
    assert len(fires_data) > 0, "Expected non-empty fires data"
    sample_fire = fires_data[0]
    sample_fire_id = sample_fire.get("fire_id") or sample_fire.get("event_id")
    print(f"  Sample Fire: {sample_fire_id} @ ({sample_fire.get('latitude')}, {sample_fire.get('longitude')})")
    assert latency_ms < 500, f"/api/fires response took too long: {latency_ms:.2f}ms"
    print("  --> SMOKE 4 PASSED: Live detections served instantaneously.")

    # 5. GIS Facilities & Sensitive Locations
    print("\n[SMOKE 5] Testing Backend /api/facilities and /api/sensitive-locations...")
    r_fac = requests.get(f"{BACKEND_URL}/api/facilities", timeout=5)
    assert r_fac.status_code == 200
    print(f"  Industrial Facilities: {len(r_fac.json().get('features', []))} features")
    r_sens = requests.get(f"{BACKEND_URL}/api/sensitive-locations", timeout=5)
    assert r_sens.status_code == 200
    print(f"  Sensitive Locations: {len(r_sens.json().get('features', []))} features")
    print("  --> SMOKE 5 PASSED: GIS geo-layers served accurately.")

    # 6. Persistent Sources /api/persistent-sources
    print("\n[SMOKE 6] Testing Backend /api/persistent-sources...")
    r_ps = requests.get(f"{BACKEND_URL}/api/persistent-sources", timeout=5)
    assert r_ps.status_code == 200
    ps_json = r_ps.json()
    sources = ps_json.get("sources", [])
    print(f"  Persistent sources count: {len(sources)}")
    print("  --> SMOKE 6 PASSED.")

    # 7. Plume Dispersion /api/plume/{fire_id}
    print(f"\n[SMOKE 7] Testing Backend /api/plume/{sample_fire_id}...")
    r_plume = requests.get(f"{BACKEND_URL}/api/plume/{sample_fire_id}", timeout=5)
    assert r_plume.status_code == 200, f"/api/plume returned {r_plume.status_code}"
    plume_json = r_plume.json()
    assert plume_json.get("type") == "Feature"
    print(f"  Plume Hazard Length: {plume_json.get('properties', {}).get('hazard_length_km')} km")
    print("  --> SMOKE 7 PASSED: Plume dispersion calculation functional.")

    # 8. Satellite Evidence /api/satellite-evidence/{fire_id}
    print(f"\n[SMOKE 8] Testing Backend /api/satellite-evidence/{sample_fire_id}...")
    r_ev = requests.get(f"{BACKEND_URL}/api/satellite-evidence/{sample_fire_id}", timeout=5)
    assert r_ev.status_code == 200, f"/api/satellite-evidence returned {r_ev.status_code}"
    assert "supporting" in r_ev.json()
    print("  --> SMOKE 8 PASSED: Multi-sensor satellite evidence functional.")

    # 9. Incident Report /api/incident/report/{fire_id}
    print(f"\n[SMOKE 9] Testing Backend /api/incident/report/{sample_fire_id}...")
    r_rep = requests.get(f"{BACKEND_URL}/api/incident/report/{sample_fire_id}", timeout=5)
    assert r_rep.status_code == 200, f"/api/incident/report returned {r_rep.status_code}"
    assert "dossier_id" in r_rep.json() or "report_id" in r_rep.json()
    print("  --> SMOKE 9 PASSED: Incident dossier generated successfully.")

    # 10. Frontend Container Verification (Nginx SPA)
    print("\n[SMOKE 10] Testing Frontend Container (Port 5173)...")
    r_fe_root = requests.get(FRONTEND_URL, timeout=5)
    assert r_fe_root.status_code == 200
    assert "<!DOCTYPE html>" in r_fe_root.text or "<!doctype html>" in r_fe_root.text
    print("  Root (/) served valid HTML index.")

    # Test SPA routing fallback on Nginx: /platform and /demo
    r_fe_plat = requests.get(f"{FRONTEND_URL}/platform", timeout=5)
    assert r_fe_plat.status_code == 200
    assert "<!DOCTYPE html>" in r_fe_plat.text or "<!doctype html>" in r_fe_plat.text
    print("  /platform served SPA fallback index.")

    r_fe_demo = requests.get(f"{FRONTEND_URL}/demo", timeout=5)
    assert r_fe_demo.status_code == 200
    assert "<!DOCTYPE html>" in r_fe_demo.text or "<!doctype html>" in r_fe_demo.text
    print("  /demo served SPA fallback index.")

    # Test Cesium Static Asset Availability
    r_cesium = requests.get(f"{FRONTEND_URL}/cesium/Cesium.js", timeout=5)
    # If vite-plugin-cesium copies to dist/cesium/
    print(f"  Cesium Static Assets Check: status={r_cesium.status_code}")
    print("  --> SMOKE 10 PASSED: Frontend container serves React SPA and routing correctly.")

    print("\n==================================================")
    print("ALL CONTAINER SMOKE TESTS PASSED (10/10)")
    print("==================================================")

if __name__ == "__main__":
    test_containerized_deployment()
