import { DEAD_BELL_CONFIG, GROUND_Y, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { hurtPlayer } from "../player";
import { bossCastDuration } from "./attackTiming";
import { bossAttackDamage, damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const RECOVERY_DRAG = 0.82;
const SHORT_RECOVERY_SCALE = 0.55;
const MOVE_STEERING_BASE = 0.045;
const MOVE_STEERING_PHASE = 0.012;
const MOVE_DRAG = 0.9;
const MOVE_MAX_SPEED_BASE = 3.2;
const MOVE_MAX_SPEED_PHASE = 0.35;
const COMBO_PHASE = 3;
const DOUBLE_PHASE = 2;
const MIN_SKILL_COOLDOWN = 160;
const SKILL_COOLDOWN_PHASE_REDUCTION = 18;
const CAST_SFX_PITCH = 0.9;
const DOUBLE_WAVE_RADIUS_BONUS = 34;
const DELAYED_BLADE_WARNING_SCALE = 0.55;
const COMBO_WAVE_RADIUS_BONUS = 46;
const COMBO_LOWER_BLADE_DELAY_BONUS = 18;
const PLAYER_BLADE_BOTTOM_SCALE = 1.4;
const BLADE_DAMAGE_BONUS = 2;
const DELAYED_BLADE_SFX_PITCH = 0.92;
const DUET_PHASE = 4;
const DUET_RANDOM_CHANCE = 0.3;
const DUET_COOLDOWN = 330;
const DUET_WAVE_DELAY_SCALE = 0.55;
const DUET_THIRD_WAVE_DELAY_BONUS = 18;
const DUET_WAVE_RADIUS_BONUS = 70;
const DUET_UPPER_BLADE_DELAY = 16;
const DUET_LOWER_BLADE_DELAY = 42;
const DUET_REPRISAL_RECOVERY_BONUS = 18;
const DUET_REPRISAL_DAMAGE_BONUS = 5;
const DUET_REPRISAL_SFX_PITCH = 0.82;

export function updateDeadBellBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    updateDeadBellReprisal(boss);
    boss.recoveryTimer -= 1;
    boss.vx *= RECOVERY_DRAG;
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
    const framesSinceCastStart = castDuration - boss.castTimer;
    const spawnAtFrame = isDeadBellLongCast(boss.skillMode)
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
      boss.recoveryTimer = deadBellRecoveryFrames(boss);
      if (boss.skillMode === "deadBellDuet") {
        boss.deadBellReprisalTimer = DEAD_BELL_CONFIG.reprisalWarningFrames
          + DEAD_BELL_CONFIG.reprisalActiveFrames;
        boss.deadBellReprisalHit = false;
      }
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
  boss.vx += Math.sign(toward) * (MOVE_STEERING_BASE + boss.phase * MOVE_STEERING_PHASE);
  boss.vx *= MOVE_DRAG;
  boss.vx = clamp(
    boss.vx,
    -(MOVE_MAX_SPEED_BASE + boss.phase * MOVE_MAX_SPEED_PHASE),
    MOVE_MAX_SPEED_BASE + boss.phase * MOVE_MAX_SPEED_PHASE,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function startDeadBellCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextDeadBellSkill(boss);
  boss.castTimer = bossCastDuration(boss);
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = boss.skillMode === "deadBellDuet"
    ? DUET_COOLDOWN
    : boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboCooldown
      : Math.max(MIN_SKILL_COOLDOWN, DEAD_BELL_CONFIG.skillCooldown - boss.phase * SKILL_COOLDOWN_PHASE_REDUCTION);
  boss.vx = 0;
  boss.deadBellReprisalTimer = 0;
  boss.deadBellReprisalHit = false;

  playSfx("bossCast", CAST_SFX_PITCH);
}

function nextDeadBellSkill(boss: LiveBoss) {
  if (boss.awakened && (boss.phase >= DUET_PHASE || Math.random() < DUET_RANDOM_CHANCE)) {
    return "deadBellDuet";
  }
  if (boss.phase >= COMBO_PHASE) return "deadBellCombo";
  if (boss.phase >= DOUBLE_PHASE) return "deadBellDouble";
  return "deadBellSingle";
}

function isDeadBellLongCast(skillMode: LiveBoss["skillMode"]) {
  return skillMode === "deadBellCombo" || skillMode === "deadBellDuet";
}

function deadBellRecoveryFrames(boss: LiveBoss) {
  if (boss.skillMode === "deadBellDuet") {
    return DEAD_BELL_CONFIG.recoveryFrames + DUET_REPRISAL_RECOVERY_BONUS;
  }
  if (boss.skillMode === "deadBellCombo") return DEAD_BELL_CONFIG.recoveryFrames;
  return Math.floor(DEAD_BELL_CONFIG.recoveryFrames * SHORT_RECOVERY_SCALE);
}

function updateDeadBellReprisal(boss: LiveBoss) {
  if (boss.skillMode !== "deadBellDuet" || (boss.deadBellReprisalTimer ?? 0) <= 0) return;

  const reprisalActive = (boss.deadBellReprisalTimer ?? 0)
    <= DEAD_BELL_CONFIG.reprisalActiveFrames;
  if (reprisalActive && !boss.deadBellReprisalHit && isPlayerUsingOffense()) {
    boss.deadBellReprisalHit = true;
    boss.deadBellReprisalTimer = 0;
    const bossCenter = boss.x + boss.w / 2;
    const playerCenter = state.player.x + state.player.w / 2;
    hurtPlayer(
      bossAttackDamage(
        DEAD_BELL_CONFIG.damageBase
          + boss.phase * DEAD_BELL_CONFIG.damagePhase
          + DUET_REPRISAL_DAMAGE_BONUS,
      ),
      bossCenter - playerCenter,
    );
    playSfx("bossPhaseShift", DUET_REPRISAL_SFX_PITCH);
    return;
  }

  boss.deadBellReprisalTimer = Math.max(0, (boss.deadBellReprisalTimer ?? 0) - 1);
}

function isPlayerUsingOffense() {
  const player = state.player;
  return player.attackTimer > 0
    || player.fallAttackTimer > 0
    || player.skillTimer > 0
    || player.ultimateCastTimer > 0;
}

function spawnDeadBellPattern(boss: LiveBoss) {
  if (boss.skillMode === "deadBellDuet") {
    spawnDeadBellDuet(boss);
    return;
  }

  if (boss.skillMode === "deadBellSingle") {
    spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
    return;
  }

  if (boss.skillMode === "deadBellDouble") {
    spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
    spawnDeadBellWave(boss, DEAD_BELL_CONFIG.delayedWaveFrames, DEAD_BELL_CONFIG.waveMaxRadius + DOUBLE_WAVE_RADIUS_BONUS);
    spawnDeadBellBlade(
      boss,
      playerBladeLane(),
      Math.floor(DEAD_BELL_CONFIG.delayedWaveFrames * DELAYED_BLADE_WARNING_SCALE),
    );
    return;
  }

  spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.upperBladeY, DEAD_BELL_CONFIG.bladeWarningFrames);
  spawnDeadBellWave(boss, DEAD_BELL_CONFIG.delayedWaveFrames, DEAD_BELL_CONFIG.waveMaxRadius + COMBO_WAVE_RADIUS_BONUS);
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, DEAD_BELL_CONFIG.delayedWaveFrames + COMBO_LOWER_BLADE_DELAY_BONUS);
}

function spawnDeadBellDuet(boss: LiveBoss) {
  spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
  spawnDeadBellWave(
    boss,
    Math.floor(DEAD_BELL_CONFIG.delayedWaveFrames * DUET_WAVE_DELAY_SCALE),
    DEAD_BELL_CONFIG.waveMaxRadius + DOUBLE_WAVE_RADIUS_BONUS,
  );
  spawnDeadBellWave(
    boss,
    DEAD_BELL_CONFIG.delayedWaveFrames + DUET_THIRD_WAVE_DELAY_BONUS,
    DEAD_BELL_CONFIG.waveMaxRadius + DUET_WAVE_RADIUS_BONUS,
  );
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.upperBladeY, DUET_UPPER_BLADE_DELAY);
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, DUET_LOWER_BLADE_DELAY);
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
    damage: bossAttackDamage(
      DEAD_BELL_CONFIG.damageBase + boss.phase * DEAD_BELL_CONFIG.damagePhase,
    ),
    hitPlayer: false,
  });
  playSfx("bossWave");
}

export function playerBladeLane() {
  return clamp(
    state.player.y + state.player.h / 2,
    DEAD_BELL_CONFIG.upperBladeY,
    GROUND_Y - DEAD_BELL_CONFIG.bladeHitH * PLAYER_BLADE_BOTTOM_SCALE,
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
    warningFrames: delay,
    elapsed: 0,
    frame: 0,
    life: DEAD_BELL_CONFIG.bladeLife,
    damage: bossAttackDamage(
      DEAD_BELL_CONFIG.damageBase
        + boss.phase * DEAD_BELL_CONFIG.damagePhase
        + BLADE_DAMAGE_BONUS,
    ),
  });
  playSfx("bossBlade", delay > 0 ? DELAYED_BLADE_SFX_PITCH : 1);
}
