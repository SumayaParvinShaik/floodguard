import { GeoPoint, DischargePoint, WeatherData } from '../types';
import { haversineDistanceKm, generateRingPoints } from '../logic/distance';

export interface HydrologicDataResponse {
  dischargePoints: DischargePoint[];
  weather: WeatherData;
  userElevation: number;
  lastUpdated: string;
  source: string;
  isCached: boolean;
}

const CACHE_KEY = 'floodguard_hydrologic_cache';

/**
 * Fetches river discharge, weather forecast, and elevation using free Open-Meteo APIs.
 * Batches user's point plus 25km and 50km concentric ring points into a single HTTP request.
 */
export async function fetchHydrologicData(
  userLocation: GeoPoint
): Promise<HydrologicDataResponse> {
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const source = 'Open-Meteo GloFAS River Model & ECMWF Weather';

  try {
    // 1. Generate ring points at 25km and 50km for batched query
    const ring25 = generateRingPoints(userLocation.lat, userLocation.lng, 25, 4);
    const ring50 = generateRingPoints(userLocation.lat, userLocation.lng, 50, 4);
    const allQueryPoints: GeoPoint[] = [userLocation, ...ring25, ...ring50];

    const lats = allQueryPoints.map((p) => p.lat.toFixed(4)).join(',');
    const lngs = allQueryPoints.map((p) => p.lng.toFixed(4)).join(',');

    // 2. Batched GloFAS query (past 30 days + 7 forecast days)
    const floodApiUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${lats}&longitude=${lngs}&daily=river_discharge&past_days=30&forecast_days=7`;
    
    // 3. Weather forecast (24h precipitation)
    const weatherApiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.lat}&longitude=${userLocation.lng}&daily=precipitation_sum&hourly=precipitation&forecast_days=2&timezone=auto`;

    // 4. Elevation API for user's coordinate
    const elevationApiUrl = `https://api.open-meteo.com/v1/elevation?latitude=${userLocation.lat}&longitude=${userLocation.lng}`;

    // Execute in parallel
    const [floodRes, weatherRes, elevationRes] = await Promise.all([
      fetch(floodApiUrl, { signal: AbortSignal.timeout(9000) }),
      fetch(weatherApiUrl, { signal: AbortSignal.timeout(7000) }),
      fetch(elevationApiUrl, { signal: AbortSignal.timeout(6000) })
    ]);

    // Process Flood / GloFAS data
    const dischargePoints: DischargePoint[] = [];
    if (floodRes.ok) {
      const floodJson = await floodRes.json();
      const resultsArray = Array.isArray(floodJson) ? floodJson : [floodJson];

      resultsArray.forEach((item: any, idx: number) => {
        const queryPt = allQueryPoints[idx] || userLocation;
        const daily = item.daily;
        if (daily && daily.river_discharge && daily.river_discharge.length > 0) {
          const discharges: (number | null)[] = daily.river_discharge;
          const times: string[] = daily.time || [];

          // Past 30 days vs 7 forecast days
          const historical = discharges.slice(0, 30).filter((v): v is number => v !== null && v > 0);
          const forecast = discharges.slice(30).filter((v): v is number => v !== null);

          const meanHistorical = historical.length > 0
            ? historical.reduce((acc, v) => acc + v, 0) / historical.length
            : 10.0; // standard base flow fallback

          const maxForecast = forecast.length > 0 ? Math.max(...forecast) : meanHistorical;

          // Compute peak date
          let peakDate = '';
          const maxIdx = forecast.indexOf(maxForecast);
          if (maxIdx !== -1 && times[30 + maxIdx]) {
            peakDate = times[30 + maxIdx];
          }

          // Rate of rise (delta from current day to next day)
          const currentDayDischarge = discharges[30] || meanHistorical;
          const nextDayDischarge = discharges[31] || currentDayDischarge;
          const rateOfRise = Math.max(0, nextDayDischarge - currentDayDischarge);

          const ratio = Number((maxForecast / Math.max(1.0, meanHistorical)).toFixed(2));
          const distKm = haversineDistanceKm(userLocation.lat, userLocation.lng, queryPt.lat, queryPt.lng);

          dischargePoints.push({
            lat: queryPt.lat,
            lng: queryPt.lng,
            distanceKm: distKm,
            maxForecastDischarge: Number(maxForecast.toFixed(1)),
            meanHistoricalDischarge: Number(meanHistorical.toFixed(1)),
            dischargeRatio: ratio,
            rateOfRise: Number(rateOfRise.toFixed(1)),
            peakDate
          });
        }
      });
    }

    // Process Weather / Precipitation data
    let precipitation24h = 0;
    if (weatherRes.ok) {
      const weatherJson = await weatherRes.json();
      if (weatherJson.daily?.precipitation_sum?.length > 0) {
        precipitation24h = weatherJson.daily.precipitation_sum[0] || 0;
      } else if (weatherJson.hourly?.precipitation?.length > 0) {
        // Sum first 24 hours
        precipitation24h = weatherJson.hourly.precipitation.slice(0, 24).reduce((acc: number, v: number) => acc + (v || 0), 0);
      }
    }

    // Process Elevation
    let userElevation = 25.0; // default baseline in meters
    if (elevationRes.ok) {
      const elevationJson = await elevationRes.json();
      if (Array.isArray(elevationJson.elevation) && elevationJson.elevation[0] !== null) {
        userElevation = elevationJson.elevation[0];
      }
    }

    const weatherData: WeatherData = {
      precipitation24h: Number(precipitation24h.toFixed(1)),
      heavyRainWarning: precipitation24h >= 50.0,
      landslideRisk: precipitation24h >= 75.0 && userElevation > 100.0,
      lastUpdated
    };

    const response: HydrologicDataResponse = {
      dischargePoints: dischargePoints.length > 0 ? dischargePoints : generateFallbackPoints(userLocation),
      weather: weatherData,
      userElevation: Number(userElevation.toFixed(0)),
      lastUpdated,
      source,
      isCached: false
    };

    // Cache locally for offline resilience
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(response));
    } catch {
      // quota safeguard
    }

    return response;
  } catch (error) {
    console.warn('[HydrologyAPI] Network request failed or timed out. Checking offline cache...', error);
    
    // Check cached data
    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr);
        return {
          ...cached,
          isCached: true,
          source: `${source} (Offline Cache - Check Connection)`
        };
      } catch {}
    }

    // Graceful offline synthetic fallback
    return {
      dischargePoints: generateFallbackPoints(userLocation),
      weather: {
        precipitation24h: 0,
        heavyRainWarning: false,
        landslideRisk: false,
        lastUpdated
      },
      userElevation: 30,
      lastUpdated,
      source: `${source} (Offline Fallback)`,
      isCached: true
    };
  }
}

function generateFallbackPoints(center: GeoPoint): DischargePoint[] {
  return [
    {
      lat: center.lat,
      lng: center.lng,
      distanceKm: 0,
      maxForecastDischarge: 12.0,
      meanHistoricalDischarge: 10.0,
      dischargeRatio: 1.2,
      rateOfRise: 0.2,
      peakDate: new Date().toISOString()
    }
  ];
}
