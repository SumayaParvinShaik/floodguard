/**
 * Web Audio API Oscillating Dual-Tone Disaster Siren Generator
 * Generates emergency warning audio directly in the browser with ZERO network files or MP3 latency.
 */

let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let lfo: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let isSirenActive = false;

export function playEmergencySiren(isLouder: boolean = false): void {
  if (isSirenActive) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Main carrier oscillator (800Hz to 1200Hz wailing siren)
    oscillator = audioCtx.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 950;

    // Low Frequency Oscillator (LFO) to modulate carrier frequency
    lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.8; // 1.8 cycles per second

    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 250; // Sweeps pitch +/- 250 Hz

    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);

    // Master volume gain node
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
    // Smooth ramp-up to prevent audio pop
    const targetVolume = isLouder ? 0.85 : 0.5;
    gainNode.gain.exponentialRampToValueAtTime(targetVolume, audioCtx.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    lfo.start();
    isSirenActive = true;

    // Haptic vibration feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 200, 400, 200, 800]);
    }
  } catch (err) {
    console.warn('[WebAudio] Could not start siren:', err);
  }
}

export function stopEmergencySiren(): void {
  if (!isSirenActive || !gainNode || !audioCtx) return;

  try {
    // Smooth fade out
    gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);

    setTimeout(() => {
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
        oscillator = null;
      }
      if (lfo) {
        lfo.stop();
        lfo.disconnect();
        lfo = null;
      }
      isSirenActive = false;
    }, 250);

    // Cancel device vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  } catch (e) {
    console.warn('[WebAudio] Siren stop error:', e);
    isSirenActive = false;
  }
}

export function getIsSirenPlaying(): boolean {
  return isSirenActive;
}
