/**
 * AGNIDRISHTI Frontend API Client
 * Base URL: http://127.0.0.1:8000
 * Strictly Data-Driven: Zero synthetic or hardcoded fallback data.
 */

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
    console.warn('[AGNIDRISHTI API] Summary fetch failed:', err.message);
    return { data: null, isLive: false, error: 'DATA SOURCE UNAVAILABLE' };
  }
}

export async function getFires(filterMode = 'all') {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/fires?filter_mode=${filterMode}`);
    return {
      data: data.data || [],
      total: data.total_records || 0,
      syncMetadata: data.sync_metadata || {},
      source: data.source || 'NASA_FIRMS_MULTI_VIIRS_LIVE',
      isLive: data.status === 'success'
    };
  } catch (err) {
    console.warn(`[AGNIDRISHTI API] Fires (${filterMode}) fetch failed:`, err.message);
    return {
      data: [],
      total: 0,
      syncMetadata: {
        last_sync_utc: 'None',
        source_status: 'DATA SOURCE UNAVAILABLE'
      },
      source: 'DATA SOURCE UNAVAILABLE',
      isLive: false,
      error: 'DATA SOURCE UNAVAILABLE'
    };
  }
}

export async function getSensitiveLocations() {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/sensitive-locations`);
    return { data, isLive: true };
  } catch (err) {
    console.warn('[AGNIDRISHTI API] Sensitive locations fetch failed:', err.message);
    return {
      data: {
        type: "FeatureCollection",
        features: []
      },
      isLive: false,
      error: 'GEOSPATIAL CONTEXT UNAVAILABLE'
    };
  }
}

export async function getFacilities() {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/facilities`);
    return { data, isLive: true };
  } catch (err) {
    console.warn('[AGNIDRISHTI API] Facilities fetch failed:', err.message);
    return {
      data: {
        type: "FeatureCollection",
        features: []
      },
      isLive: false,
      error: 'FACILITIES DATA UNAVAILABLE'
    };
  }
}

export async function getPlume(fireId) {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/plume/${fireId}`);
    return { data, isLive: true };
  } catch (err) {
    console.warn(`[AGNIDRISHTI API] Plume fetch failed for ${fireId}:`, err.message);
    return { data: null, isLive: false, error: 'PLUME MODEL UNAVAILABLE' };
  }
}

export async function getIncidentReport(fireId) {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/incident/report/${fireId}`);
    return { data, isLive: true };
  } catch (err) {
    console.warn(`[AGNIDRISHTI API] Report fetch failed for ${fireId}:`, err.message);
    return { data: null, isLive: false, error: 'INCIDENT REPORT UNAVAILABLE' };
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
          district: "Unknown",
          state: "India",
          display_name: "OpenStreetMap Offline",
          source: "UNAVAILABLE"
        },
        live_overpass_industrial_infrastructure: {
          verified_in_osm: false,
          message: "OSM Overpass query unavailable."
        }
      },
      isLive: false
    };
  }
}

export async function getDataHealth() {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/data-health`);
    return { data, isLive: true };
  } catch (err) {
    return { data: null, isLive: false, error: 'HEALTH CHECK UNAVAILABLE' };
  }
}

export async function getSatelliteEvidence(fireId) {
  try {
    const data = await fetchWithTimeout(`${BASE_URL}/api/satellite-evidence/${fireId}`);
    return { data, isLive: true };
  } catch (err) {
    console.warn(`[AGNIDRISHTI API] Satellite evidence fetch failed for ${fireId}:`, err.message);
    return { data: null, isLive: false, error: 'SATELLITE EVIDENCE UNAVAILABLE' };
  }
}

