/**
 * AGNIDRISHTI — Official Demo Scenario Dataset
 * 
 * Controlled demonstration dataset for SIH evaluation and executive presentations.
 * Models a realistic critical industrial thermal anomaly with full multi-source evidence,
 * atmospheric dispersion corridor, facility boundaries, and community exposure.
 * 
 * Master toggle: DEMO_MODE (true = demo scenario, false = live NASA VIIRS pipeline)
 */

export const DEMO_MODE = false;

// Primary Critical Event Coordinates: Hazira Petrochemical & Gas Processing Zone, Surat, Gujarat
export const DEMO_PRIMARY_COORDS = {
  latitude: 21.105020,
  longitude: 72.647090
};

export const DEMO_FIRES = [
  {
    fire_id: 'AGNI-DEMO-001',
    event_id: 'AGNI-DEMO-001',
    latitude: DEMO_PRIMARY_COORDS.latitude,
    longitude: DEMO_PRIMARY_COORDS.longitude,
    category: 'CRITICAL_INDUSTRIAL_EMERGENCY',
    threat_level: 'CRITICAL',
    threat_score: 96,
    is_emergency: true,
    is_industrial: true,
    confidence: 0.94,
    status: 'ACTIVE / UNDER ASSESSMENT',
    frp: 290.0,
    baseline_frp_mw: 85.0,
    anomaly_ratio: 3.41,
    trend: 'INCREASING',
    facility_id: 'FAC-DEMO-001',
    facility_name: 'Demo Petrochemical Processing Complex',
    facility_type: 'Chemical / Petrochemical / Industrial Processing',
    site_hint: 'Hazira Petrochemical Zone, Surat',
    land_cover: 'Built-up / Industrial',
    detection_source: 'VIIRS',
    satellite: 'NOAA-21',
    satellites: ['VIIRS_NOAA-21', 'VIIRS_NOAA-20', 'VIIRS_SNPP'],
    satellites_display: 'NOAA-21 • NOAA-20 • SNPP',
    daynight: 'D',
    acq_date: '2026-09-17',
    acq_time: '0915',
    authority_review_required: true,
    location: {
      district: 'Surat',
      state: 'Gujarat',
      region: 'Hazira Petrochemical & Gas Processing Zone',
      location_summary: 'Hazira Industrial Zone, Chorasi Taluka, Surat, Gujarat',
      formatted_coords: '21.10502° N, 72.64709° E'
    },
    wind_source: 'METEOROLOGICAL_ASSESSMENT',
    wind_speed_kmh: 18.0,
    wind_direction_deg: 315.0, // Wind blowing FROM Northwest (315°) -> Plume travels TO Southeast (135°)
    hazard_radius_km: 2.8,
    critical_chemicals: ['Benzene', 'Ethylene Oxide', 'Volatile Organics (VOCs)', 'Sulfur Compounds'],
    persistent_source: {
      source_tier: 'PERSISTENT SOURCE',
      first_seen: '2026-08-12 04:30 UTC',
      last_seen: '2026-09-17 09:15 UTC',
      observation_count: 34,
      distinct_observation_days: 22,
      recurrence_frequency: '6.2/week',
      recurrence_per_week: 6.2,
      frp_trend: 'INCREASING',
      persistence_score: 92,
      diurnal_behavior: 'Continuous industrial process emission'
    },
    persistence_score: 92,
    source_tier: 'PERSISTENT SOURCE',
    temporal_profile: {
      persistence_score: 92,
      observations_last_30d: 34,
      days_observed: 22,
      frp_trend: 'INCREASING',
      baseline_frp_mw: 85.0,
      recent_passes: [
        { label: 'Pass -3', time: '04:10', date: '2026-09-15', satellite: 'SNPP', val: 88.0 },
        { label: 'Pass -2', time: '09:20', date: '2026-09-16', satellite: 'NOAA-20', val: 125.0 },
        { label: 'Pass -1', time: '18:45', date: '2026-09-16', satellite: 'NOAA-21', val: 195.0 },
        { label: 'Current', time: '09:15', date: '2026-09-17', satellite: 'NOAA-21', val: 290.0 }
      ]
    },
    history: [
      { acq_date: '2026-09-15', acq_time: '04:10', satellite: 'VIIRS_SNPP', frp: 88.0, label: 't1 (Moderate)' },
      { acq_date: '2026-09-16', acq_time: '09:20', satellite: 'VIIRS_NOAA-20', frp: 125.0, label: 't2 (Elevated)' },
      { acq_date: '2026-09-16', acq_time: '18:45', satellite: 'VIIRS_NOAA-21', frp: 195.0, label: 't3 (High Anomaly)' },
      { acq_date: '2026-09-17', acq_time: '09:15', satellite: 'VIIRS_NOAA-21', frp: 290.0, label: 't4 (Critical Spike)' }
    ],
    community_exposure: {
      risk_level: 'HIGH',
      hazard_length_km: 2.8,
      total_sensitive_in_corridor: 5,
      affected_settlements_count: 2,
      affected_schools_count: 2,
      affected_hospitals_count: 1,
      downwind_exposure: 'HIGH',
      distance_to_nearest_settlement_km: 1.7,
      intersecting_settlements: [
        { id: 'set-1', name: 'Mora Industrial Settlement', distance_km: 1.7, population: 3800 },
        { id: 'set-2', name: 'Damka Village Perimeter', distance_km: 2.4, population: 5200 }
      ],
      intersecting_schools: [
        { id: 'sch-1', name: 'Hazira Community School', distance_km: 1.9 },
        { id: 'sch-2', name: 'Adarsh Vidyamandir', distance_km: 2.5 }
      ],
      intersecting_hospitals: [
        { id: 'hosp-1', name: 'Chorasi Health Centre', distance_km: 2.2 }
      ],
      exposure_reasons: [
        'FRP (290 MW) is 3.41× above established facility baseline (85 MW)',
        'Surface wind (18 km/h NW) directs dispersion plume toward SE community corridor',
        '2 settlements and 3 public receptors located within 2.8 km estimated hazard envelope'
      ],
      receptor_source: 'OPENSTREETMAP_OVERPASS_LIVE',
      live_osm_receptors_count: 5
    },
    satellite_evidence: {
      fire_id: 'AGNI-DEMO-001',
      is_demo: true,
      hierarchy: {
        primary: 'NASA FIRMS / VIIRS (NOAA-21) — 375m Thermal Radiance',
        supporting_optical: 'Landsat 8/9 & Sentinel-2 — 10m-30m High-Resolution Optical Context',
        supporting_thermal: 'MODIS Terra/Aqua — 1000m Thermal Context'
      },
      primary: {
        sensor: 'VIIRS',
        source: 'NASA FIRMS',
        platform: 'VIIRS (NOAA-21)',
        role: 'PRIMARY DETECTION',
        type: 'THERMAL_RADIANCE',
        resolution: '375 m',
        status: 'AVAILABLE',
        available: true,
        observation_timestamp_utc: '2026-09-17 09:15 UTC',
        frp_mw: 290.0,
        brightness_temperature_k: 367.4,
        confidence: 'HIGH (94%)',
        summary: 'Primary thermal anomaly detected by NOAA-21 at 375m resolution with 290.0 MW radiative power.'
      },
      supporting: [
        {
          source: 'Landsat',
          platform: 'Landsat 9 (OLI-2 / TIRS-2)',
          role: 'SUPPORTING HIGH-RESOLUTION OPTICAL',
          type: 'OPTICAL_CONTEXT',
          resolution: '30 m multispectral (15 m panchromatic)',
          revisit_cycle: '16 days (8 days combined constellation)',
          status: 'AVAILABLE',
          available: true,
          observation_date: '2026-09-14',
          cloud_cover_pct: 6.8,
          scene_id: 'LC09_L2SP_148045_20260914_DEMO',
          spatial_context: 'High-resolution optical scene confirms industrial facility boundary and storage tank cluster.',
          note: 'DEMO / SIMULATED EVIDENCE — Supporting optical inspection context.'
        },
        {
          source: 'Sentinel-2',
          platform: 'Sentinel-2B (MSI)',
          role: 'SUPPORTING HIGH-RESOLUTION OPTICAL',
          type: 'OPTICAL_CONTEXT',
          resolution: '10 m visible/NIR (20 m SWIR)',
          revisit_cycle: '5 days (constellation)',
          status: 'AVAILABLE',
          available: true,
          observation_date: '2026-09-16',
          cloud_cover_pct: 4.1,
          scene_id: 'S2B_MSIL2A_20260916T054639_DEMO',
          spatial_context: '10m European Copernicus MSI pass corroborates perimeter infrastructure and access roads.',
          note: 'DEMO / SIMULATED EVIDENCE — Supporting optical inspection context.'
        },
        {
          source: 'MODIS',
          platform: 'MODIS Terra / Aqua',
          role: 'SUPPORTING THERMAL / HISTORICAL CONTEXT',
          type: 'THERMAL_HISTORICAL',
          resolution: '1000 m (1 km)',
          revisit_cycle: '1 - 2 overpasses daily',
          status: 'AVAILABLE',
          available: true,
          observation_timestamp_utc: '2026-09-17 06:15 UTC (Terra Overpass)',
          frp_mw: 215.0,
          confidence: '82%',
          spatial_context: 'MODIS 1km sensor confirms elevated thermal radiance envelope over industrial sector.',
          note: 'DEMO / SIMULATED EVIDENCE — Corroborating coarse-resolution thermal observation.'
        }
      ]
    },
    incident_brief: 'Persistent thermal activity detected within industrial facility boundary. Current FRP (290 MW) is 3.41× above the established baseline (85 MW) and shows an increasing multi-pass trend. Moderate-to-high downwind exposure is estimated toward the southeast (NW 18 km/h wind, 2.8 km estimated hazard radius).'
  },
  {
    fire_id: 'AGNI-DEMO-002',
    event_id: 'AGNI-DEMO-002',
    latitude: 22.470700,
    longitude: 70.057700,
    category: 'PERSISTENT_INDUSTRIAL_FLARE',
    threat_level: 'MODERATE',
    threat_score: 48,
    is_emergency: false,
    is_industrial: true,
    confidence: 0.88,
    status: 'ACTIVE / ROUTINE',
    frp: 48.0,
    baseline_frp_mw: 50.0,
    anomaly_ratio: 0.96,
    trend: 'STABLE',
    facility_id: 'FAC-DEMO-002',
    facility_name: 'Jamnagar Refinery Flare Stack Battery',
    facility_type: 'Petroleum Refining / Elevated Flare',
    site_hint: 'Jamnagar Industrial Complex, Gujarat',
    land_cover: 'Industrial / Built-up',
    detection_source: 'VIIRS',
    satellite: 'NOAA-20',
    satellites: ['VIIRS_NOAA-20', 'VIIRS_SNPP'],
    satellites_display: 'NOAA-20 • SNPP',
    daynight: 'N',
    acq_date: '2026-09-17',
    acq_time: '0830',
    location: {
      district: 'Jamnagar',
      state: 'Gujarat',
      region: 'Jamnagar Petroleum & Petrochemical Refining Hub',
      location_summary: 'Jamnagar Petrochemicals Complex, Gujarat',
      formatted_coords: '22.47070° N, 70.05770° E'
    },
    wind_source: 'METEOROLOGICAL_ASSESSMENT',
    wind_speed_kmh: 14.0,
    wind_direction_deg: 270.0,
    hazard_radius_km: 1.5,
    critical_chemicals: ['Hydrocarbons', 'Combustion Flue Gases'],
    persistent_source: {
      source_tier: 'PERSISTENT SOURCE',
      first_seen: '2026-07-01 02:00 UTC',
      last_seen: '2026-09-17 08:30 UTC',
      observation_count: 52,
      distinct_observation_days: 30,
      recurrence_frequency: '7.0/week',
      recurrence_per_week: 7.0,
      frp_trend: 'STABLE',
      persistence_score: 98,
      diurnal_behavior: 'Continuous 24/7 flare operation'
    },
    persistence_score: 98,
    source_tier: 'PERSISTENT SOURCE',
    temporal_profile: {
      persistence_score: 98,
      observations_last_30d: 52,
      days_observed: 30,
      frp_trend: 'STABLE',
      baseline_frp_mw: 50.0
    },
    history: [
      { acq_date: '2026-09-14', acq_time: '08:15', satellite: 'VIIRS_SNPP', frp: 49.0, label: 'Pass -3' },
      { acq_date: '2026-09-15', acq_time: '20:30', satellite: 'VIIRS_NOAA-20', frp: 51.0, label: 'Pass -2' },
      { acq_date: '2026-09-16', acq_time: '08:45', satellite: 'VIIRS_SNPP', frp: 47.5, label: 'Pass -1' },
      { acq_date: '2026-09-17', acq_time: '08:30', satellite: 'VIIRS_NOAA-20', frp: 48.0, label: 'Current' }
    ],
    community_exposure: {
      risk_level: 'LOW',
      hazard_length_km: 1.5,
      total_sensitive_in_corridor: 0,
      affected_settlements_count: 0,
      affected_schools_count: 0,
      affected_hospitals_count: 0,
      downwind_exposure: 'LOW',
      exposure_reasons: ['FRP within normal operating baseline (0.96×)', 'No residential communities inside refinery safety perimeter'],
      receptor_source: 'OPENSTREETMAP_OVERPASS_LIVE'
    },
    satellite_evidence: {
      fire_id: 'AGNI-DEMO-002',
      is_demo: true,
      hierarchy: {
        primary: 'NASA FIRMS / VIIRS (NOAA-20) — 375m Thermal Radiance',
        supporting_optical: 'Landsat 8/9 & Sentinel-2 — 10m-30m High-Resolution Optical Context',
        supporting_thermal: 'MODIS Terra/Aqua — 1000m Thermal Context'
      },
      primary: {
        sensor: 'VIIRS',
        source: 'NASA FIRMS',
        platform: 'VIIRS (NOAA-20)',
        role: 'PRIMARY DETECTION',
        type: 'THERMAL_RADIANCE',
        resolution: '375 m',
        status: 'AVAILABLE',
        available: true,
        observation_timestamp_utc: '2026-09-17 08:30 UTC',
        frp_mw: 48.0,
        brightness_temperature_k: 328.6,
        confidence: 'NOMINAL (88%)',
        summary: 'Routine operational flare detected by NOAA-20 at 375m resolution with 48.0 MW radiative power.'
      },
      supporting: [
        {
          source: 'Landsat',
          platform: 'Landsat 8/9 (OLI / TIRS)',
          role: 'SUPPORTING HIGH-RESOLUTION OPTICAL',
          type: 'OPTICAL_CONTEXT',
          resolution: '30 m multispectral',
          revisit_cycle: '16 days',
          status: 'NOT_AVAILABLE',
          available: false,
          observation_date: null,
          cloud_cover_pct: null,
          scene_id: null,
          spatial_context: 'No cloud-free Landsat scene in public catalog within 16-day orbit window.',
          note: 'Supporting imagery unavailable for current observation window (16-day orbit revisit cycle).'
        },
        {
          source: 'Sentinel-2',
          platform: 'Sentinel-2A (MSI)',
          role: 'SUPPORTING HIGH-RESOLUTION OPTICAL',
          type: 'OPTICAL_CONTEXT',
          resolution: '10 m visible/NIR (20 m SWIR)',
          revisit_cycle: '5 days (constellation)',
          status: 'AVAILABLE',
          available: true,
          observation_date: '2026-09-15',
          cloud_cover_pct: 2.3,
          scene_id: 'S2A_MSIL2A_20260915T055641_DEMO',
          spatial_context: '10m Sentinel-2 scene confirms refinery flare stack perimeter and buffer exclusion boundary.',
          note: 'DEMO / SIMULATED EVIDENCE — Supporting optical inspection context.'
        },
        {
          source: 'MODIS',
          platform: 'MODIS Terra / Aqua',
          role: 'SUPPORTING THERMAL / HISTORICAL CONTEXT',
          type: 'THERMAL_HISTORICAL',
          resolution: '1000 m (1 km)',
          revisit_cycle: '1 - 2 overpasses daily',
          status: 'NOT_AVAILABLE',
          available: false,
          observation_timestamp_utc: null,
          frp_mw: null,
          confidence: null,
          spatial_context: 'No matching MODIS 1km thermal detection logged for this event coordinate.',
          note: 'No MODIS observation available (lower 1km spatial resolution threshold vs VIIRS 375m).'
        }
      ]
    },
    incident_brief: 'Routine continuous flaring within permitted industrial threshold. FRP matches baseline profile with zero off-site community exposure.'
  },
  {
    fire_id: 'AGNI-DEMO-003',
    event_id: 'AGNI-DEMO-003',
    latitude: 30.901000,
    longitude: 75.857300,
    category: 'AGRICULTURAL_STUBBLE',
    threat_level: 'LOW',
    threat_score: 18,
    is_emergency: false,
    is_industrial: false,
    confidence: 0.76,
    status: 'ACTIVE / EPHEMERAL',
    frp: 18.5,
    baseline_frp_mw: 15.0,
    anomaly_ratio: 1.23,
    trend: 'TRANSIENT',
    facility_id: null,
    facility_name: null,
    facility_type: 'Agricultural Farm Land',
    site_hint: 'Rural Agricultural Belt, Ludhiana',
    land_cover: 'Cropland / Agriculture',
    detection_source: 'VIIRS',
    satellite: 'SNPP',
    satellites: ['VIIRS_SNPP'],
    satellites_display: 'SNPP',
    daynight: 'D',
    acq_date: '2026-09-17',
    acq_time: '0745',
    location: {
      district: 'Ludhiana',
      state: 'Punjab',
      region: 'North-West Indo-Gangetic Agricultural Plain',
      location_summary: 'Rural Cropland, Ludhiana District, Punjab',
      formatted_coords: '30.90100° N, 75.85730° E'
    },
    wind_source: 'METEOROLOGICAL_ASSESSMENT',
    wind_speed_kmh: 11.0,
    wind_direction_deg: 300.0,
    hazard_radius_km: 0.9,
    persistent_source: {
      source_tier: 'NEW SOURCE',
      first_seen: '2026-09-17 07:45 UTC',
      last_seen: '2026-09-17 07:45 UTC',
      observation_count: 1,
      distinct_observation_days: 1,
      recurrence_frequency: '1/week',
      recurrence_per_week: 1.0,
      frp_trend: 'INSUFFICIENT HISTORY',
      persistence_score: 12,
      diurnal_behavior: 'Afternoon post-harvest residue clearing'
    },
    persistence_score: 12,
    source_tier: 'NEW SOURCE',
    temporal_profile: {
      persistence_score: 12,
      observations_last_30d: 1,
      days_observed: 1,
      frp_trend: 'TRANSIENT',
      baseline_frp_mw: 15.0
    },
    history: [
      { acq_date: '2026-09-17', acq_time: '07:45', satellite: 'VIIRS_SNPP', frp: 18.5, label: 'Current' }
    ],
    community_exposure: {
      risk_level: 'LOW',
      hazard_length_km: 0.9,
      total_sensitive_in_corridor: 0,
      affected_settlements_count: 0,
      downwind_exposure: 'LOW',
      exposure_reasons: ['Isolated agricultural biomass burning in open fields'],
      receptor_source: 'OPENSTREETMAP_OVERPASS_LIVE'
    },
    incident_brief: 'Single-pass seasonal crop residue combustion in rural cropland. Filtered from industrial emergency dispatch.'
  },
  {
    fire_id: 'AGNI-DEMO-004',
    event_id: 'AGNI-DEMO-004',
    latitude: 22.359500,
    longitude: 82.684100,
    category: 'COAL_MINING_FIRE',
    threat_level: 'MODERATE',
    threat_score: 58,
    is_emergency: false,
    is_industrial: true,
    confidence: 0.85,
    status: 'ACTIVE / MONITORED',
    frp: 62.0,
    baseline_frp_mw: 45.0,
    anomaly_ratio: 1.38,
    trend: 'STABLE',
    facility_id: 'FAC-DEMO-004',
    facility_name: 'Korba Opencast Coal Mining Seam',
    facility_type: 'Opencast Coal Extraction / Overburden',
    site_hint: 'Korba Coal Basin, Chhattisgarh',
    land_cover: 'Mining / Bare Ground',
    detection_source: 'VIIRS',
    satellite: 'NOAA-21',
    satellites: ['VIIRS_NOAA-21', 'VIIRS_NOAA-20'],
    satellites_display: 'NOAA-21 • NOAA-20',
    daynight: 'N',
    acq_date: '2026-09-17',
    acq_time: '0610',
    location: {
      district: 'Korba',
      state: 'Chhattisgarh',
      region: 'Central India Coal Basin Sector',
      location_summary: 'Korba Opencast Mining Cut, Chhattisgarh',
      formatted_coords: '22.35950° N, 82.68410° E'
    },
    wind_source: 'METEOROLOGICAL_ASSESSMENT',
    wind_speed_kmh: 9.0,
    wind_direction_deg: 90.0,
    hazard_radius_km: 1.8,
    critical_chemicals: ['Carbon Monoxide', 'Particulate Matter PM10', 'Sulfur Dioxide'],
    persistent_source: {
      source_tier: 'PERSISTENT SOURCE',
      first_seen: '2026-06-15 12:00 UTC',
      last_seen: '2026-09-17 06:10 UTC',
      observation_count: 42,
      distinct_observation_days: 28,
      recurrence_frequency: '5.8/week',
      recurrence_per_week: 5.8,
      frp_trend: 'STABLE',
      persistence_score: 86,
      diurnal_behavior: 'Deep subsurface coal smoldering'
    },
    persistence_score: 86,
    source_tier: 'PERSISTENT SOURCE',
    temporal_profile: {
      persistence_score: 86,
      observations_last_30d: 42,
      days_observed: 28,
      frp_trend: 'STABLE',
      baseline_frp_mw: 45.0
    },
    history: [
      { acq_date: '2026-09-14', acq_time: '06:00', satellite: 'VIIRS_SNPP', frp: 59.0, label: 'Pass -3' },
      { acq_date: '2026-09-15', acq_time: '18:15', satellite: 'VIIRS_NOAA-20', frp: 64.0, label: 'Pass -2' },
      { acq_date: '2026-09-16', acq_time: '06:30', satellite: 'VIIRS_NOAA-21', frp: 60.5, label: 'Pass -1' },
      { acq_date: '2026-09-17', acq_time: '06:10', satellite: 'VIIRS_NOAA-21', frp: 62.0, label: 'Current' }
    ],
    community_exposure: {
      risk_level: 'MEDIUM',
      hazard_length_km: 1.8,
      total_sensitive_in_corridor: 1,
      affected_settlements_count: 1,
      affected_schools_count: 0,
      affected_hospitals_count: 0,
      downwind_exposure: 'MEDIUM',
      intersecting_settlements: [
        { id: 'set-korba', name: 'Mine Workers Colony Perimeter', distance_km: 1.6, population: 1400 }
      ],
      exposure_reasons: ['Subsurface coal seam smoldering within active extraction pit'],
      receptor_source: 'OPENSTREETMAP_OVERPASS_LIVE'
    },
    incident_brief: 'Persistent coal seam smoldering inside opencast excavation pit. Monitored for pit wall stability.'
  },
  {
    fire_id: 'AGNI-DEMO-005',
    event_id: 'AGNI-DEMO-005',
    latitude: 21.850000,
    longitude: 86.350000,
    category: 'FOREST_FIRE',
    threat_level: 'MODERATE',
    threat_score: 42,
    is_emergency: false,
    is_industrial: false,
    confidence: 0.81,
    status: 'ACTIVE / UNDER MONITORING',
    frp: 34.0,
    baseline_frp_mw: 20.0,
    anomaly_ratio: 1.70,
    trend: 'EXPANDING',
    facility_id: null,
    facility_name: null,
    facility_type: 'Forest / Biosphere Reserve',
    site_hint: 'Similipal Biosphere Reserve, Odisha',
    land_cover: 'Dense Forest / Vegetation',
    detection_source: 'VIIRS',
    satellite: 'NOAA-20',
    satellites: ['VIIRS_NOAA-20'],
    satellites_display: 'NOAA-20',
    daynight: 'D',
    acq_date: '2026-09-17',
    acq_time: '0520',
    location: {
      district: 'Mayurbhanj',
      state: 'Odisha',
      region: 'Similipal Forest Hill Reserve',
      location_summary: 'Protected Forest Reserve, Mayurbhanj, Odisha',
      formatted_coords: '21.85000° N, 86.35000° E'
    },
    wind_source: 'METEOROLOGICAL_ASSESSMENT',
    wind_speed_kmh: 15.0,
    wind_direction_deg: 220.0,
    hazard_radius_km: 2.1,
    persistent_source: {
      source_tier: 'RECURRENT SOURCE',
      first_seen: '2026-09-16 11:30 UTC',
      last_seen: '2026-09-17 05:20 UTC',
      observation_count: 3,
      distinct_observation_days: 2,
      recurrence_frequency: '2.5/week',
      recurrence_per_week: 2.5,
      frp_trend: 'INCREASING',
      persistence_score: 45,
      diurnal_behavior: 'Daytime canopy and understory spread'
    },
    persistence_score: 45,
    source_tier: 'RECURRENT SOURCE',
    temporal_profile: {
      persistence_score: 45,
      observations_last_30d: 3,
      days_observed: 2,
      frp_trend: 'INCREASING',
      baseline_frp_mw: 20.0
    },
    history: [
      { acq_date: '2026-09-16', acq_time: '11:30', satellite: 'VIIRS_SNPP', frp: 22.0, label: 'Pass -2' },
      { acq_date: '2026-09-16', acq_time: '23:15', satellite: 'VIIRS_NOAA-21', frp: 28.0, label: 'Pass -1' },
      { acq_date: '2026-09-17', acq_time: '05:20', satellite: 'VIIRS_NOAA-20', frp: 34.0, label: 'Current' }
    ],
    community_exposure: {
      risk_level: 'LOW',
      hazard_length_km: 2.1,
      total_sensitive_in_corridor: 0,
      affected_settlements_count: 0,
      downwind_exposure: 'LOW',
      exposure_reasons: ['Forest fire contained inside protected natural reserve with zero proximate residential structures'],
      receptor_source: 'OPENSTREETMAP_OVERPASS_LIVE'
    },
    incident_brief: 'Expanding wildland forest fire in protected hill reserve. Forest department alerted.'
  },
  {
    fire_id: 'AGNI-DEMO-006',
    event_id: 'AGNI-DEMO-006',
    latitude: 22.804600,
    longitude: 86.202900,
    category: 'PERSISTENT_INDUSTRIAL_FLARE',
    threat_level: 'LOW',
    threat_score: 25,
    is_emergency: false,
    is_industrial: true,
    confidence: 0.83,
    status: 'ACTIVE / ROUTINE',
    frp: 38.0,
    baseline_frp_mw: 40.0,
    anomaly_ratio: 0.95,
    trend: 'STABLE',
    facility_id: 'FAC-DEMO-006',
    facility_name: 'Tata Steel Manufacturing Works',
    facility_type: 'Blast Furnace & Steel Mill',
    site_hint: 'Jamshedpur Industrial Zone, Jharkhand',
    land_cover: 'Industrial / Heavy Manufacturing',
    detection_source: 'VIIRS',
    satellite: 'NOAA-21',
    satellites: ['VIIRS_NOAA-21', 'VIIRS_SNPP'],
    satellites_display: 'NOAA-21 • SNPP',
    daynight: 'D',
    acq_date: '2026-09-17',
    acq_time: '0430',
    location: {
      district: 'East Singhbhum',
      state: 'Jharkhand',
      region: 'Jamshedpur Metallurgical Cluster',
      location_summary: 'Tata Steel Plant Perimeter, Jamshedpur, Jharkhand',
      formatted_coords: '22.80460° N, 86.20290° E'
    },
    wind_source: 'METEOROLOGICAL_ASSESSMENT',
    wind_speed_kmh: 12.0,
    wind_direction_deg: 180.0,
    hazard_radius_km: 1.2,
    persistent_source: {
      source_tier: 'PERSISTENT SOURCE',
      first_seen: '2026-05-10 00:00 UTC',
      last_seen: '2026-09-17 04:30 UTC',
      observation_count: 65,
      distinct_observation_days: 30,
      recurrence_frequency: '7.0/week',
      recurrence_per_week: 7.0,
      frp_trend: 'STABLE',
      persistence_score: 99,
      diurnal_behavior: 'Continuous primary metallurgical furnace output'
    },
    persistence_score: 99,
    source_tier: 'PERSISTENT SOURCE',
    temporal_profile: {
      persistence_score: 99,
      observations_last_30d: 65,
      days_observed: 30,
      frp_trend: 'STABLE',
      baseline_frp_mw: 40.0
    },
    history: [
      { acq_date: '2026-09-14', acq_time: '04:15', satellite: 'VIIRS_SNPP', frp: 39.0, label: 'Pass -3' },
      { acq_date: '2026-09-15', acq_time: '16:40', satellite: 'VIIRS_NOAA-20', frp: 37.5, label: 'Pass -2' },
      { acq_date: '2026-09-16', acq_time: '04:25', satellite: 'VIIRS_NOAA-21', frp: 41.0, label: 'Pass -1' },
      { acq_date: '2026-09-17', acq_time: '04:30', satellite: 'VIIRS_NOAA-21', frp: 38.0, label: 'Current' }
    ],
    community_exposure: {
      risk_level: 'LOW',
      hazard_length_km: 1.2,
      total_sensitive_in_corridor: 0,
      affected_settlements_count: 0,
      downwind_exposure: 'LOW',
      exposure_reasons: ['Thermal emissions match expected blast furnace baseline (0.95×)'],
      receptor_source: 'OPENSTREETMAP_OVERPASS_LIVE'
    },
    incident_brief: 'Normal blast furnace operations in heavy metallurgical complex. No anomaly detected.'
  }
];

export const DEMO_FACILITIES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'FAC-DEMO-001',
      properties: {
        facility_id: 'FAC-DEMO-001',
        name: 'Demo Petrochemical Processing Complex',
        category: 'Chemical / Petrochemical / Refining',
        baseline_frp_mw: 85.0,
        district: 'Surat',
        state: 'Gujarat',
        source: 'OSM Verified Industrial Zone'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [72.639000, 21.111000],
          [72.656000, 21.111000],
          [72.656000, 21.099000],
          [72.639000, 21.099000],
          [72.639000, 21.111000]
        ]]
      }
    },
    {
      type: 'Feature',
      id: 'FAC-DEMO-002',
      properties: {
        facility_id: 'FAC-DEMO-002',
        name: 'Jamnagar Refinery Flare Stack Battery',
        category: 'Petroleum Refining / Elevated Flare',
        baseline_frp_mw: 50.0,
        district: 'Jamnagar',
        state: 'Gujarat'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [70.050000, 22.478000],
          [70.065000, 22.478000],
          [70.065000, 22.463000],
          [70.050000, 22.463000],
          [70.050000, 22.478000]
        ]]
      }
    }
  ]
};

export const DEMO_SENSITIVE_LOCATIONS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'set-1',
      properties: {
        name: 'Mora Industrial Settlement',
        type: 'settlement',
        population: 3800,
        distance_km: 1.7
      },
      geometry: {
        type: 'Point',
        coordinates: [72.658000, 21.092000]
      }
    },
    {
      type: 'Feature',
      id: 'set-2',
      properties: {
        name: 'Damka Village Perimeter',
        type: 'settlement',
        population: 5200,
        distance_km: 2.4
      },
      geometry: {
        type: 'Point',
        coordinates: [72.663000, 21.086000]
      }
    },
    {
      type: 'Feature',
      id: 'sch-1',
      properties: {
        name: 'Hazira Community School',
        type: 'school',
        distance_km: 1.9
      },
      geometry: {
        type: 'Point',
        coordinates: [72.659000, 21.090000]
      }
    },
    {
      type: 'Feature',
      id: 'sch-2',
      properties: {
        name: 'Adarsh Vidyamandir',
        type: 'school',
        distance_km: 2.5
      },
      geometry: {
        type: 'Point',
        coordinates: [72.664000, 21.084000]
      }
    },
    {
      type: 'Feature',
      id: 'hosp-1',
      properties: {
        name: 'Chorasi Health Centre',
        type: 'hospital',
        distance_km: 2.2
      },
      geometry: {
        type: 'Point',
        coordinates: [72.661000, 21.088000]
      }
    }
  ]
};

export const DEMO_ANALYTICS_SUMMARY = {
  kpis: {
    total_active_hotspots: DEMO_FIRES.length,
    critical_industrial_emergencies: DEMO_FIRES.filter(f => f.is_emergency).length,
    industrial_noise_filtered_pct: 66.7,
    active_flare_batteries: 2,
    monitored_coal_fields: 1
  },
  sync_metadata: {
    last_sync_utc: '2026-09-17 09:15 UTC',
    data_provenance: 'DEMO SCENARIO',
    is_demo: true,
    new_events_detected: 0
  }
};

export const DEMO_INCIDENT_REPORT = {
  incident_id: 'AGNI-DEMO-001',
  timestamp_utc: '2026-09-17T09:15:00Z',
  classification: 'CRITICAL INDUSTRIAL FIRE',
  facility: 'Demo Petrochemical Processing Complex',
  facility_type: 'Chemical / Petrochemical / Industrial Processing',
  coordinates: '21.105020° N, 72.647090° E',
  district: 'Surat',
  state: 'Gujarat',
  frp_current_mw: 290.0,
  frp_baseline_mw: 85.0,
  anomaly_ratio: 3.41,
  persistence_tier: 'PERSISTENT SOURCE (92/100)',
  wind_vector: '18 km/h from Northwest (315°)',
  downwind_transport: 'Southeast corridor (bearing 135°)',
  hazard_radius_km: 2.8,
  critical_chemicals: ['Benzene', 'Ethylene Oxide', 'Volatile Organics (VOCs)', 'Sulfur Compounds'],
  community_risk: 'HIGH (2 settlements, 2 schools, 1 hospital downwind within 2.8 km)',
  recommended_actions: [
    'Alert Surat District Emergency Operations Centre (DEOC) & NDRF 6th Battalion',
    'Establish 1.5 km inner isolation perimeter around processing unit',
    'Notify downwind Mora & Damka community leaders for shelter-in-place readiness',
    'Deploy mobile atmospheric volatile organic gas monitors along southeast perimeter'
  ]
};
