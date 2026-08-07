import { resolveStaticAssetUrl } from "../assets/staticAssetUrl";
import type { GameSfx } from "./audioTypes";

type PlayerSfx = Extract<GameSfx, `player${string}`>;

type SfxSampleGroup = "players" | "enemies" | "bosses";

function sfxSampleUrl(group: SfxSampleGroup, fileName: string) {
  return `assets/audio/sfx/${group}/${fileName}.wav`;
}

export const PLAYER_SFX_SAMPLE_URLS = {
  playerRunStep: sfxSampleUrl("players", "playerRunStep"),
  playerLand: sfxSampleUrl("players", "playerLand"),
  playerAttackStart: sfxSampleUrl("players", "playerAttackStart"),
  playerAttackHit: sfxSampleUrl("players", "playerAttackHit"),
  playerBossHit: sfxSampleUrl("players", "playerBossHit"),
  playerFallAttackStart: sfxSampleUrl("players", "playerFallAttackStart"),
  playerFallAttackImpact: sfxSampleUrl("players", "playerFallAttackImpact"),
  playerSkillCast: sfxSampleUrl("players", "playerSkillCast"),
  playerSkillLine: sfxSampleUrl("players", "playerSkillLine"),
  playerSkillArc: sfxSampleUrl("players", "playerSkillArc"),
  playerSkillGuard: sfxSampleUrl("players", "playerSkillGuard"),
  playerSkillDash: sfxSampleUrl("players", "playerSkillDash"),
  playerSkillVortex: sfxSampleUrl("players", "playerSkillVortex"),
  playerSkillArmorBreak: sfxSampleUrl("players", "playerSkillArmorBreak"),
  playerSkillArmorBreakImpact: sfxSampleUrl("players", "playerSkillArmorBreakImpact"),
  playerSkillRain: sfxSampleUrl("players", "playerSkillRain"),
  playerSkillReturningBlade: sfxSampleUrl("players", "playerSkillReturningBlade"),
  playerSkillReturningBladeCatch: sfxSampleUrl("players", "playerSkillReturningBladeCatch"),
  playerSkillReturningBladeTurn: sfxSampleUrl("players", "playerSkillReturningBladeTurn"),
  playerSkillVerticalWave: sfxSampleUrl("players", "playerSkillVerticalWave"),
  playerUltimateCast: sfxSampleUrl("players", "playerUltimateCast"),
  playerUltimateImpact: sfxSampleUrl("players", "playerUltimateImpact"),
  playerUltimateAfterimage: sfxSampleUrl("players", "playerUltimateAfterimage"),
  playerUltimateEnd: sfxSampleUrl("players", "playerUltimateEnd"),
  playerCounter: sfxSampleUrl("players", "playerCounter"),
  playerStatusStun: sfxSampleUrl("players", "playerStatusStun"),
  playerJump: sfxSampleUrl("players", "playerJump"),
  playerHurt: sfxSampleUrl("players", "playerHurt"),
  playerDeath: sfxSampleUrl("players", "playerDeath"),
} satisfies Record<PlayerSfx, string>;

export const ENEMY_SFX_SAMPLE_URLS = {
  enemyDefeat: sfxSampleUrl("enemies", "enemyDefeat"),
  enemyWarning: sfxSampleUrl("enemies", "enemyWarning"),
  enemyLunge: sfxSampleUrl("enemies", "enemyLunge"),
  enemyDash: sfxSampleUrl("enemies", "enemyDash"),
  enemySlash: sfxSampleUrl("enemies", "enemySlash"),
  enemyCastStart: sfxSampleUrl("enemies", "enemyCastStart"),
  enemyCastRelease: sfxSampleUrl("enemies", "enemyCastRelease"),
  enemyTalismanCastStart: sfxSampleUrl("enemies", "enemyTalismanCastStart"),
  enemyTalismanCastRelease: sfxSampleUrl("enemies", "enemyTalismanCastRelease"),
  enemyCurseTick: sfxSampleUrl("enemies", "enemyCurseTick"),
  enemyShieldGuard: sfxSampleUrl("enemies", "enemyShieldGuard"),
  enemyShieldBash: sfxSampleUrl("enemies", "enemyShieldBash"),
  enemyShieldBreak: sfxSampleUrl("enemies", "enemyShieldBreak"),
  enemyCleave: sfxSampleUrl("enemies", "enemyCleave"),
  enemyDive: sfxSampleUrl("enemies", "enemyDive"),
  enemyLeap: sfxSampleUrl("enemies", "enemyLeap"),
  enemyImpact: sfxSampleUrl("enemies", "enemyImpact"),
  enemySplit: sfxSampleUrl("enemies", "enemySplit"),
  enemyBirth: sfxSampleUrl("enemies", "enemyBirth"),
  enemyAura: sfxSampleUrl("enemies", "enemyAura"),
  enemyBurrow: sfxSampleUrl("enemies", "enemyBurrow"),
  enemyEmerge: sfxSampleUrl("enemies", "enemyEmerge"),
  enemyHurt: sfxSampleUrl("enemies", "enemyHurt"),
} satisfies Partial<Record<GameSfx, string>>;

export const BOSS_SFX_SAMPLE_URLS = {
  bossMistBoneCast: sfxSampleUrl("bosses", "bossMistBoneCast"),
  bossMistBoneDart: sfxSampleUrl("bosses", "bossMistBoneDart"),
  bossMistBoneWarning: sfxSampleUrl("bosses", "bossMistBoneWarning"),
  bossMistBoneSpike: sfxSampleUrl("bosses", "bossMistBoneSpike"),
  bossMistBoneCharge: sfxSampleUrl("bosses", "bossMistBoneCharge"),
  bossMistBoneDeath: sfxSampleUrl("bosses", "bossMistBoneDeath"),
  bossKill: sfxSampleUrl("bosses", "bossKill"),
} satisfies Partial<Record<GameSfx, string>>;

const audioSampleBuffers = new Map<GameSfx, AudioBuffer>();
let audioSampleLoadTask: Promise<void> | null = null;
const SFX_SAMPLE_URLS = {
  ...BOSS_SFX_SAMPLE_URLS,
  ...ENEMY_SFX_SAMPLE_URLS,
  ...PLAYER_SFX_SAMPLE_URLS,
} satisfies Partial<Record<GameSfx, string>>;

export function preloadSfxSamples(context: AudioContext) {
  if (audioSampleLoadTask) return;
  const entries = Object.entries(SFX_SAMPLE_URLS) as Array<[GameSfx, string]>;
  audioSampleLoadTask = Promise.all(entries.map(async ([sfx, url]) => {
    try {
      const response = await fetch(resolveStaticAssetUrl(url));
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
