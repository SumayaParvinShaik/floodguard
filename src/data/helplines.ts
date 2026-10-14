import { HelplineInfo } from '../types';

export const GLOBAL_HELPLINES: Record<string, HelplineInfo> = {
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    police: '112',
    fire: '101',
    ambulance: '108',
    disaster: '1070', // State Disaster Management Authority / NDMA
    floodSpecial: '1077', // District Disaster Control Room
    note: 'National Emergency 112. State Disaster 1070. District Control 1077. Verify local numbers.'
  },
  NP: {
    countryCode: 'NP',
    countryName: 'Nepal',
    police: '100',
    fire: '101',
    ambulance: '102',
    disaster: '1155', // Department of Hydrology & Meteorology Flood Toll-Free
    floodSpecial: '1155',
    note: 'Police 100. Flood Early Warning Toll-Free 1155. Verify local numbers.'
  },
  BD: {
    countryCode: 'BD',
    countryName: 'Bangladesh',
    police: '999',
    fire: '999',
    ambulance: '999',
    disaster: '1090', // Disaster Early Warning IVR voice portal
    floodSpecial: '1090',
    note: 'National Emergency 999. Disaster Early Warning Portal 1090.'
  },
  PK: {
    countryCode: 'PK',
    countryName: 'Pakistan',
    police: '15',
    fire: '16',
    ambulance: '1122', // Rescue 1122
    disaster: '1122',
    floodSpecial: '1122',
    note: 'Emergency Rescue 1122. NDMA hotline 051-111-157-157.'
  },
  LK: {
    countryCode: 'LK',
    countryName: 'Sri Lanka',
    police: '119',
    fire: '110',
    ambulance: '1990',
    disaster: '117', // Disaster Management Centre Call Centre
    floodSpecial: '117',
    note: 'Disaster Management Centre 117. Suwa Seriya Ambulance 1990.'
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    police: '911',
    fire: '911',
    ambulance: '911',
    disaster: '911',
    floodSpecial: '311', // City Non-Emergency / 211 Disaster Info
    note: 'Immediate Life Threat: 911. Community Disaster Resources: 211.'
  },
  UK: {
    countryCode: 'UK',
    countryName: 'United Kingdom',
    police: '999',
    fire: '999',
    ambulance: '999',
    disaster: '999',
    floodSpecial: '03459881188', // Environment Agency Floodline
    note: 'Emergency 999 / 112. EA Floodline 0345 988 1188.'
  },
  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    police: '000',
    fire: '000',
    ambulance: '000',
    disaster: '132500', // SES Flood and Storm Emergency
    floodSpecial: '132500',
    note: 'Life Threat: 000. SES Flood & Storm Emergency: 132 500.'
  },
  PH: {
    countryCode: 'PH',
    countryName: 'Philippines',
    police: '911',
    fire: '911',
    ambulance: '911',
    disaster: '911',
    floodSpecial: '136', // MMDA Flood / NDRRMC
    note: 'National Emergency 911. NDRRMC Hotline 8911-1406.'
  },
  ID: {
    countryCode: 'ID',
    countryName: 'Indonesia',
    police: '110',
    fire: '113',
    ambulance: '118',
    disaster: '117', // BNPB National Disaster Management
    floodSpecial: '112',
    note: 'BNPB Disaster 117. National Emergency 112 / Basarnas 115.'
  },
  KE: {
    countryCode: 'KE',
    countryName: 'Kenya',
    police: '999',
    fire: '999',
    ambulance: '999',
    disaster: '112', // National Disaster Operations Centre
    floodSpecial: '1199', // Red Cross Emergency
    note: 'National Emergency 999 / 112. Red Cross 1199.'
  },
  ES: {
    countryCode: 'ES',
    countryName: 'Spain',
    police: '112',
    fire: '112',
    ambulance: '112',
    disaster: '112',
    floodSpecial: '112',
    note: 'Emergencias 112. Protección Civil.'
  },
  FR: {
    countryCode: 'FR',
    countryName: 'France',
    police: '17',
    fire: '18',
    ambulance: '15',
    disaster: '112',
    floodSpecial: '112',
    note: 'Numéro d’urgence européen 112. Pompiers 18. SAMU 15.'
  },
  BR: {
    countryCode: 'BR',
    countryName: 'Brazil',
    police: '190',
    fire: '193',
    ambulance: '192',
    disaster: '199', // Defesa Civil
    floodSpecial: '199',
    note: 'Defesa Civil 199. Bombeiros 193. SAMU 192.'
  },
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    police: '110',
    fire: '112',
    ambulance: '112',
    disaster: '112',
    floodSpecial: '112',
    note: 'Notruf 112. Bürgertelefon Katastrophenschutz.'
  },
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    police: '911',
    fire: '911',
    ambulance: '911',
    disaster: '911',
    floodSpecial: '211',
    note: 'Emergency 911. Community Resources & Flood Info 211.'
  }
};

export const DEFAULT_FALLBACK_HELPLINE: HelplineInfo = {
  countryCode: 'GLOBAL',
  countryName: 'International Fallback',
  police: '112',
  fire: '112',
  ambulance: '112',
  disaster: '112',
  floodSpecial: '112',
  note: 'International Standard Emergency 112 (or 911). Verify local numbers.'
};

/**
 * Retrieves the appropriate helpline for a country, taking into account
 * authority overrides configured in settings.
 */
export function getHelplineForCountry(
  countryCode?: string,
  overrides?: Record<string, Partial<HelplineInfo>>
): HelplineInfo {
  const code = (countryCode || '').trim().toUpperCase();
  const base = GLOBAL_HELPLINES[code] || DEFAULT_FALLBACK_HELPLINE;

  if (overrides && overrides[code]) {
    return { ...base, ...overrides[code] };
  }

  return base;
}
