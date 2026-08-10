import { GROUND_Y, MIST_BONE_CONFIG, WIDTH } from "../../constants";
import { recordCollisionDebugRect } from "../../game/collisionDebug";
import { canAutoSpawnEntities } from "../../game/debug";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp, rectsOverlap } from "../../game/utils";
import type { BossSkillMode } from "../../types/game-state";
import { spawnBossSummonEnemy, spawnEnemyById } from "../enemy";
import { bossAttackDamage, damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const RETREAT_PHASE_FORCE = 0.006;
const STEERING_PHASE_FORCE = 0.004;
const MOVE_COAST_DRAG = 0.86;
const MAX_VELOCITY_PHASE_BONUS = 0.18;
const ATTACK_SFX_PITCH = 1.06;
const DART_SFX_PITCH = 1.08;
const CAST_SFX_PITCH = 0.92;
const LINE_PHASE = 2;
const COOLDOWN_PHASE_REDUCTION = 12;
const CAGE_MIN_COOLDOWN = 176;
const CAGE_COOLDOWN_BONUS = 32;
const LINE_MIN_COOLDOWN = 156;
const SPIKE_MIN_COOLDOWN = 142;
const SPIKE_COOLDOWN_BONUS = 18;
const PATTERN_SFX_PITCH = 0.82;
const BASE_PATTERN_SEQUENCE = ["mistBoneLine", "mistBoneSpike"] as const satisfies readonly BossSkillMode[];
const AWAKENED_PATTERN_SEQUENCE = [
  "mistBoneCage",
  "mistBoneSpike",
  "mistBoneLine",
] as const satisfies readonly BossSkillMode[];

export function updateMistBoneBoss(boss: LiveBoss) {
  if (boss.actionState === "dash" && boss.skillMode === "mistBoneLine") {
    updateMistBoneChase(boss);
    return;
  }

  if (boss.actionState === "attack") {
    updateMistBoneAttack(boss);
    return;
  }

  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= MIST_BONE_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    if (!isMistBoneChase(boss)) damagePlayerOnContact(boss);
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
      if (isMistBoneChase(boss)) {
        startMistBoneChase(boss);
        return;
      }
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

  if (shouldStartMistBoneAttack(boss)) {
    startMistBoneAttack(boss);
    return;
  }

  moveMistBoneBoss(boss);
  damagePlayerOnContact(boss);
}

function updateMistBoneAttack(boss: LiveBoss) {
  boss.vx = 0;
  const shotCount = Math.min(MIST_BONE_CONFIG.attackMaxShots, Math.max(1, boss.phase));
  const shotsFired = boss.comboStep ?? 0;
  const nextReleaseFrame = MIST_BONE_CONFIG.attackReleaseFrame
    + shotsFired * MIST_BONE_CONFIG.attackShotInterval;

  if (shotsFired < shotCount && boss.actionTimer >= nextReleaseFrame) {
    spawnMistBoneDart(boss);
    boss.comboStep = shotsFired + 1;
  }

  if (boss.actionTimer >= MIST_BONE_CONFIG.attackDuration) {
    boss.actionState = "move";
    boss.actionTimer = 0;
    boss.comboStep = undefined;
  }
}

function shouldStartMistBoneAttack(boss: LiveBoss) {
  if (boss.aiTimer > 0) return false;
  const playerCenter = state.player.x + state.player.w / 2;
  const bossCenter = boss.x + boss.w / 2;
  const distance = Math.abs(playerCenter - bossCenter);
  return distance >= MIST_BONE_CONFIG.attackMinDistance
    && distance <= MIST_BONE_CONFIG.attackMaxDistance;
}

function startMistBoneAttack(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.actionState = "attack";
  boss.actionTimer = 0;
  boss.comboStep = 0;
  boss.aiTimer = Math.max(
    MIST_BONE_CONFIG.attackMinCooldown,
    MIST_BONE_CONFIG.attackCooldown
      - Math.max(0, boss.phase - 1) * MIST_BONE_CONFIG.attackCooldownPhaseReduction,
  );
  boss.vx = 0;
  playSfx("bossMistBoneCast", ATTACK_SFX_PITCH);
}

function spawnMistBoneDart(boss: LiveBoss) {
  const centerX = boss.x + boss.w / 2
    + boss.castFacing * MIST_BONE_CONFIG.dartSpawnOffsetX;
  const centerY = boss.y + boss.h * MIST_BONE_CONFIG.dartSpawnYScale;
  state.projectiles.push({
    kind: "bossBone",
    x: centerX - MIST_BONE_CONFIG.dartHitW / 2,
    y: centerY - MIST_BONE_CONFIG.dartHitH / 2,
    w: MIST_BONE_CONFIG.dartHitW,
    h: MIST_BONE_CONFIG.dartHitH,
    vx: boss.castFacing * (MIST_BONE_CONFIG.dartSpeed + boss.phase * MIST_BONE_CONFIG.dartSpeedPhase),
    vy: MIST_BONE_CONFIG.dartVy,
    life: MIST_BONE_CONFIG.dartLife,
    damage: bossAttackDamage(
      MIST_BONE_CONFIG.dartDamageBase + boss.phase * MIST_BONE_CONFIG.dartDamagePhase,
    ),
    frame: 0,
    elapsed: 0,
  });
  playSfx("bossMistBoneDart", DART_SFX_PITCH);
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
  boss.comboStep = undefined;
  boss.skillHitDone = false;
  boss.mistBoneChaseFacing = undefined;
  boss.skillCd = mistBoneSkillCooldown(boss.skillMode, boss.phase);
  boss.vx = 0;

  playSfx("bossMistBoneCast", CAST_SFX_PITCH);
}

function nextMistBoneSkill(boss: LiveBoss): BossSkillMode {
  if (!boss.awakened && boss.phase < LINE_PHASE) return "mistBoneSpike";

  const sequence = boss.awakened ? AWAKENED_PATTERN_SEQUENCE : BASE_PATTERN_SEQUENCE;
  const patternStep = boss.mistBonePatternStep ?? 0;
  boss.mistBonePatternStep = patternStep + 1;
  return sequence[patternStep % sequence.length] as BossSkillMode;
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
    spawnMistBoneThinFogAtPlayer();
    spawnMistBoneSpikeAtPlayer(boss, 0);
  }
  playSfx("bossMistBoneWarning", PATTERN_SFX_PITCH);
}

function spawnMistBoneThinFogAtPlayer() {
  state.mistBoneFogs.push({
    kind: "thin",
    x: state.player.x + state.player.w / 2,
    y: state.player.onPlatform?.y ?? GROUND_Y,
    radiusX: MIST_BONE_CONFIG.thinFogRadiusX,
    radiusY: MIST_BONE_CONFIG.thinFogRadiusY,
    life: MIST_BONE_CONFIG.thinFogLife,
    maxLife: MIST_BONE_CONFIG.thinFogLife,
    elapsed: 0,
  });
}

function spawnMistBoneLine(boss: LiveBoss) {
  const count = Math.min(
    MIST_BONE_CONFIG.lineMaxCount,
    MIST_BONE_CONFIG.lineBaseCount + Math.max(0, boss.phase - LINE_PHASE),
  );
  const playerCenter = state.player.x + state.player.w / 2;
  const half = (count - 1) / 2;
  const toPlayer = playerCenter - (boss.x + boss.w / 2);
  boss.mistBoneChaseFacing = toPlayer >= 0 ? 1 : -1;
  spawnMistBoneThinFogAtPlayer();

  for (let i = 0; i < count; i += 1) {
    const centerX = playerCenter + (i - half) * MIST_BONE_CONFIG.lineSpacing;
    spawnMistBoneSpike(boss, centerX, Math.abs(i - half) * MIST_BONE_CONFIG.spikeDelayStep);
  }
}

function spawnMistBoneCage(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const half = (MIST_BONE_CONFIG.cageCount - 1) / 2;

  state.mistBoneFogs.push({
    kind: "burial",
    x: playerCenter,
    y: state.player.onPlatform?.y ?? GROUND_Y,
    radiusX: MIST_BONE_CONFIG.burialFogRadiusX,
    radiusY: MIST_BONE_CONFIG.burialFogRadiusY,
    life: MIST_BONE_CONFIG.burialFogLife,
    maxLife: MIST_BONE_CONFIG.burialFogLife,
    elapsed: 0,
  });

  for (let i = 0; i < MIST_BONE_CONFIG.cageCount; i += 1) {
    const centerX = playerCenter + (i - half) * MIST_BONE_CONFIG.cageSpacing;
    const inwardDelay = (half - Math.abs(i - half)) * MIST_BONE_CONFIG.spikeDelayStep;
    spawnMistBoneSpike(boss, centerX, inwardDelay);
  }

  spawnAwakenedMistBoneSupport(boss);
}

function spawnAwakenedMistBoneSupport(boss: LiveBoss) {
  if (
    !boss.awakened
    || boss.phase < MIST_BONE_CONFIG.supportMinPhase
    || !canAutoSpawnEntities()
  ) return;
  const spawnedWarden = spawnEnemyById(
    "warden",
    "boss",
    "random_edge",
    { growthStage: "awakened" },
  );
  if (!spawnedWarden) return;

  if (!spawnBossSummonEnemy()) {
    spawnEnemyById(
      "chaser",
      "boss",
      "random_edge",
      { growthStage: "awakened" },
    );
  }
  playSfx("bossSummon");
}

function isMistBoneChase(boss: LiveBoss) {
  return boss.skillMode === "mistBoneLine"
    && boss.phase >= MIST_BONE_CONFIG.chaseMinPhase;
}

function startMistBoneChase(boss: LiveBoss) {
  const chaseFacing = boss.mistBoneChaseFacing ?? boss.castFacing;
  boss.castFacing = chaseFacing;
  boss.facing = chaseFacing;
  boss.actionState = "dash";
  boss.actionTimer = 0;
  boss.aiTimer = MIST_BONE_CONFIG.chaseFrames;
  boss.skillHitDone = false;
  boss.vx = chaseFacing * MIST_BONE_CONFIG.chaseSpeed;
  playSfx("bossMistBoneCharge");
}

function updateMistBoneChase(boss: LiveBoss) {
  const nextX = boss.x + boss.vx;
  boss.x = clamp(nextX, 0, WIDTH - boss.w);
  if (boss.x !== nextX) boss.aiTimer = 0;

  recordCollisionDebugRect(boss, "enemyAttack");
  if (!boss.skillHitDone && rectsOverlap(state.player, boss)) {
    boss.skillHitDone = true;
    damagePlayerOnContact(boss);
  }

  if (boss.aiTimer > 0) return;
  boss.actionState = "recover";
  boss.actionTimer = 0;
  boss.recoveryTimer = MIST_BONE_CONFIG.chaseRecoveryFrames;
  boss.vx = 0;
}

export function spawnMistBoneSpikeAtPlayer(boss: LiveBoss, delay: number) {
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
    damage: bossAttackDamage(
      MIST_BONE_CONFIG.damageBase + boss.phase * MIST_BONE_CONFIG.damagePhase,
    ),
    hitPlayer: false,
  });
}
