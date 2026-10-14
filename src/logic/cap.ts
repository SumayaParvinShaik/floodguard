import { RiskLevel, GeoPoint, Shelter } from '../types';

export interface CapAlertOptions {
  identifier?: string;
  sender?: string;
  headline: string;
  description: string;
  instruction: string;
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Past';
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
  certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely';
  userLocation: GeoPoint;
  radiusKm: number;
  languages: string[];
  primaryShelter?: Shelter | null;
}

/**
 * Builds an OASIS Common Alerting Protocol (CAP) v1.2 valid XML string.
 * Formatted with 50 km circular geocode area, multi-lingual blocks,
 * and telecom Cell Broadcast / Google Emergency Alert ready tags.
 */
export function buildCap12Xml(options: CapAlertOptions): string {
  const identifier = options.identifier || `FG-ALERT-${Date.now()}`;
  const sender = options.sender || 'emergency-authorities@floodguard.org';
  const sent = new Date().toISOString();
  const radius = options.radiusKm || 50.0;

  const lat = options.userLocation.lat.toFixed(4);
  const lng = options.userLocation.lng.toFixed(4);
  const circleTag = `${lat},${lng} ${radius}`;

  const infoBlocks = options.languages.map((lang) => {
    return `
    <info>
      <language>${lang}</language>
      <category>Met</category>
      <category>Safety</category>
      <event>Flash Flood & River Inundation Alert</event>
      <urgency>${options.urgency}</urgency>
      <severity>${options.severity}</severity>
      <certainty>${options.certainty}</certainty>
      <eventCode>
        <valueName>SAME</valueName>
        <value>FFW</value>
      </eventCode>
      <headline>${escapeXml(options.headline)}</headline>
      <description>${escapeXml(options.description)}</description>
      <instruction>${escapeXml(options.instruction)}</instruction>
      <area>
        <areaDesc>50 km radius around ${lat}, ${lng}</areaDesc>
        <circle>${circleTag}</circle>
      </area>
    </info>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${identifier}</identifier>
  <sender>${sender}</sender>
  <sent>${sent}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <code>CellBroadcastCapable</code>
  <code>AndroidEmergencyAlerts</code>
  ${infoBlocks}
</alert>`.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function mapRiskToCapProperties(level: RiskLevel): {
  urgency: 'Immediate' | 'Expected' | 'Future';
  severity: 'Extreme' | 'Severe' | 'Moderate';
  certainty: 'Observed' | 'Likely' | 'Possible';
} {
  switch (level) {
    case 'LEAVE_NOW':
      return { urgency: 'Immediate', severity: 'Extreme', certainty: 'Observed' };
    case 'PREPARE':
      return { urgency: 'Immediate', severity: 'Severe', certainty: 'Likely' };
    case 'WATCH':
      return { urgency: 'Expected', severity: 'Moderate', certainty: 'Possible' };
    default:
      return { urgency: 'Future', severity: 'Moderate', certainty: 'Possible' };
  }
}
