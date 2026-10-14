import { RiskLevel, DischargePoint, WeatherData, SensorReading } from '../types';

export interface RiskThresholds {
  dangerRatio: number;   // default 3.0
  prepareRatio: number;  // default 2.0
  watchRatio: number;    // default 1.5
  fastRiseThresholdCmMin: number; // default 5.0 cm/min
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  dangerRatio: 3.0,
  prepareRatio: 2.0,
  watchRatio: 1.5,
  fastRiseThresholdCmMin: 5.0,
};

export interface RiskEvaluationResult {
  overallLevel: RiskLevel;
  nearestCriticalPoint?: DischargePoint;
  criticalDistanceKm: number | null;
  maxRatio: number;
  reason: string;
  heavyRainWarning: boolean;
  landslideRisk: boolean;
  sensorAlertTriggered: boolean;
  timeToPeakHours?: number;
}

/**
 * Calculates risk level of a single discharge point based on forecast peak vs 30-day mean.
 */
export function evaluatePointRisk(
  point: DischargePoint,
  thresholds: RiskThresholds = DEFAULT_THRESHOLDS
): RiskLevel {
  if (point.dischargeRatio >= thresholds.dangerRatio) {
    return 'LEAVE_NOW';
  }
  if (point.dischargeRatio >= thresholds.prepareRatio) {
    return 'PREPARE';
  }
  if (point.dischargeRatio >= thresholds.watchRatio) {
    return 'WATCH';
  }
  return 'SAFE';
}

/**
 * Evaluates comprehensive multi-source flood risk for the user:
 * 1. Distance from user to nearest flood-risk point (<=5km = LEAVE NOW, 5-20km = PREPARE, 20-50km = WATCH, >50km = SAFE)
 * 2. Peak forecast discharge ratio vs 30-day baseline
 * 3. Rate-of-rise
 * 4. Heavy rain & flash flood precipitation (next 24h)
 * 5. Local river sensor or official gauge feed override (sub-second trigger)
 */
export function evaluateOverallRisk(
  dischargePoints: DischargePoint[],
  weather?: WeatherData,
  sensor?: SensorReading,
  thresholds: RiskThresholds = DEFAULT_THRESHOLDS
): RiskEvaluationResult {
  let highestLevel: RiskLevel = 'SAFE';
  let nearestCritical: DischargePoint | undefined;
  let minDistance = Infinity;
  let maxRatio = 1.0;
  let reason = 'River discharge levels and weather conditions are within normal safety limits.';
  let timeToPeakHours: number | undefined;

  // 1. Direct hardware sensor or official gauge override (<1 second priority)
  let sensorAlertTriggered = false;
  if (sensor && !sensor.isFault) {
    if (sensor.state === 'LEAVE_NOW' || sensor.rateOfRiseCmMin >= thresholds.fastRiseThresholdCmMin) {
      sensorAlertTriggered = true;
      return {
        overallLevel: 'LEAVE_NOW',
        criticalDistanceKm: 0.1,
        maxRatio: 4.5,
        reason: `Immediate flood alert from river gauge ${sensor.sensorId}: Water level ${sensor.levelCm.toFixed(0)}cm rising rapidly at ${sensor.rateOfRiseCmMin.toFixed(1)}cm/min!`,
        heavyRainWarning: Boolean(weather?.heavyRainWarning),
        landslideRisk: Boolean(weather?.landslideRisk),
        sensorAlertTriggered: true,
        timeToPeakHours: 1
      };
    }
  }

  // 2. Hydrologic river discharge analysis across GloFAS grid
  for (const point of dischargePoints) {
    if (point.dischargeRatio > maxRatio) {
      maxRatio = point.dischargeRatio;
    }

    const pointLevel = evaluatePointRisk(point, thresholds);
    if (pointLevel !== 'SAFE') {
      if (point.distanceKm < minDistance) {
        minDistance = point.distanceKm;
        nearestCritical = point;
      }
    }
  }

  // 3. Distance-based classification per safety specification:
  // <=5 km = LEAVE NOW; 5-20 km = PREPARE; 20-50 km = WATCH; none = SAFE
  if (nearestCritical) {
    // Estimate hours until peak discharge based on peak date
    if (nearestCritical.peakDate) {
      const peakTime = new Date(nearestCritical.peakDate).getTime();
      const nowTime = Date.now();
      timeToPeakHours = Math.max(1, Math.round((peakTime - nowTime) / (1000 * 60 * 60)));
    }

    if (minDistance <= 5.0) {
      highestLevel = 'LEAVE_NOW';
      reason = `Critical river surge (${nearestCritical.dischargeRatio.toFixed(1)}x normal discharge) is within ${minDistance.toFixed(1)} km of your position.`;
    } else if (minDistance <= 20.0) {
      highestLevel = 'PREPARE';
      reason = `Elevated flood wave (${nearestCritical.dischargeRatio.toFixed(1)}x normal) detected ${minDistance.toFixed(1)} km away. Prepare for evacuation.`;
    } else if (minDistance <= 50.0) {
      highestLevel = 'WATCH';
      reason = `River discharge advisory (${nearestCritical.dischargeRatio.toFixed(1)}x normal) within ${minDistance.toFixed(1)} km. Monitor water levels closely.`;
    }
  }

  // 4. Flash flood & heavy rainfall hazard elevation
  if (weather && weather.precipitation24h >= 50.0 && highestLevel === 'SAFE') {
    highestLevel = 'WATCH';
    reason = `Heavy rainfall forecast (${weather.precipitation24h.toFixed(0)} mm in next 24 hours). Flash flooding possible in low-lying zones.`;
  } else if (weather && weather.precipitation24h >= 100.0 && highestLevel === 'WATCH') {
    highestLevel = 'PREPARE';
    reason = `Extreme rainfall warning (${weather.precipitation24h.toFixed(0)} mm/24h) with severe surface runoff and rapid pooling.`;
  }

  return {
    overallLevel: highestLevel,
    nearestCriticalPoint: nearestCritical,
    criticalDistanceKm: minDistance === Infinity ? null : minDistance,
    maxRatio,
    reason,
    heavyRainWarning: Boolean(weather?.heavyRainWarning),
    landslideRisk: Boolean(weather?.landslideRisk),
    sensorAlertTriggered,
    timeToPeakHours
  };
}

/**
 * Anti-Fatigue Filter:
 * Avoid re-alerting or sounding siren for the exact same risk level within 60 minutes
 * unless the situation has worsened (e.g. WATCH -> PREPARE or PREPARE -> LEAVE_NOW).
 */
export function shouldTriggerAlarm(
  newLevel: RiskLevel,
  lastLevel: RiskLevel | null,
  lastAlertTimestamp: number
): boolean {
  if (newLevel === 'SAFE') return false;
  if (!lastLevel) return true;

  const severityOrder: Record<RiskLevel, number> = {
    SAFE: 0,
    WATCH: 1,
    PREPARE: 2,
    LEAVE_NOW: 3
  };

  // If situation worsened, always alert immediately
  if (severityOrder[newLevel] > severityOrder[lastLevel]) {
    return true;
  }

  // If identical level, suppress audible repeat within 60 minutes (3600000 ms)
  const timeSinceLastAlertMs = Date.now() - lastAlertTimestamp;
  if (severityOrder[newLevel] === severityOrder[lastLevel] && timeSinceLastAlertMs < 3600000) {
    return false;
  }

  return true;
}
