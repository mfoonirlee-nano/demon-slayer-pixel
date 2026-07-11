import type { GameSfx } from "./audioTypes";

type PlayerSfx = Extract<GameSfx, `player${string}`>;

export const PLAYER_SFX_SAMPLE_URLS = {
  playerRunStep: new URL(
    "../../assets/audio/sfx/players/playerRunStep.wav",
    import.meta.url,
  ).href,
  playerLand: new URL(
    "../../assets/audio/sfx/players/playerLand.wav",
    import.meta.url,
  ).href,
  playerAttackStart: new URL(
    "../../assets/audio/sfx/players/playerAttackStart.wav",
    import.meta.url,
  ).href,
  playerAttackHit: new URL(
    "../../assets/audio/sfx/players/playerAttackHit.wav",
    import.meta.url,
  ).href,
  playerBossHit: new URL(
    "../../assets/audio/sfx/players/playerBossHit.wav",
    import.meta.url,
  ).href,
  playerFallAttackStart: new URL(
    "../../assets/audio/sfx/players/playerFallAttackStart.wav",
    import.meta.url,
  ).href,
  playerFallAttackImpact: new URL(
    "../../assets/audio/sfx/players/playerFallAttackImpact.wav",
    import.meta.url,
  ).href,
  playerSkillCast: new URL(
    "../../assets/audio/sfx/players/playerSkillCast.wav",
    import.meta.url,
  ).href,
  playerSkillLine: new URL(
    "../../assets/audio/sfx/players/playerSkillLine.wav",
    import.meta.url,
  ).href,
  playerSkillArc: new URL(
    "../../assets/audio/sfx/players/playerSkillArc.wav",
    import.meta.url,
  ).href,
  playerSkillGuard: new URL(
    "../../assets/audio/sfx/players/playerSkillGuard.wav",
    import.meta.url,
  ).href,
  playerSkillDash: new URL(
    "../../assets/audio/sfx/players/playerSkillDash.wav",
    import.meta.url,
  ).href,
  playerSkillVortex: new URL(
    "../../assets/audio/sfx/players/playerSkillVortex.wav",
    import.meta.url,
  ).href,
  playerSkillArmorBreak: new URL(
    "../../assets/audio/sfx/players/playerSkillArmorBreak.wav",
    import.meta.url,
  ).href,
  playerSkillArmorBreakImpact: new URL(
    "../../assets/audio/sfx/players/playerSkillArmorBreakImpact.wav",
    import.meta.url,
  ).href,
  playerSkillRain: new URL(
    "../../assets/audio/sfx/players/playerSkillRain.wav",
    import.meta.url,
  ).href,
  playerSkillReturningBlade: new URL(
    "../../assets/audio/sfx/players/playerSkillReturningBlade.wav",
    import.meta.url,
  ).href,
  playerSkillReturningBladeCatch: new URL(
    "../../assets/audio/sfx/players/playerSkillReturningBladeCatch.wav",
    import.meta.url,
  ).href,
  playerSkillReturningBladeTurn: new URL(
    "../../assets/audio/sfx/players/playerSkillReturningBladeTurn.wav",
    import.meta.url,
  ).href,
  playerSkillVerticalWave: new URL(
    "../../assets/audio/sfx/players/playerSkillVerticalWave.wav",
    import.meta.url,
  ).href,
  playerUltimateCast: new URL(
    "../../assets/audio/sfx/players/playerUltimateCast.wav",
    import.meta.url,
  ).href,
  playerUltimateImpact: new URL(
    "../../assets/audio/sfx/players/playerUltimateImpact.wav",
    import.meta.url,
  ).href,
  playerUltimateAfterimage: new URL(
    "../../assets/audio/sfx/players/playerUltimateAfterimage.wav",
    import.meta.url,
  ).href,
  playerUltimateEnd: new URL(
    "../../assets/audio/sfx/players/playerUltimateEnd.wav",
    import.meta.url,
  ).href,
  playerCounter: new URL(
    "../../assets/audio/sfx/players/playerCounter.wav",
    import.meta.url,
  ).href,
  playerStatusStun: new URL(
    "../../assets/audio/sfx/players/playerStatusStun.wav",
    import.meta.url,
  ).href,
  playerJump: new URL(
    "../../assets/audio/sfx/players/playerJump.wav",
    import.meta.url,
  ).href,
  playerHurt: new URL(
    "../../assets/audio/sfx/players/playerHurt.wav",
    import.meta.url,
  ).href,
  playerDeath: new URL(
    "../../assets/audio/sfx/players/playerDeath.wav",
    import.meta.url,
  ).href,
} satisfies Record<PlayerSfx, string>;

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
const SFX_SAMPLE_URLS = {
  ...ENEMY_SFX_SAMPLE_URLS,
  ...PLAYER_SFX_SAMPLE_URLS,
} satisfies Partial<Record<GameSfx, string>>;

export function preloadSfxSamples(context: AudioContext) {
  if (audioSampleLoadTask) return;
  const entries = Object.entries(SFX_SAMPLE_URLS) as Array<[GameSfx, string]>;
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

export function hasSfxSample(sfx: GameSfx) {
  return audioSampleBuffers.has(sfx);
}

export function playSfxSample(
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
