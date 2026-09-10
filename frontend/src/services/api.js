/**
 * AGNIDRISHTI Frontend API Client
 * Base URL: http://127.0.0.1:8000
 * Automatic fail-safe resilience with calibrated fallback dataset.
 */

import { FALLBACK_SUMMARY, FALLBACK_FIRES, FALLBACK_FACILITIES } from './fallbackData';

const BASE_URL = 'http://127.0.0.1:8000';
const TIMEOUT_MS = 25000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function getAnalyticsSummary() {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/analytics/summary`);
    return { data, isLive: true };
  } catch (err) {
    console.warn('[AGNIDRISHTI API] Summary fetch failed, engaging calibrated fallback.', err.message);
    return { data: FALLBACK_SUMMARY, isLive: false };
  }
}

export async function getFires(filterMode = 'all') {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/fires?filter_mode=${filterMode}`);
    return { data: data.data || [], total: data.total_records || 0, isLive: true };
  } catch (err) {
    console.warn(`[AGNIDRISHTI API] Fires (${filterMode}) fetch failed, engaging calibrated fallback.`, err.message);
    let filtered = FALLBACK_FIRES;
    if (filterMode === 'industrial') {
      filtered = FALLBACK_FIRES.filter(f => f.is_industrial);
    } else if (filterMode === 'emergencies') {
      filtered = FALLBACK_FIRES.filter(f => f.is_emergency);
    }
    return { data: filtered, total: filtered.length, isLive: false };
  }
}

export async function getFacilities() {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/facilities`);
    return { data, isLive: true };
  } catch (err) {
    console.warn('[AGNIDRISHTI API] Facilities fetch failed, engaging calibrated fallback.', err.message);
    return { data: FALLBACK_FACILITIES, isLive: false };
  }
}

export async function getPlume(fireId) {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/plume/${fireId}`);
    return { data, isLive: true };
  } catch (err) {
    console.warn(`[AGNIDRISHTI API] Plume fetch failed for ${fireId}, generating client-side fallback cone.`, err.message);
    // Find matching fire
    const fire = FALLBACK_FIRES.find(f => f.fire_id === fireId) || FALLBACK_FIRES[0];
    const downwindDeg = ((fire.wind_direction_deg || 235) + 180) % 360;
    const downwindRad = (downwindDeg * Math.PI) / 180;
    const lengthKm = Math.min(28.0, Math.max(2.5, (fire.frp / 25.0) * (0.8 + (fire.wind_speed_kmh / 30.0))));
    const spreadRad = (22.5 * Math.PI) / 180;
    const kmPerLat = 111.32;
    const kmPerLon = 111.32 * Math.cos((fire.latitude * Math.PI) / 180);

    const coords = [[fire.longitude, fire.latitude]];
    for (let step = 0; step <= 8; step++) {
      const frac = step / 8;
      const angle = (downwindRad - spreadRad) + frac * (2 * spreadRad);
      const rKm = lengthKm * (0.88 + 0.12 * Math.cos(angle - downwindRad));
      const dLat = (rKm * Math.cos(angle)) / kmPerLat;
      const dLon = (rKm * Math.sin(angle)) / kmPerLon;
      coords.push([Number((fire.longitude + dLon).toFixed(6)), Number((fire.latitude + dLat).toFixed(6))]);
    }
    coords.push([fire.longitude, fire.latitude]);

    return {
      data: {
        type: "Feature",
        properties: {
          fire_id: fire.fire_id,
          hazard_tier: fire.is_emergency ? "CRITICAL THERMAL ANOMALY" : "ROUTINE INDUSTRIAL FLUE PLUME",
          hazard_length_km: Number(lengthKm.toFixed(1)),
          wind_speed_kmh: fire.wind_speed_kmh,
          wind_direction_deg: fire.wind_direction_deg,
          downwind_azimuth_deg: Number(downwindDeg.toFixed(1)),
          fill_color: fire.is_emergency ? "#DC2626" : "#F97316",
          fill_opacity: 0.35,
          warning: fire.is_emergency 
            ? "POTENTIAL HIGH-RISK DOWNWIND CORRIDOR IDENTIFIED: Elevated thermal buoyancy observed."
            : "MONITORED DISPERSION: Controlled hydrocarbon combustion within regulatory limits."
        },
        geometry: {
          type: "Polygon",
          coordinates: [coords]
        }
      },
      isLive: false
    };
  }
}

export async function getIncidentReport(fireId) {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/incident/report/${fireId}`);
    return { data, isLive: true };
  } catch (err) {
    console.warn(`[AGNIDRISHTI API] Report fetch failed for ${fireId}, generating client-side fallback memo.`, err.message);
    const fire = FALLBACK_FIRES.find(f => f.fire_id === fireId) || FALLBACK_FIRES[0];
    return {
      data: {
        dossier_id: `NDRF-DOSSIER-${fire.fire_id}`,
        generated_at: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        incident_summary: {
          fire_id: fire.fire_id,
          category: fire.category,
          sub_category: fire.sub_category,
          threat_level: fire.threat_level,
          threat_score: fire.threat_score,
          anomaly_ratio: fire.anomaly_ratio,
          coordinates: { latitude: fire.latitude, longitude: fire.longitude }
        },
        industrial_facility_impact: {
          facility_name: fire.facility_name || "N/A (Rural / Agricultural Biomass)",
          facility_id: fire.facility_id || "N/A",
          observed_frp_mw: fire.frp,
          baseline_frp_mw: fire.baseline_frp_mw || 25.0,
          critical_chemicals_present: fire.critical_chemicals || ["PM2.5", "Carbon Monoxide"],
          emergency_contact: {
            ndrf_battalion: "6th Bn NDRF (Vadodara)",
            control_room: "+91-265-2830491"
          }
        },
        atmospheric_dispersion_assessment: {
          hazard_tier: fire.is_emergency ? "CRITICAL THERMAL ANOMALY" : "ROUTINE INDUSTRIAL FLUE PLUME",
          downwind_trajectory_bearing: `${((fire.wind_direction_deg || 235) + 180) % 360}°`,
          wind_speed: `${fire.wind_speed_kmh || 18.0} km/h`,
          toxic_plume_corridor_length: `${fire.hazard_radius_km * 3.5} km`,
          evacuation_zone_radius: `${fire.hazard_radius_km} km`,
          public_warning_statement: fire.actionable_sop
        },
        tactical_response_plan: {
          standard_operating_procedure: fire.actionable_sop,
          immediate_actions: [
            "1. Establish incident command post upwind of coordinates.",
            `2. Initiate localized sirens and alert communities downwind.`,
            "3. Coordinate with industrial hazard safety officers for plant emergency shutdown."
          ]
        }
      },
      isLive: false
    };
  }
}

export async function getLiveOsmVerification(lat, lon) {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/osm/live-verify?lat=${lat}&lon=${lon}`);
    return { data, isLive: true };
  } catch (err) {
    return {
      data: {
        live_nominatim_reverse_geocoding: {
          district: "Local Sub-district",
          state: "India",
          display_name: "OpenStreetMap Offline / Cached Profile",
          source: "LOCAL_INDEX"
        },
        live_overpass_industrial_infrastructure: {
          verified_in_osm: false,
          message: "Live Overpass query skipped or timed out."
        }
      },
      isLive: false
    };
  }
}
