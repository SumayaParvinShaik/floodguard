import { LanguageMeta } from '../types';

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', bcp47: 'en-US' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', bcp47: 'ne-NP' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-BD' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', bcp47: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', bcp47: 'fr-FR' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', bcp47: 'ar-SA', rtl: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', bcp47: 'pt-BR' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', bcp47: 'id-ID' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', bcp47: 'sw-KE' },
];

/**
 * Regional linguistic mapping database for zero-latency offline detection.
 */
interface RegionalMapping {
  countryCodes: string[];
  states?: Record<string, string>; // lowercase state name -> lang code
  defaultLang: string;
}

const REGIONAL_DATABASE: Record<string, RegionalMapping> = {
  IN: {
    countryCodes: ['IN', 'IND'],
    defaultLang: 'hi',
    states: {
      'andhra pradesh': 'te',
      'telangana': 'te',
      'tamil nadu': 'ta',
      'puducherry': 'ta',
      'west bengal': 'bn',
      'tripura': 'bn',
      'kerala': 'en',
      'karnataka': 'en',
      'maharashtra': 'hi',
      'gujarat': 'hi',
      'bihar': 'hi',
      'uttar pradesh': 'hi',
      'delhi': 'hi',
      'punjab': 'hi',
      'assam': 'bn',
      'odisha': 'en'
    }
  },
  NP: {
    countryCodes: ['NP', 'NPL'],
    defaultLang: 'ne'
  },
  BD: {
    countryCodes: ['BD', 'BGD'],
    defaultLang: 'bn'
  },
  ES: {
    countryCodes: ['ES', 'ESP'],
    defaultLang: 'es'
  },
  MX: {
    countryCodes: ['MX', 'MEX', 'CO', 'AR', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY'],
    defaultLang: 'es'
  },
  FR: {
    countryCodes: ['FR', 'FRA', 'SN', 'CI', 'ML', 'CD', 'MG', 'CM'],
    defaultLang: 'fr'
  },
  SA: {
    countryCodes: ['SA', 'SAU', 'AE', 'ARE', 'EG', 'EGY', 'IQ', 'IRQ', 'JO', 'JOR', 'LB', 'LBN', 'KW', 'KWT', 'OM', 'OMN', 'QA', 'QAT', 'YE', 'YEM', 'SD', 'SDN', 'MA', 'MAR', 'DZ', 'DZA', 'TN', 'TUN'],
    defaultLang: 'ar'
  },
  BR: {
    countryCodes: ['BR', 'BRA', 'PT', 'PRT', 'AO', 'MOZ'],
    defaultLang: 'pt'
  },
  ID: {
    countryCodes: ['ID', 'IDN'],
    defaultLang: 'id'
  },
  KE: {
    countryCodes: ['KE', 'KEN', 'TZ', 'TZA', 'UG', 'UGA'],
    defaultLang: 'sw'
  }
};

/**
 * Resolves the optimal language for a user based on their geographical location
 * and their device browser language.
 */
export function resolveBestLanguage(
  countryCode?: string,
  stateName?: string,
  browserLang: string = typeof navigator !== 'undefined' ? navigator.language : 'en'
): LanguageMeta {
  const cleanCountry = (countryCode || '').trim().toUpperCase();
  const cleanState = (stateName || '').trim().toLowerCase();
  const browserPrefix = browserLang.split('-')[0].toLowerCase();

  // Find candidate language for region
  let regionalLangCode = 'en';

  for (const region of Object.values(REGIONAL_DATABASE)) {
    if (region.countryCodes.includes(cleanCountry)) {
      if (region.states && cleanState) {
        for (const [key, lang] of Object.entries(region.states)) {
          if (cleanState.includes(key)) {
            regionalLangCode = lang;
            break;
          }
        }
      }
      if (regionalLangCode === 'en' && region.defaultLang) {
        regionalLangCode = region.defaultLang;
      }
      break;
    }
  }

  // If the phone language is commonly spoken in that region or is directly supported,
  // prefer browser language if it matches regional options
  if (browserPrefix === regionalLangCode) {
    const match = SUPPORTED_LANGUAGES.find((l) => l.code === browserPrefix);
    if (match) return match;
  }

  // Otherwise prefer regional language first (e.g. user in Vijayawada gets Telugu even if their phone OS is set to English)
  if (regionalLangCode !== 'en') {
    const match = SUPPORTED_LANGUAGES.find((l) => l.code === regionalLangCode);
    if (match) return match;
  }

  // Then browser language
  const browserMatch = SUPPORTED_LANGUAGES.find((l) => l.code === browserPrefix);
  if (browserMatch) return browserMatch;

  // Default to English
  return SUPPORTED_LANGUAGES[0];
}
