import { readSoundEnabled, writeSoundEnabled } from '../utils/gamePreferences';

type SuccessToneKind = 'synthesis' | 'level' | 'victory';

export interface PourRustleHandle {
  stop: () => void;
}

let audioContext: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let soundEnabled = readSoundEnabled();

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  writeSoundEnabled(enabled);

  if (enabled) {
    void getAudioContext()?.resume().catch(() => undefined);
  }
}

function canPlaySound(): boolean {
  return soundEnabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  try {
    if (!audioContext) {
      audioContext = new AudioContextCtor();
    }
  } catch {
    return null;
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => undefined);
  }

  return audioContext;
}

function getNoiseBuffer(context: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;

  const length = context.sampleRate * 0.25;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    channel[i] = Math.random() * 2 - 1;
  }

  noiseBuffer = buffer;
  return buffer;
}

function scheduleGainEnvelope(
  context: AudioContext,
  gainNode: GainNode,
  peak: number,
  attack: number,
  decay: number
): number {
  const now = context.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(peak, now + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  return now;
}

export function playPourRustle(layerCount: number): PourRustleHandle | null {
  if (!canPlaySound()) return null;

  const context = getAudioContext();
  if (!context) return null;

  const source = context.createBufferSource();
  source.buffer = getNoiseBuffer(context);
  source.loop = true;

  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 170;

  const bandpass = context.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 760 + layerCount * 55;
  bandpass.Q.value = 0.65;

  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 2350 - layerCount * 80;

  const gainNode = context.createGain();
  const peak = Math.min(0.06, 0.028 + layerCount * 0.008);

  const flutter = context.createOscillator();
  flutter.type = 'sine';
  flutter.frequency.value = 6.5 + layerCount * 0.4;

  const flutterGain = context.createGain();
  flutterGain.gain.value = 0.0026;

  const now = context.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(peak, now + 0.05);

  source.playbackRate.value = 0.86 + layerCount * 0.025;
  flutter.connect(flutterGain);
  flutterGain.connect(gainNode.gain);

  source.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(lowpass);
  lowpass.connect(gainNode);
  gainNode.connect(context.destination);
  source.start(now);
  flutter.start(now);

  let stopped = false;

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;

      const releaseAt = context.currentTime;
      gainNode.gain.cancelScheduledValues(releaseAt);
      gainNode.gain.setValueAtTime(peak, releaseAt);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseAt + 0.12);
      source.stop(releaseAt + 0.16);
      flutter.stop(releaseAt + 0.16);
    },
  };
}

export function playFailureTone(): void {
  if (!canPlaySound()) return;

  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(220, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(140, context.currentTime + 0.16);

  const gainNode = context.createGain();
  const now = scheduleGainEnvelope(context, gainNode, 0.08, 0.01, 0.18);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.22);
}

export function playSuccessTone(kind: SuccessToneKind): void {
  if (!canPlaySound()) return;

  const context = getAudioContext();
  if (!context) return;

  const presets: Record<SuccessToneKind, { frequencies: number[]; peak: number; spacing: number; duration: number }> = {
    synthesis: {
      frequencies: [392, 523.25, 659.25],
      peak: 0.045,
      spacing: 0.07,
      duration: 0.24,
    },
    level: {
      frequencies: [392, 523.25, 659.25, 783.99],
      peak: 0.05,
      spacing: 0.08,
      duration: 0.28,
    },
    victory: {
      frequencies: [392, 523.25, 659.25, 783.99, 1046.5],
      peak: 0.055,
      spacing: 0.09,
      duration: 0.34,
    },
  };

  const preset = presets[kind];

  preset.frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = index % 2 === 0 ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;

    const gainNode = context.createGain();
    const startTime = context.currentTime + index * preset.spacing;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(preset.peak, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + preset.duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + preset.duration + 0.02);
  });
}
