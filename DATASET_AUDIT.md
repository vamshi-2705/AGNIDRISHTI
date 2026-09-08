# ASTRAFIRE - DATASET PROVENANCE & LINEAGE AUDIT
**Smart India Hackathon (SIH 2026) | Problem Statement 26162**  
**Organization:** National Technical Research Organisation (NTRO)  
**Deliverables Audited:**  
- **Deliverable i:** Classification and segregation of Industrial fires from forest fires and other natural fires.  
- **Deliverable ii:** GIS based solution for data storage, visualization of the output as an overlay over maps.

---

## 1. Traceability & Lineage Matrix

| # | Dataset Name | Primary Custodian / Source Portal | Sensor / Product Resolution | Backend File & Functions | Data Transformation & NTRO Deliverable Fulfillment |
|---|---|---|---|---|---|
| **1** | **NASA FIRMS** (Fire Information for Resource Management System) | NASA EOSDIS / LANCE  <br>`https://firms.modaps.eosdis.nasa.gov/api/country/csv` | VIIRS (375m spatial resolution) on Suomi-NPP, NOAA-20 & NOAA-21 satellites | `firms_service.py` (`fetch_firms_data`, `_parse_firms_csv`) & `mock_firms_data.py` (`CALIBRATED_INDIAN_FIRMS_DATA`) | Ingests near real-time thermal anomalies across India. Normalizes latitude, longitude, brightness temperature ($T_4$), Fire Radiative Power (FRP in Megawatts), satellite pass, and acquisition timestamps into normalized JSON payloads. |
| **2** | **OpenStreetMap (OSM) Critical Indian Industrial Infrastructure** | OpenStreetMap Foundation / Overpass Turbo  <br>`https://overpass-turbo.eu` | Vector boundary polygons & land-use footprints (Sub-meter accuracy) | `industrial_db.py` (`INDUSTRIAL_FACILITIES`, `find_facility_for_point`, `get_facilities_geojson`) | Ingests geographic polygons tagged with `industrial=oil_refinery`, `landuse=industrial`, `power=plant`, `man_made=storage_tank`. Maps complexes including Reliance Jamnagar, Hazira, Manali, Visakhapatnam, Paradeep, Panipat, and Jharia. Stores operational baseline FRP thresholds and critical hazardous chemicals for rapid spatial bounding. |
| **3** | **ESA WorldCover 10m Land-Use / Land-Cover (LULC)** | European Space Agency (ESA)  <br>`https://worldcover2021.esa.int` | Sentinel-1 and Sentinel-2 optical/radar composite at 10-meter resolution | `classifier.py` (`classify_thermal_point`, `classify_fire_list`) | **Fulfills Deliverable i**: Matches coordinates falling outside industrial boundaries against cropland belts (e.g. Indo-Gangetic Plains) to identify **Agricultural Stubble Burning**, and against national parks/tree canopies (e.g. Similipal, Bandipur) to identify **Forest Wildfires**. Filters out benign agricultural noise. |
| **4** | **Meteorological Wind Vector Field** | NOAA GFS / OpenWeather API  <br>`https://openweathermap.org/api` | Real-time global atmospheric wind vectors (10m surface winds) | `plume_service.py` (`calculate_plume_cone`) | Takes wind velocity ($\text{km/h}$), source bearing, and fire FRP. Projects a downwind Gaussian trigonometric dispersion cone (GeoJSON Polygon) along the downwind azimuth ($\theta_{\text{downwind}} = (\theta_{\text{wind}} + 180^\circ) \pmod{360^\circ}$) to demarcate toxic gas exposure corridors for NDRF evacuation. |

---

## 2. Granular Data Flow Architecture

```
[ NASA FIRMS VIIRS (375m) ]  ---> [ firms_service.py ]
                                         │
                                         ▼
                            [ Raw Thermal Anomaly Stream ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [ OSM Industrial Database ]                     [ ESA WorldCover LULC ]
        (industrial_db.py)                              (classifier.py)
                 │                                               │
                 ├─ Inside Facility Boundary?                    ├─ In Indo-Gangetic Cropland?
                 │   ├─ FRP <= Max Normal Flare?                 │   └─> AGRICULTURAL_STUBBLE (Green)
                 │   │   └─> PERSISTENT_FLARE (Orange)           │
                 │   └─ FRP > 2.2x Baseline?                     ├─ In Forest Canopy Reserve?
                 │       └─> CRITICAL_EMERGENCY (Red)            │   └─> FOREST_FIRE (Green)
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                             [ Enriched Fire Entity ]
                                         │
                                         ▼
                         [ Atmospheric Wind Vectors ]
                             (plume_service.py)
                                         │
                                         ▼
                 [ Dynamic Downwind Dispersion Cone (GeoJSON) ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         [ /api/fires ]                               [ /api/facilities ]
         [ /api/plume/{id} ]                          [ /api/incident/report/{id} ]
```

---

## 3. Mandatory Deliverable Compliance Verification

### Deliverable i: Classification and Segregation
- **Segregation Rule 1 (Industrial Emergency vs. Flare):** A thermal point inside an industrial facility boundary (e.g. Reliance Jamnagar) with FRP $= 284.6\text{ MW}$ against a historical baseline of $45\text{ MW}$ yields an anomaly ratio of $6.3\times$. This immediately triggers `CRITICAL_INDUSTRIAL_EMERGENCY` (Threat: CRITICAL, Red `#EF4444`).
- **Segregation Rule 2 (Routine Flare):** A thermal point inside Jamnagar with FRP $= 42.1\text{ MW} \le 80.0\text{ MW}$ baseline is segregated as `PERSISTENT_INDUSTRIAL_FLARE` (Threat: MODERATE, Orange `#F97316`).
- **Segregation Rule 3 (Extractive Mining):** Persistent thermal emissions in Jharia coal pits are segregated as `COAL_MINING_FIRE` (Threat: MODERATE, Yellow `#EAB308`).
- **Segregation Rule 4 (Agricultural Stubble Burning):** Detections in Punjab/Haryana croplands with moderate FRP ($\approx 18\text{--}25\text{ MW}$) are categorized as `AGRICULTURAL_STUBBLE` (Threat: LOW, Green `#22C55E`), filtering out biomass noise.
- **Segregation Rule 5 (Forest Wildfire):** Detections in Similipal or Bandipur are tagged as `FOREST_FIRE` (Threat: LOW, Emerald `#10B981`).

### Deliverable ii: GIS Storage, Visualization & Overlays
- All spatial boundaries (`/api/facilities`) and smoke dispersion cones (`/api/plume/{fire_id}`) conform strictly to **RFC 7946 GeoJSON** specifications.
- Coordinate Reference System: Standard **WGS84 (EPSG:4326)**, allowing zero-transformation rendering on Leaflet, Mapbox GL, and Cesium JS.
