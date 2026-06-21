import { BLOOD_MOON_CONFIG, DEAD_BELL_CONFIG, GROUND_Y, LANTERN_EMBER_CONFIG, WIDTH } from "../../constants";
import { canAutoSpawnEntities } from "../../game/debug";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { spawnBossSummonEnemy } from "../enemy";
import { spawnDeadBellBlade, spawnDeadBellWave, playerBladeLane } from "./deadBellBehavior";
import { spawnLanternFireline } from "./lanternEmberBehavior";
import { damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";
import type { BloodMoonEffectState } from "../../types/game-state";

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
    const castDuration = bloodMoonCastDuration(boss);
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

export function bloodMoonCastDuration(boss: LiveBoss) {
  return boss.skillMode === "bloodMoonManyFaces"
    ? BLOOD_MOON_CONFIG.finalCastDuration
    : BLOOD_MOON_CONFIG.castDuration;
}

function startBloodMoonCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextBloodMoonSkill(boss);
  boss.castTimer = bloodMoonCastDuration(boss);
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = bloodMoonSkillCooldown(boss);
  boss.vx = 0;

  playSfx("bossCast", boss.skillMode === "bloodMoonManyFaces" ? 0.78 : 0.88);
}

function nextBloodMoonSkill(boss: LiveBoss) {
  if (boss.phase >= 5) return "bloodMoonManyFaces";
  if (boss.phase === 4) return "bloodMoonSixfold";
  if (boss.phase === 3) return "bloodMoonLanternBell";
  if (boss.phase === 2) return "bloodMoonMirrorFang";
  return "bloodMoonSpiderMist";
}

function bloodMoonSkillCooldown(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonManyFaces") return BLOOD_MOON_CONFIG.finalSkillCooldown;
  return Math.max(142, BLOOD_MOON_CONFIG.skillCooldown - boss.phase * 12);
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
    boss.vx *= 0.84;
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
  return (base + boss.phase * BLOOD_MOON_CONFIG.damagePhase) * scale;
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
  const count = boss.phase >= 4 ? 2 : 1;
  const offsets = count === 1 ? [0] : [-70, 70];

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
      delay: delay + index * 10,
      warningFrames: BLOOD_MOON_CONFIG.spiderMistWarningFrames,
      elapsed: 0,
      frame: 0,
      life: BLOOD_MOON_CONFIG.spiderMistLife,
      damage: bloodMoonDamage(BLOOD_MOON_CONFIG.spiderMistDamageBase, boss, damageScale),
      hitPlayerCd: 0,
      hitDone: false,
    });
  });
  playSfx("bossFire", 0.8);
}

function spawnBloodMoonMirrorFang(boss: LiveBoss, delay = 0, damageScale = 1) {
  const hitW = BLOOD_MOON_CONFIG.mirrorFangHitW;
  const hitH = BLOOD_MOON_CONFIG.mirrorFangHitH;
  const startX = boss.castFacing === 1 ? boss.x + boss.w : boss.x - hitW;
  const playerCenterY = state.player.y + state.player.h / 2;
  spawnBloodMoonEffect({
    kind: "mirrorFang",
    x: clamp(startX, -hitW, WIDTH),
    y: clamp(playerCenterY - hitH / 2, 140, GROUND_Y - hitH),
    w: hitW,
    h: hitH,
    vx: boss.castFacing * (BLOOD_MOON_CONFIG.mirrorFangSpeed + boss.phase * 0.18),
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
  playSfx("bossBlade", 1.1);
}

function spawnBloodMoonLanternBell(boss: LiveBoss) {
  spawnBloodMoonEffect({
    kind: "lanternBell",
    x: boss.x + boss.w / 2 - 92,
    y: boss.y + boss.h * 0.18,
    w: 184,
    h: 150,
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
    enemy.lanternBuffTimer = Math.max(enemy.lanternBuffTimer ?? 0, Math.floor(LANTERN_EMBER_CONFIG.buffFrames * 0.45));
  }
  spawnLanternFireline(boss);
  spawnDeadBellBlade(boss, playerBladeLane(), DEAD_BELL_CONFIG.bladeWarningFrames);
  playSfx("bossSummon", 0.82);
}

function spawnBloodMoonSixfold(boss: LiveBoss) {
  spawnBloodMoonEffect({
    kind: "sixfold",
    x: boss.x + boss.w / 2 - 100,
    y: boss.y + boss.h * 0.08,
    w: 200,
    h: 170,
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

  const roll = Math.floor(Math.random() * 4);
  if (roll === 0) {
    spawnBloodMoonSpiderMist(boss, 18, 0.86);
  } else if (roll === 1) {
    spawnBloodMoonMirrorFang(boss, 16, 0.86);
  } else if (roll === 2) {
    spawnLanternFireline(boss);
  } else {
    spawnDeadBellWave(boss, 16, Math.floor(DEAD_BELL_CONFIG.waveMaxRadius * 0.82));
  }
  playSfx("bossUltimate", 0.92);
}

function spawnBloodMoonManyFaces(boss: LiveBoss) {
  spawnBloodMoonSpiderMist(boss, 0, 0.72);
  spawnBloodMoonMirrorFang(boss, 18, 0.72);
  spawnDeadBellWave(boss, 36, Math.floor(DEAD_BELL_CONFIG.waveMaxRadius * 0.82));
  spawnBloodMoonManyFacesBurst(boss, BLOOD_MOON_CONFIG.manyFacesDelayFrames);
  playSfx("bossUltimate", 0.76);
}

function spawnBloodMoonManyFacesBurst(boss: LiveBoss, delay: number) {
  const hitW = BLOOD_MOON_CONFIG.manyFacesHitW;
  const hitH = BLOOD_MOON_CONFIG.manyFacesHitH;
  const playerCenter = state.player.x + state.player.w / 2;
  const playerMid = state.player.y + state.player.h / 2;
  spawnBloodMoonEffect({
    kind: "manyFaces",
    x: clamp(playerCenter - hitW / 2, 0, WIDTH - hitW),
    y: clamp(playerMid - hitH / 2, 96, GROUND_Y - hitH),
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
