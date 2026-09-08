# ASTRAFIRE - FRONTEND HANDOVER SPECIFICATION
**Team Integration Guide for Frontend Engineers**  
**Backend Base URL:** `http://127.0.0.1:8000` (or `http://localhost:8000`)  
**Interactive API Docs:** `http://127.0.0.1:8000/docs`

---

## 1. Recommended Frontend Tech Stack

To achieve maximum visual polish and hackathon-winning aesthetics, the frontend team should use:
- **Framework:** Next.js 14 / Vite + React 18 (TypeScript recommended)
- **Styling:** Tailwind CSS (Dark Mode theme with Slate/Zinc palette, vibrant neon accents: `#EF4444` red, `#F97316` orange, `#22C55E` green, `#3B82F6` blue)
- **Mapping Engine:** Leaflet (via `react-leaflet`) or Mapbox GL JS / MapLibre GL
- **State & Data Fetching:** TanStack Query (`@tanstack/react-query`) or native `fetch` / `axios`
- **Icons:** `lucide-react` (Flame, AlertTriangle, ShieldCheck, Wind, Radio, Compass)

---

## 2. API Endpoints Specification

### A. System Health & Metadata
- **Endpoint:** `GET /`
- **Use Case:** App initialization check, status badge ("Backend: OPERATIONAL").
```json
{
  "system": "ASTRAFIRE Backend Engine",
  "status": "OPERATIONAL",
  "sih_problem_id": "SIH26162",
  "theme": "Disaster Management / Geospatial Intelligence",
  "version": "1.0.0"
}
```

---

### B. Thermal Anomaly Points Layer
- **Endpoint:** `GET /api/fires?filter_mode={all|industrial|emergencies}`
- **Parameters:**
  - `filter_mode`: `"all"` (default) | `"industrial"` | `"emergencies"`
- **Response Sample:**
```json
{
  "status": "success",
  "filter_applied": "all",
  "total_records": 12,
  "source": "CALIBRATED_OFFLINE_DATASET",
  "data": [
    {
      "fire_id": "FIRMS-IND-2026-001",
      "latitude": 22.3582,
      "longitude": 69.8695,
      "brightness": 392.4,
      "frp": 284.6,
      "category": "CRITICAL_INDUSTRIAL_EMERGENCY",
      "sub_category": "Major Hydrocarbon Storage Breach / Reactor Explosion",
      "is_industrial": true,
      "is_emergency": true,
      "threat_level": "CRITICAL",
      "threat_color": "#EF4444",
      "threat_score": 98,
      "facility_name": "Reliance Jamnagar Refining & Petrochemical Complex",
      "baseline_frp_mw": 45.0,
      "anomaly_ratio": 6.32,
      "critical_chemicals": ["Crude Hydrocarbons", "Benzene", "Toluene", "Hydrogen Sulfide", "Naphtha"],
      "hazard_radius_km": 5.0,
      "wind_speed_kmh": 24.5,
      "wind_direction_deg": 235.0,
      "actionable_sop": "EMERGENCY PROTOCOL LEVEL-1 ACTIVATED: Notify 6th Bn NDRF (Vadodara)..."
    }
  ]
}
```

---

### C. Industrial Facility Boundaries (OSM Polygons)
- **Endpoint:** `GET /api/facilities`
- **Use Case:** Add directly as a GeoJSON layer on Leaflet (`<GeoJSON data={facilitiesGeoJson} />`). Renders facility boundary borders on the map.
- **Response Sample (GeoJSON FeatureCollection):**
```json
{
  "type": "FeatureCollection",
  "metadata": { "total_facilities": 7, "crs": "EPSG:4326" },
  "features": [
    {
      "type": "Feature",
      "id": "IND-FAC-001",
      "properties": {
        "facility_id": "IND-FAC-001",
        "name": "Reliance Jamnagar Refining & Petrochemical Complex",
        "category": "Petrochemical & Crude Refining",
        "baseline_frp_mw": 45.0,
        "max_normal_frp_mw": 80.0
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[69.84, 22.33], [69.91, 22.33], [69.91, 22.385], [69.84, 22.385], [69.84, 22.33]]]
      }
    }
  ]
}
```

---

### D. Executive Dashboard Summary KPIs
- **Endpoint:** `GET /api/analytics/summary`
- **Use Case:** Powers top stats bar cards.
- **Response Sample:**
```json
{
  "kpis": {
    "total_active_hotspots": 12,
    "critical_industrial_emergencies": 2,
    "persistent_industrial_flares": 5,
    "coal_mining_combustion_sites": 1,
    "agricultural_stubble_fires": 2,
    "forest_canopy_wildfires": 2,
    "industrial_noise_filtered_pct": 33.3
  },
  "peak_anomaly": {
    "fire_id": "FIRMS-IND-2026-001",
    "facility_name": "Reliance Jamnagar Refining & Petrochemical Complex",
    "peak_frp_mw": 284.6,
    "anomaly_ratio": 6.32,
    "threat_level": "CRITICAL"
  },
  "national_threat_posture": "RED_ALERT",
  "last_updated": "2026-09-08 14:25:00 UTC"
}
```

---

### E. Toxic Smoke Plume Dispersion Cone (GeoJSON)
- **Endpoint:** `GET /api/plume/{fire_id}`
- **Example:** `GET /api/plume/FIRMS-IND-2026-001`
- **Use Case:** When a user clicks on an incident marker, render this GeoJSON polygon as a semi-transparent hazard cone downwind of the fire.
- **Response Sample (GeoJSON Feature):**
```json
{
  "type": "Feature",
  "properties": {
    "fire_id": "FIRMS-IND-2026-001",
    "hazard_tier": "TIER-1 CRITICAL TOXIC HAZARD",
    "hazard_length_km": 18.4,
    "wind_speed_kmh": 24.5,
    "wind_direction_deg": 235.0,
    "downwind_azimuth_deg": 55.0,
    "fill_color": "#DC2626",
    "fill_opacity": 0.35,
    "warning": "IMMEDIATE EVACUATION MANDATED: High toxic combustion density..."
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[69.8695, 22.3582], [69.9675, 22.4278], ..., [69.8695, 22.3582]]]
  }
}
```

---

### F. NDRF Incident Dossier / Emergency Briefing
- **Endpoint:** `GET /api/incident/report/{fire_id}`
- **Use Case:** Powers the "Download / View Emergency Dossier" modal for disaster management officials.
- **Response Sample:**
```json
{
  "dossier_id": "NDRF-DOSSIER-FIRMS-IND-2026-001",
  "generated_at": "2026-09-08 14:25:00 UTC",
  "incident_summary": {
    "fire_id": "FIRMS-IND-2026-001",
    "category": "CRITICAL_INDUSTRIAL_EMERGENCY",
    "threat_level": "CRITICAL",
    "threat_score": 98,
    "anomaly_ratio": 6.32
  },
  "industrial_facility_impact": {
    "facility_name": "Reliance Jamnagar Refining & Petrochemical Complex",
    "observed_frp_mw": 284.6,
    "baseline_frp_mw": 45.0,
    "critical_chemicals_present": ["Crude Hydrocarbons", "Benzene", "Toluene", "Hydrogen Sulfide", "Naphtha"],
    "emergency_contact": {
      "ndrf_battalion": "6th Bn NDRF (Vadodara)",
      "control_room": "+91-265-2830491"
    }
  },
  "atmospheric_dispersion_assessment": {
    "hazard_tier": "TIER-1 CRITICAL TOXIC HAZARD",
    "downwind_trajectory_bearing": "55.0°",
    "toxic_plume_corridor_length": "18.4 km",
    "evacuation_zone_radius": "5.0 km"
  },
  "tactical_response_plan": {
    "standard_operating_procedure": "EMERGENCY PROTOCOL LEVEL-1 ACTIVATED...",
    "immediate_actions": [
      "1. Establish incident command post upwind of coordinates.",
      "2. Initiate localized sirens and alert communities in 55.0° bearing vector.",
      "3. Coordinate with industrial hazard safety officers for plant emergency shutdown."
    ]
  }
}
```

---

## 3. Recommended Component Layout Blueprint

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  ASTRAFIRE | NTRO INDUSTRIAL FIRE & THERMAL INTELLIGENCE PLATFORM  [RED ALERT BADGE]   │
├─────────────────┬──────────────────┬──────────────────┬─────────────────┬──────────────┤
│ TOTAL DETECTIONS│ EMERGENCIES      │ ROUTINE FLARES   │ NOISE FILTERED  │ PEAK FRP     │
│       12        │   2 (CRITICAL)   │        5         │     33.3%       │ 284.6 MW     │
├─────────────────┴──────────────────┴──────────────────┴─────────────────┴──────────────┤
│ [SIDEBAR CONTROLS]                 │ [MAIN GIS VIEWPORT (Dark Mode Mapbox/Leaflet)]   │
│                                    │                                                  │
│ AI Noise Filter:                   │   • Indian Subcontinent View (Lat: 20.5, Lng: 78.9)│
│  ( ) All Hotspots                  │   • Facility Polygons Layer (Subtle blue borders)│
│  ( ) Industrial Only               │   • Fire Markers:                                │
│  (•) Critical Emergencies Only     │       - Red Pulsing Dot: Emergency Breach        │
│                                    │       - Orange Dot: Routine Refinery Flare Stack │
│ Hotspot Feed List:                 │       - Yellow Dot: Coal Seam Combustion         │
│  1. Jamnagar Tank Breach (284 MW)  │       - Green Dot: Stubble / Wildfire            │
│  2. Manali Polymer Fire (196 MW)   │                                                  │
│  3. Hazira Gas Flare (38 MW)       │   • When Marker Clicked:                         │
│  4. Paradeep Flare (51 MW)         │     - Plume Cone Layer activates (Red wedge)     │
│                                    │     - Opens Floating Inspector Drawer (Right)    │
│                                    │                                                  │
│                                    ├──────────────────────────────────────────────────┤
│                                    │ [FLOATING INCIDENT INSPECTOR DRAWER]             │
│                                    │ Facility: Reliance Jamnagar Refinery             │
│                                    │ Threat: CRITICAL (Score: 98/100)                 │
│                                    │ Observed FRP: 284.6 MW (6.3x Baseline)           │
│                                    │ Wind: 24.5 km/h @ 235° SW -> Downwind: 55° NE    │
│                                    │ Hazard Corridor: 18.4 km                         │
│                                    │ Evacuation Radius: 5.0 km                        │
│                                    │ Chemicals: Benzene, H2S, Naphtha                 │
│                                    │ Action: [View NDRF Tactical Dossier Modal]       │
└────────────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 4. How Teammates Should Connect Frontend to Backend

1. **Start the backend server:**
   Double-click `run_backend.bat` or run:
   ```bash
   python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **In your React / Next.js `.env.local` or configuration file:**
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
   ```
3. **Fetch data:**
   ```typescript
   // Example React hook
   import { useEffect, useState } from 'react';

   export function useFires(filterMode = 'all') {
     const [fires, setFires] = useState([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       fetch(`http://127.0.0.1:8000/api/fires?filter_mode=${filterMode}`)
         .then((res) => res.json())
         .then((data) => {
           setFires(data.data);
           setLoading(false);
         });
     }, [filterMode]);

     return { fires, loading };
   }
   ```

---

## 5. Post-Frontend Roadmap: What the Whole Team Must Do to Win SIH 2026

Once the frontend code is drafted, execute this 3-step action plan to win:

### Step 1: Joint Integration & Edge Case Hardening (1 Hour)
- Test the **AI Filter toggle**: Switching between `"all"`, `"industrial"`, and `"emergencies"` must update map markers instantly without lag.
- Test the **Plume Cone rendering**: Clicking the Jamnagar emergency must draw the red dispersion wedge facing northeast (55° downwind azimuth).
- Test offline stability: Unplug your laptop's WiFi; verify that the backend and frontend continue to run smoothly with zero crashes using the calibrated dataset.

### Step 2: The 3-Minute Hackathon Pitch Script
1. **Minute 1 - The Problem & NTRO Challenge:**
   Show the raw NASA FIRMS map cluttered with thousands of crop stubble dots. Explain how real industrial fires get lost in the noise, causing delayed emergency responses.
2. **Minute 2 - The ASTRAFIRE Solution & Live Demo:**
   - Flip the "AI Industrial Filter" switch. Watch 90% of rural noise vanish, leaving only real facilities.
   - Show how the backend compares Jamnagar's 284 MW FRP against its 45 MW baseline.
   - Click the Jamnagar emergency: the Pasquill-Gifford toxic plume cone renders instantly.
   - Click "Generate NDRF Dossier" to show the actionable incident report ready for deployment.
3. **Minute 3 - Architecture & Feasibility:**
   Emphasize the microsecond GeoJSON speed, automated NASA VIIRS ingestion, OpenStreetMap boundary integration, and production-ready REST APIs.

### Step 3: Jury Q&A Preparedness
- **Question:** *"How do you handle satellite revisit delays (e.g. VIIRS passes twice daily)?"*  
  **Answer:** *"Our architecture is sensor-agnostic. We ingest VIIRS 375m for high thermal resolution, but our pipeline is ready to ingest geostationary INSAT-3D/3DR (every 15 minutes) and Sentinel-3 SLSTR data via the exact same ingestion interface."*
