/**
 * Calibrated Fallback Dataset for AGNIDRISHTI Frontend
 * Provides fail-safe operational continuity if backend is initializing or offline.
 */

export const FALLBACK_SUMMARY = {
  kpis: {
    total_active_hotspots: 12,
    critical_industrial_emergencies: 2,
    persistent_industrial_flares: 5,
    coal_mining_combustion_sites: 1,
    agricultural_stubble_fires: 2,
    forest_canopy_wildfires: 2,
    industrial_noise_filtered_pct: 33.3
  },
  peak_anomaly: {
    fire_id: "FIRMS-IND-2026-001",
    site_hint: "Reliance Jamnagar Refinery - Sector 4 Tank Farm",
    facility_name: "Reliance Jamnagar Refining & Petrochemical Complex",
    peak_frp_mw: 284.6,
    anomaly_ratio: 6.32,
    threat_level: "CRITICAL"
  },
  national_threat_posture: "RED_ALERT",
  last_updated: "2026-09-08 15:20:00 UTC"
};

export const FALLBACK_FIRES = [
  {
    fire_id: "FIRMS-IND-2026-001",
    latitude: 22.3582,
    longitude: 69.8695,
    brightness: 392.4,
    frp: 284.6,
    category: "CRITICAL_INDUSTRIAL_EMERGENCY",
    sub_category: "Major Hydrocarbon Storage Breach / Reactor Explosion",
    is_industrial: true,
    is_emergency: true,
    threat_level: "CRITICAL",
    threat_color: "#EF4444",
    threat_score: 98,
    facility_id: "IND-FAC-001",
    facility_name: "Reliance Jamnagar Refining & Petrochemical Complex",
    site_hint: "Reliance Jamnagar Refinery - Sector 4 Tank Farm",
    location: {
      district: "Jamnagar",
      state: "Gujarat",
      region: "Gulf of Kutch Refining & Heavy Petrochemical Belt",
      formatted_coords: "22.35820° N, 69.86950° E",
      location_summary: "Reliance Jamnagar Refinery, Jamnagar, Gujarat, India"
    },
    baseline_frp_mw: 45.0,
    anomaly_ratio: 6.32,
    acq_time: "08:45 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    critical_chemicals: ["Crude Hydrocarbons", "Benzene", "Toluene", "Hydrogen Sulfide", "Naphtha"],
    hazard_radius_km: 5.0,
    wind_speed_kmh: 24.5,
    wind_direction_deg: 235.0,
    actionable_sop: "EMERGENCY PROTOCOL LEVEL-1 ACTIVATED: Notify 6th Bn NDRF (Vadodara) (Ph: +91-265-2830491). Immediately initiate evacuation of a 5.0 km downwind corridor. Deploy foam deluge systems on adjacent tanks."
  },
  {
    fire_id: "FIRMS-IND-2026-002",
    latitude: 22.3610,
    longitude: 69.8780,
    brightness: 348.2,
    frp: 42.1,
    category: "PERSISTENT_INDUSTRIAL_FLARE",
    sub_category: "Routine Refinery / Petrochemical Flare Stack",
    is_industrial: true,
    is_emergency: false,
    threat_level: "MODERATE",
    threat_color: "#F97316",
    threat_score: 45,
    facility_id: "IND-FAC-001",
    facility_name: "Reliance Jamnagar Refining & Petrochemical Complex",
    site_hint: "Reliance Jamnagar Refinery - Flare Stack Bravo",
    location: {
      district: "Jamnagar",
      state: "Gujarat",
      region: "Gulf of Kutch Refining & Heavy Petrochemical Belt",
      formatted_coords: "22.36100° N, 69.87800° E",
      location_summary: "Reliance Jamnagar Refinery, Jamnagar, Gujarat, India"
    },
    baseline_frp_mw: 45.0,
    anomaly_ratio: 0.94,
    acq_time: "08:45 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    critical_chemicals: ["Crude Hydrocarbons", "Benzene"],
    hazard_radius_km: 1.0,
    wind_speed_kmh: 22.0,
    wind_direction_deg: 230.0,
    actionable_sop: "NOMINAL INDUSTRIAL MONITORING: Thermal emission (42.1 MW) within facility baseline (45.0 MW). Routine automated flaring logged."
  },
  {
    fire_id: "FIRMS-IND-2026-003",
    latitude: 21.1125,
    longitude: 72.6510,
    brightness: 352.6,
    frp: 38.5,
    category: "PERSISTENT_INDUSTRIAL_FLARE",
    sub_category: "Routine Refinery / Petrochemical Flare Stack",
    is_industrial: true,
    is_emergency: false,
    threat_level: "MODERATE",
    threat_color: "#F97316",
    threat_score: 45,
    facility_id: "IND-FAC-002",
    facility_name: "Hazira Petrochemical & Gas Processing Zone (ONGC / RIL)",
    site_hint: "ONGC Hazira Gas Processing Complex",
    location: {
      district: "Surat",
      state: "Gujarat",
      region: "Hazira LNG & Petrochemical Hub",
      formatted_coords: "21.11250° N, 72.65100° E",
      location_summary: "ONGC Hazira Complex, Surat, Gujarat, India"
    },
    baseline_frp_mw: 40.0,
    anomaly_ratio: 0.96,
    acq_time: "08:50 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    critical_chemicals: ["Methane", "LPG", "Propylene"],
    hazard_radius_km: 1.0,
    wind_speed_kmh: 18.2,
    wind_direction_deg: 210.0,
    actionable_sop: "NOMINAL INDUSTRIAL MONITORING: Routine gas processing flaring active."
  },
  {
    fire_id: "FIRMS-IND-2026-004",
    latitude: 13.1685,
    longitude: 80.2612,
    brightness: 386.1,
    frp: 196.8,
    category: "CRITICAL_INDUSTRIAL_EMERGENCY",
    sub_category: "Major Hydrocarbon Storage Breach / Reactor Explosion",
    is_industrial: true,
    is_emergency: true,
    threat_level: "CRITICAL",
    threat_color: "#EF4444",
    threat_score: 95,
    facility_id: "IND-FAC-003",
    facility_name: "Manali Petrochemical & Fertilizer Industrial Corridor",
    site_hint: "Manali Petrochemicals Plant II",
    location: {
      district: "Chennai",
      state: "Tamil Nadu",
      region: "Manali Petrochemical Corridor",
      formatted_coords: "13.16850° N, 80.26120° E",
      location_summary: "Manali Petrochemicals, Chennai, Tamil Nadu, India"
    },
    baseline_frp_mw: 30.0,
    anomaly_ratio: 6.56,
    acq_time: "09:15 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    critical_chemicals: ["Propylene Oxide", "Propylene Glycol", "Ammonia"],
    hazard_radius_km: 4.0,
    wind_speed_kmh: 19.8,
    wind_direction_deg: 85.0,
    actionable_sop: "EMERGENCY PROTOCOL LEVEL-1: Toxic reactor thermal spike. Alert 4th Bn NDRF (Arakkonam)."
  },
  {
    fire_id: "FIRMS-IND-2026-005",
    latitude: 17.6912,
    longitude: 83.2530,
    brightness: 349.0,
    frp: 44.0,
    category: "PERSISTENT_INDUSTRIAL_FLARE",
    sub_category: "Routine Coastal Refinery Flare",
    is_industrial: true,
    is_emergency: false,
    threat_level: "MODERATE",
    threat_color: "#F97316",
    threat_score: 45,
    facility_id: "IND-FAC-004",
    facility_name: "Visakhapatnam Industrial SEZ & HPCL Refinery",
    site_hint: "HPCL Visakhapatnam Coastal Refinery",
    location: {
      district: "Visakhapatnam",
      state: "Andhra Pradesh",
      region: "Eastern Coastal Port & HPCL SEZ",
      formatted_coords: "17.69120° N, 83.25300° E",
      location_summary: "HPCL Refinery, Visakhapatnam, Andhra Pradesh, India"
    },
    baseline_frp_mw: 45.0,
    anomaly_ratio: 0.98,
    acq_time: "09:30 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    critical_chemicals: ["Gasoline", "Diesel"],
    hazard_radius_km: 1.0,
    wind_speed_kmh: 16.5,
    wind_direction_deg: 140.0,
    actionable_sop: "NOMINAL MONITORING: HPCL coastal flare within thresholds."
  },
  {
    fire_id: "FIRMS-IND-2026-006",
    latitude: 20.2850,
    longitude: 86.6420,
    brightness: 354.2,
    frp: 51.2,
    category: "PERSISTENT_INDUSTRIAL_FLARE",
    sub_category: "Integrated Refinery Flaring",
    is_industrial: true,
    is_emergency: false,
    threat_level: "MODERATE",
    threat_color: "#F97316",
    threat_score: 45,
    facility_id: "IND-FAC-005",
    facility_name: "IOCL Paradeep Integrated Refinery Complex",
    site_hint: "IOCL Paradeep Flare Mast 3",
    location: {
      district: "Jagatsinghpur",
      state: "Odisha",
      region: "Paradeep Port & IOCL Refinery Corridor",
      formatted_coords: "20.28500° N, 86.64200° E",
      location_summary: "IOCL Refinery, Jagatsinghpur, Odisha, India"
    },
    baseline_frp_mw: 50.0,
    anomaly_ratio: 1.02,
    acq_time: "09:45 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    critical_chemicals: ["High-Sulfur Crude", "Polypropylene"],
    hazard_radius_km: 1.0,
    wind_speed_kmh: 15.0,
    wind_direction_deg: 175.0,
    actionable_sop: "NOMINAL SURVEILLANCE: Normal flare stack emission."
  },
  {
    fire_id: "FIRMS-IND-2026-007",
    latitude: 29.4670,
    longitude: 76.9240,
    brightness: 351.1,
    frp: 46.8,
    category: "PERSISTENT_INDUSTRIAL_FLARE",
    sub_category: "Petrochemical Cracker Flare",
    is_industrial: true,
    is_emergency: false,
    threat_level: "MODERATE",
    threat_color: "#F97316",
    threat_score: 45,
    facility_id: "IND-FAC-006",
    facility_name: "Panipat IOCL Refinery & Naphtha Cracker Complex",
    site_hint: "Panipat IOCL Naphtha Cracker",
    location: {
      district: "Panipat",
      state: "Haryana",
      region: "IOCL Panipat Refining Basin",
      formatted_coords: "29.46700° N, 76.92400° E",
      location_summary: "IOCL Panipat Complex, Panipat, Haryana, India"
    },
    baseline_frp_mw: 48.0,
    anomaly_ratio: 0.98,
    acq_time: "10:05 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    critical_chemicals: ["Naphtha", "Butadiene"],
    hazard_radius_km: 1.0,
    wind_speed_kmh: 12.0,
    wind_direction_deg: 310.0,
    actionable_sop: "NOMINAL SURVEILLANCE: Naphtha cracker flare within limits."
  },
  {
    fire_id: "FIRMS-IND-2026-008",
    latitude: 23.7480,
    longitude: 86.4190,
    brightness: 361.5,
    frp: 68.4,
    category: "COAL_MINING_FIRE",
    sub_category: "Subterranean Coal Seam Combustion & Gas Venting",
    is_industrial: true,
    is_emergency: false,
    threat_level: "MODERATE",
    threat_color: "#EAB308",
    threat_score: 55,
    facility_id: "IND-FAC-007",
    facility_name: "Jharia Opencast Coalfield Mining Complex (BCCL)",
    site_hint: "Jharia Opencast Coalfield Sector-IV",
    location: {
      district: "Dhanbad",
      state: "Jharkhand",
      region: "Damodar Valley Coal Mining Belt",
      formatted_coords: "23.74800° N, 86.41900° E",
      location_summary: "BCCL Jharia Coalfield, Dhanbad, Jharkhand, India"
    },
    baseline_frp_mw: 60.0,
    anomaly_ratio: 1.14,
    acq_time: "10:20 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    critical_chemicals: ["Carbon Monoxide", "Coal Dust", "Sulfur Dioxide"],
    hazard_radius_km: 3.5,
    wind_speed_kmh: 11.4,
    wind_direction_deg: 280.0,
    actionable_sop: "COAL PIT SAFETY SURVEILLANCE: Monitor surface cracks for CO and SO2 venting."
  },
  {
    fire_id: "FIRMS-IND-2026-009",
    latitude: 30.2450,
    longitude: 75.8420,
    brightness: 329.8,
    frp: 21.4,
    category: "AGRICULTURAL_STUBBLE",
    sub_category: "Seasonal Crop Residue (Paddy / Wheat Straw) Field Burning",
    is_industrial: false,
    is_emergency: false,
    threat_level: "LOW",
    threat_color: "#22C55E",
    threat_score: 25,
    facility_name: "Agricultural Farmland, Sangrur",
    site_hint: "Sangrur Agricultural Farmland",
    location: {
      district: "Sangrur",
      state: "Punjab",
      region: "Malwa Agricultural Paddy Belt",
      formatted_coords: "30.24500° N, 75.84200° E",
      location_summary: "Sangrur District, Punjab, India"
    },
    anomaly_ratio: 1.07,
    acq_time: "11:00 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    hazard_radius_km: 1.5,
    wind_speed_kmh: 14.0,
    wind_direction_deg: 315.0,
    actionable_sop: "AGRICULTURAL NOISE: Crop residue field burning. Non-industrial."
  },
  {
    fire_id: "FIRMS-IND-2026-010",
    latitude: 29.6850,
    longitude: 76.9900,
    brightness: 326.4,
    frp: 18.2,
    category: "AGRICULTURAL_STUBBLE",
    sub_category: "Seasonal Crop Residue Field Burning",
    is_industrial: false,
    is_emergency: false,
    threat_level: "LOW",
    threat_color: "#22C55E",
    threat_score: 25,
    facility_name: "Agricultural Farmland, Karnal",
    site_hint: "Karnal Crop Residue Farmland",
    location: {
      district: "Karnal",
      state: "Haryana",
      region: "Indo-Gangetic Intensive Agricultural Cropland",
      formatted_coords: "29.68500° N, 76.9900° E",
      location_summary: "Karnal District, Haryana, India"
    },
    anomaly_ratio: 0.91,
    acq_time: "11:15 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    hazard_radius_km: 1.5,
    wind_speed_kmh: 13.5,
    wind_direction_deg: 320.0,
    actionable_sop: "AGRICULTURAL NOISE: Open field stubble burning. Non-industrial."
  },
  {
    fire_id: "FIRMS-IND-2026-011",
    latitude: 21.8600,
    longitude: 86.3500,
    brightness: 341.2,
    frp: 54.6,
    category: "FOREST_FIRE",
    sub_category: "Deciduous / Tropical Forest Canopy Wildfire",
    is_industrial: false,
    is_emergency: false,
    threat_level: "LOW",
    threat_color: "#10B981",
    threat_score: 35,
    facility_name: "Similipal Forest Biosphere",
    site_hint: "Similipal Tiger Reserve Core Zone",
    location: {
      district: "Mayurbhanj",
      state: "Odisha",
      region: "Similipal Deciduous Canopy Biosphere",
      formatted_coords: "21.86000° N, 86.35000° E",
      location_summary: "Similipal National Park, Mayurbhanj, Odisha, India"
    },
    anomaly_ratio: 1.56,
    acq_time: "11:40 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    hazard_radius_km: 3.0,
    wind_speed_kmh: 17.0,
    wind_direction_deg: 190.0,
    actionable_sop: "NATURAL BIOMASS: Forest canopy wildfire. Forest Department alerted."
  },
  {
    fire_id: "FIRMS-IND-2026-012",
    latitude: 11.6650,
    longitude: 76.6320,
    brightness: 338.5,
    frp: 41.3,
    category: "FOREST_FIRE",
    sub_category: "Forest Undergrowth Wildfire",
    is_industrial: false,
    is_emergency: false,
    threat_level: "LOW",
    threat_color: "#10B981",
    threat_score: 35,
    facility_name: "Bandipur / Nilgiri Forest Canopy",
    site_hint: "Bandipur National Park Southern Ridge",
    location: {
      district: "Chamarajanagar",
      state: "Karnataka",
      region: "Bandipur & Nilgiri Biosphere",
      formatted_coords: "11.66500° N, 76.63200° E",
      location_summary: "Bandipur Tiger Reserve, Karnataka, India"
    },
    anomaly_ratio: 1.18,
    acq_time: "12:05 IST",
    daynight: "D",
    instrument: "VIIRS 375m",
    hazard_radius_km: 3.0,
    wind_speed_kmh: 14.2,
    wind_direction_deg: 240.0,
    actionable_sop: "NATURAL BIOMASS: Forest undergrowth wildfire. Beat guards dispatched."
  }
];

export const FALLBACK_FACILITIES = {
  type: "FeatureCollection",
  metadata: { total_facilities: 7, crs: "EPSG:4326" },
  features: [
    {
      type: "Feature",
      id: "IND-FAC-001",
      properties: {
        facility_id: "IND-FAC-001",
        name: "Reliance Jamnagar Refining & Petrochemical Complex",
        category: "Petrochemical & Crude Refining",
        state: "Gujarat",
        district: "Jamnagar",
        baseline_frp_mw: 45.0,
        max_normal_frp_mw: 80.0
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[69.84, 22.33], [69.91, 22.33], [69.91, 22.385], [69.84, 22.385], [69.84, 22.33]]]
      }
    },
    {
      type: "Feature",
      id: "IND-FAC-002",
      properties: {
        facility_id: "IND-FAC-002",
        name: "Hazira Petrochemical & Gas Processing Zone (ONGC / RIL)",
        category: "Natural Gas & Polymer Manufacturing",
        state: "Gujarat",
        district: "Surat",
        baseline_frp_mw: 40.0,
        max_normal_frp_mw: 75.0
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[72.62, 21.09], [72.675, 21.09], [72.675, 21.135], [72.62, 21.135], [72.62, 21.09]]]
      }
    },
    {
      type: "Feature",
      id: "IND-FAC-003",
      properties: {
        facility_id: "IND-FAC-003",
        name: "Manali Petrochemical & Fertilizer Industrial Corridor",
        category: "Petrochemicals & Bulk Chemical Storage",
        state: "Tamil Nadu",
        district: "Chennai",
        baseline_frp_mw: 30.0,
        max_normal_frp_mw: 60.0
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[80.24, 13.15], [80.285, 13.15], [80.285, 13.19], [80.24, 13.19], [80.24, 13.15]]]
      }
    },
    {
      type: "Feature",
      id: "IND-FAC-004",
      properties: {
        facility_id: "IND-FAC-004",
        name: "Visakhapatnam Industrial SEZ & HPCL Refinery",
        category: "Coastal Refinery & Hydrocarbon Storage",
        state: "Andhra Pradesh",
        district: "Visakhapatnam",
        baseline_frp_mw: 45.0,
        max_normal_frp_mw: 80.0
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[83.23, 17.67], [83.275, 17.67], [83.275, 17.715], [83.23, 17.715], [83.23, 17.67]]]
      }
    },
    {
      type: "Feature",
      id: "IND-FAC-005",
      properties: {
        facility_id: "IND-FAC-005",
        name: "IOCL Paradeep Integrated Refinery Complex",
        category: "Heavy Crude Refining & Polypropylene",
        state: "Odisha",
        district: "Jagatsinghpur",
        baseline_frp_mw: 50.0,
        max_normal_frp_mw: 90.0
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[86.62, 20.26], [86.67, 20.26], [86.67, 20.31], [86.62, 20.31], [86.62, 20.26]]]
      }
    },
    {
      type: "Feature",
      id: "IND-FAC-006",
      properties: {
        facility_id: "IND-FAC-006",
        name: "Panipat IOCL Refinery & Naphtha Cracker Complex",
        category: "Petrochemical Cracker & Synthetic Rubber",
        state: "Haryana",
        district: "Panipat",
        baseline_frp_mw: 48.0,
        max_normal_frp_mw: 85.0
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[76.90, 29.445], [76.95, 29.445], [76.95, 29.49], [76.90, 29.49], [76.90, 29.445]]]
      }
    },
    {
      type: "Feature",
      id: "IND-FAC-007",
      properties: {
        facility_id: "IND-FAC-007",
        name: "Jharia Opencast Coalfield Mining Complex (BCCL)",
        category: "Subterranean Coal Mining & Methane Venting",
        state: "Jharkhand",
        district: "Dhanbad",
        baseline_frp_mw: 60.0,
        max_normal_frp_mw: 110.0
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[86.38, 23.72], [86.45, 23.72], [86.45, 23.775], [86.38, 23.775], [86.38, 23.72]]]
      }
    }
  ]
};
