import {
  BLOOD_MOON_CONFIG,
  DEAD_BELL_CONFIG,
  GROUND_Y,
  LANTERN_EMBER_CONFIG,
  WIDTH,
} from "../../constants";
import { playSfx } from "../../game/audio";
import { canAutoSpawnEntities } from "../../game/debug";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import type {
  BloodMoonEffectState,
  BloodMoonFace,
} from "../../types/game-state";
import { spawnBossSummonEnemy } from "../enemy";
import { clearBloodMoonHazards } from "./bloodMoonHazards";
import {
  playerBladeLane,
  spawnDeadBellBlade,
  spawnDeadBellWave,
} from "./deadBellBehavior";
import { spawnLanternFireline } from "./lanternEmberBehavior";
import { spawnMirrorShardFromBoss } from "./mirrorDreamBehavior";
import { spawnMistBoneSpikeAtPlayer } from "./mistBoneBehavior";
import { bossAttackDamage } from "./shared";
import { spawnSpiderStringPillars } from "./spiderStringPillarEffects";
import type { LiveBoss } from "./types";

export const BLOOD_MOON_FACES = [
  "spider",
  "bone",
  "mirror",
  "fang",
  "lantern",
  "bell",
] as const satisfies readonly BloodMoonFace[];

const LANTERN_BELL_X_OFFSET = 92;
const LANTERN_BELL_Y_SCALE = 0.18;
const LANTERN_BELL_W = 184;
const LANTERN_BELL_H = 150;
const LANTERN_BUFF_FRAME_SCALE = 0.45;
const MIRROR_FANG_MIN_Y = 140;
const MIRROR_FANG_PHASE_SPEED_BONUS = 0.18;
const REVIEW_WAVE_RADIUS_SCALE = 0.82;
const SPIDER_MIST_SFX_PITCH = 0.8;
const MIRROR_FANG_SFX_PITCH = 1.1;
const LANTERN_BELL_SFX_PITCH = 0.82;
const REVIEW_SFX_PITCH = 0.92;
const LANTERN_BEAT_COUNT = 3;

export function spawnBloodMoonTrail(
  boss: LiveBoss,
  samples: readonly { x: number; surfaceY: number }[],
) {
  const hitW = BLOOD_MOON_CONFIG.spiderMistHitW;
  const hitH = BLOOD_MOON_CONFIG.spiderMistHitH;
  const route = completeTrailSamples(samples);

  route.forEach((sample, index) => {
    pushBloodMoonEffect({
      kind: "spiderMist",
      x: clamp(sample.x - hitW / 2, 0, WIDTH - hitW),
      y: sample.surfaceY - hitH,
      w: hitW,
      h: hitH,
      vx: 0,
      facing: boss.castFacing,
      delay: index * BLOOD_MOON_CONFIG.trailStaggerFrames,
      warningFrames: BLOOD_MOON_CONFIG.spiderMistWarningFrames,
      elapsed: 0,
      frame: 0,
      life: BLOOD_MOON_CONFIG.spiderMistLife,
      damage: bloodMoonDamage(BLOOD_MOON_CONFIG.spiderMistDamageBase, boss),
      hitDone: false,
    });
  });
  playSfx("bossFire", SPIDER_MIST_SFX_PITCH);
}

export function spawnBloodMoonMirrorTrial(boss: LiveBoss) {
  const decoyDirections = [boss.castFacing, boss.castFacing];
  decoyDirections.forEach((direction, index) => {
    spawnEdgeFang(
      boss,
      direction,
      index === 0
        ? -BLOOD_MOON_CONFIG.mirrorDecoyVerticalGap
        : BLOOD_MOON_CONFIG.mirrorDecoyVerticalGap,
      true,
      0,
    );
  });
  spawnEdgeFang(boss, -boss.castFacing, 0, false, 1);
  playSfx("bossBlade", MIRROR_FANG_SFX_PITCH);
}

export function spawnBloodMoonLanternBeat(boss: LiveBoss, step: number) {
  spawnLanternBellCue(boss);
  const beat = step % LANTERN_BEAT_COUNT;
  if (beat === 0) {
    summonAndBuffRetinue();
    playSfx("bossSummon", LANTERN_BELL_SFX_PITCH);
    return;
  }
  if (beat === 1) {
    spawnLanternFireline(boss);
    return;
  }
  spawnDeadBellBlade(
    boss,
    playerBladeLane(),
    DEAD_BELL_CONFIG.bladeWarningFrames,
  );
  playSfx("bossBlade", LANTERN_BELL_SFX_PITCH);
}

export function cueBloodMoonFace(boss: LiveBoss, face: BloodMoonFace) {
  const centerX = boss.x + boss.w / 2;
  const y = Math.max(0, boss.y - BLOOD_MOON_CONFIG.runeYOffset);
  pushBloodMoonEffect({
    kind: "phaseRune",
    runeFace: face,
    x: centerX - BLOOD_MOON_CONFIG.runeDrawW / 2,
    y,
    w: BLOOD_MOON_CONFIG.runeDrawW,
    h: BLOOD_MOON_CONFIG.runeDrawH,
    vx: 0,
    facing: 1,
    delay: 0,
    warningFrames: 0,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.runeLife,
    damage: 0,
    hitDone: true,
  });
}

export function releaseBloodMoonFace(
  boss: LiveBoss,
  face: BloodMoonFace,
  damageScale: number,
) {
  clearBloodMoonHazards({ preserveRunes: true });
  if (face === "spider") {
    const start = state.spiderStringPillars.length;
    spawnSpiderStringPillars(boss, { count: BLOOD_MOON_CONFIG.reviewPillarCount });
    scaleNewDamage(state.spiderStringPillars, start, damageScale);
  } else if (face === "bone") {
    const start = state.mistBoneSpikes.length;
    spawnMistBoneSpikeAtPlayer(boss, 0);
    scaleNewDamage(state.mistBoneSpikes, start, damageScale);
  } else if (face === "mirror") {
    const start = state.mirrorShards.length;
    spawnMirrorShardFromBoss(boss);
    scaleNewDamage(state.mirrorShards, start, damageScale);
  } else if (face === "fang") {
    spawnBossFang(boss, damageScale);
  } else if (face === "lantern") {
    const start = state.lanternEmberFirelines.length;
    spawnLanternFireline(boss);
    scaleNewDamage(state.lanternEmberFirelines, start, damageScale);
  } else {
    const start = state.deadBellWaves.length;
    spawnDeadBellWave(
      boss,
      0,
      Math.floor(DEAD_BELL_CONFIG.waveMaxRadius * REVIEW_WAVE_RADIUS_SCALE),
    );
    scaleNewDamage(state.deadBellWaves, start, damageScale);
  }
  playSfx("bossUltimate", REVIEW_SFX_PITCH);
}

function completeTrailSamples(
  samples: readonly { x: number; surfaceY: number }[],
) {
  const fallback = {
    x: state.player.x + state.player.w / 2,
    surfaceY: playerFootSurfaceY(),
  };
  return BLOOD_MOON_CONFIG.trailSampleFrames.map((_, index) => (
    samples[index] ?? samples[samples.length - 1] ?? fallback
  ));
}

function spawnEdgeFang(
  boss: LiveBoss,
  facing: number,
  yOffset: number,
  decoy: boolean,
  damageScale: number,
) {
  const hitW = BLOOD_MOON_CONFIG.mirrorFangHitW;
  const hitH = BLOOD_MOON_CONFIG.mirrorFangHitH;
  const playerCenterY = state.player.y + state.player.h / 2;
  pushBloodMoonEffect({
    kind: "mirrorFang",
    decoy,
    x: facing > 0 ? 0 : WIDTH - hitW,
    y: clamp(
      playerCenterY - hitH / 2 + yOffset,
      MIRROR_FANG_MIN_Y,
      GROUND_Y - hitH,
    ),
    w: hitW,
    h: hitH,
    vx: facing * BLOOD_MOON_CONFIG.mirrorTrialSpeed,
    facing,
    delay: decoy ? 0 : BLOOD_MOON_CONFIG.mirrorTrueDelayFrames,
    warningFrames: BLOOD_MOON_CONFIG.mirrorFangWarningFrames,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.mirrorFangLife,
    damage: decoy
      ? 0
      : bloodMoonDamage(BLOOD_MOON_CONFIG.mirrorFangDamageBase, boss, damageScale),
    hitDone: false,
  });
}

function spawnBossFang(boss: LiveBoss, damageScale: number) {
  const hitW = BLOOD_MOON_CONFIG.mirrorFangHitW;
  const hitH = BLOOD_MOON_CONFIG.mirrorFangHitH;
  const playerCenterY = state.player.y + state.player.h / 2;
  pushBloodMoonEffect({
    kind: "mirrorFang",
    decoy: false,
    x: boss.castFacing > 0 ? boss.x + boss.w : boss.x - hitW,
    y: clamp(playerCenterY - hitH / 2, MIRROR_FANG_MIN_Y, GROUND_Y - hitH),
    w: hitW,
    h: hitH,
    vx: boss.castFacing * (
      BLOOD_MOON_CONFIG.mirrorFangSpeed
      + boss.phase * MIRROR_FANG_PHASE_SPEED_BONUS
    ),
    facing: boss.castFacing,
    delay: 0,
    warningFrames: BLOOD_MOON_CONFIG.mirrorFangWarningFrames,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.mirrorFangLife,
    damage: bloodMoonDamage(
      BLOOD_MOON_CONFIG.mirrorFangDamageBase,
      boss,
      damageScale,
    ),
    hitDone: false,
  });
}

function spawnLanternBellCue(boss: LiveBoss) {
  pushBloodMoonEffect({
    kind: "lanternBell",
    x: boss.x + boss.w / 2 - LANTERN_BELL_X_OFFSET,
    y: boss.y + boss.h * LANTERN_BELL_Y_SCALE,
    w: LANTERN_BELL_W,
    h: LANTERN_BELL_H,
    vx: 0,
    facing: boss.castFacing,
    delay: 0,
    warningFrames: 0,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.lanternBellLife,
    damage: 0,
    hitDone: true,
  });
}

function summonAndBuffRetinue() {
  if (canAutoSpawnEntities()) {
    const spawnCount = Math.min(
      2,
      Math.max(0, BLOOD_MOON_CONFIG.summonMaxEnemies - state.enemies.length),
    );
    for (let index = 0; index < spawnCount; index += 1) spawnBossSummonEnemy();
  }
  for (const enemy of state.enemies.slice(0, BLOOD_MOON_CONFIG.summonMaxEnemies)) {
    enemy.lanternBuffTimer = Math.max(
      enemy.lanternBuffTimer ?? 0,
      Math.floor(LANTERN_EMBER_CONFIG.buffFrames * LANTERN_BUFF_FRAME_SCALE),
    );
  }
}

function scaleNewDamage<T extends { damage: number }>(
  effects: T[],
  start: number,
  damageScale: number,
) {
  for (let index = start; index < effects.length; index += 1) {
    const effect = effects[index];
    if (effect) effect.damage *= damageScale;
  }
}

function bloodMoonDamage(base: number, boss: LiveBoss, scale = 1) {
  return bossAttackDamage(
    (base + boss.phase * BLOOD_MOON_CONFIG.damagePhase) * scale,
  );
}

function playerFootSurfaceY() {
  return state.player.onPlatform?.y ?? GROUND_Y;
}

function pushBloodMoonEffect(effect: BloodMoonEffectState) {
  state.bloodMoonEffects.push(effect);
}
