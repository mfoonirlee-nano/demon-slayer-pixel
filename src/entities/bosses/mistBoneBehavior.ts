import { GROUND_Y, MIST_BONE_CONFIG, WIDTH } from "../../constants";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import type { BossSkillMode } from "../../types/game-state";
import { damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const RETREAT_PHASE_FORCE = 0.006;
const STEERING_PHASE_FORCE = 0.004;
const MOVE_COAST_DRAG = 0.86;
const MAX_VELOCITY_PHASE_BONUS = 0.18;
const CAST_SFX_PITCH = 0.92;
const CAGE_PHASE = 4;
const CAGE_RANDOM_CHANCE = 0.28;
const LINE_PHASE = 2;
const LINE_RANDOM_CHANCE = 0.72;
const COOLDOWN_PHASE_REDUCTION = 12;
const CAGE_MIN_COOLDOWN = 176;
const CAGE_COOLDOWN_BONUS = 32;
const LINE_MIN_COOLDOWN = 156;
const SPIKE_MIN_COOLDOWN = 142;
const SPIKE_COOLDOWN_BONUS = 18;
const PATTERN_SFX_PITCH = 0.82;

export function updateMistBoneBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= MIST_BONE_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const framesSinceCastStart = MIST_BONE_CONFIG.castDuration - boss.castTimer;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= MIST_BONE_CONFIG.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnMistBonePattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = MIST_BONE_CONFIG.recoveryFrames;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startMistBoneCast(boss);
    return;
  }

  moveMistBoneBoss(boss);
  damagePlayerOnContact(boss);
}

function moveMistBoneBoss(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const bossCenter = boss.x + boss.w / 2;
  const toPlayer = playerCenter - bossCenter;
  const distance = Math.abs(toPlayer);
  boss.facing = toPlayer >= 0 ? 1 : -1;
  boss.actionState = "move";

  if (distance < MIST_BONE_CONFIG.closeDistance) {
    boss.vx -= Math.sign(toPlayer) * (MIST_BONE_CONFIG.retreatForce + boss.phase * RETREAT_PHASE_FORCE);
  } else if (distance > MIST_BONE_CONFIG.preferredDistance) {
    boss.vx += Math.sign(toPlayer) * (MIST_BONE_CONFIG.steeringForce + boss.phase * STEERING_PHASE_FORCE);
  } else {
    boss.vx *= MOVE_COAST_DRAG;
  }

  boss.vx *= MIST_BONE_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(MIST_BONE_CONFIG.maxVelocity + boss.phase * MAX_VELOCITY_PHASE_BONUS),
    MIST_BONE_CONFIG.maxVelocity + boss.phase * MAX_VELOCITY_PHASE_BONUS,
  );
  boss.x = clamp(boss.x + boss.vx, 0, WIDTH - boss.w);
}

function startMistBoneCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextMistBoneSkill(boss);
  boss.castTimer = MIST_BONE_CONFIG.castDuration;
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = mistBoneSkillCooldown(boss.skillMode, boss.phase);
  boss.vx = 0;

  playSfx("bossCast", CAST_SFX_PITCH);
}

function nextMistBoneSkill(boss: LiveBoss): BossSkillMode {
  const roll = Math.random();
  if (boss.awakened && (boss.phase >= CAGE_PHASE || roll < CAGE_RANDOM_CHANCE)) return "mistBoneCage";
  if (boss.phase >= LINE_PHASE && roll < LINE_RANDOM_CHANCE) return "mistBoneLine";
  return "mistBoneSpike";
}

function mistBoneSkillCooldown(skillMode: BossSkillMode, phase: number) {
  const phaseReduction = phase * COOLDOWN_PHASE_REDUCTION;
  if (skillMode === "mistBoneCage") {
    return Math.max(CAGE_MIN_COOLDOWN, MIST_BONE_CONFIG.skillCooldown + CAGE_COOLDOWN_BONUS - phaseReduction);
  }
  if (skillMode === "mistBoneLine") return Math.max(LINE_MIN_COOLDOWN, MIST_BONE_CONFIG.skillCooldown - phaseReduction);
  return Math.max(SPIKE_MIN_COOLDOWN, MIST_BONE_CONFIG.skillCooldown - SPIKE_COOLDOWN_BONUS - phaseReduction);
}

function spawnMistBonePattern(boss: LiveBoss) {
  if (boss.skillMode === "mistBoneCage") {
    spawnMistBoneCage(boss);
  } else if (boss.skillMode === "mistBoneLine") {
    spawnMistBoneLine(boss);
  } else {
    spawnMistBoneSpikeAtPlayer(boss, 0);
  }
  playSfx("bossWave", PATTERN_SFX_PITCH);
}

function spawnMistBoneLine(boss: LiveBoss) {
  const count = Math.min(
    MIST_BONE_CONFIG.lineMaxCount,
    MIST_BONE_CONFIG.lineBaseCount + Math.max(0, boss.phase - LINE_PHASE),
  );
  const playerCenter = state.player.x + state.player.w / 2;
  const half = (count - 1) / 2;

  for (let i = 0; i < count; i += 1) {
    const centerX = playerCenter + (i - half) * MIST_BONE_CONFIG.lineSpacing;
    spawnMistBoneSpike(boss, centerX, Math.abs(i - half) * MIST_BONE_CONFIG.spikeDelayStep);
  }
}

function spawnMistBoneCage(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const half = (MIST_BONE_CONFIG.cageCount - 1) / 2;

  for (let i = 0; i < MIST_BONE_CONFIG.cageCount; i += 1) {
    const centerX = playerCenter + (i - half) * MIST_BONE_CONFIG.cageSpacing;
    const inwardDelay = (half - Math.abs(i - half)) * MIST_BONE_CONFIG.spikeDelayStep;
    spawnMistBoneSpike(boss, centerX, inwardDelay);
  }
}

function spawnMistBoneSpikeAtPlayer(boss: LiveBoss, delay: number) {
  const centerX = state.player.x + state.player.w / 2;
  spawnMistBoneSpike(boss, centerX, delay);
}

function spawnMistBoneSpike(boss: LiveBoss, centerX: number, delay: number) {
  const w = MIST_BONE_CONFIG.spikeHitW;
  const h = MIST_BONE_CONFIG.spikeHitH;
  const laneY = state.player.onPlatform?.y ?? GROUND_Y;
  const x = clamp(centerX - w / 2, 0, WIDTH - w);
  state.mistBoneSpikes.push({
    x,
    y: laneY - h,
    w,
    h,
    delay: Math.floor(delay),
    warningFrames: MIST_BONE_CONFIG.spikeWarningFrames,
    elapsed: 0,
    frame: 0,
    life: MIST_BONE_CONFIG.spikeLife,
    damage: MIST_BONE_CONFIG.damageBase + boss.phase * MIST_BONE_CONFIG.damagePhase,
    hitPlayer: false,
  });
}
