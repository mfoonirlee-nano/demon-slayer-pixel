import {
  GROUND_Y,
  SPIDER_STRING_CAGE_CONFIG,
  SPIDER_STRING_ULTIMATE_PILLAR_SHEET,
  WIDTH,
} from "../../constants";
import { recordCollisionDebugRect } from "../../game/collisionDebug";
import { state } from "../../game/state";
import { clamp, rectsOverlap } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type {
  SpiderStringCagePulseKind,
  SpiderStringCageState,
} from "../../types/game-state";
import { hurtPlayer } from "../player";
import { bossArchetypeForId } from "./registry";
import { bossAttackDamage } from "./shared";
import type { LiveBoss } from "./types";

type CagePillarDirection = "up" | "down";
type CagePillarRect = { x: number; y: number; w: number; h: number };

const FULL_CIRCLE = Math.PI * 2;
const WARNING_DASH_LENGTH = 8;
const WARNING_LINE_WIDTH = 2;
const WARNING_RADIUS_X = 38;
const WARNING_RADIUS_Y = 9;
const SIDE_SAFE_LANE_MIN = 1;
const SIDE_SAFE_LANE_MAX = SPIDER_STRING_CAGE_CONFIG.laneCount
  - SPIDER_STRING_CAGE_CONFIG.safeLaneCount
  - 1;
const PILLAR_ACTIVE_SPRITE_FRAMES = SPIDER_STRING_ULTIMATE_PILLAR_SHEET.count
  - SPIDER_STRING_CAGE_CONFIG.warningSpriteFrames;
const PULSE_ACTIVE_FRAMES = PILLAR_ACTIVE_SPRITE_FRAMES
  * SPIDER_STRING_CAGE_CONFIG.effectFrameDuration;

export function spawnSpiderStringCageEffect(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  const damage = bossAttackDamage(
    (archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase)
      * SPIDER_STRING_CAGE_CONFIG.damageMultiplier,
  );
  const groundSafeLaneStart = firstSafeLaneStart();
  const airSafeLaneStart = shiftSafeGapTowardCenter(groundSafeLaneStart);
  const sideSafeLaneStart = clamp(
    shiftSafeGapTowardCenter(airSafeLaneStart),
    SIDE_SAFE_LANE_MIN,
    SIDE_SAFE_LANE_MAX,
  );
  // Internal adjacent gaps keep hazards on both sides without creating a static safe pocket.
  const alternateSideSafeLaneStart = sideSafeLaneStart
    <= SPIDER_STRING_CAGE_CONFIG.laneCount / 2
    ? sideSafeLaneStart + 1
    : sideSafeLaneStart - 1;

  const pulseSpecs = [
    ...SPIDER_STRING_CAGE_CONFIG.groundPulseStartFrames.map(
      (delay) => createPulseSpec("ground", delay, groundSafeLaneStart),
    ),
    ...SPIDER_STRING_CAGE_CONFIG.airPulseStartFrames.map(
      (delay) => createPulseSpec("air", delay, airSafeLaneStart),
    ),
    ...SPIDER_STRING_CAGE_CONFIG.sidePulseStartFrames.map((delay, index) => (
      createPulseSpec(
        "sides",
        delay,
        Math.floor(index / 2) % 2 === 0
          ? sideSafeLaneStart
          : alternateSideSafeLaneStart,
      )
    )),
  ];

  state.spiderStringCages.length = 0;
  state.spiderStringCages.push(...pulseSpecs.map((spec, pulseIndex) => ({
    ...spec,
    pulseIndex,
    elapsed: 0,
    damage,
    hitPlayer: false,
  })));
}

export function updateSpiderStringCageEffects() {
  for (let index = state.spiderStringCages.length - 1; index >= 0; index -= 1) {
    const pulse = state.spiderStringCages[index];
    if (pulse.delay > 0) {
      pulse.delay -= 1;
      continue;
    }

    pulse.elapsed += 1;
    const activeElapsed = cagePillarActiveElapsed(pulse);
    if (activeElapsed >= PULSE_ACTIVE_FRAMES) {
      state.spiderStringCages.splice(index, 1);
      continue;
    }

    const frame = cagePillarFrame(pulse, activeElapsed);
    if (!isCagePillarHitFrame(frame)) continue;

    let overlapsPlayer = false;
    visitDangerPillars(pulse, (pillar) => {
      recordCollisionDebugRect(pillar, "enemyAttack");
      if (rectsOverlap(state.player, pillar)) overlapsPlayer = true;
    });
    if (pulse.hitPlayer || !overlapsPlayer) continue;

    pulse.hitPlayer = true;
    const hpBefore = state.player.hp;
    const playerCenterX = state.player.x + state.player.w / 2;
    hurtPlayer(pulse.damage, playerCenterX - safeGapCenterX(pulse));
    if (state.player.hp < hpBefore) {
      state.player.spiderSilkSlowTimer = Math.max(
        state.player.spiderSilkSlowTimer,
        SPIDER_STRING_CAGE_CONFIG.slowFrames,
      );
    }
  }
}

export function drawSpiderStringCageEffects() {
  if (!ctx || !SPIDER_STRING_ULTIMATE_PILLAR_SHEET.image) return;

  for (const pulse of state.spiderStringCages) {
    if (pulse.delay > 0 || pulse.elapsed <= 0) continue;
    const frame = cagePillarFrame(pulse, cagePillarActiveElapsed(pulse));
    const isWarning = pulse.elapsed <= SPIDER_STRING_CAGE_CONFIG.warningFrames;
    const warningProgress = clamp(
      pulse.elapsed / SPIDER_STRING_CAGE_CONFIG.warningFrames,
      0,
      1,
    );

    ctx.save();
    if (isWarning) {
      ctx.globalAlpha *= SPIDER_STRING_CAGE_CONFIG.warningAlphaBase
        + warningProgress * SPIDER_STRING_CAGE_CONFIG.warningAlphaScale;
    }
    visitDangerPillars(pulse, (pillar, direction) => {
      drawCagePillar(pillar, direction, frame);
      if (isWarning) drawCagePillarWarning(pillar, direction);
    });
    ctx.restore();
  }
}

function createPulseSpec(
  kind: SpiderStringCagePulseKind,
  delay: number,
  safeLaneStart: number,
) {
  return { kind, delay, safeLaneStart };
}

function firstSafeLaneStart() {
  const laneW = WIDTH / SPIDER_STRING_CAGE_CONFIG.laneCount;
  const maxSafeLaneStart = SPIDER_STRING_CAGE_CONFIG.laneCount
    - SPIDER_STRING_CAGE_CONFIG.safeLaneCount;
  const playerLeft = state.player.x;
  const playerRight = state.player.x + state.player.w;
  const playerCenterX = state.player.x + state.player.w / 2;
  const playerLane = clamp(
    Math.floor(playerCenterX / laneW),
    0,
    SPIDER_STRING_CAGE_CONFIG.laneCount - 1,
  );
  let closestSafeLaneStart = Math.min(playerLane, maxSafeLaneStart);
  let closestDistance = Number.POSITIVE_INFINITY;

  // Real hitbox bounds keep a player who straddles a lane boundary fully inside the first gap.
  for (let safeLaneStart = 0; safeLaneStart <= maxSafeLaneStart; safeLaneStart += 1) {
    const corridor = safeCorridorBounds(safeLaneStart, laneW);
    if (playerLeft < corridor.left || playerRight > corridor.right) continue;

    const distance = Math.abs(playerCenterX - safeGapCenterForLane(safeLaneStart, laneW));
    if (distance >= closestDistance) continue;
    closestSafeLaneStart = safeLaneStart;
    closestDistance = distance;
  }

  return closestSafeLaneStart;
}

function safeCorridorBounds(safeLaneStart: number, laneW: number) {
  const laneInset = (laneW - SPIDER_STRING_CAGE_CONFIG.hitW) / 2;
  const safeLaneEnd = safeLaneStart + SPIDER_STRING_CAGE_CONFIG.safeLaneCount;
  return {
    left: safeLaneStart === 0 ? 0 : safeLaneStart * laneW - laneInset,
    right: safeLaneEnd >= SPIDER_STRING_CAGE_CONFIG.laneCount
      ? WIDTH
      : safeLaneEnd * laneW + laneInset,
  };
}

function shiftSafeGapTowardCenter(safeLaneStart: number) {
  const maxSafeLaneStart = SPIDER_STRING_CAGE_CONFIG.laneCount
    - SPIDER_STRING_CAGE_CONFIG.safeLaneCount;
  const gapCenterLane = safeLaneStart
    + (SPIDER_STRING_CAGE_CONFIG.safeLaneCount - 1) / 2;
  const fieldCenterLane = (SPIDER_STRING_CAGE_CONFIG.laneCount - 1) / 2;
  // A one-lane shift preserves one overlapping safe lane for the next pulse.
  if (gapCenterLane < fieldCenterLane) return Math.min(maxSafeLaneStart, safeLaneStart + 1);
  if (gapCenterLane > fieldCenterLane) return Math.max(0, safeLaneStart - 1);
  return safeLaneStart;
}

function cagePillarFrame(pulse: SpiderStringCageState, activeElapsed: number) {
  if (activeElapsed < 0) {
    return Math.min(
      SPIDER_STRING_CAGE_CONFIG.warningSpriteFrames - 1,
      Math.floor(
        Math.max(0, pulse.elapsed - 1)
          * SPIDER_STRING_CAGE_CONFIG.warningSpriteFrames
          / SPIDER_STRING_CAGE_CONFIG.warningFrames,
      ),
    );
  }

  return Math.min(
    SPIDER_STRING_ULTIMATE_PILLAR_SHEET.count - 1,
    SPIDER_STRING_CAGE_CONFIG.warningSpriteFrames
      + Math.floor(activeElapsed / SPIDER_STRING_CAGE_CONFIG.effectFrameDuration),
  );
}

function cagePillarActiveElapsed(pulse: SpiderStringCageState) {
  return pulse.elapsed - SPIDER_STRING_CAGE_CONFIG.warningFrames - 1;
}

function isCagePillarHitFrame(frame: number) {
  return frame >= SPIDER_STRING_CAGE_CONFIG.hitStartEffectFrame
    && frame < SPIDER_STRING_CAGE_CONFIG.hitEndEffectFrame;
}

function visitDangerPillars(
  pulse: SpiderStringCageState,
  visit: (pillar: CagePillarRect, direction: CagePillarDirection) => void,
) {
  const laneW = WIDTH / SPIDER_STRING_CAGE_CONFIG.laneCount;
  for (let lane = 0; lane < SPIDER_STRING_CAGE_CONFIG.laneCount; lane += 1) {
    if (isSafeLane(pulse, lane)) continue;
    const pillar = {
      x: lane * laneW + (laneW - SPIDER_STRING_CAGE_CONFIG.hitW) / 2,
      y: GROUND_Y - SPIDER_STRING_CAGE_CONFIG.hitH,
      w: SPIDER_STRING_CAGE_CONFIG.hitW,
      h: SPIDER_STRING_CAGE_CONFIG.hitH,
    };
    visit(pillar, cagePillarDirection(pulse, lane));
  }
}

function isSafeLane(pulse: SpiderStringCageState, lane: number) {
  return lane >= pulse.safeLaneStart
    && lane < pulse.safeLaneStart + SPIDER_STRING_CAGE_CONFIG.safeLaneCount;
}

function cagePillarDirection(
  pulse: SpiderStringCageState,
  lane: number,
): CagePillarDirection {
  if (pulse.kind === "ground") return "up";
  if (pulse.kind === "air") return "down";

  const isLeftSide = lane < pulse.safeLaneStart;
  const leftSideUsesUpPillars = pulse.pulseIndex % 2 === 0;
  return isLeftSide === leftSideUsesUpPillars ? "up" : "down";
}

function safeGapCenterX(pulse: SpiderStringCageState) {
  const laneW = WIDTH / SPIDER_STRING_CAGE_CONFIG.laneCount;
  return safeGapCenterForLane(pulse.safeLaneStart, laneW);
}

function safeGapCenterForLane(safeLaneStart: number, laneW: number) {
  return (safeLaneStart + SPIDER_STRING_CAGE_CONFIG.safeLaneCount / 2) * laneW;
}

function drawCagePillar(
  pillar: CagePillarRect,
  direction: CagePillarDirection,
  frame: number,
) {
  if (!ctx) return;
  const centerX = pillar.x + pillar.w / 2;
  const drawX = centerX - SPIDER_STRING_CAGE_CONFIG.drawW / 2;
  const drawY = GROUND_Y
    - SPIDER_STRING_CAGE_CONFIG.drawH
    + SPIDER_STRING_CAGE_CONFIG.effectOriginPadding;

  if (direction === "up") {
    drawSheetFrame(
      SPIDER_STRING_ULTIMATE_PILLAR_SHEET,
      frame,
      drawX,
      drawY,
      SPIDER_STRING_CAGE_CONFIG.drawW,
      SPIDER_STRING_CAGE_CONFIG.drawH,
    );
    return;
  }

  // Flip inside the same draw box so the source's stable root becomes a ceiling anchor.
  ctx.save();
  ctx.translate(0, drawY * 2 + SPIDER_STRING_CAGE_CONFIG.drawH);
  ctx.scale(1, -1);
  drawSheetFrame(
    SPIDER_STRING_ULTIMATE_PILLAR_SHEET,
    frame,
    drawX,
    drawY,
    SPIDER_STRING_CAGE_CONFIG.drawW,
    SPIDER_STRING_CAGE_CONFIG.drawH,
  );
  ctx.restore();
}

function drawCagePillarWarning(
  pillar: CagePillarRect,
  direction: CagePillarDirection,
) {
  if (!ctx) return;
  const centerX = pillar.x + pillar.w / 2;
  const topY = pillar.y;
  const originY = direction === "up" ? GROUND_Y : topY;
  const targetY = direction === "up" ? topY : GROUND_Y;

  ctx.save();
  ctx.strokeStyle = "#f4efff";
  ctx.fillStyle = "#a92d3c";
  ctx.lineWidth = WARNING_LINE_WIDTH;
  ctx.setLineDash([WARNING_DASH_LENGTH, WARNING_DASH_LENGTH]);
  ctx.beginPath();
  ctx.moveTo(centerX, originY);
  ctx.lineTo(centerX, targetY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    originY,
    WARNING_RADIUS_X,
    WARNING_RADIUS_Y,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
