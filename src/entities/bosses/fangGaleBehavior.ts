import { FANG_GALE_CONFIG, WIDTH } from "../../constants";
import { playSfx } from "../../game/audio";
import { recordCollisionDebugRect } from "../../game/collisionDebug";
import { state } from "../../game/state";
import { clamp, rectsOverlap } from "../../game/utils";
import type { BossSkillMode } from "../../types/game-state";
import { hurtPlayer } from "../player";
import { bossCastDuration, fangChainWindupFrames } from "./attackTiming";
import { bossAttackDamage, damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const STEERING_PHASE_FORCE = 0.01;
const MAX_VELOCITY_PHASE_BONUS = 0.24;
const CAST_SFX_PITCH = 1.08;
const DASH_PHASE_SPEED_BONUS = 0.28;
const STORM_DASH_SFX_PITCH = 1.16;
const STORM_CHAIN_WARNING_SFX_PITCH = 1.16;
const WAVE_FORWARD_OFFSET = 42;
const WAVE_CENTER_Y_SCALE = 0.56;

export function updateFangGaleBoss(boss: LiveBoss) {
  if (boss.actionState === "retreat") {
    updateFangRetreat(boss);
    return;
  }

  if (boss.actionState === "dash") {
    updateFangDash(boss);
    return;
  }

  if (boss.actionState === "windup") {
    updateFangChainWindup(boss);
    return;
  }

  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= FANG_GALE_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
      boss.skillCd = fangPostRecoveryCooldown(boss.fangPatternPhase ?? boss.phase);
      boss.fangPatternPhase = undefined;
      boss.comboStep = undefined;
    }
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    boss.castTimer -= 1;
    if (boss.castTimer <= 0) startFangDash(boss);
    return;
  }

  if (boss.skillCd <= 0 && boss.aiTimer <= 0) {
    startFangPattern(boss);
    return;
  }

  moveFangGaleBoss(boss);
  damagePlayerOnContact(boss);
}

function moveFangGaleBoss(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
  boss.actionState = "move";
  boss.vx += Math.sign(toward) * (FANG_GALE_CONFIG.steeringForce + boss.phase * STEERING_PHASE_FORCE);
  boss.vx *= FANG_GALE_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(FANG_GALE_CONFIG.maxVelocity + boss.phase * MAX_VELOCITY_PHASE_BONUS),
    FANG_GALE_CONFIG.maxVelocity + boss.phase * MAX_VELOCITY_PHASE_BONUS,
  );
  boss.x = clamp(boss.x + boss.vx, 0, WIDTH - boss.w);
}

function startFangPattern(boss: LiveBoss) {
  boss.skillMode = nextFangSkill(boss);
  // Lock the pattern so an HP phase change cannot alter its remaining hits or timing.
  boss.fangPatternPhase = boss.phase;
  if (boss.skillMode !== "fangGaleDash" && boss.phase >= 2) {
    boss.actionState = "retreat";
    boss.actionTimer = 0;
    boss.aiTimer = FANG_GALE_CONFIG.retreatFrames;
    setFangRetreatVelocity(boss);
    return;
  }
  startFangCast(boss);
}

function updateFangRetreat(boss: LiveBoss) {
  setFangRetreatVelocity(boss);
  boss.x = clamp(boss.x + boss.vx, 0, WIDTH - boss.w);
  if (boss.aiTimer <= 0) startFangCast(boss);
}

function faceFangTowardPlayer(boss: LiveBoss) {
  boss.castFacing = fangDirectionToPlayer(boss);
  boss.facing = boss.castFacing;
}

function setFangRetreatVelocity(boss: LiveBoss) {
  faceFangTowardPlayer(boss);
  boss.vx = -boss.castFacing * FANG_GALE_CONFIG.retreatSpeed;
}

function startFangCast(boss: LiveBoss) {
  faceFangTowardPlayer(boss);
  boss.castTimer = bossCastDuration(boss);
  boss.skillEffectSpawned = false;
  boss.skillHitDone = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = 0;
  boss.vx = 0;

  playSfx("bossCast", CAST_SFX_PITCH);
}

function nextFangSkill(boss: LiveBoss): BossSkillMode {
  const roll = Math.random();
  if (boss.awakened) {
    const weights = FANG_GALE_CONFIG.awakenedSkillWeights[
      Math.min(
        FANG_GALE_CONFIG.awakenedSkillWeights.length - 1,
        Math.max(0, boss.phase - 1),
      )
    ];
    if (roll < weights.dash) return "fangGaleDash";
    if (roll < weights.dash + weights.wave) return "fangGaleWave";
    return "fangGaleStorm";
  }

  const weights = FANG_GALE_CONFIG.normalSkillWeights[
    Math.min(
      FANG_GALE_CONFIG.normalSkillWeights.length - 1,
      Math.max(0, boss.phase - 1),
    )
  ];
  return roll < weights.dash ? "fangGaleDash" : "fangGaleWave";
}

function fangPostRecoveryCooldown(phase: number) {
  const index = Math.min(
    FANG_GALE_CONFIG.postRecoveryCooldowns.length - 1,
    Math.max(0, phase - 1),
  );
  return FANG_GALE_CONFIG.postRecoveryCooldowns[index];
}

function startFangDash(boss: LiveBoss) {
  boss.comboStep = 1;
  startFangDashSegment(boss);
}

function startFangDashSegment(boss: LiveBoss) {
  const storm = boss.skillMode === "fangGaleStorm";
  const finalStormDash = storm && boss.comboStep === FANG_GALE_CONFIG.stormDashCount;
  const baseSpeed = storm ? FANG_GALE_CONFIG.stormDashSpeed : FANG_GALE_CONFIG.dashSpeed;
  const phase = boss.fangPatternPhase ?? boss.phase;
  const phaseSpeed = baseSpeed + phase * DASH_PHASE_SPEED_BONUS;
  const speed = finalStormDash
    ? phaseSpeed * FANG_GALE_CONFIG.stormFinalDashSpeedMultiplier
    : phaseSpeed;
  boss.actionState = "dash";
  boss.actionTimer = 0;
  boss.aiTimer = storm ? FANG_GALE_CONFIG.stormDashFrames : FANG_GALE_CONFIG.dashFrames;
  boss.skillHitDone = false;
  boss.vx = boss.castFacing * speed;
  playSfx("bossBlade", storm ? STORM_DASH_SFX_PITCH : 1);
}

function updateFangChainWindup(boss: LiveBoss) {
  boss.vx = 0;
  boss.castTimer -= 1;
  if (boss.castTimer <= 0) startFangDashSegment(boss);
}

function updateFangDash(boss: LiveBoss) {
  boss.x += boss.vx;
  const clampedX = clamp(boss.x, 0, WIDTH - boss.w);
  if (clampedX !== boss.x) {
    boss.x = clampedX;
    boss.aiTimer = 0;
  }

  const dashHitbox = fangDashHitbox(boss);
  recordCollisionDebugRect(dashHitbox, "enemyAttack");
  if (!boss.skillHitDone && rectsOverlap(state.player, dashHitbox)) {
    boss.skillHitDone = true;
    const phase = boss.fangPatternPhase ?? boss.phase;
    hurtPlayer(
      bossAttackDamage(
        FANG_GALE_CONFIG.dashDamageBase + phase * FANG_GALE_CONFIG.dashDamagePhase,
      ),
      boss.vx,
    );
  }

  if (boss.aiTimer <= 0) {
    if ((boss.comboStep ?? 1) < fangComboLength(boss)) {
      startFangChainWindup(boss);
      return;
    }
    if (boss.skillMode === "fangGaleWave") {
      const facing = fangDirectionToPlayer(boss);
      spawnFangWave(boss, facing);
      playSfx("bossBlade");
    }
    boss.actionState = "recover";
    boss.actionTimer = 0;
    boss.recoveryTimer = boss.skillMode === "fangGaleStorm"
      ? FANG_GALE_CONFIG.stormRecoveryFrames
      : FANG_GALE_CONFIG.recoveryFrames;
    boss.vx = 0;
    boss.comboStep = undefined;
  }
}

function fangDashHitbox(boss: LiveBoss) {
  return {
    x: boss.x + boss.w / 2 - FANG_GALE_CONFIG.dashHitW / 2,
    y: boss.y + boss.h - FANG_GALE_CONFIG.dashHitH,
    w: FANG_GALE_CONFIG.dashHitW,
    h: FANG_GALE_CONFIG.dashHitH,
  };
}

function startFangChainWindup(boss: LiveBoss) {
  boss.comboStep = (boss.comboStep ?? 1) + 1;
  boss.castFacing = boss.skillMode === "fangGaleStorm"
    ? -boss.castFacing
    : fangDirectionToPlayer(boss);
  boss.facing = boss.castFacing;
  boss.castTimer = fangChainWindupFrames(boss.fangPatternPhase ?? boss.phase);
  boss.skillEffectSpawned = false;
  boss.skillHitDone = false;
  boss.actionState = "windup";
  boss.actionTimer = 0;
  boss.vx = 0;
  playSfx("bossCast", STORM_CHAIN_WARNING_SFX_PITCH);
}

function fangComboLength(boss: LiveBoss) {
  if (boss.skillMode === "fangGaleStorm") return FANG_GALE_CONFIG.stormDashCount;
  if (
    boss.skillMode === "fangGaleWave"
    && (boss.fangPatternPhase ?? boss.phase) >= FANG_GALE_CONFIG.waveComboPhase
  ) {
    return FANG_GALE_CONFIG.waveDashCount;
  }
  return 1;
}

function fangDirectionToPlayer(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  if (toPlayer === 0) return -boss.castFacing || 1;
  return toPlayer > 0 ? 1 : -1;
}

function spawnFangWave(boss: LiveBoss, facing: number) {
  const w = FANG_GALE_CONFIG.waveHitW;
  const h = FANG_GALE_CONFIG.waveHitH;
  const centerX = boss.x + boss.w / 2 + facing * WAVE_FORWARD_OFFSET;
  const centerY = boss.y + boss.h * WAVE_CENTER_Y_SCALE;
  const phase = boss.fangPatternPhase ?? boss.phase;
  state.fangGaleWaves.push({
    x: centerX - w / 2,
    y: centerY - h / 2,
    w,
    h,
    vx: facing * FANG_GALE_CONFIG.waveSpeed,
    facing,
    warningFrames: FANG_GALE_CONFIG.waveWarningFrames,
    elapsed: 0,
    frame: 0,
    life: FANG_GALE_CONFIG.waveLife,
    damage: bossAttackDamage(
      FANG_GALE_CONFIG.waveDamageBase + phase * FANG_GALE_CONFIG.waveDamagePhase,
    ),
  });
}
