import { FANG_GALE_CONFIG, WIDTH } from "../../constants";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import type { BossSkillMode } from "../../types/game-state";
import { hurtPlayer } from "../player";
import { bossAttackDamage, damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const STEERING_PHASE_FORCE = 0.01;
const MAX_VELOCITY_PHASE_BONUS = 0.24;
const CAST_SFX_PITCH = 1.08;
const WAVE_PHASE = 2;
const MIN_STORM_COOLDOWN = 188;
const MIN_WAVE_COOLDOWN = 150;
const MIN_DASH_COOLDOWN = 134;
const STORM_PHASE_ONE_CHANCE = 0.12;
const STORM_PHASE_TWO_CHANCE = 0.22;
const STORM_PHASE_THREE_CHANCE = 0.34;
const WAVE_PHASE_TWO_CHANCE = 0.44;
const WAVE_PHASE_THREE_CHANCE = 0.66;
const WAVE_PHASE_FOUR_CHANCE = 0.78;
const COOLDOWN_PHASE_TWO_MULTIPLIER = 0.9;
const COOLDOWN_PHASE_THREE_MULTIPLIER = 0.78;
const COOLDOWN_PHASE_FOUR_MULTIPLIER = 0.68;
const STORM_CHANCE_BY_PHASE = [
  STORM_PHASE_ONE_CHANCE,
  STORM_PHASE_TWO_CHANCE,
  STORM_PHASE_THREE_CHANCE,
  1,
] as const;
const WAVE_CHANCE_BY_PHASE = [
  0,
  WAVE_PHASE_TWO_CHANCE,
  WAVE_PHASE_THREE_CHANCE,
  WAVE_PHASE_FOUR_CHANCE,
] as const;
const COOLDOWN_MULTIPLIER_BY_PHASE = [
  1,
  COOLDOWN_PHASE_TWO_MULTIPLIER,
  COOLDOWN_PHASE_THREE_MULTIPLIER,
  COOLDOWN_PHASE_FOUR_MULTIPLIER,
] as const;
const STORM_WAVE_SFX_PITCH = 1.12;
const DASH_PHASE_SPEED_BONUS = 0.28;
const STORM_DASH_SFX_PITCH = 1.16;
const STORM_CHAIN_WAVE_SFX_PITCH = 1.06;
const MAX_STORM_COMBO_STEP = 3;
const WAVE_FORWARD_OFFSET = 42;
const WAVE_CENTER_Y_SCALE = 0.56;

export function updateFangGaleBoss(boss: LiveBoss) {
  if (boss.actionState === "dash") {
    updateFangDash(boss);
    return;
  }

  if (boss.actionState === "windup") {
    updateFangStormWindup(boss);
    return;
  }

  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= FANG_GALE_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    const castDuration = fangCastDuration(boss);
    const framesSinceCastStart = castDuration - boss.castTimer;
    boss.vx = 0;
    boss.castTimer -= 1;

    if (!boss.skillEffectSpawned && framesSinceCastStart >= FANG_GALE_CONFIG.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnFangWavePattern(boss);
    }
    if (boss.castTimer <= 0) startFangDash(boss);
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startFangCast(boss);
    return;
  }

  moveFangGaleBoss(boss);
  damagePlayerOnContact(boss);
}

export function fangCastDuration(boss: LiveBoss) {
  if (boss.actionState === "windup") return FANG_GALE_CONFIG.chainWindupFrames;
  return boss.skillMode === "fangGaleStorm"
    ? FANG_GALE_CONFIG.stormCastDuration
    : FANG_GALE_CONFIG.castDuration;
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

function startFangCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextFangSkill(boss);
  boss.castTimer = fangCastDuration(boss);
  boss.skillEffectSpawned = false;
  boss.skillHitDone = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = fangSkillCooldown(boss.skillMode, boss.phase);
  boss.vx = 0;

  playSfx("bossCast", CAST_SFX_PITCH);
}

function nextFangSkill(boss: LiveBoss): BossSkillMode {
  const roll = Math.random();
  const phaseIndex = fangPhaseIndex(boss.phase);
  if (boss.awakened && roll < STORM_CHANCE_BY_PHASE[phaseIndex]) return "fangGaleStorm";
  if (boss.phase >= WAVE_PHASE && roll < WAVE_CHANCE_BY_PHASE[phaseIndex]) return "fangGaleWave";
  return "fangGaleDash";
}

function fangSkillCooldown(skillMode: BossSkillMode, phase: number) {
  const multiplier = COOLDOWN_MULTIPLIER_BY_PHASE[fangPhaseIndex(phase)];
  if (skillMode === "fangGaleStorm") {
    return Math.max(MIN_STORM_COOLDOWN, Math.round(FANG_GALE_CONFIG.stormCooldown * multiplier));
  }
  if (skillMode === "fangGaleWave") {
    return Math.max(MIN_WAVE_COOLDOWN, Math.round(FANG_GALE_CONFIG.waveCooldown * multiplier));
  }
  return Math.max(MIN_DASH_COOLDOWN, Math.round(FANG_GALE_CONFIG.dashCooldown * multiplier));
}

function fangPhaseIndex(phase: number) {
  return Math.min(COOLDOWN_MULTIPLIER_BY_PHASE.length - 1, Math.max(0, phase - 1));
}

function spawnFangWavePattern(boss: LiveBoss) {
  if (boss.skillMode === "fangGaleDash") return;
  spawnFangWave(boss, boss.castFacing);
  if (boss.skillMode === "fangGaleStorm") spawnFangWave(boss, -boss.castFacing);
  playSfx("bossBlade", boss.skillMode === "fangGaleStorm" ? STORM_WAVE_SFX_PITCH : 1);
}

function startFangDash(boss: LiveBoss) {
  boss.comboStep = boss.skillMode === "fangGaleStorm" ? 1 : 0;
  startFangDashSegment(boss);
}

function startFangDashSegment(boss: LiveBoss) {
  const storm = boss.skillMode === "fangGaleStorm";
  const speed = storm ? FANG_GALE_CONFIG.stormDashSpeed : FANG_GALE_CONFIG.dashSpeed;
  boss.actionState = "dash";
  boss.actionTimer = 0;
  boss.aiTimer = storm ? FANG_GALE_CONFIG.stormDashFrames : FANG_GALE_CONFIG.dashFrames;
  boss.skillHitDone = false;
  boss.vx = boss.castFacing * (speed + boss.phase * DASH_PHASE_SPEED_BONUS);
  playSfx("bossBlade", storm ? STORM_DASH_SFX_PITCH : 1);
}

function updateFangStormWindup(boss: LiveBoss) {
  const framesSinceWindupStart = FANG_GALE_CONFIG.chainWindupFrames - boss.castTimer;
  boss.vx = 0;
  boss.castTimer -= 1;

  if (!boss.skillEffectSpawned && framesSinceWindupStart >= FANG_GALE_CONFIG.chainSpawnAtFrame) {
    boss.skillEffectSpawned = true;
    spawnFangWave(boss, boss.castFacing);
    playSfx("bossBlade", STORM_CHAIN_WAVE_SFX_PITCH);
  }
  if (boss.castTimer <= 0) startFangDashSegment(boss);
  damagePlayerOnContact(boss);
}

function updateFangDash(boss: LiveBoss) {
  boss.x += boss.vx;
  const clampedX = clamp(boss.x, 0, WIDTH - boss.w);
  if (clampedX !== boss.x) {
    boss.x = clampedX;
    boss.aiTimer = 0;
  }

  if (!boss.skillHitDone && hitbox(state.player, boss)) {
    boss.skillHitDone = true;
    hurtPlayer(
      bossAttackDamage(
        FANG_GALE_CONFIG.dashDamageBase + boss.phase * FANG_GALE_CONFIG.dashDamagePhase,
      ),
      boss.vx,
    );
  }

  if (boss.aiTimer <= 0) {
    if (boss.skillMode === "fangGaleStorm" && (boss.comboStep ?? 1) < MAX_STORM_COMBO_STEP) {
      startFangStormChainWindup(boss);
      return;
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

function startFangStormChainWindup(boss: LiveBoss) {
  boss.comboStep = (boss.comboStep ?? 1) + 1;
  boss.castFacing *= -1;
  boss.facing = boss.castFacing;
  boss.castTimer = FANG_GALE_CONFIG.chainWindupFrames;
  boss.skillEffectSpawned = false;
  boss.skillHitDone = false;
  boss.actionState = "windup";
  boss.actionTimer = 0;
  boss.vx = 0;
}

function spawnFangWave(boss: LiveBoss, facing: number) {
  const w = FANG_GALE_CONFIG.waveHitW;
  const h = FANG_GALE_CONFIG.waveHitH;
  const centerX = boss.x + boss.w / 2 + facing * WAVE_FORWARD_OFFSET;
  const centerY = boss.y + boss.h * WAVE_CENTER_Y_SCALE;
  const storm = boss.skillMode === "fangGaleStorm";
  state.fangGaleWaves.push({
    x: centerX - w / 2,
    y: centerY - h / 2,
    w,
    h,
    vx: facing * (storm ? FANG_GALE_CONFIG.stormWaveSpeed : FANG_GALE_CONFIG.waveSpeed),
    facing,
    warningFrames: FANG_GALE_CONFIG.waveWarningFrames,
    elapsed: 0,
    frame: 0,
    life: FANG_GALE_CONFIG.waveLife,
    damage: bossAttackDamage(
      FANG_GALE_CONFIG.waveDamageBase + boss.phase * FANG_GALE_CONFIG.waveDamagePhase,
    ),
  });
}
