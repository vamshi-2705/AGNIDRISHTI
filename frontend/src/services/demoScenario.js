/**
 * AGNIDRISHTI — DEMONSTRATION SCENARIO REFERENCE
 * 
 * IMPORTANT:
 * This dataset is strictly an isolated fallback for the /demo walkthrough page
 * when the application is offline or NASA FIRMS API returns zero active events.
 * 
 * IT IS NEVER INJECTED INTO:
 * - /api/fires
 * - GisMapViewer (live platform)
 * - Production event stores or backend pipelines
 */

export const DEMO_PETROCHEM_SCENARIO = {
  is_demo_scenario: true,
  scenario_label: 'DEMONSTRATION SCENARIO — OFFLINE REFERENCE ONLY',
  provenance_note: 'Synthesized demonstration profile for SIH evaluation when live VIIRS feeds are unreachable.',
  
  // 1. Detection Data
  fire_id: 'DEMO-SCENARIO-IND-01',
  event_id: 'AGNI-DEMO-PETROCHEM',
  latitude: 12.9716,
  longitude: 74.8340,
  frp: 168.4,
  brightness: 368.5,
  acq_date: new Date().toISOString().split('T')[0],
  acq_time: '11:45 UTC (17:15 IST)',
  confidence: 'high',
  satellite: 'SNPP + NOAA-20 + NOAA-21',
  satellite_count: 3,
  pass_count: 4,
  
  // Multi-satellite verification passes
  observations: [
    { sensor: 'VIIRS (Suomi NPP)', time: '07:30 UTC', frp: 142.1, confidence: 'high' },
    { sensor: 'VIIRS (NOAA-20)', time: '09:12 UTC', frp: 156.8, confidence: 'high' },
    { sensor: 'VIIRS (NOAA-21)', time: '11:45 UTC', frp: 168.4, confidence: 'high' },
    { sensor: 'VIIRS (Suomi NPP)', time: '13:20 UTC', frp: 164.0, confidence: 'high' }
  ],

  // 2. Geospatial & Industrial Context
  facility_id: 'FAC-DEMO-KA-MANGALORE',
  facility_name: 'Mangalore Coastal Petrochemical & Refinery Complex',
  facility_category: 'Petrochemical Refining & Liquid Hydrocarbons',
  site_hint: 'Mangalore Coastal Industrial Zone, Karnataka',
  location: {
    district: 'Dakshina Kannada',
    state: 'Karnataka',
    formatted_coords: '12.971600° N, 74.834000° E',
    region_type: 'Heavy Industrial Maritime Cluster'
  },
  land_cover: 'Heavy Industrial / Commercial Fabric (ESA WorldCover)',
  proximity_to_coast_km: 1.4,
  closest_highway: 'NH-66 Coastal Corridor (850m East)',

  // Facility Boundary Polygon (Mangalore coastal industrial perimeter)
  facility_geometry: {
    type: 'Polygon',
    coordinates: [[
      [74.8250, 12.9650],
      [74.8420, 12.9650],
      [74.8450, 12.9780],
      [74.8320, 12.9820],
      [74.8230, 12.9750],
      [74.8250, 12.9650]
    ]]
  },

  // 3. FRP Analysis & Baseline
  baseline_frp_mw: 28.5,
  max_normal_frp_mw: 45.0,
  anomaly_ratio: 5.91,
  baseline_status: 'ACUTE INDUSTRIAL EXCEEDANCE (5.91× BASELINE)',
  historical_trend: 'RAPID RISE — 4 CONSECUTIVE PASSES EXCEEDING NORMAL FLARE THRESHOLD',

  // 4. Classification
  category: 'CRITICAL_INDUSTRIAL_EMERGENCY',
  classification_title: 'Critical Industrial Anomaly (Petrochemical)',
  classification_confidence: 0.94,
  is_emergency: true,
  threat_level: 'CRITICAL',
  threat_score: 96,

  // 5. Dispersion Assessment (Open-Meteo Weather)
  weather: {
    wind_speed_kmh: 22.4,
    wind_direction_deg: 245, // WSW
    downwind_direction: 'ENE (East-North-East inland corridor)',
    temperature_c: 31.5,
    humidity_pct: 78,
    atmospheric_stability: 'Class C (Slightly Unstable Coastal Boundary Layer)'
  },
  dispersion: {
    estimated_length_km: 8.5,
    plume_cone_angle_deg: 32,
    hazard_tier: 'TIER 3 — ACUTE COMMUNITY EXPOSURE ZONE',
    estimated_transit_time_min: 22
  },

  // 6. Community Exposure
  community_exposure: {
    risk_level: 'HIGH',
    summary: 'Estimated dispersion intersects 3 settlements, 2 educational centers, 1 medical center within 6km downwind.',
    affected_settlements_count: 3,
    affected_schools_count: 2,
    affected_hospitals_count: 1,
    receptors: [
      { name: 'Kulai Coastal Settlement', type: 'settlement', distance_km: 2.8, est_population: 8400, in_plume: true },
      { name: 'Baikampady Residential Sector', type: 'settlement', distance_km: 4.2, est_population: 14200, in_plume: true },
      { name: 'Surathkal Urban Sub-District', type: 'settlement', distance_km: 6.8, est_population: 32000, in_plume: true },
      { name: 'Kulai Govt Higher Primary School', type: 'school', distance_km: 3.1, est_students: 450, in_plume: true },
      { name: 'Coastal Technical Training Institute', type: 'school', distance_km: 5.0, est_students: 820, in_plume: true },
      { name: 'Surathkal Community Health Center', type: 'hospital', distance_km: 6.4, est_beds: 65, in_plume: true }
    ]
  }
};
