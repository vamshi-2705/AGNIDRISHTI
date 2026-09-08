"""
ASTRAFIRE - Calibrated High-Fidelity Indian Thermal Anomaly Dataset
Source Heritage: NASA FIRMS VIIRS (375m NRT Active Fire Product)
Sensors: VIIRS on Suomi-NPP (N), NOAA-20 (1), and NOAA-21 (2)

This dataset provides calibrated thermal anomalies across India:
- Critical industrial complexes (Jamnagar, Hazira, Manali, Visakhapatnam, Paradeep, Panipat)
- High-intensity emergency explosions (e.g. Jamnagar crude distillation unit breach)
- Subterranean coal fires (Jharia Coalfield)
- Agricultural stubble burning clusters (Punjab & Haryana agricultural belt)
- Forest canopy fires (Similipal & Bandipur National Parks)
"""

from typing import List, Dict, Any

CALIBRATED_INDIAN_FIRMS_DATA: List[Dict[str, Any]] = [
    # 1. Reliance Jamnagar Refinery - Catastrophic Storage Tank Breach / Emergency Explosion
    {
        "fire_id": "FIRMS-IND-2026-001",
        "latitude": 22.3582,
        "longitude": 69.8695,
        "brightness": 392.4,  # Kelvin (Extreme thermal signature)
        "scan": 0.41,
        "track": 0.38,
        "acq_date": "2026-09-08",
        "acq_time": "0845",
        "satellite": "N",
        "instrument": "VIIRS",
        "confidence": "high",
        "version": "2.0NRT",
        "bright_t31": 315.8,
        "frp": 284.6,  # MW (Standard baseline is ~45 MW; 6.3x baseline anomaly)
        "daynight": "D",
        "site_hint": "Reliance Jamnagar Refinery - Sector 4 Tank Farm",
        "wind_speed_kmh": 24.5,
        "wind_direction_deg": 235.0  # SW wind blowing NE toward populated buffer
    },
    # 2. Reliance Jamnagar Refinery - Routine Operational Flare Stack
    {
        "fire_id": "FIRMS-IND-2026-002",
        "latitude": 22.3610,
        "longitude": 69.8780,
        "brightness": 348.2,
        "scan": 0.39,
        "track": 0.37,
        "acq_date": "2026-09-08",
        "acq_time": "0845",
        "satellite": "N",
        "instrument": "VIIRS",
        "confidence": "high",
        "version": "2.0NRT",
        "bright_t31": 302.1,
        "frp": 42.1,  # MW (Within nominal operational baseline of 55 MW)
        "daynight": "D",
        "site_hint": "Reliance Jamnagar Refinery - Flare Stack Bravo",
        "wind_speed_kmh": 22.0,
        "wind_direction_deg": 230.0
    },
    # 3. Hazira Petrochemical Complex (Surat, Gujarat) - Routine Elevated Flare
    {
        "fire_id": "FIRMS-IND-2026-003",
        "latitude": 21.1125,
        "longitude": 72.6510,
        "brightness": 352.6,
        "scan": 0.40,
        "track": 0.38,
        "acq_date": "2026-09-08",
        "acq_time": "0850",
        "satellite": "1",
        "instrument": "VIIRS",
        "confidence": "high",
        "version": "2.0NRT",
        "bright_t31": 305.4,
        "frp": 38.5,  # MW (Nominal baseline: 40 MW)
        "daynight": "D",
        "site_hint": "ONGC Hazira Gas Processing Complex",
        "wind_speed_kmh": 18.2,
        "wind_direction_deg": 210.0
    },
    # 4. Manali Petrochemical Industrial Cluster (Chennai, Tamil Nadu) - Critical Polymer Reactor Fire
    {
        "fire_id": "FIRMS-IND-2026-004",
        "latitude": 13.1685,
        "longitude": 80.2612,
        "brightness": 386.1,
        "scan": 0.42,
        "track": 0.39,
        "acq_date": "2026-09-08",
        "acq_time": "0915",
        "satellite": "2",
        "instrument": "VIIRS",
        "confidence": "high",
        "version": "2.0NRT",
        "bright_t31": 312.0,
        "frp": 196.8,  # MW (Baseline: 30 MW; 6.5x anomaly)
        "daynight": "D",
        "site_hint": "Manali Petrochemicals Plant II",
        "wind_speed_kmh": 19.8,
        "wind_direction_deg": 85.0  # Easterly sea breeze pushing plume inland
    },
    # 5. Visakhapatnam Industrial SEZ / HPCL Coastal Refinery - Operational Flare
    {
        "fire_id": "FIRMS-IND-2026-005",
        "latitude": 17.6912,
        "longitude": 83.2530,
        "brightness": 349.0,
        "scan": 0.38,
        "track": 0.37,
        "acq_date": "2026-09-08",
        "acq_time": "0910",
        "satellite": "1",
        "instrument": "VIIRS",
        "confidence": "high",
        "version": "2.0NRT",
        "bright_t31": 303.7,
        "frp": 44.0,  # MW (Baseline: 45 MW)
        "daynight": "D",
        "site_hint": "HPCL Visakh Refinery Crude Unit Flare",
        "wind_speed_kmh": 16.5,
        "wind_direction_deg": 140.0
    },
    # 6. Paradeep IOCL Refinery (Odisha) - Operational Flare
    {
        "fire_id": "FIRMS-IND-2026-006",
        "latitude": 20.2850,
        "longitude": 86.6420,
        "brightness": 354.2,
        "scan": 0.43,
        "track": 0.40,
        "acq_date": "2026-09-08",
        "acq_time": "0920",
        "satellite": "N",
        "instrument": "VIIRS",
        "confidence": "high",
        "version": "2.0NRT",
        "bright_t31": 306.8,
        "frp": 51.2,  # MW (Baseline: 55 MW)
        "daynight": "D",
        "site_hint": "IOCL Paradeep Integrated Refinery Flare",
        "wind_speed_kmh": 15.0,
        "wind_direction_deg": 175.0
    },
    # 7. Panipat IOCL Petrochemical Complex (Haryana) - Industrial Flare
    {
        "fire_id": "FIRMS-IND-2026-007",
        "latitude": 29.4670,
        "longitude": 76.9240,
        "brightness": 351.1,
        "scan": 0.40,
        "track": 0.38,
        "acq_date": "2026-09-08",
        "acq_time": "0840",
        "satellite": "1",
        "instrument": "VIIRS",
        "confidence": "nominal",
        "version": "2.0NRT",
        "bright_t31": 304.5,
        "frp": 46.8,  # MW (Baseline: 50 MW)
        "daynight": "D",
        "site_hint": "Panipat Naphtha Cracker Flare",
        "wind_speed_kmh": 12.0,
        "wind_direction_deg": 310.0
    },
    # 8. Jharia Coalfield (Dhanbad, Jharkhand) - Uncontrolled Subsurface Coal Seam Fire
    {
        "fire_id": "FIRMS-IND-2026-008",
        "latitude": 23.7480,
        "longitude": 86.4190,
        "brightness": 361.5,
        "scan": 0.42,
        "track": 0.39,
        "acq_date": "2026-09-08",
        "acq_time": "0905",
        "satellite": "N",
        "instrument": "VIIRS",
        "confidence": "high",
        "version": "2.0NRT",
        "bright_t31": 309.2,
        "frp": 68.4,  # MW (Coal seam thermal emission)
        "daynight": "D",
        "site_hint": "Jharia Opencast Coal Pit IX Fire",
        "wind_speed_kmh": 11.4,
        "wind_direction_deg": 280.0
    },
    # 9. Sangrur, Punjab - Intensive Agricultural Paddy Crop Residue (Stubble) Burning
    {
        "fire_id": "FIRMS-IND-2026-009",
        "latitude": 30.2450,
        "longitude": 75.8420,
        "brightness": 329.8,
        "scan": 0.38,
        "track": 0.37,
        "acq_date": "2026-09-08",
        "acq_time": "0835",
        "satellite": "1",
        "instrument": "VIIRS",
        "confidence": "nominal",
        "version": "2.0NRT",
        "bright_t31": 298.5,
        "frp": 21.4,  # MW (Typical seasonal stubble fire)
        "daynight": "D",
        "site_hint": "Agricultural Field (Paddy Residue), Sangrur",
        "wind_speed_kmh": 14.0,
        "wind_direction_deg": 315.0
    },
    # 10. Karnal, Haryana - Agricultural Crop Residue (Stubble) Burning
    {
        "fire_id": "FIRMS-IND-2026-010",
        "latitude": 29.6850,
        "longitude": 76.9900,
        "brightness": 326.4,
        "scan": 0.39,
        "track": 0.37,
        "acq_date": "2026-09-08",
        "acq_time": "0838",
        "satellite": "2",
        "instrument": "VIIRS",
        "confidence": "nominal",
        "version": "2.0NRT",
        "bright_t31": 297.0,
        "frp": 18.2,  # MW (Crop burning)
        "daynight": "D",
        "site_hint": "Agricultural Cropland, Karnal",
        "wind_speed_kmh": 13.5,
        "wind_direction_deg": 320.0
    },
    # 11. Similipal Biosphere Reserve (Mayurbhanj, Odisha) - Dry Deciduous Forest Canopy Fire
    {
        "fire_id": "FIRMS-IND-2026-011",
        "latitude": 21.8600,
        "longitude": 86.3500,
        "brightness": 341.2,
        "scan": 0.44,
        "track": 0.41,
        "acq_date": "2026-09-08",
        "acq_time": "0925",
        "satellite": "N",
        "instrument": "VIIRS",
        "confidence": "high",
        "version": "2.0NRT",
        "bright_t31": 302.8,
        "frp": 54.6,  # MW (Forest wildfire)
        "daynight": "D",
        "site_hint": "Similipal National Park Dense Forest",
        "wind_speed_kmh": 17.0,
        "wind_direction_deg": 190.0
    },
    # 12. Bandipur National Park (Chamarajanagar, Karnataka) - Forest Undergrowth Wildfire
    {
        "fire_id": "FIRMS-IND-2026-012",
        "latitude": 11.6650,
        "longitude": 76.6320,
        "brightness": 338.5,
        "scan": 0.40,
        "track": 0.38,
        "acq_date": "2026-09-08",
        "acq_time": "0930",
        "satellite": "1",
        "instrument": "VIIRS",
        "confidence": "nominal",
        "version": "2.0NRT",
        "bright_t31": 300.9,
        "frp": 41.3,  # MW (Forest wildfire)
        "daynight": "D",
        "site_hint": "Bandipur Tiger Reserve Southern Range",
        "wind_speed_kmh": 14.2,
        "wind_direction_deg": 240.0
    }
]
