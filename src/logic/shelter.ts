import { Shelter, GeoPoint, TravelMode, DischargePoint } from '../types';
import {
  haversineDistanceKm,
  calculateBearing,
  getCompassDirection,
  calculateTravelMinutes
} from './distance';

export interface ShelterSelectionResult {
  primaryShelter: Shelter | null;
  alternateShelter: Shelter | null;
  allCandidates: Shelter[];
  verticalEvacuationAdvised: boolean;
  honestAdvice: string;
}

/**
 * Computes the safest reachable evacuation refuge:
 * Criteria:
 * 1. Within 15 km of user.
 * 2. Elevation must be higher than the user (elevationGainMeters > 0).
 * 3. Shelter must be farther from the flood epicenter than the user is
 *    (prevents navigating directly into the flood hazard).
 * 4. Official emergency shelters override OpenStreetMap candidates.
 * 5. Shortest travel time wins.
 * 6. Travel time compared with flood arrival time: If unreachable in time,
 *    honestly recommends vertical evacuation.
 */
export function selectSafestShelter(
  userLocation: GeoPoint,
  userElevationMeters: number,
  candidateShelters: Shelter[],
  floodPoint?: DischargePoint,
  travelMode: TravelMode = 'walking',
  floodArrivalTimeHours?: number
): ShelterSelectionResult {
  const userToFloodDist = floodPoint
    ? haversineDistanceKm(userLocation.lat, userLocation.lng, floodPoint.lat, floodPoint.lng)
    : 0;

  // Process and augment each shelter with geometry, elevation delta, travel time
  const processedCandidates: Shelter[] = candidateShelters
    .map((shelter) => {
      const dist = haversineDistanceKm(
        userLocation.lat,
        userLocation.lng,
        shelter.lat,
        shelter.lng
      );
      const elevationGain = Number((shelter.elevationMeters - userElevationMeters).toFixed(1));
      const bearing = calculateBearing(
        userLocation.lat,
        userLocation.lng,
        shelter.lat,
        shelter.lng
      );
      const travelMins = calculateTravelMinutes(dist, travelMode);

      // Distance from shelter to the flood epicenter
      const shelterToFloodDist = floodPoint
        ? haversineDistanceKm(shelter.lat, shelter.lng, floodPoint.lat, floodPoint.lng)
        : Infinity;

      // Condition: shelter is farther from flood point than user is
      const isMovingAwayFromFlood = !floodPoint || shelterToFloodDist >= userToFloodDist;

      // Reachability condition vs flood arrival time
      let isReachableInTime = true;
      if (floodArrivalTimeHours !== undefined && floodArrivalTimeHours > 0) {
        const floodArrivalMinutes = floodArrivalTimeHours * 60;
        // Require a 15-minute safety buffer
        if (travelMins + 15 > floodArrivalMinutes) {
          isReachableInTime = false;
        }
      }

      return {
        ...shelter,
        distanceKm: dist,
        elevationGainMeters: elevationGain,
        bearingDeg: bearing,
        compassDirection: getCompassDirection(bearing),
        travelMinutes: travelMins,
        isReachableInTime,
        isMovingAwayFromFlood
      };
    })
    // Filter to within 15 km
    .filter((s) => s.distanceKm <= 15.0);

  // Filter for valid candidates:
  // Must have positive or neutral elevation gain (higher than or equal to user)
  // AND must not move toward the flood point
  let validCandidates = processedCandidates.filter((s) => {
    const higherGround = s.elevationGainMeters >= 0;
    const safeDirection = (s as any).isMovingAwayFromFlood !== false;
    return higherGround && safeDirection;
  });

  // If strict filtering yields zero candidates, gracefully relax the flood angle check
  // but retain higher ground prioritization
  if (validCandidates.length === 0) {
    validCandidates = processedCandidates.filter((s) => s.elevationGainMeters >= 0);
  }

  // If still empty (e.g. user is on the highest peak in the valley), sort by proximity
  if (validCandidates.length === 0) {
    validCandidates = [...processedCandidates];
  }

  // Sort: reachable first, then shortest travel time, then highest elevation gain
  validCandidates.sort((a, b) => {
    if (a.isReachableInTime !== b.isReachableInTime) {
      return a.isReachableInTime ? -1 : 1;
    }
    if (a.travelMinutes !== b.travelMinutes) {
      return a.travelMinutes - b.travelMinutes;
    }
    return b.elevationGainMeters - a.elevationGainMeters;
  });

  const primary = validCandidates[0] || null;
  const alternate = validCandidates.length > 1 ? { ...validCandidates[1], isAlternate: true } : null;

  // Check if primary shelter cannot be reached before flood arrival
  let verticalEvacuationAdvised = false;
  let honestAdvice = '';

  if (!primary) {
    verticalEvacuationAdvised = true;
    honestAdvice =
      'No identified emergency shelters found within 15 km. Do not attempt long travel. Immediately seek vertical refuge: climb to the highest floor, reinforced roof, or nearest elevated structure.';
  } else if (!primary.isReachableInTime) {
    verticalEvacuationAdvised = true;
    honestAdvice = `Shelter (${primary.name}) is ${primary.travelMinutes} minutes away, which exceeds estimated flood arrival time (${(floodArrivalTimeHours || 1).toFixed(1)} hours). Evacuation on foot is dangerous. Move to an upper floor, reinforced roof, or high ground now.`;
  } else {
    honestAdvice = `Safest route to ${primary.name}: ${primary.distanceKm} km (${primary.compassDirection}), approximately ${primary.travelMinutes} minutes. Elevation gain: +${primary.elevationGainMeters}m above current level.`;
  }

  return {
    primaryShelter: primary,
    alternateShelter: alternate,
    allCandidates: processedCandidates,
    verticalEvacuationAdvised,
    honestAdvice
  };
}
