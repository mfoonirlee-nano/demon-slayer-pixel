import { DEAD_BELL_CONFIG, GROUND_Y, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { canAutoSpawnEntities } from "../../game/debug";
import type { BossSkillMode, DeadBellWaveTone } from "../../types/game-state";
import { spawnBossSummonEnemy, spawnEnemyById } from "../enemy";
import { hurtPlayer } from "../player";
import { bossCastDuration } from "./attackTiming";
import { bossAttackDamage, damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const RECOVERY_DRAG = 0.82;
const MOVE_STEERING_BASE = 0.045;
const MOVE_STEERING_PHASE = 0.012;
const MOVE_DRAG = 0.9;
const MOVE_MAX_SPEED_BASE = 3.2;
const MOVE_MAX_SPEED_PHASE = 0.35;
const SKILL_COOLDOWN_PHASE_REDUCTION = 18;
const DOUBLE_WAVE_RADIUS_BONUS = 34;
const DELAYED_BLADE_WARNING_SCALE = 0.55;
const COMBO_WAVE_RADIUS_BONUS = 46;
const COMBO_LOWER_BLADE_DELAY_BONUS = 18;
const PLAYER_BLADE_BOTTOM_SCALE = 1.4;
const BLADE_DAMAGE_BONUS = 2;
const DUET_COOLDOWN = 330;
const DUET_WAVE_DELAY_SCALE = 0.55;
const DUET_THIRD_WAVE_DELAY_BONUS = 18;
const DUET_WAVE_RADIUS_BONUS = 70;
const DUET_UPPER_BLADE_DELAY = 16;
const DUET_LOWER_BLADE_DELAY = 42;
const DUET_REPRISAL_DAMAGE_BONUS = 5;
const FIRST_PHASE = 1;
const DOUBLE_PATTERN_PHASE = 2;
const COMBO_PATTERN_PHASE = 3;
const AWAKENED_FINAL_PHASE = 4;
const AWAKENED_SUPPORT_SPECIALIST_INTERVAL = 2;
const BASE_PATTERN_SEQUENCES = {
  1: ["deadBellSingle"],
  2: ["deadBellDouble", "deadBellSingle"],
  3: ["deadBellCombo", "deadBellDouble", "deadBellSingle"],
  4: ["deadBellCombo", "deadBellDouble", "deadBellSingle"],
} as const satisfies Record<number, readonly BossSkillMode[]>;
const AWAKENED_PHASE_FOUR_SEQUENCE = [
  "deadBellCombo",
  "deadBellDouble",
  "deadBellSingle",
  "deadBellDuet",
] as const satisfies readonly BossSkillMode[];

export function updateDeadBellBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    updateDeadBellReprisal(boss);
    boss.recoveryTimer -= 1;
    boss.vx *= RECOVERY_DRAG;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
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
        boss.deadBellOffenseSequenceSnapshot = state.player.offenseActionSequence;
        boss.deadBellReprisalCueSequence = undefined;
        playSfx("bossDeadBellSilence");
      }
      return;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0 && boss.aiTimer <= 0) {
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
  boss.skillCd = deadBellSkillCooldown(boss);
  boss.vx = 0;
  boss.deadBellReprisalTimer = 0;
  boss.deadBellReprisalHit = false;
  boss.deadBellReprisalCueSequence = undefined;

  attemptDeadBellSupportSummon(boss);
  playSfx("bossDeadBellCast");
}

function nextDeadBellSkill(boss: LiveBoss) {
  if (boss.deadBellPatternPhase !== boss.phase) {
    boss.deadBellPatternPhase = boss.phase;
    boss.deadBellPatternStep = 0;
    boss.deadBellSupportStep = 0;
  }

  if (boss.awakened && boss.deadBellDuetPhase !== boss.phase) {
    boss.deadBellDuetPhase = boss.phase;
    return "deadBellDuet";
  }

  const phaseKey = Math.min(
    AWAKENED_FINAL_PHASE,
    Math.max(FIRST_PHASE, boss.phase),
  ) as keyof typeof BASE_PATTERN_SEQUENCES;
  const sequence = boss.awakened && boss.phase >= AWAKENED_FINAL_PHASE
    ? AWAKENED_PHASE_FOUR_SEQUENCE
    : BASE_PATTERN_SEQUENCES[phaseKey];
  const patternStep = boss.deadBellPatternStep ?? 0;
  boss.deadBellPatternStep = patternStep + 1;
  return sequence[patternStep % sequence.length];
}

function isDeadBellLongCast(skillMode: LiveBoss["skillMode"]) {
  return skillMode === "deadBellCombo" || skillMode === "deadBellDuet";
}

function deadBellSkillCooldown(boss: LiveBoss) {
  if (boss.skillMode === "deadBellDuet") return DUET_COOLDOWN;
  const standardCooldown = boss.skillMode === "deadBellCombo"
    ? DEAD_BELL_CONFIG.comboCooldown
    : Math.max(
      DEAD_BELL_CONFIG.minimumSkillCooldown,
      DEAD_BELL_CONFIG.skillCooldown - boss.phase * SKILL_COOLDOWN_PHASE_REDUCTION,
    );
  if (!boss.awakened) return standardCooldown;
  return Math.max(
    DEAD_BELL_CONFIG.awakenedMinimumSkillCooldown,
    standardCooldown - DEAD_BELL_CONFIG.awakenedCooldownReduction,
  );
}

function deadBellRecoveryFrames(boss: LiveBoss) {
  if (boss.skillMode === "deadBellDuet") {
    return DEAD_BELL_CONFIG.reprisalWarningFrames
      + DEAD_BELL_CONFIG.reprisalActiveFrames
      + DEAD_BELL_CONFIG.counterFrames;
  }
  if (boss.skillMode === "deadBellCombo") return DEAD_BELL_CONFIG.recoveryFrames;
  return DEAD_BELL_CONFIG.shortRecoveryFrames;
}

function updateDeadBellReprisal(boss: LiveBoss) {
  if (boss.skillMode !== "deadBellDuet" || (boss.deadBellReprisalTimer ?? 0) <= 0) return;

  const reprisalTimer = boss.deadBellReprisalTimer ?? 0;
  const reprisalActive = reprisalTimer <= DEAD_BELL_CONFIG.reprisalActiveFrames;
  const activeBoundary = reprisalTimer === DEAD_BELL_CONFIG.reprisalActiveFrames;
  if (!reprisalActive) {
    boss.deadBellOffenseSequenceSnapshot = state.player.offenseActionSequence;
  } else if (
    activeBoundary
    && boss.deadBellReprisalCueSequence !== state.player.offenseActionSequence
  ) {
    boss.deadBellReprisalCueSequence = state.player.offenseActionSequence;
    playSfx("bossDeadBellReprisal");
  }

  const offenseSequence = state.player.offenseActionSequence;
  const offenseStartedDuringActive = offenseSequence
    > (boss.deadBellOffenseSequenceSnapshot ?? 0);
  if (
    reprisalActive
    && !boss.deadBellReprisalHit
    && offenseStartedDuringActive
  ) {
    if (boss.deadBellReprisalCueSequence !== offenseSequence) {
      boss.deadBellReprisalCueSequence = offenseSequence;
      playSfx("bossDeadBellReprisal");
    }
    if (state.player.invincible > 0) {
      // Keep both clocks on this beat so startup invulnerability cannot erase a violation.
      boss.recoveryTimer += 1;
      return;
    }
    boss.deadBellReprisalHit = true;
    boss.deadBellReprisalTimer = 0;
    boss.recoveryTimer = Math.min(
      boss.recoveryTimer,
      DEAD_BELL_CONFIG.counterFrames + 1,
    );
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
    return;
  }

  boss.deadBellReprisalTimer = Math.max(0, reprisalTimer - 1);
  if (reprisalActive && boss.deadBellReprisalTimer === 0) {
    playSfx("bossDeadBellBreak");
  }
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
  spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius, "low");
  spawnDeadBellWave(
    boss,
    Math.floor(DEAD_BELL_CONFIG.delayedWaveFrames * DUET_WAVE_DELAY_SCALE),
    DEAD_BELL_CONFIG.waveMaxRadius + DOUBLE_WAVE_RADIUS_BONUS,
    "high",
  );
  if (boss.phase >= COMBO_PATTERN_PHASE) {
    spawnDeadBellWave(
      boss,
      DEAD_BELL_CONFIG.delayedWaveFrames + DUET_THIRD_WAVE_DELAY_BONUS,
      DEAD_BELL_CONFIG.waveMaxRadius + DUET_WAVE_RADIUS_BONUS,
      "low",
    );
  }
  if (boss.phase >= DOUBLE_PATTERN_PHASE) {
    const primaryLane = playerBladeLane();
    spawnDeadBellBlade(boss, primaryLane, DUET_UPPER_BLADE_DELAY);
    if (boss.phase >= COMBO_PATTERN_PHASE) {
      spawnDeadBellBlade(boss, oppositeBladeLane(primaryLane), DUET_LOWER_BLADE_DELAY);
    }
  }
}

export function spawnDeadBellWave(
  boss: LiveBoss,
  delay: number,
  maxRadius: number,
  tone: DeadBellWaveTone = "low",
) {
  state.deadBellWaves.push({
    x: boss.x + boss.w / 2,
    y: boss.y + boss.h / 2,
    radius: DEAD_BELL_CONFIG.waveStartRadius,
    maxRadius,
    thickness: DEAD_BELL_CONFIG.waveThickness,
    warningFrames: DEAD_BELL_CONFIG.waveWarningFrames,
    expandFrames: tone === "high"
      ? Math.floor(
        DEAD_BELL_CONFIG.waveExpandFrames * DEAD_BELL_CONFIG.highToneExpandScale,
      )
      : DEAD_BELL_CONFIG.waveExpandFrames,
    delay,
    elapsed: 0,
    frame: 0,
    tone,
    awakened: boss.awakened,
    damage: bossAttackDamage(
      DEAD_BELL_CONFIG.damageBase + boss.phase * DEAD_BELL_CONFIG.damagePhase,
    ),
    hitPlayer: false,
  });
}

export function playerBladeLane() {
  return clamp(
    state.player.y + state.player.h / 2,
    DEAD_BELL_CONFIG.upperBladeY,
    GROUND_Y - DEAD_BELL_CONFIG.bladeHitH * PLAYER_BLADE_BOTTOM_SCALE,
  );
}

function oppositeBladeLane(primaryLane: number) {
  const laneMidpoint = (DEAD_BELL_CONFIG.upperBladeY + DEAD_BELL_CONFIG.lowerBladeY) / 2;
  return primaryLane <= laneMidpoint
    ? DEAD_BELL_CONFIG.lowerBladeY
    : DEAD_BELL_CONFIG.upperBladeY;
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
    delay: Math.max(delay, DEAD_BELL_CONFIG.bladeWarningFrames),
    warningFrames: DEAD_BELL_CONFIG.bladeWarningFrames,
    elapsed: 0,
    frame: 0,
    life: DEAD_BELL_CONFIG.bladeLife,
    damage: bossAttackDamage(
      DEAD_BELL_CONFIG.damageBase
        + boss.phase * DEAD_BELL_CONFIG.damagePhase
        + BLADE_DAMAGE_BONUS,
    ),
  });
}

function attemptDeadBellSupportSummon(boss: LiveBoss) {
  if (boss.phase < COMBO_PATTERN_PHASE || boss.skillMode !== "deadBellCombo") return;

  // Each combo owns one support slot; a rejected slot waits for the next full cycle.
  const supportStep = boss.deadBellSupportStep ?? 0;
  boss.deadBellSupportStep = supportStep + 1;
  if (!canAutoSpawnEntities()) return;

  const usesAwakenedSpecialist = boss.awakened
    && supportStep % AWAKENED_SUPPORT_SPECIALIST_INTERVAL === 0;
  const spawned = usesAwakenedSpecialist
    ? spawnEnemyById(
      boss.phase === AWAKENED_FINAL_PHASE ? "warden" : "binder",
      "boss",
      "random_edge",
      { growthStage: "awakened" },
    )
    : spawnBossSummonEnemy();
  if (spawned) playSfx("bossSummon");
}
