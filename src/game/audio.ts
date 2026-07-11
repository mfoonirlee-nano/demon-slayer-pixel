import { hasSfxSample, playSfxSample, preloadSfxSamples } from "./audioSamples";
import type { GameSfx, ToneStep } from "./audioTypes";
import { playerDynamicSfxPattern } from "./playerAudioPatterns";

export type { GameSfx } from "./audioTypes";

const AUDIO_CONFIG = {
  defaultToneDuration: 0.08,
  defaultToneVolume: 0.03,
  fadeOutVolume: 0.0001,
  minFrequency: 24,
};
const DEFAULT_PATTERN_MIN_GAP = 0.03;
const AUDIO_SAMPLE_MIN_GAP = 0.12;
const AUDIO_SAMPLE_VOLUME = 0.16;
const AUDIO_VOLUME_STORAGE_KEY = "moonlit-tide-audio-volume";
const DEFAULT_AUDIO_VOLUME_SETTINGS = {
  master: 1,
  sfx: 1,
};

type AudioWindow = Window & typeof globalThis & {
  AudioContext?: typeof AudioContext;
};

export type AudioVolumeSettings = typeof DEFAULT_AUDIO_VOLUME_SETTINGS;

const SFX_MIN_GAPS: Record<GameSfx, number> = {
  playerRunStep: 0.13,
  playerLand: 0.14,
  playerAttackStart: 0.04,
  playerAttackHit: 0.035,
  playerBossHit: 0.045,
  playerFallAttackStart: 0.08,
  playerFallAttackImpact: 0.08,
  playerSkillCast: 0.1,
  playerSkillLine: 0.12,
  playerSkillArc: 0.1,
  playerSkillGuard: 0.14,
  playerSkillDash: 0.1,
  playerSkillVortex: 0.18,
  playerSkillArmorBreak: 0.14,
  playerSkillArmorBreakImpact: 0.14,
  playerSkillRain: 0.16,
  playerSkillReturningBlade: 0.12,
  playerSkillReturningBladeCatch: 0.12,
  playerSkillReturningBladeTurn: 0.12,
  playerSkillVerticalWave: 0.14,
  playerUltimateCast: 0.2,
  playerUltimateImpact: 0.25,
  playerUltimateAfterimage: 0.12,
  playerUltimateEnd: 0.4,
  playerCounter: 0.08,
  playerStatusStun: 0.3,
  playerJump: 0.06,
  playerHurt: 0.12,
  playerDeath: 1,
  enemyDefeat: 0.05,
  enemyWarning: 0.12,
  enemyLunge: 0.09,
  enemyDash: 0.1,
  enemySlash: 0.08,
  enemyCastStart: 0.14,
  enemyCastRelease: 0.1,
  enemyTalismanCastStart: 0.16,
  enemyTalismanCastRelease: 0.12,
  enemyCurseTick: 0.18,
  enemyShieldGuard: 0.16,
  enemyShieldBash: 0.14,
  enemyShieldBreak: 0.2,
  enemyCleave: 0.13,
  enemyDive: 0.12,
  enemyLeap: 0.12,
  enemyImpact: 0.12,
  enemySplit: 0.16,
  enemyBirth: 0.08,
  enemyAura: 0.3,
  enemyBurrow: 0.14,
  enemyEmerge: 0.14,
  enemyHurt: 0.08,
  bossHurt: 0.08,
  bossSpawn: 1,
  bossPhaseShift: 0.4,
  bossCast: 0.18,
  bossProjectile: 0.08,
  bossSummon: 0.14,
  bossWave: 0.12,
  bossBlade: 0.1,
  bossMirror: 0.12,
  bossFire: 0.14,
  bossBuff: 0.14,
  bossUltimate: 0.3,
  bossKill: 1,
};

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
  preloadSfxSamples(audioCtx);
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

function randomFrequency(range: { base: number; spread: number }) {
  return range.base + Math.random() * range.spread;
}

function claimSfxPlayback(sfx: GameSfx, minGap: number) {
  if (!audioCtx) return false;
  const now = audioCtx.currentTime;
  const lastPlayed = lastSfxAt.get(sfx) ?? -Infinity;
  if (now - lastPlayed < minGap) return false;
  lastSfxAt.set(sfx, now);
  return true;
}

function playPattern(sfx: GameSfx, steps: ToneStep[], minGap = DEFAULT_PATTERN_MIN_GAP, pitch = 1) {
  if (!claimSfxPlayback(sfx, minGap)) return;

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
  if (audioCtx && hasSfxSample(sfx)) {
    const minGap = Math.max(AUDIO_SAMPLE_MIN_GAP, SFX_MIN_GAPS[sfx]);
    if (!claimSfxPlayback(sfx, minGap)) return;
    const volume = AUDIO_SAMPLE_VOLUME * audioVolumeSettings.master * audioVolumeSettings.sfx;
    playSfxSample(audioCtx, sfx, pitch, volume);
    return;
  }

  const dynamicPlayerPattern = playerDynamicSfxPattern(sfx);
  if (dynamicPlayerPattern) {
    playPattern(sfx, dynamicPlayerPattern, SFX_MIN_GAPS[sfx], pitch);
    return;
  }

  switch (sfx) {
    case "playerRunStep":
      playPattern(sfx, [
        { frequency: 92, slideTo: 70, duration: 0.035, type: "triangle", volume: 0.018 },
        { frequency: 540, slideTo: 690, duration: 0.026, type: "sine", volume: 0.014, delay: 0.012 },
      ], SFX_MIN_GAPS.playerRunStep, pitch);
      return;
    case "playerLand":
      playPattern(sfx, [
        { frequency: 88, slideTo: 54, duration: 0.075, type: "triangle", volume: 0.036 },
        { frequency: 260, slideTo: 180, duration: 0.045, type: "sine", volume: 0.02, delay: 0.018 },
      ], SFX_MIN_GAPS.playerLand, pitch);
      return;
    case "playerAttackStart":
      playPattern(sfx, [
        { frequency: 300, slideTo: 520, duration: 0.055, type: "triangle", volume: 0.045 },
      ], SFX_MIN_GAPS.playerAttackStart, pitch);
      return;
    case "playerAttackHit":
      playPattern(sfx, [
        { frequency: randomFrequency({ base: 420, spread: 70 }), duration: 0.035, type: "triangle", volume: 0.03 },
        { frequency: 180, slideTo: 130, duration: 0.045, type: "square", volume: 0.018 },
      ], SFX_MIN_GAPS.playerAttackHit, pitch);
      return;
    case "playerBossHit":
      playPattern(sfx, [
        { frequency: 190, slideTo: 130, duration: 0.07, type: "sawtooth", volume: 0.05 },
        { frequency: 480, duration: 0.045, type: "triangle", volume: 0.028, delay: 0.012 },
      ], SFX_MIN_GAPS.playerBossHit, pitch);
      return;
    case "playerFallAttackStart":
      playPattern(sfx, [
        { frequency: 240, slideTo: 160, duration: 0.08, type: "triangle", volume: 0.052 },
        { frequency: 500, slideTo: 300, duration: 0.055, type: "sine", volume: 0.025 },
      ], SFX_MIN_GAPS.playerFallAttackStart, pitch);
      return;
    case "playerFallAttackImpact":
      playPattern(sfx, [
        { frequency: 92, slideTo: 58, duration: 0.105, type: "sawtooth", volume: 0.07 },
        { frequency: 520, duration: 0.055, type: "triangle", volume: 0.045 },
        { frequency: 180, slideTo: 120, duration: 0.06, type: "square", volume: 0.028, delay: 0.018 },
      ], SFX_MIN_GAPS.playerFallAttackImpact, pitch);
      return;
    case "playerSkillCast":
      playPattern(sfx, [
        { frequency: 520, slideTo: 760, duration: 0.11, type: "triangle", volume: 0.048 },
        { frequency: 300, slideTo: 420, duration: 0.09, type: "sine", volume: 0.03, delay: 0.018 },
      ], SFX_MIN_GAPS.playerSkillCast, pitch);
      return;
    case "playerSkillLine":
      playPattern(sfx, [
        { frequency: 360, slideTo: 900, duration: 0.085, type: "triangle", volume: 0.05 },
        { frequency: 180, slideTo: 120, duration: 0.08, type: "sine", volume: 0.032, delay: 0.018 },
      ], SFX_MIN_GAPS.playerSkillLine, pitch);
      return;
    case "playerSkillArc":
      playPattern(sfx, [
        { frequency: 520, slideTo: 940, duration: 0.06, type: "triangle", volume: 0.048 },
        { frequency: 210, slideTo: 150, duration: 0.045, type: "square", volume: 0.024, delay: 0.014 },
      ], SFX_MIN_GAPS.playerSkillArc, pitch);
      return;
    case "playerSkillGuard":
      playPattern(sfx, [
        { frequency: 740, slideTo: 520, duration: 0.105, type: "sine", volume: 0.045 },
        { frequency: 1040, duration: 0.045, type: "triangle", volume: 0.034, delay: 0.032 },
      ], SFX_MIN_GAPS.playerSkillGuard, pitch);
      return;
    case "playerSkillDash":
      playPattern(sfx, [
        { frequency: 300, slideTo: 120, duration: 0.07, type: "sawtooth", volume: 0.044 },
        { frequency: 760, slideTo: 1020, duration: 0.052, type: "triangle", volume: 0.034, delay: 0.018 },
      ], SFX_MIN_GAPS.playerSkillDash, pitch);
      return;
    case "playerSkillVortex":
      playPattern(sfx, [
        { frequency: 170, slideTo: 300, duration: 0.14, type: "sine", volume: 0.044 },
        { frequency: 420, slideTo: 260, duration: 0.12, type: "triangle", volume: 0.03, delay: 0.035 },
      ], SFX_MIN_GAPS.playerSkillVortex, pitch);
      return;
    case "playerSkillArmorBreak":
      playPattern(sfx, [
        { frequency: 126, slideTo: 76, duration: 0.095, type: "square", volume: 0.052 },
        { frequency: 620, slideTo: 880, duration: 0.055, type: "triangle", volume: 0.038, delay: 0.02 },
      ], SFX_MIN_GAPS.playerSkillArmorBreak, pitch);
      return;
    case "playerSkillRain":
      playPattern(sfx, [
        { frequency: 860, slideTo: 620, duration: 0.04, type: "triangle", volume: 0.033 },
        { frequency: 920, slideTo: 680, duration: 0.04, type: "triangle", volume: 0.03, delay: 0.035 },
        { frequency: 720, slideTo: 480, duration: 0.05, type: "sine", volume: 0.024, delay: 0.07 },
      ], SFX_MIN_GAPS.playerSkillRain, pitch);
      return;
    case "playerSkillReturningBlade":
      playPattern(sfx, [
        { frequency: 520, slideTo: 820, duration: 0.055, type: "triangle", volume: 0.04 },
        { frequency: 820, slideTo: 460, duration: 0.07, type: "sine", volume: 0.034, delay: 0.048 },
      ], SFX_MIN_GAPS.playerSkillReturningBlade, pitch);
      return;
    case "playerSkillVerticalWave":
      playPattern(sfx, [
        { frequency: 180, slideTo: 360, duration: 0.1, type: "sine", volume: 0.044 },
        { frequency: 520, slideTo: 960, duration: 0.075, type: "triangle", volume: 0.036, delay: 0.026 },
      ], SFX_MIN_GAPS.playerSkillVerticalWave, pitch);
      return;
    case "playerUltimateCast":
      playPattern(sfx, [
        { frequency: 220, slideTo: 110, duration: 0.16, type: "sawtooth", volume: 0.07 },
        { frequency: 880, slideTo: 1180, duration: 0.14, type: "triangle", volume: 0.055 },
      ], SFX_MIN_GAPS.playerUltimateCast, pitch);
      return;
    case "playerUltimateImpact":
      playPattern(sfx, [
        { frequency: 76, slideTo: 42, duration: 0.18, type: "sawtooth", volume: 0.08 },
        { frequency: 190, slideTo: 95, duration: 0.12, type: "square", volume: 0.055, delay: 0.015 },
        { frequency: 720, slideTo: 960, duration: 0.09, type: "triangle", volume: 0.045, delay: 0.025 },
      ], SFX_MIN_GAPS.playerUltimateImpact, pitch);
      return;
    case "playerCounter":
      playPattern(sfx, [
        { frequency: 440, slideTo: 660, duration: 0.075, type: "triangle", volume: 0.11 },
        { frequency: 920, duration: 0.045, type: "sine", volume: 0.05, delay: 0.03 },
      ], SFX_MIN_GAPS.playerCounter, pitch);
      return;
    case "playerJump":
      playPattern(sfx, [
        { frequency: 250, slideTo: 360, duration: 0.055, type: "triangle", volume: 0.038 },
      ], SFX_MIN_GAPS.playerJump, pitch);
      return;
    case "playerHurt":
      playPattern(sfx, [
        { frequency: 128, slideTo: 92, duration: 0.12, type: "square", volume: 0.055 },
        { frequency: 64, duration: 0.08, type: "sawtooth", volume: 0.028, delay: 0.012 },
      ], SFX_MIN_GAPS.playerHurt, pitch);
      return;
    case "playerDeath":
      playPattern(sfx, [
        { frequency: 120, slideTo: 52, duration: 0.3, type: "sawtooth", volume: 0.07 },
        { frequency: 300, slideTo: 90, duration: 0.18, type: "triangle", volume: 0.04, delay: 0.05 },
      ], SFX_MIN_GAPS.playerDeath, pitch);
      return;
    case "enemyDefeat":
      playPattern(sfx, [
        { frequency: 240, slideTo: 130, duration: 0.075, type: "square", volume: 0.033 },
        { frequency: 560, duration: 0.035, type: "triangle", volume: 0.02, delay: 0.018 },
      ], SFX_MIN_GAPS.enemyDefeat, pitch);
      return;
    case "enemyWarning":
      playPattern(sfx, [
        { frequency: 180, slideTo: 240, duration: 0.09, type: "sawtooth", volume: 0.028 },
      ], SFX_MIN_GAPS.enemyWarning, pitch);
      return;
    case "enemyLunge":
      playPattern(sfx, [
        { frequency: 190, slideTo: 95, duration: 0.085, type: "sawtooth", volume: 0.045 },
        { frequency: 360, slideTo: 280, duration: 0.045, type: "triangle", volume: 0.024 },
      ], SFX_MIN_GAPS.enemyLunge, pitch);
      return;
    case "enemyDash":
      playPattern(sfx, [
        { frequency: 260, slideTo: 140, duration: 0.075, type: "sawtooth", volume: 0.04 },
      ], SFX_MIN_GAPS.enemyDash, pitch);
      return;
    case "enemySlash":
      playPattern(sfx, [
        { frequency: 360, slideTo: 620, duration: 0.06, type: "triangle", volume: 0.035 },
        { frequency: 170, duration: 0.05, type: "square", volume: 0.02, delay: 0.015 },
      ], SFX_MIN_GAPS.enemySlash, pitch);
      return;
    case "enemyCastStart":
      playPattern(sfx, [
        { frequency: 210, slideTo: 300, duration: 0.12, type: "sine", volume: 0.035 },
        { frequency: 420, duration: 0.08, type: "triangle", volume: 0.02, delay: 0.035 },
      ], SFX_MIN_GAPS.enemyCastStart, pitch);
      return;
    case "enemyCastRelease":
      playPattern(sfx, [
        { frequency: 520, slideTo: 260, duration: 0.08, type: "sawtooth", volume: 0.045 },
        { frequency: 780, duration: 0.045, type: "triangle", volume: 0.025 },
      ], SFX_MIN_GAPS.enemyCastRelease, pitch);
      return;
    case "enemyTalismanCastStart":
      playPattern(sfx, [
        { frequency: 180, slideTo: 240, duration: 0.13, type: "sine", volume: 0.032 },
        { frequency: 680, slideTo: 520, duration: 0.06, type: "triangle", volume: 0.018, delay: 0.04 },
      ], SFX_MIN_GAPS.enemyTalismanCastStart, pitch);
      return;
    case "enemyTalismanCastRelease":
      playPattern(sfx, [
        { frequency: 720, slideTo: 380, duration: 0.07, type: "triangle", volume: 0.035 },
        { frequency: 210, slideTo: 150, duration: 0.09, type: "sine", volume: 0.024, delay: 0.015 },
      ], SFX_MIN_GAPS.enemyTalismanCastRelease, pitch);
      return;
    case "enemyCurseTick":
      playPattern(sfx, [
        { frequency: 230, slideTo: 170, duration: 0.08, type: "triangle", volume: 0.03 },
        { frequency: 540, duration: 0.035, type: "sine", volume: 0.018, delay: 0.012 },
      ], SFX_MIN_GAPS.enemyCurseTick, pitch);
      return;
    case "enemyShieldGuard":
      playPattern(sfx, [
        { frequency: 110, slideTo: 135, duration: 0.11, type: "square", volume: 0.04 },
      ], SFX_MIN_GAPS.enemyShieldGuard, pitch);
      return;
    case "enemyShieldBash":
      playPattern(sfx, [
        { frequency: 96, slideTo: 54, duration: 0.11, type: "sawtooth", volume: 0.065 },
        { frequency: 180, duration: 0.05, type: "square", volume: 0.03, delay: 0.02 },
      ], SFX_MIN_GAPS.enemyShieldBash, pitch);
      return;
    case "enemyShieldBreak":
      playPattern(sfx, [
        { frequency: 82, slideTo: 42, duration: 0.16, type: "sawtooth", volume: 0.075 },
        { frequency: 240, slideTo: 120, duration: 0.095, type: "square", volume: 0.04, delay: 0.018 },
      ], SFX_MIN_GAPS.enemyShieldBreak, pitch);
      return;
    case "enemyCleave":
      playPattern(sfx, [
        { frequency: 150, slideTo: 92, duration: 0.105, type: "sawtooth", volume: 0.055 },
        { frequency: 330, slideTo: 520, duration: 0.06, type: "triangle", volume: 0.03 },
      ], SFX_MIN_GAPS.enemyCleave, pitch);
      return;
    case "enemyDive":
      playPattern(sfx, [
        { frequency: 380, slideTo: 160, duration: 0.12, type: "sawtooth", volume: 0.038 },
      ], SFX_MIN_GAPS.enemyDive, pitch);
      return;
    case "enemyLeap":
      playPattern(sfx, [
        { frequency: 180, slideTo: 280, duration: 0.09, type: "triangle", volume: 0.04 },
      ], SFX_MIN_GAPS.enemyLeap, pitch);
      return;
    case "enemyImpact":
      playPattern(sfx, [
        { frequency: 92, slideTo: 58, duration: 0.12, type: "sawtooth", volume: 0.06 },
        { frequency: 240, duration: 0.045, type: "square", volume: 0.028, delay: 0.015 },
      ], SFX_MIN_GAPS.enemyImpact, pitch);
      return;
    case "enemySplit":
      playPattern(sfx, [
        { frequency: 180, slideTo: 95, duration: 0.13, type: "sawtooth", volume: 0.052 },
        { frequency: 360, slideTo: 520, duration: 0.07, type: "triangle", volume: 0.03, delay: 0.025 },
      ], SFX_MIN_GAPS.enemySplit, pitch);
      return;
    case "enemyBirth":
      playPattern(sfx, [
        { frequency: 260, slideTo: 390, duration: 0.07, type: "triangle", volume: 0.026 },
      ], SFX_MIN_GAPS.enemyBirth, pitch);
      return;
    case "enemyAura":
      playPattern(sfx, [
        { frequency: 160, slideTo: 220, duration: 0.16, type: "sine", volume: 0.035 },
        { frequency: 320, duration: 0.09, type: "triangle", volume: 0.022, delay: 0.04 },
      ], SFX_MIN_GAPS.enemyAura, pitch);
      return;
    case "enemyBurrow":
      playPattern(sfx, [
        { frequency: 120, slideTo: 72, duration: 0.12, type: "sawtooth", volume: 0.046 },
      ], SFX_MIN_GAPS.enemyBurrow, pitch);
      return;
    case "enemyEmerge":
      playPattern(sfx, [
        { frequency: 78, slideTo: 150, duration: 0.12, type: "sawtooth", volume: 0.058 },
        { frequency: 300, duration: 0.055, type: "square", volume: 0.027, delay: 0.02 },
      ], SFX_MIN_GAPS.enemyEmerge, pitch);
      return;
    case "enemyHurt":
      playPattern(sfx, [
        { frequency: 300, slideTo: 180, duration: 0.045, type: "square", volume: 0.02 },
      ], SFX_MIN_GAPS.enemyHurt, pitch);
      return;
    case "bossHurt":
      playPattern(sfx, [
        { frequency: 150, slideTo: 105, duration: 0.075, type: "sawtooth", volume: 0.04 },
        { frequency: 330, slideTo: 240, duration: 0.045, type: "triangle", volume: 0.022, delay: 0.01 },
      ], SFX_MIN_GAPS.bossHurt, pitch);
      return;
    case "bossSpawn":
      playPattern(sfx, [
        { frequency: 120, slideTo: 70, duration: 0.24, type: "sawtooth", volume: 0.065 },
        { frequency: 90, slideTo: 55, duration: 0.28, type: "sawtooth", volume: 0.052, delay: 0.035 },
      ], SFX_MIN_GAPS.bossSpawn, pitch);
      return;
    case "bossPhaseShift":
      playPattern(sfx, [
        { frequency: 150, slideTo: 84, duration: 0.16, type: "sawtooth", volume: 0.058 },
        { frequency: 430, slideTo: 620, duration: 0.11, type: "triangle", volume: 0.04, delay: 0.025 },
      ], SFX_MIN_GAPS.bossPhaseShift, pitch);
      return;
    case "bossCast":
      playPattern(sfx, [
        { frequency: 170, slideTo: 250, duration: 0.15, type: "sawtooth", volume: 0.055 },
        { frequency: 410, slideTo: 520, duration: 0.1, type: "triangle", volume: 0.042, delay: 0.025 },
      ], SFX_MIN_GAPS.bossCast, pitch);
      return;
    case "bossProjectile":
      playPattern(sfx, [
        { frequency: 190, slideTo: 120, duration: 0.08, type: "sawtooth", volume: 0.048 },
      ], SFX_MIN_GAPS.bossProjectile, pitch);
      return;
    case "bossSummon":
      playPattern(sfx, [
        { frequency: 100, slideTo: 160, duration: 0.1, type: "square", volume: 0.045 },
        { frequency: 260, duration: 0.07, type: "triangle", volume: 0.025, delay: 0.025 },
      ], SFX_MIN_GAPS.bossSummon, pitch);
      return;
    case "bossWave":
      playPattern(sfx, [
        { frequency: 130, slideTo: 86, duration: 0.18, type: "sine", volume: 0.06 },
        { frequency: 260, slideTo: 180, duration: 0.11, type: "triangle", volume: 0.03, delay: 0.02 },
      ], SFX_MIN_GAPS.bossWave, pitch);
      return;
    case "bossBlade":
      playPattern(sfx, [
        { frequency: 480, slideTo: 740, duration: 0.07, type: "sawtooth", volume: 0.043 },
        { frequency: 150, duration: 0.055, type: "square", volume: 0.025, delay: 0.015 },
      ], SFX_MIN_GAPS.bossBlade, pitch);
      return;
    case "bossMirror":
      playPattern(sfx, [
        { frequency: 520, slideTo: 760, duration: 0.085, type: "sine", volume: 0.045 },
        { frequency: 260, slideTo: 180, duration: 0.09, type: "triangle", volume: 0.03, delay: 0.02 },
      ], SFX_MIN_GAPS.bossMirror, pitch);
      return;
    case "bossFire":
      playPattern(sfx, [
        { frequency: 120, slideTo: 82, duration: 0.16, type: "sawtooth", volume: 0.058 },
        { frequency: 360, slideTo: 280, duration: 0.08, type: "square", volume: 0.032, delay: 0.02 },
      ], SFX_MIN_GAPS.bossFire, pitch);
      return;
    case "bossBuff":
      playPattern(sfx, [
        { frequency: 260, slideTo: 390, duration: 0.12, type: "sawtooth", volume: 0.045 },
        { frequency: 520, duration: 0.075, type: "triangle", volume: 0.026, delay: 0.035 },
      ], SFX_MIN_GAPS.bossBuff, pitch);
      return;
    case "bossUltimate":
      playPattern(sfx, [
        { frequency: 88, slideTo: 44, duration: 0.26, type: "sawtooth", volume: 0.075 },
        { frequency: 230, slideTo: 115, duration: 0.14, type: "square", volume: 0.045, delay: 0.03 },
        { frequency: 520, slideTo: 760, duration: 0.1, type: "triangle", volume: 0.035, delay: 0.05 },
      ], SFX_MIN_GAPS.bossUltimate, pitch);
      return;
    case "bossKill":
      playPattern(sfx, [
        { frequency: 700, slideTo: 980, duration: 0.12, type: "triangle", volume: 0.058 },
        { frequency: 180, slideTo: 75, duration: 0.22, type: "sawtooth", volume: 0.05, delay: 0.025 },
      ], SFX_MIN_GAPS.bossKill, pitch);
      return;
    default:
      return;
  }
}
