"""
ASTRAFIRE - FastAPI Backend Server
Smart India Hackathon (SIH 2026) | Problem Statement 26162 (NTRO)
Title: AI-Based Detection and Classification of Industrial Fires and Persistent Thermal Sources
       Using NASA FIRMS, OSM & Satellite Data
Organization: National Technical Research Organisation (NTRO)
Category: Software | Theme: Disaster Management / Miscellaneous
"""

import time
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from firms_service import firms_service
from classifier import classify_fire_list, classify_thermal_point
from industrial_db import get_facilities_geojson, find_facility_for_point
from plume_service import calculate_plume_cone

app = FastAPI(
    title="ASTRAFIRE - Geospatial AI Industrial Fire Surveillance Engine",
    description=(
        "Production-grade GIS backend for NTRO SIH 2026 Problem Statement 26162. "
        "Delivers automated multi-spectral satellite thermal anomaly ingestion (NASA FIRMS VIIRS), "
        "OpenStreetMap industrial boundary intersection, FRP baseline anomaly segregation, "
        "and dynamic Gaussian toxic smoke plume dispersion modeling."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# -----------------------------------------------------------------------------
# CORS Middleware Configuration
# Configured with allow_origins=["*"] to enable zero-friction local and staging
# connections for React, Next.js, Vite, and Leaflet frontends.
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health & Metadata"])
def get_root_status() -> Dict[str, Any]:
    """
    Root health check and comprehensive API manifest for judges and clients.
    """
    return {
        "system": "ASTRAFIRE Backend Engine",
        "status": "OPERATIONAL",
        "sih_problem_id": "SIH26162",
        "ministry_organization": "National Technical Research Organisation (NTRO)",
        "theme": "Disaster Management / Geospatial Intelligence",
        "version": "1.0.0",
        "documentation": "/docs",
        "endpoints": {
            "fires": "/api/fires?filter_mode=all|industrial|emergencies",
            "facilities": "/api/facilities",
            "analytics_summary": "/api/analytics/summary",
            "plume_model": "/api/plume/{fire_id}",
            "incident_report": "/api/incident/report/{fire_id}"
        },
        "deliverables_fulfilled": {
            "deliverable_i": "AI-based segregation of industrial fires from forest & stubble fires (classifier.py)",
            "deliverable_ii": "GIS data storage, Map overlays, and GeoJSON export (app.py, industrial_db.py)"
        }
    }


@app.get("/api/fires", tags=["Thermal Surveillance"])
def get_thermal_fires(
    filter_mode: str = Query("all", pattern="^(all|industrial|emergencies)$", description="Filter mode")
) -> Dict[str, Any]:
    """
    Ingests near real-time satellite detections and classifies each point
    into industrial emergencies, routine flares, coal seam fires, stubble, or forest fires.
    """
    ingestion = firms_service.fetch_firms_data()
    raw_points = ingestion.get("data", [])
    classified_points = classify_fire_list(raw_points, filter_mode=filter_mode)

    return {
        "status": "success",
        "filter_applied": filter_mode,
        "total_records": len(classified_points),
        "source": ingestion.get("source", "CALIBRATED_OFFLINE_DATASET"),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "data": classified_points
    }


@app.get("/api/facilities", tags=["GIS Infrastructure"])
def get_industrial_facilities() -> Dict[str, Any]:
    """
    Returns standard GeoJSON FeatureCollection containing polygons and baseline
    operational thresholds for major Indian industrial refining and chemical clusters.
    """
    return get_facilities_geojson()


@app.get("/api/analytics/summary", tags=["Analytics & KPIs"])
def get_analytics_summary() -> Dict[str, Any]:
    """
    High-level dashboard KPIs and operational status metrics for executive situational awareness.
    """
    ingestion = firms_service.fetch_firms_data()
    all_fires = classify_fire_list(ingestion.get("data", []), filter_mode="all")

    emergencies = [f for f in all_fires if f.get("is_emergency", False)]
    flares = [f for f in all_fires if f.get("category") == "PERSISTENT_INDUSTRIAL_FLARE"]
    coal_fires = [f for f in all_fires if f.get("category") == "COAL_MINING_FIRE"]
    stubble = [f for f in all_fires if f.get("category") == "AGRICULTURAL_STUBBLE"]
    forest = [f for f in all_fires if f.get("category") == "FOREST_FIRE"]

    max_frp_point = max(all_fires, key=lambda x: x.get("frp", 0.0)) if all_fires else None

    return {
        "kpis": {
            "total_active_hotspots": len(all_fires),
            "critical_industrial_emergencies": len(emergencies),
            "persistent_industrial_flares": len(flares),
            "coal_mining_combustion_sites": len(coal_fires),
            "agricultural_stubble_fires": len(stubble),
            "forest_canopy_wildfires": len(forest),
            "industrial_noise_filtered_pct": round(
                ((len(stubble) + len(forest)) / len(all_fires) * 100) if all_fires else 0.0, 1
            )
        },
        "peak_anomaly": {
            "fire_id": max_frp_point.get("fire_id") if max_frp_point else None,
            "site_hint": max_frp_point.get("site_hint") if max_frp_point else None,
            "facility_name": max_frp_point.get("facility_name") if max_frp_point else None,
            "peak_frp_mw": max_frp_point.get("frp") if max_frp_point else 0.0,
            "anomaly_ratio": max_frp_point.get("anomaly_ratio") if max_frp_point else 1.0,
            "threat_level": max_frp_point.get("threat_level") if max_frp_point else "LOW"
        },
        "national_threat_posture": "RED_ALERT" if emergencies else "NOMINAL_SURVEILLANCE",
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    }


@app.get("/api/plume/{fire_id}", tags=["Simulation & Hazard Modeling"])
def get_plume_dispersion(fire_id: str) -> Dict[str, Any]:
    """
    Computes and returns a GeoJSON Polygon representing the downwind toxic dispersion
    hazard cone for a specific fire incident.
    """
    ingestion = firms_service.fetch_firms_data()
    all_fires = classify_fire_list(ingestion.get("data", []), filter_mode="all")

    target_fire = next((f for f in all_fires if f.get("fire_id") == fire_id), None)
    if not target_fire:
        raise HTTPException(status_code=404, detail=f"Fire incident with ID '{fire_id}' not found.")

    plume_geojson = calculate_plume_cone(
        lat=target_fire["latitude"],
        lon=target_fire["longitude"],
        frp=target_fire["frp"],
        wind_speed_kmh=target_fire.get("wind_speed_kmh", 18.0),
        wind_direction_deg=target_fire.get("wind_direction_deg", 225.0),
        fire_id=target_fire["fire_id"],
        category=target_fire.get("category", "CRITICAL_INDUSTRIAL_EMERGENCY")
    )

    return plume_geojson


@app.get("/api/incident/report/{fire_id}", tags=["Incident Response Dossiers"])
def get_incident_report(fire_id: str) -> Dict[str, Any]:
    """
    Generates an executive incident audit report formatted for the National Disaster Response Force (NDRF)
    and District Disaster Management Authority (DDMA).
    """
    ingestion = firms_service.fetch_firms_data()
    all_fires = classify_fire_list(ingestion.get("data", []), filter_mode="all")

    incident = next((f for f in all_fires if f.get("fire_id") == fire_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Fire incident with ID '{fire_id}' not found.")

    plume_geojson = calculate_plume_cone(
        lat=incident["latitude"],
        lon=incident["longitude"],
        frp=incident["frp"],
        wind_speed_kmh=incident.get("wind_speed_kmh", 18.0),
        wind_direction_deg=incident.get("wind_direction_deg", 225.0),
        fire_id=incident["fire_id"],
        category=incident.get("category", "CRITICAL_INDUSTRIAL_EMERGENCY")
    )
    plume_props = plume_geojson["properties"]

    return {
        "dossier_id": f"NDRF-DOSSIER-{fire_id}",
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "incident_summary": {
            "fire_id": incident["fire_id"],
            "category": incident.get("category"),
            "sub_category": incident.get("sub_category"),
            "threat_level": incident.get("threat_level"),
            "threat_score": incident.get("threat_score"),
            "anomaly_ratio": incident.get("anomaly_ratio"),
            "coordinates": {
                "latitude": incident["latitude"],
                "longitude": incident["longitude"]
            },
            "satellite_metadata": {
                "satellite": incident.get("satellite"),
                "instrument": incident.get("instrument"),
                "confidence": incident.get("confidence"),
                "acquisition_date": incident.get("acq_date"),
                "acquisition_time": incident.get("acq_time")
            }
        },
        "industrial_facility_impact": {
            "facility_name": incident.get("facility_name", "N/A (Off-facility Anomaly)"),
            "facility_id": incident.get("facility_id", "N/A"),
            "observed_frp_mw": incident.get("frp"),
            "baseline_frp_mw": incident.get("baseline_frp_mw", "N/A"),
            "critical_chemicals_present": incident.get("critical_chemicals", []),
            "emergency_contact": incident.get("emergency_contact", {})
        },
        "atmospheric_dispersion_assessment": {
            "hazard_tier": plume_props.get("hazard_tier"),
            "downwind_trajectory_bearing": f"{plume_props.get('downwind_azimuth_deg')}°",
            "wind_speed": f"{plume_props.get('wind_speed_kmh')} km/h",
            "toxic_plume_corridor_length": f"{plume_props.get('hazard_length_km')} km",
            "evacuation_zone_radius": f"{incident.get('hazard_radius_km', 2.0)} km",
            "public_warning_statement": plume_props.get("warning")
        },
        "tactical_response_plan": {
            "standard_operating_procedure": incident.get("actionable_sop"),
            "immediate_actions": [
                "1. Establish incident command post upwind of coordinates.",
                f"2. Initiate localized sirens and alert communities in {plume_props.get('downwind_azimuth_deg')}° bearing vector.",
                "3. Coordinate with industrial hazard safety officers for plant emergency shutdown."
            ]
        }
    }
