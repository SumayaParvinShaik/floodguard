export type RiskLevel = 'SAFE' | 'WATCH' | 'PREPARE' | 'LEAVE_NOW';

export type TravelMode = 'walking' | 'slow_walking' | 'vehicle';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DischargePoint extends GeoPoint {
  distanceKm: number;
  maxForecastDischarge: number;
  meanHistoricalDischarge: number;
  dischargeRatio: number;
  rateOfRise: number; // m³/s per day
  peakDate: string;
}

export interface WeatherData {
  precipitation24h: number; // mm
  heavyRainWarning: boolean;
  landslideRisk: boolean;
  lastUpdated: string;
}

export interface ReverseGeoResult {
  countryCode: string;
  countryName: string;
  state: string;
  city: string;
  locality: string;
  displayName: string;
}

export interface Shelter extends GeoPoint {
  id: string;
  name: string;
  type: 'shelter' | 'school' | 'hospital' | 'community_centre' | 'assembly_point';
  distanceKm: number;
  elevationMeters: number;
  elevationGainMeters: number;
  travelMinutes: number;
  isReachableInTime: boolean;
  isAlternate?: boolean;
  address?: string;
  phone?: string;
  bearingDeg?: number;
  compassDirection?: string;
}

export interface HelplineInfo {
  countryCode: string;
  countryName: string;
  police: string;
  fire: string;
  ambulance: string;
  disaster: string;
  floodSpecial?: string;
  note: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
}

export interface SensorReading {
  levelCm: number;
  rateOfRiseCmMin: number;
  state: RiskLevel;
  batteryPct: number;
  timestamp: number;
  sensorId: string;
  isFault: boolean;
}

export interface FamilyMemberStatus {
  id: string;
  name: string;
  status: 'safe' | 'needs_help' | 'evacuating';
  timestamp: number;
  message?: string;
}

export interface CommunityReport {
  id: string;
  type: 'water_level' | 'blocked_road' | 'bridge_closed' | 'shelter_full';
  description: string;
  lat: number;
  lng: number;
  timestamp: number;
  confidenceScore: number;
  photoUrl?: string;
  verified: boolean;
}

export interface AlertHistoryRecord {
  id: string;
  timestamp: number;
  level: RiskLevel;
  locationName: string;
  summary: string;
}

export interface AppSettings {
  geminiApiKey: string;
  proxyUrl: string;
  highContrast: boolean;
  largeText: boolean;
  simpleLanguage: boolean;
  audioFirst: boolean;
  lowDataMode: boolean;
  batterySaver: boolean;
  travelMode: TravelMode;
  dangerThresholdRatio: number;
  prepareThresholdRatio: number;
  watchThresholdRatio: number;
  fastRiseThresholdCmMin: number;
  emergencyContacts: EmergencyContact[];
  officialShelters: Shelter[];
  overrideHelplines: Record<string, Partial<HelplineInfo>>;
}

export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  bcp47: string;
  rtl?: boolean;
}
