import { BLOOD_MOON_CONFIG, DEAD_BELL_CONFIG, GROUND_Y, LANTERN_EMBER_CONFIG, WIDTH } from "../../constants";
import { canAutoSpawnEntities } from "../../game/debug";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { spawnBossSummonEnemy } from "../enemy";
import { spawnDeadBellBlade, spawnDeadBellWave, playerBladeLane } from "./deadBellBehavior";
import { spawnLanternFireline } from "./lanternEmberBehavior";
import { bossCastDuration } from "./attackTiming";
import { bossAttackDamage, damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";
import type { BloodMoonEffectState } from "../../types/game-state";

const MANY_FACES_PHASE = 5;
const SIXFOLD_PHASE = 4;
const LANTERN_BELL_PHASE = 3;
const MIRROR_FANG_PHASE = 2;
const FINAL_CAST_SFX_PITCH = 0.78;
const STANDARD_CAST_SFX_PITCH = 0.88;
const MIN_SKILL_COOLDOWN = 142;
const SKILL_COOLDOWN_PHASE_REDUCTION = 12;
const MOVE_COAST_DRAG = 0.84;
const SPIDER_MIST_MULTI_PHASE = 4;
const SPIDER_MIST_LEFT_OFFSET = -70;
const SPIDER_MIST_RIGHT_OFFSET = 70;
const SPIDER_MIST_DELAY_STAGGER = 10;
const SPIDER_MIST_SFX_PITCH = 0.8;
const MIRROR_FANG_MIN_Y = 140;
const MIRROR_FANG_PHASE_SPEED_BONUS = 0.18;
const MIRROR_FANG_SFX_PITCH = 1.1;
const LANTERN_BELL_X_OFFSET = 92;
const LANTERN_BELL_Y_SCALE = 0.18;
const LANTERN_BELL_W = 184;
const LANTERN_BELL_H = 150;
const LANTERN_BUFF_FRAME_SCALE = 0.45;
const LANTERN_BELL_SFX_PITCH = 0.82;
const SIXFOLD_X_OFFSET = 100;
const SIXFOLD_Y_SCALE = 0.08;
const SIXFOLD_W = 200;
const SIXFOLD_H = 170;
const SIXFOLD_VARIANT_COUNT = 4;
const SIXFOLD_SPIDER_DELAY = 18;
const SIXFOLD_SPIDER_DAMAGE_SCALE = 0.86;
const SIXFOLD_MIRROR_DELAY = 16;
const SIXFOLD_MIRROR_DAMAGE_SCALE = 0.86;
const SIXFOLD_WAVE_DELAY = 16;
const SIXFOLD_WAVE_RADIUS_SCALE = 0.82;
const SIXFOLD_SFX_PITCH = 0.92;
const MANY_FACES_SPIDER_DAMAGE_SCALE = 0.72;
const MANY_FACES_MIRROR_DELAY = 18;
const MANY_FACES_MIRROR_DAMAGE_SCALE = 0.72;
const MANY_FACES_WAVE_DELAY = 36;
const MANY_FACES_WAVE_RADIUS_SCALE = 0.82;
const MANY_FACES_SFX_PITCH = 0.76;
const MANY_FACES_MIN_Y = 96;

export function updateBloodMoonBoss(boss: LiveBoss) {
  if ((boss.phaseShiftTimer ?? 0) > 0) {
    boss.phaseShiftTimer = Math.max(0, (boss.phaseShiftTimer ?? 0) - 1);
    boss.vx *= BLOOD_MOON_CONFIG.drag;
    if (boss.phaseShiftTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= BLOOD_MOON_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const castDuration = bossCastDuration(boss);
    const spawnAtFrame = boss.skillMode === "bloodMoonManyFaces"
      ? BLOOD_MOON_CONFIG.finalSpawnAtFrame
      : BLOOD_MOON_CONFIG.spawnAtFrame;
    const framesSinceCastStart = castDuration - boss.castTimer;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnBloodMoonPattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = boss.skillMode === "bloodMoonManyFaces"
        ? BLOOD_MOON_CONFIG.finalRecoveryFrames
        : BLOOD_MOON_CONFIG.recoveryFrames;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startBloodMoonCast(boss);
    return;
  }

  moveBloodMoonBoss(boss);
  damagePlayerOnContact(boss);
}

function startBloodMoonCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextBloodMoonSkill(boss);
  boss.castTimer = bossCastDuration(boss);
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = bloodMoonSkillCooldown(boss);
  boss.vx = 0;

  playSfx("bossCast", boss.skillMode === "bloodMoonManyFaces" ? FINAL_CAST_SFX_PITCH : STANDARD_CAST_SFX_PITCH);
}

function nextBloodMoonSkill(boss: LiveBoss) {
  if (boss.phase >= MANY_FACES_PHASE) return "bloodMoonManyFaces";
  if (boss.phase === SIXFOLD_PHASE) return "bloodMoonSixfold";
  if (boss.phase === LANTERN_BELL_PHASE) return "bloodMoonLanternBell";
  if (boss.phase === MIRROR_FANG_PHASE) return "bloodMoonMirrorFang";
  return "bloodMoonSpiderMist";
}

function bloodMoonSkillCooldown(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonManyFaces") return BLOOD_MOON_CONFIG.finalSkillCooldown;
  return Math.max(MIN_SKILL_COOLDOWN, BLOOD_MOON_CONFIG.skillCooldown - boss.phase * SKILL_COOLDOWN_PHASE_REDUCTION);
}

function moveBloodMoonBoss(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const bossCenter = boss.x + boss.w / 2;
  const toPlayer = playerCenter - bossCenter;
  const distance = Math.abs(toPlayer);
  boss.facing = toPlayer >= 0 ? 1 : -1;
  boss.actionState = "move";

  if (distance < BLOOD_MOON_CONFIG.closeDistance) {
    boss.vx -= Math.sign(toPlayer) * BLOOD_MOON_CONFIG.retreatForce;
  } else if (distance > BLOOD_MOON_CONFIG.preferredDistance) {
    boss.vx += Math.sign(toPlayer) * (
      BLOOD_MOON_CONFIG.moveSteeringForce
      + boss.phase * BLOOD_MOON_CONFIG.phaseSteeringForce
    );
  } else {
    boss.vx *= MOVE_COAST_DRAG;
  }

  boss.vx *= BLOOD_MOON_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(BLOOD_MOON_CONFIG.maxVelocityBase + boss.phase * BLOOD_MOON_CONFIG.maxVelocityPhase),
    BLOOD_MOON_CONFIG.maxVelocityBase + boss.phase * BLOOD_MOON_CONFIG.maxVelocityPhase,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function spawnBloodMoonPattern(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonMirrorFang") {
    spawnBloodMoonMirrorFang(boss);
  } else if (boss.skillMode === "bloodMoonLanternBell") {
    spawnBloodMoonLanternBell(boss);
  } else if (boss.skillMode === "bloodMoonSixfold") {
    spawnBloodMoonSixfold(boss);
  } else if (boss.skillMode === "bloodMoonManyFaces") {
    spawnBloodMoonManyFaces(boss);
  } else {
    spawnBloodMoonSpiderMist(boss);
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

function spawnBloodMoonEffect(effect: BloodMoonEffectState) {
  state.bloodMoonEffects.push(effect);
}

function spawnBloodMoonSpiderMist(boss: LiveBoss, delay = 0, damageScale = 1) {
  const hitW = BLOOD_MOON_CONFIG.spiderMistHitW;
  const hitH = BLOOD_MOON_CONFIG.spiderMistHitH;
  const playerCenter = state.player.x + state.player.w / 2;
  const count = boss.phase >= SPIDER_MIST_MULTI_PHASE ? 2 : 1;
  const offsets = count === 1 ? [0] : [SPIDER_MIST_LEFT_OFFSET, SPIDER_MIST_RIGHT_OFFSET];

  offsets.forEach((offset, index) => {
    const x = clamp(playerCenter - hitW / 2 + offset, 0, WIDTH - hitW);
    const surfaceY = playerFootSurfaceY();
    spawnBloodMoonEffect({
      kind: "spiderMist",
      x,
      y: surfaceY - hitH,
      w: hitW,
      h: hitH,
      vx: 0,
      facing: boss.castFacing,
      delay: delay + index * SPIDER_MIST_DELAY_STAGGER,
      warningFrames: BLOOD_MOON_CONFIG.spiderMistWarningFrames,
      elapsed: 0,
      frame: 0,
      life: BLOOD_MOON_CONFIG.spiderMistLife,
      damage: bloodMoonDamage(BLOOD_MOON_CONFIG.spiderMistDamageBase, boss, damageScale),
      hitPlayerCd: 0,
      hitDone: false,
    });
  });
  playSfx("bossFire", SPIDER_MIST_SFX_PITCH);
}

function spawnBloodMoonMirrorFang(boss: LiveBoss, delay = 0, damageScale = 1) {
  const hitW = BLOOD_MOON_CONFIG.mirrorFangHitW;
  const hitH = BLOOD_MOON_CONFIG.mirrorFangHitH;
  const startX = boss.castFacing === 1 ? boss.x + boss.w : boss.x - hitW;
  const playerCenterY = state.player.y + state.player.h / 2;
  spawnBloodMoonEffect({
    kind: "mirrorFang",
    x: clamp(startX, -hitW, WIDTH),
    y: clamp(playerCenterY - hitH / 2, MIRROR_FANG_MIN_Y, GROUND_Y - hitH),
    w: hitW,
    h: hitH,
    vx: boss.castFacing * (
      BLOOD_MOON_CONFIG.mirrorFangSpeed
      + boss.phase * MIRROR_FANG_PHASE_SPEED_BONUS
    ),
    facing: boss.castFacing,
    delay,
    warningFrames: BLOOD_MOON_CONFIG.mirrorFangWarningFrames,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.mirrorFangLife,
    damage: bloodMoonDamage(BLOOD_MOON_CONFIG.mirrorFangDamageBase, boss, damageScale),
    hitPlayerCd: 0,
    hitDone: false,
  });
  playSfx("bossBlade", MIRROR_FANG_SFX_PITCH);
}

function spawnBloodMoonLanternBell(boss: LiveBoss) {
  spawnBloodMoonEffect({
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
    hitPlayerCd: 0,
    hitDone: true,
  });

  if (canAutoSpawnEntities()) {
    const spawnCount = Math.min(2, Math.max(0, BLOOD_MOON_CONFIG.summonMaxEnemies - state.enemies.length));
    for (let i = 0; i < spawnCount; i += 1) spawnBossSummonEnemy();
  }
  for (const enemy of state.enemies.slice(0, BLOOD_MOON_CONFIG.summonMaxEnemies)) {
    enemy.lanternBuffTimer = Math.max(
      enemy.lanternBuffTimer ?? 0,
      Math.floor(LANTERN_EMBER_CONFIG.buffFrames * LANTERN_BUFF_FRAME_SCALE),
    );
  }
  spawnLanternFireline(boss);
  spawnDeadBellBlade(boss, playerBladeLane(), DEAD_BELL_CONFIG.bladeWarningFrames);
  playSfx("bossSummon", LANTERN_BELL_SFX_PITCH);
}

function spawnBloodMoonSixfold(boss: LiveBoss) {
  spawnBloodMoonEffect({
    kind: "sixfold",
    x: boss.x + boss.w / 2 - SIXFOLD_X_OFFSET,
    y: boss.y + boss.h * SIXFOLD_Y_SCALE,
    w: SIXFOLD_W,
    h: SIXFOLD_H,
    vx: 0,
    facing: boss.castFacing,
    delay: 0,
    warningFrames: 0,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.sixfoldLife,
    damage: 0,
    hitPlayerCd: 0,
    hitDone: true,
  });

  const roll = Math.floor(Math.random() * SIXFOLD_VARIANT_COUNT);
  if (roll === 0) {
    spawnBloodMoonSpiderMist(boss, SIXFOLD_SPIDER_DELAY, SIXFOLD_SPIDER_DAMAGE_SCALE);
  } else if (roll === 1) {
    spawnBloodMoonMirrorFang(boss, SIXFOLD_MIRROR_DELAY, SIXFOLD_MIRROR_DAMAGE_SCALE);
  } else if (roll === 2) {
    spawnLanternFireline(boss);
  } else {
    spawnDeadBellWave(boss, SIXFOLD_WAVE_DELAY, Math.floor(DEAD_BELL_CONFIG.waveMaxRadius * SIXFOLD_WAVE_RADIUS_SCALE));
  }
  playSfx("bossUltimate", SIXFOLD_SFX_PITCH);
}

function spawnBloodMoonManyFaces(boss: LiveBoss) {
  spawnBloodMoonSpiderMist(boss, 0, MANY_FACES_SPIDER_DAMAGE_SCALE);
  spawnBloodMoonMirrorFang(boss, MANY_FACES_MIRROR_DELAY, MANY_FACES_MIRROR_DAMAGE_SCALE);
  spawnDeadBellWave(boss, MANY_FACES_WAVE_DELAY, Math.floor(DEAD_BELL_CONFIG.waveMaxRadius * MANY_FACES_WAVE_RADIUS_SCALE));
  spawnBloodMoonManyFacesBurst(boss, BLOOD_MOON_CONFIG.manyFacesDelayFrames);
  playSfx("bossUltimate", MANY_FACES_SFX_PITCH);
}

function spawnBloodMoonManyFacesBurst(boss: LiveBoss, delay: number) {
  const hitW = BLOOD_MOON_CONFIG.manyFacesHitW;
  const hitH = BLOOD_MOON_CONFIG.manyFacesHitH;
  const playerCenter = state.player.x + state.player.w / 2;
  const playerMid = state.player.y + state.player.h / 2;
  spawnBloodMoonEffect({
    kind: "manyFaces",
    x: clamp(playerCenter - hitW / 2, 0, WIDTH - hitW),
    y: clamp(playerMid - hitH / 2, MANY_FACES_MIN_Y, GROUND_Y - hitH),
    w: hitW,
    h: hitH,
    vx: 0,
    facing: boss.castFacing,
    delay,
    warningFrames: BLOOD_MOON_CONFIG.manyFacesWarningFrames,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.manyFacesLife,
    damage: bloodMoonDamage(BLOOD_MOON_CONFIG.manyFacesDamageBase, boss),
    hitPlayerCd: 0,
    hitDone: false,
  });
}
