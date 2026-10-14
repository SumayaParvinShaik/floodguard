import { GeoPoint, ReverseGeoResult } from '../types';

const GEO_CACHE_KEY = 'floodguard_last_geocode';

/**
 * Reverse geocodes coordinates to administrative region using BigDataCloud free client API,
 * falling back to Open-Meteo geocoding.
 */
export async function reverseGeocode(point: GeoPoint): Promise<ReverseGeoResult> {
  // 1. Try BigDataCloud Client Reverse Geocode (free, client-side, zero key required)
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${point.lat}&longitude=${point.lng}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const countryCode = data.countryCode || '';
      const countryName = data.countryName || 'Unknown Country';
      const state = data.principalSubdivision || '';
      const city = data.city || data.locality || '';
      const locality = data.locality || '';
      const displayName = [locality || city, state, countryName].filter(Boolean).join(', ');

      const result: ReverseGeoResult = {
        countryCode,
        countryName,
        state,
        city,
        locality,
        displayName: displayName || `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`
      };

      try {
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(result));
      } catch {}

      return result;
    }
  } catch (err) {
    console.warn('[Geocode] BigDataCloud query failed or timed out:', err);
  }

  // 2. Open-Meteo Reverse / Search Fallback
  try {
    const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${point.lat.toFixed(2)},${point.lng.toFixed(2)}&count=1&language=en&format=json`;
    const res = await fetch(omUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const top = data.results[0];
        const result: ReverseGeoResult = {
          countryCode: top.country_code || '',
          countryName: top.country || '',
          state: top.admin1 || '',
          city: top.name || '',
          locality: top.admin2 || '',
          displayName: [top.name, top.admin1, top.country].filter(Boolean).join(', ')
        };
        return result;
      }
    }
  } catch (err) {
    console.warn('[Geocode] Open-Meteo geocode fallback failed:', err);
  }

  // 3. Check offline cache
  const cached = localStorage.getItem(GEO_CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  // 4. Default fallback
  return {
    countryCode: 'GLOBAL',
    countryName: 'Current Location',
    state: '',
    city: 'Local Area',
    locality: '',
    displayName: `${point.lat.toFixed(4)}°, ${point.lng.toFixed(4)}°`
  };
}

/**
 * Searches a geographical place name (e.g., "Vijayawada", "Kathmandu", "Dhaka")
 * to coordinates using Open-Meteo Geocoding.
 */
export async function searchPlaceCoordinates(query: string): Promise<Array<{
  name: string;
  country: string;
  admin1?: string;
  lat: number;
  lng: number;
  countryCode: string;
}>> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data.results) {
        return data.results.map((r: any) => ({
          name: r.name,
          country: r.country || '',
          admin1: r.admin1 || '',
          lat: r.latitude,
          lng: r.longitude,
          countryCode: r.country_code || ''
        }));
      }
    }
  } catch (e) {
    console.warn('[Geocode] Place search error:', e);
  }

  return [];
}
