import {
  BLOOD_MOON_CONFIG,
  BOSS_SKILL1_CONFIG,
  DEAD_BELL_CONFIG,
  FANG_GALE_CONFIG,
  LANTERN_EMBER_CONFIG,
  MIRROR_DREAM_CONFIG,
  MIST_BONE_CONFIG,
  SPIDER_STRING_CAGE_CONFIG,
  SPIDER_STRING_PILLAR_CONFIG,
  WIDTH,
} from "../../constants";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { ctx } from "../../rendering/context";
import type { BossSkillMode } from "../../types/game-state";
import {
  bossCastDuration,
  fangChainWindupFrames,
  spiderRushWindupFrames,
} from "./attackTiming";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import type { LiveBoss } from "./types";

type TelegraphPattern = "directional" | "area" | "radial" | "teleport";
type TelegraphSeverity = "quick" | "standard" | "heavy" | "ultimate" | "support" | "counter";
type BossTelegraphAttackId =
  | BossSkillMode
  | "spiderRush"
  | "mistBoneDart"
  | "fangGaleChain"
  | "fangGaleFollowupDash"
  | "deadBellReprisal";

export type BossAttackTelegraph = {
  attackId: BossTelegraphAttackId;
  pattern: TelegraphPattern;
  severity: TelegraphSeverity;
  reactionFrames: number;
  remainingFrames: number;
  progress: number;
  facing: number;
  targetX?: number;
};

const FULL_CIRCLE = Math.PI * 2;
const RELEASE_PULSE_START = 0.75;
const HALO_DASH_LENGTH = 9;
const HALO_DASH_GAP = 7;
const DIRECTION_DASH_LENGTH = 14;
const DIRECTION_DASH_GAP = 10;
const PROJECTILE_WARNING_DEFAULT_HEIGHT = 28;
const AIM_LINE_WIDTH = 3;
const AIM_INDICATOR_LENGTH = 92;
const GROUND_WARNING_RADIUS_Y = 10;
const TELEPORT_WARNING_RADIUS_Y = 14;
const TELEPORT_RADIUS_X_SCALE = 0.72;
const AREA_RADIUS_X_BASE_SCALE = 0.72;
const AREA_RADIUS_X_PROGRESS_SCALE = 0.28;
const PROJECTILE_WARNING_Y_SCALE = 0.38;
const SOURCE_HALO_CENTER_Y_SCALE = 0.42;
const SOURCE_HALO_PULSE_CYCLES = 3;
const SOURCE_HALO_HEIGHT_SCALE = 0.58;
const SOURCE_HALO_RADIUS_BASE_SCALE = 0.58;
const SOURCE_HALO_RADIUS_PROGRESS_SCALE = 0.12;
const SOURCE_HALO_PULSE_ALPHA = 0.16;
const SOURCE_HALO_ULTIMATE_LINE_WIDTH = 4;
const SOURCE_HALO_LINE_WIDTH = 3;
const SOURCE_HALO_X_SCALE = 0.72;
const SOURCE_HALO_ARC_SCALE = 0.82;
const WARNING_ALPHA_RELEASE_GAIN = 0.2;
const WARNING_ALPHA_BASE = 0.32;
const WARNING_ALPHA_PROGRESS_GAIN = 0.2;

const TELEGRAPH_STYLE: Record<TelegraphSeverity, { stroke: string; fill: string }> = {
  quick: { stroke: "#f0c36a", fill: "rgba(169, 73, 35, 0.13)" },
  standard: { stroke: "#eb8a55", fill: "rgba(154, 45, 38, 0.14)" },
  heavy: { stroke: "#e04c43", fill: "rgba(142, 24, 35, 0.16)" },
  ultimate: { stroke: "#ff3559", fill: "rgba(161, 13, 46, 0.2)" },
  support: { stroke: "#e4c46f", fill: "rgba(122, 89, 31, 0.12)" },
  counter: { stroke: "#ffe09a", fill: "rgba(166, 91, 31, 0.16)" },
};

export function resolveBossAttackTelegraphs(boss: LiveBoss): BossAttackTelegraph[] {
  if (boss.entering || (boss.phaseShiftTimer ?? 0) > 0) return [];

  const reprisalCue = resolveDeadBellReprisalCue(boss);
  if (reprisalCue) return [reprisalCue];

  if (boss.actionState === "windup") {
    if (boss.id === BOSS_ARCHETYPE_IDS.spiderString) {
      return [createCue({
        boss,
        attackId: "spiderRush",
        pattern: "directional",
        severity: "quick",
        reactionFrames: spiderRushWindupFrames(boss.phase),
        elapsedFrames: boss.actionTimer,
        facing: boss.castFacing,
      })];
    }
    if (boss.id === BOSS_ARCHETYPE_IDS.fangGale) {
      const reactionFrames = fangChainWindupFrames(boss.phase);
      return [createCue({
        boss,
        attackId: "fangGaleChain",
        pattern: "directional",
        severity: "quick",
        reactionFrames,
        elapsedFrames: reactionFrames - boss.castTimer,
      })];
    }
    return [];
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone && boss.actionState === "attack") {
    const shotCount = Math.min(
      MIST_BONE_CONFIG.attackMaxShots,
      Math.max(1, boss.phase),
    );
    const shotsFired = Math.min(shotCount, boss.comboStep ?? 0);
    if (shotsFired >= shotCount) return [];
    // comboStep advances on release, so anchor each new cue to the prior shot
    // instead of letting the first-shot countdown stay exhausted for the volley.
    const previousReleaseFrame = shotsFired === 0
      ? 0
      : MIST_BONE_CONFIG.attackReleaseFrame
        + (shotsFired - 1) * MIST_BONE_CONFIG.attackShotInterval;
    const nextReleaseFrame = MIST_BONE_CONFIG.attackReleaseFrame
      + shotsFired * MIST_BONE_CONFIG.attackShotInterval;
    const reactionFrames = nextReleaseFrame - previousReleaseFrame;
    return [createCue({
      boss,
      attackId: "mistBoneDart",
      pattern: "directional",
      severity: "quick",
      reactionFrames,
      elapsedFrames: boss.actionTimer - previousReleaseFrame,
    })];
  }

  if (boss.actionState !== "cast" || boss.castTimer <= 0) return [];
  const castSpec = resolveCastCueSpec(boss);
  if (!castSpec || castSpec.elapsedFrames > castSpec.reactionFrames) return [];
  return [createCue({ boss, ...castSpec })];
}

export function drawBossAttackTelegraphs() {
  const boss = state.boss;
  if (!ctx || !boss) return;

  for (const cue of resolveBossAttackTelegraphs(boss)) {
    drawSpatialCue(boss, cue);
    if (cue.attackId !== "fangGaleFollowupDash") drawSourceHalo(boss, cue);
  }
}

function resolveDeadBellReprisalCue(boss: LiveBoss) {
  const timer = boss.deadBellReprisalTimer ?? 0;
  const remainingFrames = timer - DEAD_BELL_CONFIG.reprisalActiveFrames;
  if (
    boss.id !== BOSS_ARCHETYPE_IDS.deadBell
    || boss.skillMode !== "deadBellDuet"
    || remainingFrames <= 0
  ) return null;

  return createCue({
    boss,
    attackId: "deadBellReprisal",
    pattern: "radial",
    severity: "counter",
    reactionFrames: DEAD_BELL_CONFIG.reprisalWarningFrames,
    elapsedFrames: DEAD_BELL_CONFIG.reprisalWarningFrames - remainingFrames,
  });
}

function resolveCastCueSpec(boss: LiveBoss) {
  const elapsedFrames = castElapsedFrames(boss);
  if (boss.id === BOSS_ARCHETYPE_IDS.spiderString) {
    if (boss.skillMode === "spiderStringCage") {
      return cueSpec(
        "spiderStringCage",
        "area",
        "ultimate",
        SPIDER_STRING_CAGE_CONFIG.warningFrames,
        elapsedFrames,
      );
    }
    if (boss.skillMode === "spiderStringPillars") {
      return cueSpec(
        "spiderStringPillars",
        "area",
        "heavy",
        SPIDER_STRING_PILLAR_CONFIG.spawnAtFrame,
        elapsedFrames,
      );
    }
    return cueSpec(
      "spiderString",
      "directional",
      "standard",
      BOSS_SKILL1_CONFIG.spawnAtFrame,
      elapsedFrames,
    );
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone) {
    return cueSpec(boss.skillMode, "area", "heavy", MIST_BONE_CONFIG.spawnAtFrame, elapsedFrames);
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) {
    const teleport = boss.skillMode === "mirrorAfterimage" || boss.skillMode === "mirrorTrueImageShift";
    const severity = boss.skillMode === "mirrorTrueImageShift" ? "ultimate" : "standard";
    const pattern = teleport ? "teleport" : boss.skillMode === "mirrorShard" ? "directional" : "area";
    return {
      ...cueSpec(boss.skillMode, pattern, severity, MIRROR_DREAM_CONFIG.spawnAtFrame, elapsedFrames),
      targetX: teleport && boss.mirrorTeleportTargetX !== undefined
        ? boss.mirrorTeleportTargetX + boss.w / 2
        : undefined,
    };
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.fangGale) {
    if (boss.skillMode !== "fangGaleDash" && !boss.skillEffectSpawned) {
      return cueSpec(
        boss.skillMode,
        "area",
        boss.skillMode === "fangGaleStorm" ? "ultimate" : "standard",
        FANG_GALE_CONFIG.spawnAtFrame,
        elapsedFrames,
      );
    }
    if (boss.skillMode !== "fangGaleDash") {
      // Fang's update records the wave spawn before decrementing castTimer; the
      // following rendered frame must begin a fresh cue for the committed dash.
      const followupStartFrame = FANG_GALE_CONFIG.spawnAtFrame + 1;
      return cueSpec(
        "fangGaleFollowupDash",
        "directional",
        "heavy",
        bossCastDuration(boss) - followupStartFrame,
        elapsedFrames - followupStartFrame,
      );
    }
    return cueSpec(
      boss.skillMode,
      "directional",
      "heavy",
      bossCastDuration(boss),
      elapsedFrames,
    );
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) {
    const awakened = boss.skillMode === "lanternAwakenedGrid";
    const support = boss.skillMode === "lanternLure" || boss.skillMode === "lanternBuff";
    return cueSpec(
      boss.skillMode,
      support ? "radial" : "area",
      awakened ? "ultimate" : support ? "support" : "heavy",
      awakened ? LANTERN_EMBER_CONFIG.awakenedSpawnAtFrame : LANTERN_EMBER_CONFIG.spawnAtFrame,
      elapsedFrames,
    );
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) {
    const longCast = boss.skillMode === "deadBellCombo" || boss.skillMode === "deadBellDuet";
    return cueSpec(
      boss.skillMode,
      "radial",
      boss.skillMode === "deadBellDuet" ? "ultimate" : "heavy",
      longCast ? DEAD_BELL_CONFIG.comboSpawnAtFrame : DEAD_BELL_CONFIG.spawnAtFrame,
      elapsedFrames,
    );
  }

  const finalCast = boss.skillMode === "bloodMoonManyFaces";
  const directional = boss.skillMode === "bloodMoonMirrorFang";
  return cueSpec(
    boss.skillMode,
    directional ? "directional" : "area",
    finalCast || boss.skillMode === "bloodMoonSixfold" ? "ultimate" : "heavy",
    finalCast ? BLOOD_MOON_CONFIG.finalSpawnAtFrame : BLOOD_MOON_CONFIG.spawnAtFrame,
    elapsedFrames,
  );
}

function castElapsedFrames(boss: LiveBoss) {
  return bossCastDuration(boss) - boss.castTimer;
}

function cueSpec(
  attackId: BossTelegraphAttackId,
  pattern: TelegraphPattern,
  severity: TelegraphSeverity,
  reactionFrames: number,
  elapsedFrames: number,
) {
  return { attackId, pattern, severity, reactionFrames, elapsedFrames };
}

function createCue(params: {
  boss: LiveBoss;
  attackId: BossTelegraphAttackId;
  pattern: TelegraphPattern;
  severity: TelegraphSeverity;
  reactionFrames: number;
  elapsedFrames: number;
  targetX?: number;
  facing?: number;
}): BossAttackTelegraph {
  const elapsedFrames = clamp(params.elapsedFrames, 0, params.reactionFrames);
  return {
    attackId: params.attackId,
    pattern: params.pattern,
    severity: params.severity,
    reactionFrames: params.reactionFrames,
    remainingFrames: params.reactionFrames - elapsedFrames,
    progress: elapsedFrames / Math.max(1, params.reactionFrames),
    facing: params.facing ?? (params.boss.castFacing || params.boss.facing),
    targetX: params.targetX,
  };
}

function drawSpatialCue(boss: LiveBoss, cue: BossAttackTelegraph) {
  if (!ctx) return;
  if (cue.pattern === "directional") {
    drawDirectionalCue(boss, cue);
    return;
  }
  if (cue.pattern === "area") return;

  const centerX = cue.pattern === "teleport" && cue.targetX !== undefined
    ? cue.targetX
    : boss.x + boss.w / 2;
  const centerY = boss.y + boss.h;
  const radiusX = cue.pattern === "teleport"
    ? boss.w * TELEPORT_RADIUS_X_SCALE
    : boss.w * (
      AREA_RADIUS_X_BASE_SCALE
      + cue.progress * AREA_RADIUS_X_PROGRESS_SCALE
    );
  const radiusY = cue.pattern === "teleport" ? TELEPORT_WARNING_RADIUS_Y : GROUND_WARNING_RADIUS_Y;
  drawGroundEllipse(cue, centerX, centerY, radiusX, radiusY);
}

function drawDirectionalCue(boss: LiveBoss, cue: BossAttackTelegraph) {
  if (!ctx) return;
  const style = TELEGRAPH_STYLE[cue.severity];
  const startX = cue.facing > 0 ? boss.x + boss.w : boss.x;
  const isDash = cue.attackId === "spiderRush"
    || cue.attackId.startsWith("fangGale");
  const endX = isDash
    ? cue.facing > 0 ? WIDTH : 0
    : startX + cue.facing * AIM_INDICATOR_LENGTH;
  const x = Math.min(startX, endX);
  const h = isDash ? boss.h : projectileWarningHeight(cue.attackId);
  const y = isDash ? boss.y : boss.y + boss.h * PROJECTILE_WARNING_Y_SCALE - h / 2;
  ctx.save();
  ctx.globalAlpha = warningAlpha(cue.progress);
  ctx.strokeStyle = style.stroke;
  ctx.setLineDash([DIRECTION_DASH_LENGTH, DIRECTION_DASH_GAP]);
  if (!isDash) {
    const centerY = y + h / 2;
    ctx.lineWidth = AIM_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(startX, centerY);
    ctx.lineTo(endX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }

  ctx.fillStyle = style.fill;
  ctx.fillRect(x, y, Math.abs(endX - startX), h);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.moveTo(startX, y + h);
  ctx.lineTo(endX, y + h);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function projectileWarningHeight(attackId: BossTelegraphAttackId) {
  if (attackId === "mistBoneDart") return MIST_BONE_CONFIG.dartHitH;
  if (attackId === "mirrorShard") return MIRROR_DREAM_CONFIG.shardHitH;
  if (attackId === "bloodMoonMirrorFang") return BLOOD_MOON_CONFIG.mirrorFangHitH;
  return PROJECTILE_WARNING_DEFAULT_HEIGHT;
}

function drawGroundEllipse(
  cue: BossAttackTelegraph,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
) {
  if (!ctx) return;
  const style = TELEGRAPH_STYLE[cue.severity];
  ctx.save();
  ctx.globalAlpha = warningAlpha(cue.progress);
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = 2;
  ctx.setLineDash([HALO_DASH_LENGTH, HALO_DASH_GAP]);
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, FULL_CIRCLE);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSourceHalo(boss: LiveBoss, cue: BossAttackTelegraph) {
  if (!ctx) return;
  const style = TELEGRAPH_STYLE[cue.severity];
  const centerX = boss.x + boss.w / 2;
  const centerY = boss.y + boss.h * SOURCE_HALO_CENTER_Y_SCALE;
  const pulse = cue.progress < RELEASE_PULSE_START
    ? 0
    : Math.sin(
      (cue.progress - RELEASE_PULSE_START)
        / (1 - RELEASE_PULSE_START)
        * Math.PI
        * SOURCE_HALO_PULSE_CYCLES,
    );
  const radius = Math.max(boss.w, boss.h * SOURCE_HALO_HEIGHT_SCALE) * (
    SOURCE_HALO_RADIUS_BASE_SCALE
    - cue.progress * SOURCE_HALO_RADIUS_PROGRESS_SCALE
  );
  ctx.save();
  ctx.globalAlpha = warningAlpha(cue.progress)
    + Math.max(0, pulse) * SOURCE_HALO_PULSE_ALPHA;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = cue.severity === "ultimate"
    ? SOURCE_HALO_ULTIMATE_LINE_WIDTH
    : SOURCE_HALO_LINE_WIDTH;
  ctx.setLineDash([HALO_DASH_LENGTH, HALO_DASH_GAP]);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radius * SOURCE_HALO_X_SCALE, radius, 0, 0, FULL_CIRCLE);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(
    centerX,
    centerY,
    radius * SOURCE_HALO_ARC_SCALE,
    -Math.PI / 2,
    -Math.PI / 2 + FULL_CIRCLE * cue.progress,
  );
  ctx.stroke();
  ctx.restore();
}

function warningAlpha(progress: number) {
  const releaseGain = progress >= RELEASE_PULSE_START
    ? (progress - RELEASE_PULSE_START)
      / (1 - RELEASE_PULSE_START)
      * WARNING_ALPHA_RELEASE_GAIN
    : 0;
  return WARNING_ALPHA_BASE + progress * WARNING_ALPHA_PROGRESS_GAIN + releaseGain;
}
