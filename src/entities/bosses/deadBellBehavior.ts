import { DEAD_BELL_CONFIG, GROUND_Y, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

export function updateDeadBellBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= 0.82;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const castDuration = boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboCastDuration
      : DEAD_BELL_CONFIG.castDuration;
    const framesSinceCastStart = castDuration - boss.castTimer;
    const spawnAtFrame = boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboSpawnAtFrame
      : DEAD_BELL_CONFIG.spawnAtFrame;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnDeadBellPattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = boss.skillMode === "deadBellCombo"
        ? DEAD_BELL_CONFIG.recoveryFrames
        : Math.floor(DEAD_BELL_CONFIG.recoveryFrames * 0.55);
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startDeadBellCast(boss);
    return;
  }

  moveDeadBellBoss(boss);
  damagePlayerOnContact(boss);
}

function moveDeadBellBoss(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
  boss.actionState = "move";
  boss.vx += Math.sign(toward) * (0.045 + boss.phase * 0.012);
  boss.vx *= 0.9;
  boss.vx = clamp(boss.vx, -(3.2 + boss.phase * 0.35), 3.2 + boss.phase * 0.35);
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function startDeadBellCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = boss.phase >= 3
    ? "deadBellCombo"
    : boss.phase >= 2
      ? "deadBellDouble"
      : "deadBellSingle";
  boss.castTimer = boss.skillMode === "deadBellCombo"
    ? DEAD_BELL_CONFIG.comboCastDuration
    : DEAD_BELL_CONFIG.castDuration;
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = boss.skillMode === "deadBellCombo"
    ? DEAD_BELL_CONFIG.comboCooldown
    : Math.max(160, DEAD_BELL_CONFIG.skillCooldown - boss.phase * 18);
  boss.vx = 0;

  playSfx("bossCast", 0.9);
}

function spawnDeadBellPattern(boss: LiveBoss) {
  if (boss.skillMode === "deadBellSingle") {
    spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
    return;
  }

  if (boss.skillMode === "deadBellDouble") {
    spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
    spawnDeadBellWave(boss, DEAD_BELL_CONFIG.delayedWaveFrames, DEAD_BELL_CONFIG.waveMaxRadius + 34);
    spawnDeadBellBlade(boss, playerBladeLane(), Math.floor(DEAD_BELL_CONFIG.delayedWaveFrames * 0.55));
    return;
  }

  spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.upperBladeY, DEAD_BELL_CONFIG.bladeWarningFrames);
  spawnDeadBellWave(boss, DEAD_BELL_CONFIG.delayedWaveFrames, DEAD_BELL_CONFIG.waveMaxRadius + 46);
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, DEAD_BELL_CONFIG.delayedWaveFrames + 18);
}

export function spawnDeadBellWave(boss: LiveBoss, delay: number, maxRadius: number) {
  state.deadBellWaves.push({
    x: boss.x + boss.w / 2,
    y: boss.y + boss.h / 2,
    radius: DEAD_BELL_CONFIG.waveStartRadius,
    maxRadius,
    thickness: DEAD_BELL_CONFIG.waveThickness,
    warningFrames: DEAD_BELL_CONFIG.waveWarningFrames,
    expandFrames: DEAD_BELL_CONFIG.waveExpandFrames,
    delay,
    elapsed: 0,
    frame: 0,
    damage: DEAD_BELL_CONFIG.damageBase + boss.phase * DEAD_BELL_CONFIG.damagePhase,
    hitPlayer: false,
  });
  playSfx("bossWave");
}

export function playerBladeLane() {
  return clamp(
    state.player.y + state.player.h / 2,
    DEAD_BELL_CONFIG.upperBladeY,
    GROUND_Y - DEAD_BELL_CONFIG.bladeHitH * 1.4,
  );
}

export function spawnDeadBellBlade(boss: LiveBoss, centerY: number, delay: number) {
  const w = DEAD_BELL_CONFIG.bladeHitW;
  const h = DEAD_BELL_CONFIG.bladeHitH;
  state.deadBellBlades.push({
    x: boss.castFacing === 1 ? boss.x + boss.w : boss.x - w,
    y: centerY - h / 2,
    w,
    h,
    vx: boss.castFacing * DEAD_BELL_CONFIG.bladeSpeed,
    facing: boss.castFacing,
    delay,
    elapsed: 0,
    frame: 0,
    life: DEAD_BELL_CONFIG.bladeLife,
    damage: DEAD_BELL_CONFIG.damageBase + boss.phase * DEAD_BELL_CONFIG.damagePhase + 2,
  });
  playSfx("bossBlade", delay > 0 ? 0.92 : 1);
}
