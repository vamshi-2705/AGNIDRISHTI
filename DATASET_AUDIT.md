# ASTRAFIRE - DATASET PROVENANCE & LINEAGE AUDIT
**Smart India Hackathon (SIH 2026) | Problem Statement 26162**  
**Organization:** National Technical Research Organisation (NTRO)  
**Deliverables Audited:**  
- **Deliverable i:** Classification and segregation of Industrial fires from forest fires and other natural fires.  
- **Deliverable ii:** GIS based solution for data storage, visualization of the output as an overlay over maps.

---

## 1. Traceability & Lineage Matrix (Full Live Telemetry Status)

| # | Dataset / Telemetry Feed | Custodian & Source Endpoint | Live Telemetry Status | Implementation File | Role in NTRO Problem Statement |
|---|---|---|---|---|---|
| **1** | **NASA FIRMS Satellite Thermal Stream** | NASA EOSDIS / LANCE <br>`https://firms.modaps.eosdis.nasa.gov/api/area/csv` | **100% REAL-TIME LIVE** | `firms_service.py` | Ingests live VIIRS 375m thermal infrared anomaly detections across the Indian subcontinent (`68°E, 6°N` to `97°E, 37°N`). |
| **2** | **Meteorological Atmospheric Wind Vectors** | Open-Meteo Atmospheric Models (NOAA GFS / ECMWF) <br>`https://api.open-meteo.com/v1/forecast` | **100% REAL-TIME LIVE** | `plume_service.py` | Dynamically queries live 10m surface wind speed and wind direction for the exact coordinates of any fire to project dynamic Gaussian toxic plume dispersion cones. |
| **3** | **OpenStreetMap (OSM) Industrial Infrastructure** | OpenStreetMap Foundation / Overpass API <br>`https://lz4.overpass-api.de/api/interpreter` | **100% REAL-TIME LIVE API** | `industrial_db.py` | Dynamically executes spatial Overpass queries for industrial tags (`industrial=oil_refinery`, `landuse=industrial`, `power=plant`) intersecting detection points, coupled with high-speed verified baseline polygons. |
| **4** | **ESA WorldCover 10m Land-Use / Land-Cover (LULC)** | European Space Agency (ESA) <br>`https://worldcover2021.esa.int` | **ANNUAL SATELLITE BASELINE** | `classifier.py` | **Fulfills Deliverable i**: Matches coordinates falling outside industrial boundaries against cropland belts (Indo-Gangetic, Cauvery) and forest reserves (Similipal, Bandipur) to filter benign agricultural/forest noise. |
| **5** | **Administrative Reverse Geocoding** | OpenStreetMap Nominatim Live Engine <br>`https://nominatim.openstreetmap.org/reverse` | **100% REAL-TIME LIVE API** | `geocoding_service.py` | Queries live OpenStreetMap reverse geocoding to resolve exact real-time village, taluka, district, and state addresses for any satellite hotspot coordinates. |

---

## 2. Granular Data Flow Architecture

```
[ NASA FIRMS VIIRS (375m) LIVE ]  ---> [ firms_service.py ]
                                              │
                                              ▼
                                 [ Raw Thermal Anomaly Stream ]
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
        [ Live OSM Overpass Query ]                     [ ESA WorldCover 10m LULC ]
           (industrial_db.py)                              (classifier.py)
                     │                                                 │
                     ├─ Inside Facility Perimeter?                     ├─ In Agrarian Cropland Belt?
                     │   ├─ FRP <= Max Normal Flare?                   │   └─> AGRICULTURAL_STUBBLE (Green)
                     │   │   └─> PERSISTENT_FLARE (Orange)             │
                     │   └─ FRP > 2.2x Baseline?                       ├─ In Protected Forest Canopy?
                     │       └─> CRITICAL_EMERGENCY (Red)              │   └─> FOREST_FIRE (Green)
                     │                                                 │
                     └────────────────────────┬────────────────────────┘
                                              │
                                              ▼
                         [ Live OSM Nominatim Reverse Geocoder ]
                                   (geocoding_service.py)
                                              │
                                              ▼
                         [ Live Open-Meteo Atmospheric Wind ]
                                   (plume_service.py)
                                              │
                                              ▼
                      [ Dynamic Downwind Dispersion Cone (GeoJSON) ]
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
             [ /api/fires ]                               [ /api/facilities ]
             [ /api/plume/{id} ]                          [ /api/osm/live-verify ]
```
