import { playEmergencySiren, stopEmergencySiren } from './siren';

export interface SpeechOptions {
  bcp47: string;
  rate?: number; // 0.8 for Slow, 1.0 standard
  volume?: number; // 0.8 standard, 1.0 louder
  playSirenIntro?: boolean;
  onEnded?: () => void;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let autoRepeatTimer: number | null = null;
let isSpeakingState = false;

/**
 * Checks whether the browser has a synthesized speech voice installed
 * for the requested BCP47 language code.
 */
export function checkHasVoiceForLanguage(bcp47: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return true; // Voices might load asynchronously

  const prefix = bcp47.split('-')[0].toLowerCase();
  return voices.some(
    (v) => v.lang.toLowerCase().startsWith(prefix) || v.lang.toLowerCase() === bcp47.toLowerCase()
  );
}

/**
 * Executes the full acoustic warning sequence:
 * 1. Plays Web Audio siren tone + vibration
 * 2. Delivers spoken emergency alert in detected language
 */
export function speakEmergencyAlert(
  text: string,
  options: SpeechOptions
): { hasVoice: boolean } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { hasVoice: false };
  }

  // Cancel any existing speech
  stopEmergencySpeech();

  const hasVoice = checkHasVoiceForLanguage(options.bcp47);

  // Play siren intro if requested
  if (options.playSirenIntro !== false) {
    playEmergencySiren(options.volume === 1.0);
    // Let siren pulse for 1.4 seconds before speaking
    setTimeout(() => {
      stopEmergencySiren();
      deliverSpeech(text, options);
    }, 1400);
  } else {
    deliverSpeech(text, options);
  }

  return { hasVoice };
}

function deliverSpeech(text: string, options: SpeechOptions): void {
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.bcp47;
    utterance.rate = options.rate || 1.0;
    utterance.volume = options.volume || 1.0;
    utterance.pitch = 1.0;

    // Pick best matching voice
    const voices = window.speechSynthesis.getVoices();
    const prefix = options.bcp47.split('-')[0].toLowerCase();
    const matchedVoice = voices.find(
      (v) => v.lang.toLowerCase() === options.bcp47.toLowerCase() || v.lang.toLowerCase().startsWith(prefix)
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      isSpeakingState = true;
    };

    utterance.onend = () => {
      isSpeakingState = false;
      activeUtterance = null;
      if (options.onEnded) options.onEnded();
    };

    utterance.onerror = (e) => {
      console.warn('[SpeechSynthesis] Error:', e);
      isSpeakingState = false;
      activeUtterance = null;
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[SpeechSynthesis] deliverSpeech exception:', err);
  }
}

/**
 * Starts continuous auto-repeat cadence for LEAVE_NOW state until acknowledged.
 */
export function startAutoRepeatAlert(text: string, options: SpeechOptions): void {
  stopAutoRepeatAlert();

  speakEmergencyAlert(text, {
    ...options,
    onEnded: () => {
      // Repeat alert every 12 seconds while in critical danger state
      autoRepeatTimer = window.setTimeout(() => {
        startAutoRepeatAlert(text, options);
      }, 12000);
    }
  });
}

export function stopAutoRepeatAlert(): void {
  if (autoRepeatTimer) {
    clearTimeout(autoRepeatTimer);
    autoRepeatTimer = null;
  }
  stopEmergencySpeech();
}

export function stopEmergencySpeech(): void {
  stopEmergencySiren();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeakingState = false;
  activeUtterance = null;
}

export function getIsSpeaking(): boolean {
  return isSpeakingState;
}

export function getActiveUtterance(): SpeechSynthesisUtterance | null {
  return activeUtterance;
}
