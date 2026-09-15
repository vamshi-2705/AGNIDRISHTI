# AGNIDRISHTI (अग्निदृष्टि)

> **Geospatial AI Industrial Fire Surveillance, Baseline Profiling & Plume Dispersion Engine**  
> **Smart India Hackathon (SIH 2026)** | **Problem Statement 26162**  
> **Ministry / Organisation**: National Technical Research Organisation (NTRO)  
> **Theme**: Disaster Management / Geospatial Intelligence

---

## Architecture Overview

AGNIDRISHTI is a high-performance GIS surveillance platform combining satellite remote sensing, OpenStreetMap industrial infrastructures, and Gaussian atmospheric dispersion modeling:

1. **Multi-Spectral Satellite Ingestion**: Direct ingestion of NASA FIRMS VIIRS 375m Near-Real-Time observations across S-NPP, NOAA-20, and NOAA-21 satellites.
2. **AI Classification & Segregation**: Segregates critical industrial emergencies from routine flaring, coal combustion, and agricultural stubble burning.
3. **Gaussian Dispersion Modeling**: Computes downwind atmospheric dispersion cones using real-time atmospheric wind velocity and azimuth from Open-Meteo.
4. **Community Exposure Assessment**: Spatially intersects dispersion corridors with settlements, schools, and hospitals from OpenStreetMap.
5. **3D Incident Inspection Mode**: Oblique 3D geospatial environment powered by CesiumJS for deep investigation of detected anomalies.

---

## 3D Incident Inspection Mode

AGNIDRISHTI provides a dedicated **3D Incident Inspection** mode built using CesiumJS to inspect detected thermal events with true 3D spatial context.

### Evaluator Workflow:
1. **Select a Thermal Event**: Choose any authentic thermal event in the 2D Operations Sidebar or click an event pin on the Leaflet 2D map.
2. **Click `[ 3D INSPECT ]`**: Click the `[ 3D INSPECT ]` button in the Incident Inspector drawer or header.
3. **Oblique Camera Fly-To**: The 3D camera smoothly flies to the exact coordinates (`latitude`, `longitude`) of the selected FIRMS event at an oblique -35° angle, placing the thermal anomaly near the center of the viewport.
4. **Inspect Industrial Context**: Inspect OpenStreetMap industrial facility boundaries, baseline comparisons, and satellite imagery without synthetic or fabricated 3D refinery structures.
5. **Inspect Dispersion & Community Exposure**: View the estimated downwind dispersion corridor and affected sensitive locations (settlements, schools, hospitals) with highlighted `[IN PLUME]` indicators.
6. **Camera Recall & Layer Toggles**: Click `[ LOCATE EVENT ]` to return the camera to the anomaly at any time. Toggle contextual overlays (Hotspot, Facility, Dispersion, Receptors).
7. **Return to 2D**: Click `[ 2D VIEW / EXIT 3D ]` to return immediately to the Leaflet 2D operational map with all state preserved.

### Technical Honesty & Scientific Interpretation:
- **Thermal Observation**: Provided by authentic NASA FIRMS VIIRS satellite sensors.
- **Geographic Coordinate**: The exact latitude and longitude reported by the satellite observation.
- **Industrial Context**: Real OpenStreetMap boundary polygons and historical operational baselines.
- **Satellite Visual Context**: True high-resolution satellite imagery via Esri World Imagery.
- **Estimated Dispersion**: Gaussian dispersion cone representing the estimated downwind hazard corridor based on real-time Open-Meteo wind. *Described strictly as "Estimated Dispersion" rather than confirmed toxic smoke.*
- **Estimated Community Exposure**: Dynamic spatial intersection between downwind dispersion geometry and nearby sensitive receptors.

---

## Configuration & Environment Variables

Create `.env` in the root or `frontend/.env` using `.env.example`:

```bash
# Optional: Cesium Ion Token for 3D world terrain elevation
# Note: CesiumJS operates completely without a token using Esri World Imagery and ellipsoid terrain.
VITE_CESIUM_ION_TOKEN=

# Backend API URL
VITE_API_BASE_URL=http://127.0.0.1:8000

# Backend Configuration
NASA_FIRMS_MAP_KEY=
```

---

## Quick Start

### 1. Start Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Backend runs at `http://127.0.0.1:8000`.

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

### 3. Run Automated Tests
```bash
# Backend unit & integrity tests
cd backend
python -m pytest test_3d_inspection_integrity.py test_community_exposure.py test_deduplication_history.py test_missing_wind_fallback.py test_multi_satellite_firms.py

# Frontend production bundle build
cd ../frontend
npm run build
```
