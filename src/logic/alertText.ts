import { RiskLevel, Shelter, HelplineInfo } from '../types';

export interface AlertTextParams {
  level: RiskLevel;
  locationName: string;
  criticalDistanceKm: number | null;
  expectedTimeHours?: number;
  shelter: Shelter | null;
  helpline: HelplineInfo;
  verticalEvacuationAdvised?: boolean;
}

/**
 * Generates calibrated, strictly factual 40-60 word emergency alert text.
 * Contains:
 * - Danger level
 * - How close
 * - Expected arrival time
 * - Exact shelter name
 * - Compass direction
 * - Distance
 * - Travel minutes
 * - Helpline phone digits
 * Tone: Calm, direct, urgent, zero fabricated facts.
 */
export function generateFactualAlertText(params: AlertTextParams): string {
  const {
    level,
    locationName,
    criticalDistanceKm,
    expectedTimeHours,
    shelter,
    helpline,
    verticalEvacuationAdvised
  } = params;

  const helplineDigits = helpline.disaster || helpline.police || '112';

  if (level === 'SAFE') {
    return `FloodGuard status for ${locationName}: Normal conditions. No severe river surge detected within fifty kilometers. Stay informed and monitor official announcements. Local emergency helpline is ${helplineDigits}.`;
  }

  const levelLabels: Record<RiskLevel, string> = {
    SAFE: 'Normal',
    WATCH: 'Flood Watch',
    PREPARE: 'Flood Warning Prepare',
    LEAVE_NOW: 'Emergency Leave Now'
  };

  const levelTitle = levelLabels[level];
  const distanceStr = criticalDistanceKm ? `${criticalDistanceKm.toFixed(1)} km` : 'nearby';
  const timeStr = expectedTimeHours ? `in approximately ${expectedTimeHours} hours` : 'soon';

  if (verticalEvacuationAdvised || !shelter) {
    return `${levelTitle} for ${locationName}. River surge is ${distanceStr} away, expected ${timeStr}. Surrounding roads are at risk and safe shelters cannot be reached in time. Do not travel outside. Move immediately to an upper floor, high ground, or roof. Dial emergency services at ${helplineDigits}.`;
  }

  const shelterDir = shelter.compassDirection || 'nearby';
  const shelterDist = `${shelter.distanceKm.toFixed(1)} km`;
  const shelterMins = `${shelter.travelMinutes} minutes`;

  return `${levelTitle} for ${locationName}. River flood threat is ${distanceStr} away, expected ${timeStr}. Evacuate immediately to designated shelter ${shelter.name}, located ${shelterDist} to the ${shelterDir}, approximately ${shelterMins} travel time. Elevation gain is plus ${shelter.elevationGainMeters} meters. For emergency rescue dial ${helplineDigits}.`;
}
