import { BLOOD_MOON_CONFIG, GROUND_Y, WIDTH } from "../../constants";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { bossCastDuration } from "./attackTiming";
import {
  BLOOD_MOON_FACES,
  cueBloodMoonFace,
  releaseBloodMoonFace,
  spawnBloodMoonLanternBeat,
  spawnBloodMoonMirrorTrial,
  spawnBloodMoonTrail,
} from "./bloodMoonPatterns";
import { clearBloodMoonHazards } from "./bloodMoonHazards";
import { damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const MANY_FACES_PHASE = 5;
const SIXFOLD_PHASE = 4;
const LANTERN_BELL_PHASE = 3;
const MIRROR_FANG_PHASE = 2;
const FINAL_CAST_SFX_PITCH = 0.78;
const STANDARD_CAST_SFX_PITCH = 0.88;
const MIN_SKILL_COOLDOWN = 142;
const SKILL_COOLDOWN_PHASE_REDUCTION = 12;
const MOVE_COAST_DRAG = 0.84;
const FINAL_BREAK_SFX_PITCH = 0.72;

export function updateBloodMoonBoss(boss: LiveBoss) {
  if ((boss.phaseShiftTimer ?? 0) > 0) {
    updateBloodMoonPhaseShift(boss);
    return;
  }

  if (boss.recoveryTimer > 0) {
    updateBloodMoonRecovery(boss);
    return;
  }

  if (boss.castTimer > 0) {
    updateBloodMoonCast(boss);
    if (boss.skillMode !== "bloodMoonManyFaces") damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0 && boss.aiTimer <= 0) {
    startBloodMoonCast(boss);
    return;
  }

  moveBloodMoonBoss(boss);
  damagePlayerOnContact(boss);
}

export function beginBloodMoonPhaseShift(boss: LiveBoss) {
  clearBloodMoonHazards({ clearSummons: true });
  boss.castTimer = 0;
  boss.recoveryTimer = 0;
  boss.skillEffectSpawned = false;
  boss.skillHitDone = false;
  boss.bloodMoonTrailSamples = [];
  boss.bloodMoonActiveFace = undefined;
  boss.bloodMoonFinalCueStep = undefined;
  boss.bloodMoonFinalAttackStep = undefined;
  boss.bloodMoonExposed = false;
  boss.phaseShiftTimer = BLOOD_MOON_CONFIG.phaseShiftFrames;
  boss.actionState = "windup";
  boss.actionTimer = 0;
  boss.vx = 0;
}

function updateBloodMoonPhaseShift(boss: LiveBoss) {
  boss.phaseShiftTimer = Math.max(0, (boss.phaseShiftTimer ?? 0) - 1);
  boss.vx *= BLOOD_MOON_CONFIG.drag;
  if ((boss.phaseShiftTimer ?? 0) > 0) return;

  boss.actionState = "move";
  boss.actionTimer = 0;
  boss.skillCd = Math.max(boss.skillCd, BLOOD_MOON_CONFIG.phaseEntryCooldown);
  boss.aiTimer = Math.max(boss.aiTimer, BLOOD_MOON_CONFIG.phaseEntryCooldown);
}

function updateBloodMoonRecovery(boss: LiveBoss) {
  boss.recoveryTimer -= 1;
  boss.vx *= BLOOD_MOON_CONFIG.drag;

  if (
    boss.skillMode === "bloodMoonManyFaces"
    && !boss.bloodMoonExposed
    && boss.recoveryTimer <= BLOOD_MOON_CONFIG.finalExposureFrames
  ) {
    clearBloodMoonHazards();
    boss.bloodMoonExposed = true;
    playSfx("bossDeadBellBreak", FINAL_BREAK_SFX_PITCH);
  }

  if (boss.recoveryTimer > 0) return;
  boss.actionState = "move";
  boss.actionTimer = 0;
  boss.bloodMoonExposed = false;
}

function updateBloodMoonCast(boss: LiveBoss) {
  boss.vx = 0;
  const castDuration = bossCastDuration(boss);
  const framesSinceCastStart = castDuration - boss.castTimer;

  if (boss.skillMode === "bloodMoonSpiderMist") {
    sampleBloodMoonTrail(boss, framesSinceCastStart);
  } else if (boss.skillMode === "bloodMoonManyFaces") {
    updateManyFacesRelay(boss, framesSinceCastStart);
  }

  boss.castTimer -= 1;
  if (
    boss.skillMode !== "bloodMoonManyFaces"
    && !boss.skillEffectSpawned
    && framesSinceCastStart >= BLOOD_MOON_CONFIG.spawnAtFrame
  ) {
    boss.skillEffectSpawned = true;
    spawnBloodMoonPattern(boss);
  }
  if (boss.castTimer > 0) return;

  boss.actionState = "recover";
  boss.actionTimer = 0;
  boss.recoveryTimer = boss.skillMode === "bloodMoonManyFaces"
    ? BLOOD_MOON_CONFIG.finalSettleFrames
      + BLOOD_MOON_CONFIG.finalExposureFrames
    : BLOOD_MOON_CONFIG.recoveryFrames;
  boss.bloodMoonExposed = false;
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
  boss.bloodMoonExposed = false;

  prepareBloodMoonPattern(boss);
  playSfx(
    "bossCast",
    boss.skillMode === "bloodMoonManyFaces"
      ? FINAL_CAST_SFX_PITCH
      : STANDARD_CAST_SFX_PITCH,
  );
}

function prepareBloodMoonPattern(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonSpiderMist") {
    boss.bloodMoonTrailSamples = [];
    return;
  }
  if (boss.skillMode === "bloodMoonLanternBell") {
    if (boss.bloodMoonLanternPhase !== boss.phase) {
      boss.bloodMoonLanternPhase = boss.phase;
      boss.bloodMoonLanternStep = 0;
    }
    return;
  }
  if (boss.skillMode === "bloodMoonSixfold") {
    if (boss.bloodMoonSixfoldPhase !== boss.phase) {
      boss.bloodMoonSixfoldPhase = boss.phase;
      boss.bloodMoonSixfoldStep = 0;
    }
    const step = boss.bloodMoonSixfoldStep ?? 0;
    const face = BLOOD_MOON_FACES[step % BLOOD_MOON_FACES.length];
    boss.bloodMoonSixfoldStep = step + 1;
    boss.bloodMoonActiveFace = face;
    cueBloodMoonFace(boss, face);
    return;
  }
  if (boss.skillMode === "bloodMoonManyFaces") {
    boss.bloodMoonFinalCueStep = 0;
    boss.bloodMoonFinalAttackStep = 0;
    boss.bloodMoonActiveFace = undefined;
  }
}

function nextBloodMoonSkill(boss: LiveBoss) {
  if (boss.phase >= MANY_FACES_PHASE) return "bloodMoonManyFaces";
  if (boss.phase === SIXFOLD_PHASE) return "bloodMoonSixfold";
  if (boss.phase === LANTERN_BELL_PHASE) return "bloodMoonLanternBell";
  if (boss.phase === MIRROR_FANG_PHASE) return "bloodMoonMirrorFang";
  return "bloodMoonSpiderMist";
}

function bloodMoonSkillCooldown(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonManyFaces") {
    return BLOOD_MOON_CONFIG.finalSkillCooldown;
  }
  return Math.max(
    MIN_SKILL_COOLDOWN,
    BLOOD_MOON_CONFIG.skillCooldown
      - boss.phase * SKILL_COOLDOWN_PHASE_REDUCTION,
  );
}

function sampleBloodMoonTrail(boss: LiveBoss, framesSinceCastStart: number) {
  if (!BLOOD_MOON_CONFIG.trailSampleFrames.some(
    (sampleFrame) => sampleFrame === framesSinceCastStart,
  )) return;
  const samples = boss.bloodMoonTrailSamples ?? [];
  samples.push({
    x: state.player.x + state.player.w / 2,
    surfaceY: state.player.onPlatform?.y ?? GROUND_Y,
  });
  boss.bloodMoonTrailSamples = samples;
}

function spawnBloodMoonPattern(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonMirrorFang") {
    spawnBloodMoonMirrorTrial(boss);
    return;
  }
  if (boss.skillMode === "bloodMoonLanternBell") {
    const step = boss.bloodMoonLanternStep ?? 0;
    spawnBloodMoonLanternBeat(boss, step);
    boss.bloodMoonLanternStep = step + 1;
    return;
  }
  if (boss.skillMode === "bloodMoonSixfold") {
    const face = boss.bloodMoonActiveFace ?? BLOOD_MOON_FACES[0];
    releaseBloodMoonFace(boss, face, BLOOD_MOON_CONFIG.reviewDamageScale);
    return;
  }
  spawnBloodMoonTrail(boss, boss.bloodMoonTrailSamples ?? []);
}

function updateManyFacesRelay(boss: LiveBoss, framesSinceCastStart: number) {
  let cueStep = boss.bloodMoonFinalCueStep ?? 0;
  while (
    cueStep < BLOOD_MOON_FACES.length
    && framesSinceCastStart >= cueStep * BLOOD_MOON_CONFIG.finalCueInterval
  ) {
    cueBloodMoonFace(boss, BLOOD_MOON_FACES[cueStep]);
    cueStep += 1;
  }
  boss.bloodMoonFinalCueStep = cueStep;

  let attackStep = boss.bloodMoonFinalAttackStep ?? 0;
  while (
    attackStep < BLOOD_MOON_FACES.length
    && framesSinceCastStart >= attackStep * BLOOD_MOON_CONFIG.finalCueInterval
      + BLOOD_MOON_CONFIG.finalAttackOffset
  ) {
    const face = BLOOD_MOON_FACES[attackStep];
    boss.bloodMoonActiveFace = face;
    releaseBloodMoonFace(boss, face, BLOOD_MOON_CONFIG.finalDamageScale);
    attackStep += 1;
  }
  boss.bloodMoonFinalAttackStep = attackStep;
  boss.skillEffectSpawned = attackStep >= BLOOD_MOON_FACES.length;
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
    -(BLOOD_MOON_CONFIG.maxVelocityBase
      + boss.phase * BLOOD_MOON_CONFIG.maxVelocityPhase),
    BLOOD_MOON_CONFIG.maxVelocityBase
      + boss.phase * BLOOD_MOON_CONFIG.maxVelocityPhase,
  );
  boss.x = clamp(boss.x + boss.vx, 0, WIDTH - boss.w);
}
