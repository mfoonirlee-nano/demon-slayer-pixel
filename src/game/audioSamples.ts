import type { GameSfx } from "./audioTypes";

export const ENEMY_SFX_SAMPLE_URLS = {
  enemyDefeat: new URL(
    "../../assets/audio/sfx/enemies/enemyDefeat.wav",
    import.meta.url,
  ).href,
  enemyWarning: new URL(
    "../../assets/audio/sfx/enemies/enemyWarning.wav",
    import.meta.url,
  ).href,
  enemyLunge: new URL(
    "../../assets/audio/sfx/enemies/enemyLunge.wav",
    import.meta.url,
  ).href,
  enemyDash: new URL(
    "../../assets/audio/sfx/enemies/enemyDash.wav",
    import.meta.url,
  ).href,
  enemySlash: new URL(
    "../../assets/audio/sfx/enemies/enemySlash.wav",
    import.meta.url,
  ).href,
  enemyCastStart: new URL(
    "../../assets/audio/sfx/enemies/enemyCastStart.wav",
    import.meta.url,
  ).href,
  enemyCastRelease: new URL(
    "../../assets/audio/sfx/enemies/enemyCastRelease.wav",
    import.meta.url,
  ).href,
  enemyTalismanCastStart: new URL(
    "../../assets/audio/sfx/enemies/enemyTalismanCastStart.wav",
    import.meta.url,
  ).href,
  enemyTalismanCastRelease: new URL(
    "../../assets/audio/sfx/enemies/enemyTalismanCastRelease.wav",
    import.meta.url,
  ).href,
  enemyCurseTick: new URL(
    "../../assets/audio/sfx/enemies/enemyCurseTick.wav",
    import.meta.url,
  ).href,
  enemyShieldGuard: new URL(
    "../../assets/audio/sfx/enemies/enemyShieldGuard.wav",
    import.meta.url,
  ).href,
  enemyShieldBash: new URL(
    "../../assets/audio/sfx/enemies/enemyShieldBash.wav",
    import.meta.url,
  ).href,
  enemyShieldBreak: new URL(
    "../../assets/audio/sfx/enemies/enemyShieldBreak.wav",
    import.meta.url,
  ).href,
  enemyCleave: new URL(
    "../../assets/audio/sfx/enemies/enemyCleave.wav",
    import.meta.url,
  ).href,
  enemyDive: new URL(
    "../../assets/audio/sfx/enemies/enemyDive.wav",
    import.meta.url,
  ).href,
  enemyLeap: new URL(
    "../../assets/audio/sfx/enemies/enemyLeap.wav",
    import.meta.url,
  ).href,
  enemyImpact: new URL(
    "../../assets/audio/sfx/enemies/enemyImpact.wav",
    import.meta.url,
  ).href,
  enemySplit: new URL(
    "../../assets/audio/sfx/enemies/enemySplit.wav",
    import.meta.url,
  ).href,
  enemyBirth: new URL(
    "../../assets/audio/sfx/enemies/enemyBirth.wav",
    import.meta.url,
  ).href,
  enemyAura: new URL(
    "../../assets/audio/sfx/enemies/enemyAura.wav",
    import.meta.url,
  ).href,
  enemyBurrow: new URL(
    "../../assets/audio/sfx/enemies/enemyBurrow.wav",
    import.meta.url,
  ).href,
  enemyEmerge: new URL(
    "../../assets/audio/sfx/enemies/enemyEmerge.wav",
    import.meta.url,
  ).href,
  enemyHurt: new URL(
    "../../assets/audio/sfx/enemies/enemyHurt.wav",
    import.meta.url,
  ).href,
} satisfies Partial<Record<GameSfx, string>>;

const audioSampleBuffers = new Map<GameSfx, AudioBuffer>();
let audioSampleLoadTask: Promise<void> | null = null;

export function preloadEnemySfxSamples(context: AudioContext) {
  if (audioSampleLoadTask) return;
  const entries = Object.entries(ENEMY_SFX_SAMPLE_URLS) as Array<[GameSfx, string]>;
  audioSampleLoadTask = Promise.all(entries.map(async ([sfx, url]) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const encodedAudio = await response.arrayBuffer();
      audioSampleBuffers.set(sfx, await context.decodeAudioData(encodedAudio));
    } catch {
      // Keep the oscillator fallback when a sample is unavailable or invalid.
    }
  })).then(() => undefined);
}

export function hasEnemySfxSample(sfx: GameSfx) {
  return audioSampleBuffers.has(sfx);
}

export function playEnemySfxSample(
  context: AudioContext,
  sfx: GameSfx,
  pitch: number,
  volume: number,
) {
  const buffer = audioSampleBuffers.get(sfx);
  if (!buffer || volume <= 0) return;

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = pitch;
  gain.gain.setValueAtTime(volume, context.currentTime);
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
}
