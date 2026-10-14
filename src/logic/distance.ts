import { GeoPoint, TravelMode } from '../types';

const EARTH_RADIUS_KM = 6371.0;

/**
 * Computes great-circle distance between two coordinates in kilometers using Haversine formula.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((EARTH_RADIUS_KM * c).toFixed(2));
}

/**
 * Computes the initial compass bearing in degrees (0° - 360°) from point 1 to point 2.
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180.0) * Math.cos((lat2 * Math.PI) / 180.0);
  const x =
    Math.cos((lat1 * Math.PI) / 180.0) * Math.sin((lat2 * Math.PI) / 180.0) -
    Math.sin((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180.0);

  const initialBearingRad = Math.atan2(y, x);
  const initialBearingDeg = (initialBearingRad * 180.0) / Math.PI;
  return Math.round((initialBearingDeg + 360) % 360);
}

/**
 * Converts a compass bearing degree into standard 16-point cardinal direction.
 */
export function getCompassDirection(bearingDeg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(bearingDeg / 22.5) % 16;
  return directions[index];
}

/**
 * Generates an equidistant ring of points around a center coordinate.
 * Used to batch-query river discharge across the 25km and 50km radii.
 */
export function generateRingPoints(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  count: number = 8
): GeoPoint[] {
  const points: GeoPoint[] = [];
  const angularDistance = radiusKm / EARTH_RADIUS_KM;
  const centerLatRad = (centerLat * Math.PI) / 180.0;
  const centerLngRad = (centerLng * Math.PI) / 180.0;

  for (let i = 0; i < count; i++) {
    const bearingRad = (i * (360 / count) * Math.PI) / 180.0;

    const latRad = Math.asin(
      Math.sin(centerLatRad) * Math.cos(angularDistance) +
      Math.cos(centerLatRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
    );

    const lngRad =
      centerLngRad +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(centerLatRad),
        Math.cos(angularDistance) - Math.sin(centerLatRad) * Math.sin(latRad)
      );

    points.push({
      lat: Number(((latRad * 180.0) / Math.PI).toFixed(4)),
      lng: Number(((lngRad * 180.0) / Math.PI).toFixed(4))
    });
  }

  return points;
}

/**
 * Estimates travel time in minutes based on distance and selected mode.
 */
export function calculateTravelMinutes(distanceKm: number, mode: TravelMode): number {
  let speedKmH = 4.5; // Standard adult walking speed
  if (mode === 'slow_walking') {
    speedKmH = 2.5; // Child or elderly walking speed
  } else if (mode === 'vehicle') {
    speedKmH = 25.0; // Disaster evacuation vehicle speed factoring congestion
  }

  const hours = distanceKm / speedKmH;
  return Math.max(1, Math.round(hours * 60));
}
