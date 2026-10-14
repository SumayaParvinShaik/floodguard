import { resolveBestLanguage, SUPPORTED_LANGUAGES } from '../i18n/languages';

const GEMINI_LOCAL_KEY = 'floodguard_gemini_api_key';

/**
 * Retrieves the active Gemini API key from environment, AI Studio injection, or localStorage.
 */
export function getActiveGeminiKey(): string {
  // 1. Vite environment variable (or injected in AI Studio)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY.trim();
  }
  // 2. LocalStorage user configuration
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(GEMINI_LOCAL_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  }
  return '';
}

export function saveGeminiKey(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(GEMINI_LOCAL_KEY, key.trim());
  }
}

export function clearGeminiKey(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(GEMINI_LOCAL_KEY);
  }
}

export function getProxyUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PROXY_URL) {
    return import.meta.env.VITE_PROXY_URL.trim();
  }
  return '';
}

/**
 * Validates a Gemini API Key with a lightweight test prompt.
 */
export async function testGeminiApiKey(key: string): Promise<{ success: boolean; message: string }> {
  if (!key || key.trim().length < 10) {
    return { success: false, message: 'Invalid API key length.' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key.trim()}`;
    const payload = {
      contents: [{ parts: [{ text: 'Respond with the word: READY' }] }]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(7000)
    });

    if (res.ok) {
      return { success: true, message: 'API key validated successfully! Gemini AI features active.' };
    } else {
      const err = await res.json();
      return {
        success: false,
        message: err.error?.message || `API error code: ${res.status}`
      };
    }
  } catch (err: any) {
    return { success: false, message: `Connection failed: ${err.message || 'Network error'}` };
  }
}

/**
 * Uses Gemini to determine the most appropriate native language for the user,
 * considering their country, state, district/locality, and phone language.
 * Returns JSON { language, bcp47, text }.
 * Falls back gracefully to offline resolver if key absent or network fails.
 */
export async function detectLanguageWithGemini(
  countryName: string,
  stateName: string,
  locality: string,
  browserLang: string
): Promise<{ language: string; bcp47: string; rationale: string }> {
  const offlineResolved = resolveBestLanguage(undefined, stateName, browserLang);
  const activeKey = getActiveGeminiKey();
  const proxyUrl = getProxyUrl();

  // If no Gemini key and no proxy configured, use instant offline detection
  if (!activeKey && !proxyUrl) {
    return {
      language: offlineResolved.code,
      bcp47: offlineResolved.bcp47,
      rationale: `Selected ${offlineResolved.name} based on offline regional database for ${stateName || countryName}.`
    };
  }

  const prompt = `You are an emergency disaster response linguist.
A flood warning app is locating a user at:
- Country: "${countryName}"
- State/Region: "${stateName}"
- City/Locality: "${locality}"
- User's Phone/Browser System Language: "${browserLang}"

Determine the most appropriate spoken and written language for life-safety emergency instructions in this exact region.
Rule: If the phone's browser language is commonly understood in this locality, prefer it. Otherwise pick the primary local mother tongue (e.g., Vijayawada -> Telugu; Kathmandu -> Nepali; Dhaka -> Bengali).
Supported codes: [en, te, hi, ne, bn, ta, es, fr, ar, pt, id, sw].

Respond ONLY with valid JSON in this exact structure:
{
  "language": "two_letter_code",
  "bcp47": "bcp47_tag",
  "rationale": "one sentence explanation"
}`;

  try {
    let rawText = '';

    if (proxyUrl) {
      const res = await fetch(`${proxyUrl}/api/gemini/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const json = await res.json();
        rawText = json.text;
      }
    } else if (activeKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const json = await res.json();
        rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    }

    if (rawText) {
      const cleanJson = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
      if (cleanJson.language) {
        // Ensure language is supported in our UI
        const matched = SUPPORTED_LANGUAGES.find((l) => l.code === cleanJson.language);
        if (matched) {
          return {
            language: matched.code,
            bcp47: cleanJson.bcp47 || matched.bcp47,
            rationale: cleanJson.rationale || `Gemini recommended ${matched.name}.`
          };
        }
      }
    }
  } catch (e) {
    console.warn('[Gemini] Language resolution failed or timed out. Using offline fallback:', e);
  }

  return {
    language: offlineResolved.code,
    bcp47: offlineResolved.bcp47,
    rationale: `Selected ${offlineResolved.name} via offline regional fallback.`
  };
}
