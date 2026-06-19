const AUDIO_CONFIG = {
  defaultToneDuration: 0.08,
  defaultToneVolume: 0.03,
  fadeOutVolume: 0.0001,
  minFrequency: 24,
};
const AUDIO_VOLUME_STORAGE_KEY = "moonlit-tide-audio-volume";
const DEFAULT_AUDIO_VOLUME_SETTINGS = {
  master: 1,
  sfx: 1,
};

type AudioWindow = Window & typeof globalThis & {
  AudioContext?: typeof AudioContext;
};

export type AudioVolumeSettings = typeof DEFAULT_AUDIO_VOLUME_SETTINGS;

type ToneStep = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
  slideTo?: number;
};

export type GameSfx =
  | "playerAttackStart"
  | "playerAttackHit"
  | "playerBossHit"
  | "playerFallAttackStart"
  | "playerFallAttackImpact"
  | "playerSkillCast"
  | "playerSkillRelease"
  | "playerUltimateCast"
  | "playerUltimateImpact"
  | "playerCounter"
  | "playerJump"
  | "playerHurt"
  | "playerDeath"
  | "enemyDefeat"
  | "enemyWarning"
  | "enemyLunge"
  | "enemyDash"
  | "enemySlash"
  | "enemyCastStart"
  | "enemyCastRelease"
  | "enemyShieldGuard"
  | "enemyShieldBash"
  | "enemyShieldBreak"
  | "enemyCleave"
  | "enemyDive"
  | "enemyLeap"
  | "enemyImpact"
  | "enemySplit"
  | "enemyBirth"
  | "enemyAura"
  | "enemyBurrow"
  | "enemyEmerge"
  | "enemyHitReact"
  | "bossSpawn"
  | "bossPhaseShift"
  | "bossCast"
  | "bossProjectile"
  | "bossSummon"
  | "bossWave"
  | "bossBlade"
  | "bossMirror"
  | "bossFire"
  | "bossBuff"
  | "bossUltimate"
  | "bossKill";

let audioCtx: AudioContext | null = null;
const lastSfxAt = new Map<GameSfx, number>();
let audioVolumeSettings: AudioVolumeSettings = loadAudioVolumeSettings();

function getAudioContextConstructor() {
  return (window as AudioWindow).AudioContext;
}

export function ensureAudio() {
  if (!audioCtx) {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return;
    audioCtx = new AudioContextConstructor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
}

export function getAudioVolumeSettings(): AudioVolumeSettings {
  return audioVolumeSettings;
}

export function setAudioVolumeSettings(nextSettings: Partial<AudioVolumeSettings>) {
  audioVolumeSettings = normalizeAudioVolumeSettings({
    ...audioVolumeSettings,
    ...nextSettings,
  });
  saveAudioVolumeSettings(audioVolumeSettings);
  return audioVolumeSettings;
}

export function playTone(
  freq: number,
  duration = AUDIO_CONFIG.defaultToneDuration,
  type: OscillatorType = "square",
  volume = AUDIO_CONFIG.defaultToneVolume,
  delay = 0,
  slideTo?: number,
) {
  if (!audioCtx) return;
  const effectiveVolume = volume * audioVolumeSettings.master * audioVolumeSettings.sfx;
  if (effectiveVolume <= 0) return;
  const now = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.setValueAtTime(Math.max(AUDIO_CONFIG.minFrequency, freq), now);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(AUDIO_CONFIG.minFrequency, slideTo),
      now + duration,
    );
  }
  osc.type = type;
  gain.gain.setValueAtTime(effectiveVolume, now);
  gain.gain.exponentialRampToValueAtTime(AUDIO_CONFIG.fadeOutVolume, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playPattern(sfx: GameSfx, steps: ToneStep[], minGap = 0.03, pitch = 1) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const lastPlayed = lastSfxAt.get(sfx) ?? -Infinity;
  if (now - lastPlayed < minGap) return;
  lastSfxAt.set(sfx, now);

  for (const step of steps) {
    playTone(
      step.frequency * pitch,
      step.duration,
      step.type ?? "square",
      step.volume ?? AUDIO_CONFIG.defaultToneVolume,
      step.delay ?? 0,
      step.slideTo === undefined ? undefined : step.slideTo * pitch,
    );
  }
}

function loadAudioVolumeSettings(): AudioVolumeSettings {
  if (typeof window === "undefined") return DEFAULT_AUDIO_VOLUME_SETTINGS;

  try {
    const storedSettings = window.localStorage.getItem(AUDIO_VOLUME_STORAGE_KEY);
    if (!storedSettings) return DEFAULT_AUDIO_VOLUME_SETTINGS;
    return normalizeAudioVolumeSettings(JSON.parse(storedSettings) as Partial<AudioVolumeSettings>);
  } catch {
    return DEFAULT_AUDIO_VOLUME_SETTINGS;
  }
}

function saveAudioVolumeSettings(settings: AudioVolumeSettings) {
  try {
    window.localStorage.setItem(AUDIO_VOLUME_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Audio settings are still applied for the current session.
  }
}

function normalizeAudioVolumeSettings(settings: Partial<AudioVolumeSettings>): AudioVolumeSettings {
  return {
    master: clampAudioVolume(settings.master ?? DEFAULT_AUDIO_VOLUME_SETTINGS.master),
    sfx: clampAudioVolume(settings.sfx ?? DEFAULT_AUDIO_VOLUME_SETTINGS.sfx),
  };
}

function clampAudioVolume(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

export function playSfx(sfx: GameSfx, pitch = 1) {
  switch (sfx) {
    case "playerAttackStart":
      playPattern(sfx, [
        { frequency: 300, slideTo: 520, duration: 0.055, type: "triangle", volume: 0.045 },
      ], 0.04, pitch);
      return;
    case "playerAttackHit":
      playPattern(sfx, [
        { frequency: 420 + Math.random() * 70, duration: 0.035, type: "triangle", volume: 0.03 },
        { frequency: 180, slideTo: 130, duration: 0.045, type: "square", volume: 0.018 },
      ], 0.035, pitch);
      return;
    case "playerBossHit":
      playPattern(sfx, [
        { frequency: 190, slideTo: 130, duration: 0.07, type: "sawtooth", volume: 0.05 },
        { frequency: 480, duration: 0.045, type: "triangle", volume: 0.028, delay: 0.012 },
      ], 0.045, pitch);
      return;
    case "playerFallAttackStart":
      playPattern(sfx, [
        { frequency: 240, slideTo: 160, duration: 0.08, type: "triangle", volume: 0.052 },
        { frequency: 500, slideTo: 300, duration: 0.055, type: "sine", volume: 0.025 },
      ], 0.08, pitch);
      return;
    case "playerFallAttackImpact":
      playPattern(sfx, [
        { frequency: 92, slideTo: 58, duration: 0.105, type: "sawtooth", volume: 0.07 },
        { frequency: 520, duration: 0.055, type: "triangle", volume: 0.045 },
        { frequency: 180, slideTo: 120, duration: 0.06, type: "square", volume: 0.028, delay: 0.018 },
      ], 0.08, pitch);
      return;
    case "playerSkillCast":
      playPattern(sfx, [
        { frequency: 620, slideTo: 760, duration: 0.11, type: "triangle", volume: 0.06 },
        { frequency: 860, slideTo: 520, duration: 0.09, type: "sawtooth", volume: 0.045 },
      ], 0.1, pitch);
      return;
    case "playerSkillRelease":
      playPattern(sfx, [
        { frequency: 420, slideTo: 880, duration: 0.075, type: "triangle", volume: 0.045 },
        { frequency: 260, slideTo: 180, duration: 0.06, type: "sine", volume: 0.025 },
      ], 0.12, pitch);
      return;
    case "playerUltimateCast":
      playPattern(sfx, [
        { frequency: 220, slideTo: 110, duration: 0.16, type: "sawtooth", volume: 0.07 },
        { frequency: 880, slideTo: 1180, duration: 0.14, type: "triangle", volume: 0.055 },
      ], 0.2, pitch);
      return;
    case "playerUltimateImpact":
      playPattern(sfx, [
        { frequency: 76, slideTo: 42, duration: 0.18, type: "sawtooth", volume: 0.08 },
        { frequency: 190, slideTo: 95, duration: 0.12, type: "square", volume: 0.055, delay: 0.015 },
        { frequency: 720, slideTo: 960, duration: 0.09, type: "triangle", volume: 0.045, delay: 0.025 },
      ], 0.25, pitch);
      return;
    case "playerCounter":
      playPattern(sfx, [
        { frequency: 440, slideTo: 660, duration: 0.075, type: "triangle", volume: 0.11 },
        { frequency: 920, duration: 0.045, type: "sine", volume: 0.05, delay: 0.03 },
      ], 0.08, pitch);
      return;
    case "playerJump":
      playPattern(sfx, [
        { frequency: 250, slideTo: 360, duration: 0.055, type: "triangle", volume: 0.038 },
      ], 0.06, pitch);
      return;
    case "playerHurt":
      playPattern(sfx, [
        { frequency: 128, slideTo: 92, duration: 0.12, type: "square", volume: 0.055 },
        { frequency: 64, duration: 0.08, type: "sawtooth", volume: 0.028, delay: 0.012 },
      ], 0.12, pitch);
      return;
    case "playerDeath":
      playPattern(sfx, [
        { frequency: 120, slideTo: 52, duration: 0.3, type: "sawtooth", volume: 0.07 },
        { frequency: 300, slideTo: 90, duration: 0.18, type: "triangle", volume: 0.04, delay: 0.05 },
      ], 1, pitch);
      return;
    case "enemyDefeat":
      playPattern(sfx, [
        { frequency: 240, slideTo: 130, duration: 0.075, type: "square", volume: 0.033 },
        { frequency: 560, duration: 0.035, type: "triangle", volume: 0.02, delay: 0.018 },
      ], 0.05, pitch);
      return;
    case "enemyWarning":
      playPattern(sfx, [
        { frequency: 180, slideTo: 240, duration: 0.09, type: "sawtooth", volume: 0.028 },
      ], 0.12, pitch);
      return;
    case "enemyLunge":
      playPattern(sfx, [
        { frequency: 190, slideTo: 95, duration: 0.085, type: "sawtooth", volume: 0.045 },
        { frequency: 360, slideTo: 280, duration: 0.045, type: "triangle", volume: 0.024 },
      ], 0.09, pitch);
      return;
    case "enemyDash":
      playPattern(sfx, [
        { frequency: 260, slideTo: 140, duration: 0.075, type: "sawtooth", volume: 0.04 },
      ], 0.1, pitch);
      return;
    case "enemySlash":
      playPattern(sfx, [
        { frequency: 360, slideTo: 620, duration: 0.06, type: "triangle", volume: 0.035 },
        { frequency: 170, duration: 0.05, type: "square", volume: 0.02, delay: 0.015 },
      ], 0.08, pitch);
      return;
    case "enemyCastStart":
      playPattern(sfx, [
        { frequency: 210, slideTo: 300, duration: 0.12, type: "sine", volume: 0.035 },
        { frequency: 420, duration: 0.08, type: "triangle", volume: 0.02, delay: 0.035 },
      ], 0.14, pitch);
      return;
    case "enemyCastRelease":
      playPattern(sfx, [
        { frequency: 520, slideTo: 260, duration: 0.08, type: "sawtooth", volume: 0.045 },
        { frequency: 780, duration: 0.045, type: "triangle", volume: 0.025 },
      ], 0.1, pitch);
      return;
    case "enemyShieldGuard":
      playPattern(sfx, [
        { frequency: 110, slideTo: 135, duration: 0.11, type: "square", volume: 0.04 },
      ], 0.16, pitch);
      return;
    case "enemyShieldBash":
      playPattern(sfx, [
        { frequency: 96, slideTo: 54, duration: 0.11, type: "sawtooth", volume: 0.065 },
        { frequency: 180, duration: 0.05, type: "square", volume: 0.03, delay: 0.02 },
      ], 0.14, pitch);
      return;
    case "enemyShieldBreak":
      playPattern(sfx, [
        { frequency: 82, slideTo: 42, duration: 0.16, type: "sawtooth", volume: 0.075 },
        { frequency: 240, slideTo: 120, duration: 0.095, type: "square", volume: 0.04, delay: 0.018 },
      ], 0.2, pitch);
      return;
    case "enemyCleave":
      playPattern(sfx, [
        { frequency: 150, slideTo: 92, duration: 0.105, type: "sawtooth", volume: 0.055 },
        { frequency: 330, slideTo: 520, duration: 0.06, type: "triangle", volume: 0.03 },
      ], 0.13, pitch);
      return;
    case "enemyDive":
      playPattern(sfx, [
        { frequency: 380, slideTo: 160, duration: 0.12, type: "sawtooth", volume: 0.038 },
      ], 0.12, pitch);
      return;
    case "enemyLeap":
      playPattern(sfx, [
        { frequency: 180, slideTo: 280, duration: 0.09, type: "triangle", volume: 0.04 },
      ], 0.12, pitch);
      return;
    case "enemyImpact":
      playPattern(sfx, [
        { frequency: 92, slideTo: 58, duration: 0.12, type: "sawtooth", volume: 0.06 },
        { frequency: 240, duration: 0.045, type: "square", volume: 0.028, delay: 0.015 },
      ], 0.12, pitch);
      return;
    case "enemySplit":
      playPattern(sfx, [
        { frequency: 180, slideTo: 95, duration: 0.13, type: "sawtooth", volume: 0.052 },
        { frequency: 360, slideTo: 520, duration: 0.07, type: "triangle", volume: 0.03, delay: 0.025 },
      ], 0.16, pitch);
      return;
    case "enemyBirth":
      playPattern(sfx, [
        { frequency: 260, slideTo: 390, duration: 0.07, type: "triangle", volume: 0.026 },
      ], 0.08, pitch);
      return;
    case "enemyAura":
      playPattern(sfx, [
        { frequency: 160, slideTo: 220, duration: 0.16, type: "sine", volume: 0.035 },
        { frequency: 320, duration: 0.09, type: "triangle", volume: 0.022, delay: 0.04 },
      ], 0.3, pitch);
      return;
    case "enemyBurrow":
      playPattern(sfx, [
        { frequency: 120, slideTo: 72, duration: 0.12, type: "sawtooth", volume: 0.046 },
      ], 0.14, pitch);
      return;
    case "enemyEmerge":
      playPattern(sfx, [
        { frequency: 78, slideTo: 150, duration: 0.12, type: "sawtooth", volume: 0.058 },
        { frequency: 300, duration: 0.055, type: "square", volume: 0.027, delay: 0.02 },
      ], 0.14, pitch);
      return;
    case "enemyHitReact":
      playPattern(sfx, [
        { frequency: 300, slideTo: 180, duration: 0.045, type: "square", volume: 0.02 },
      ], 0.08, pitch);
      return;
    case "bossSpawn":
      playPattern(sfx, [
        { frequency: 120, slideTo: 70, duration: 0.24, type: "sawtooth", volume: 0.065 },
        { frequency: 90, slideTo: 55, duration: 0.28, type: "sawtooth", volume: 0.052, delay: 0.035 },
      ], 1, pitch);
      return;
    case "bossPhaseShift":
      playPattern(sfx, [
        { frequency: 150, slideTo: 84, duration: 0.16, type: "sawtooth", volume: 0.058 },
        { frequency: 430, slideTo: 620, duration: 0.11, type: "triangle", volume: 0.04, delay: 0.025 },
      ], 0.4, pitch);
      return;
    case "bossCast":
      playPattern(sfx, [
        { frequency: 170, slideTo: 250, duration: 0.15, type: "sawtooth", volume: 0.055 },
        { frequency: 410, slideTo: 520, duration: 0.1, type: "triangle", volume: 0.042, delay: 0.025 },
      ], 0.18, pitch);
      return;
    case "bossProjectile":
      playPattern(sfx, [
        { frequency: 190, slideTo: 120, duration: 0.08, type: "sawtooth", volume: 0.048 },
      ], 0.08, pitch);
      return;
    case "bossSummon":
      playPattern(sfx, [
        { frequency: 100, slideTo: 160, duration: 0.1, type: "square", volume: 0.045 },
        { frequency: 260, duration: 0.07, type: "triangle", volume: 0.025, delay: 0.025 },
      ], 0.14, pitch);
      return;
    case "bossWave":
      playPattern(sfx, [
        { frequency: 130, slideTo: 86, duration: 0.18, type: "sine", volume: 0.06 },
        { frequency: 260, slideTo: 180, duration: 0.11, type: "triangle", volume: 0.03, delay: 0.02 },
      ], 0.12, pitch);
      return;
    case "bossBlade":
      playPattern(sfx, [
        { frequency: 480, slideTo: 740, duration: 0.07, type: "sawtooth", volume: 0.043 },
        { frequency: 150, duration: 0.055, type: "square", volume: 0.025, delay: 0.015 },
      ], 0.1, pitch);
      return;
    case "bossMirror":
      playPattern(sfx, [
        { frequency: 520, slideTo: 760, duration: 0.085, type: "sine", volume: 0.045 },
        { frequency: 260, slideTo: 180, duration: 0.09, type: "triangle", volume: 0.03, delay: 0.02 },
      ], 0.12, pitch);
      return;
    case "bossFire":
      playPattern(sfx, [
        { frequency: 120, slideTo: 82, duration: 0.16, type: "sawtooth", volume: 0.058 },
        { frequency: 360, slideTo: 280, duration: 0.08, type: "square", volume: 0.032, delay: 0.02 },
      ], 0.14, pitch);
      return;
    case "bossBuff":
      playPattern(sfx, [
        { frequency: 260, slideTo: 390, duration: 0.12, type: "sawtooth", volume: 0.045 },
        { frequency: 520, duration: 0.075, type: "triangle", volume: 0.026, delay: 0.035 },
      ], 0.14, pitch);
      return;
    case "bossUltimate":
      playPattern(sfx, [
        { frequency: 88, slideTo: 44, duration: 0.26, type: "sawtooth", volume: 0.075 },
        { frequency: 230, slideTo: 115, duration: 0.14, type: "square", volume: 0.045, delay: 0.03 },
        { frequency: 520, slideTo: 760, duration: 0.1, type: "triangle", volume: 0.035, delay: 0.05 },
      ], 0.3, pitch);
      return;
    case "bossKill":
      playPattern(sfx, [
        { frequency: 700, slideTo: 980, duration: 0.12, type: "triangle", volume: 0.058 },
        { frequency: 180, slideTo: 75, duration: 0.22, type: "sawtooth", volume: 0.05, delay: 0.025 },
      ], 1, pitch);
      return;
    default:
      return;
  }
}
