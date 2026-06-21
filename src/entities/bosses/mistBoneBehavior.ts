import { GROUND_Y, MIST_BONE_CONFIG, WIDTH } from "../../constants";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import type { BossSkillMode } from "../../types/game-state";
import { damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

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
    boss.vx -= Math.sign(toPlayer) * (MIST_BONE_CONFIG.retreatForce + boss.phase * 0.006);
  } else if (distance > MIST_BONE_CONFIG.preferredDistance) {
    boss.vx += Math.sign(toPlayer) * (MIST_BONE_CONFIG.steeringForce + boss.phase * 0.004);
  } else {
    boss.vx *= 0.86;
  }

  boss.vx *= MIST_BONE_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(MIST_BONE_CONFIG.maxVelocity + boss.phase * 0.18),
    MIST_BONE_CONFIG.maxVelocity + boss.phase * 0.18,
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

  playSfx("bossCast", 0.92);
}

function nextMistBoneSkill(boss: LiveBoss): BossSkillMode {
  const roll = Math.random();
  if (boss.awakened && (boss.phase >= 4 || roll < 0.28)) return "mistBoneCage";
  if (boss.phase >= 2 && roll < 0.72) return "mistBoneLine";
  return "mistBoneSpike";
}

function mistBoneSkillCooldown(skillMode: BossSkillMode, phase: number) {
  const phaseReduction = phase * 12;
  if (skillMode === "mistBoneCage") return Math.max(176, MIST_BONE_CONFIG.skillCooldown + 32 - phaseReduction);
  if (skillMode === "mistBoneLine") return Math.max(156, MIST_BONE_CONFIG.skillCooldown - phaseReduction);
  return Math.max(142, MIST_BONE_CONFIG.skillCooldown - 18 - phaseReduction);
}

function spawnMistBonePattern(boss: LiveBoss) {
  if (boss.skillMode === "mistBoneCage") {
    spawnMistBoneCage(boss);
  } else if (boss.skillMode === "mistBoneLine") {
    spawnMistBoneLine(boss);
  } else {
    spawnMistBoneSpikeAtPlayer(boss, 0);
  }
  playSfx("bossWave", 0.82);
}

function spawnMistBoneLine(boss: LiveBoss) {
  const count = Math.min(
    MIST_BONE_CONFIG.lineMaxCount,
    MIST_BONE_CONFIG.lineBaseCount + Math.max(0, boss.phase - 2),
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
