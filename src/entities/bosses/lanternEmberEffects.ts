import {
  LANTERN_EMBER_ASH_ZONE_SHEET,
  LANTERN_EMBER_AWAKENED_GRID_SHEET,
  LANTERN_EMBER_BUFF_TETHER_SHEET,
  LANTERN_EMBER_CONFIG,
  LANTERN_EMBER_FIRELINE_SHEET,
  LANTERN_EMBER_LURE_EFFECT_SHEET,
  WIDTH,
} from "../../constants";
import {
  recordCollisionDebugEllipse,
  recordCollisionDebugRect,
} from "../../game/collisionDebug";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { hurtPlayer } from "../player";
import type { LanternEmberAshZoneState, LanternEmberAwakenedGridState, LanternEmberBuffTetherState, LanternEmberFirelineState, LanternEmberLureState } from "../../types/game-state";

const FIRELINE_FOOT_PADDING = 12;
const AWAKENED_GRID_FOOT_PADDING = 14;
const LURE_ALPHA_BASE = 0.48;
const LURE_ALPHA_SCALE = 0.52;
const FIRELINE_WARNING_ALPHA = 0.82;
const FIRELINE_ALPHA_BASE = 0.58;
const FIRELINE_ALPHA_SCALE = 0.42;
const FIRELINE_TRAJECTORY_ALPHA_BASE = 0.5;
const FIRELINE_TRAJECTORY_ALPHA_SCALE = 0.46;
const GRID_WARNING_ALPHA = 0.78;
const GRID_ALPHA_BASE = 0.56;
const GRID_ALPHA_SCALE = 0.44;
const ASH_ZONE_FADE_FRAMES = 18;
const ASH_ZONE_ALPHA_SCALE = 0.72;
const TETHER_ALPHA_BASE = 0.5;
const TETHER_ALPHA_SCALE = 0.5;

export function updateLanternEmberEffects() {
  updateLanternLures();
  updateLanternBuffTethers();
  updateLanternFirelines();
  updateLanternAwakenedGrids();
  updateLanternAshZones();
}

function updateLanternLures() {
  for (let i = state.lanternEmberLures.length - 1; i >= 0; i -= 1) {
    const lure = state.lanternEmberLures[i] as LanternEmberLureState;
    lure.elapsed += 1;
    lure.life -= 1;
    lure.x += lure.vx;
    lure.frame = middleLoopFrame(
      lure.elapsed,
      LANTERN_EMBER_CONFIG.lureFrameDuration,
      LANTERN_EMBER_LURE_EFFECT_SHEET.count,
    );
    if (lure.life <= 0) state.lanternEmberLures.splice(i, 1);
  }
}

function updateLanternBuffTethers() {
  for (let i = state.lanternEmberBuffTethers.length - 1; i >= 0; i -= 1) {
    const tether = state.lanternEmberBuffTethers[i] as LanternEmberBuffTetherState;
    tether.elapsed += 1;
    tether.life -= 1;
    tether.toX = tether.target.x + tether.target.w / 2;
    tether.toY = tether.target.y + tether.target.h / 2;
    tether.frame = middleLoopFrame(
      tether.elapsed,
      LANTERN_EMBER_CONFIG.buffTetherFrameDuration,
      LANTERN_EMBER_BUFF_TETHER_SHEET.count,
    );
    if (tether.life <= 0) state.lanternEmberBuffTethers.splice(i, 1);
  }
}

function updateLanternFirelines() {
  for (let i = state.lanternEmberFirelines.length - 1; i >= 0; i -= 1) {
    const fireline = state.lanternEmberFirelines[i] as LanternEmberFirelineState;
    fireline.elapsed += 1;
    fireline.life -= 1;
    const activeElapsed = Math.max(0, fireline.elapsed - fireline.warningFrames);
    fireline.frame = fireline.elapsed <= fireline.warningFrames
      ? 0
      : middleLoopFrame(
        activeElapsed,
        LANTERN_EMBER_CONFIG.firelineFrameDuration,
        LANTERN_EMBER_FIRELINE_SHEET.count,
      );

    if (!fireline.hitPlayer && fireline.elapsed > fireline.warningFrames && isPlayerInLanternFireline(fireline)) {
      fireline.hitPlayer = true;
      hurtPlayer(fireline.damage, state.player.x + state.player.w / 2 - (fireline.x + fireline.w / 2));
    }

    if (fireline.life <= 0) state.lanternEmberFirelines.splice(i, 1);
  }
}

function updateLanternAwakenedGrids() {
  for (let i = state.lanternEmberAwakenedGrids.length - 1; i >= 0; i -= 1) {
    const grid = state.lanternEmberAwakenedGrids[i] as LanternEmberAwakenedGridState;
    grid.elapsed += 1;
    grid.life -= 1;
    if (grid.hitPlayerCd > 0) grid.hitPlayerCd -= 1;
    if (grid.elapsed > grid.warningFrames) grid.x += grid.vx;

    const activeElapsed = Math.max(0, grid.elapsed - grid.warningFrames);
    grid.frame = grid.elapsed <= grid.warningFrames
      ? 0
      : middleLoopFrame(
        activeElapsed,
        LANTERN_EMBER_CONFIG.awakenedGridFrameDuration,
        LANTERN_EMBER_AWAKENED_GRID_SHEET.count,
      );

    if (grid.elapsed > grid.warningFrames && grid.hitPlayerCd <= 0 && isPlayerInLanternGrid(grid)) {
      hurtPlayer(grid.damage, grid.vx);
      grid.hitPlayerCd = LANTERN_EMBER_CONFIG.awakenedGridHitCooldown;
    }

    if (grid.life <= 0) state.lanternEmberAwakenedGrids.splice(i, 1);
  }
}

function updateLanternAshZones() {
  for (let i = state.lanternEmberAshZones.length - 1; i >= 0; i -= 1) {
    const zone = state.lanternEmberAshZones[i] as LanternEmberAshZoneState;
    const geometry = lanternAshZoneGeometry(zone);
    recordCollisionDebugEllipse(
      geometry.centerX,
      geometry.centerY,
      geometry.radiusX,
      geometry.radiusY,
      "enemyAttack",
    );
    zone.elapsed += 1;
    zone.life -= 1;
    if (
      zone.elapsed >= LANTERN_EMBER_CONFIG.ashZoneDamageFirstFrame
      && (zone.elapsed - LANTERN_EMBER_CONFIG.ashZoneDamageFirstFrame) % LANTERN_EMBER_CONFIG.ashZoneDamageIntervalFrames === 0
      && isPlayerInLanternAshZone(zone)
      && state.player.invincible <= 0
    ) {
      hurtPlayer(zone.damage, zone.x - (state.player.x + state.player.w / 2));
      state.player.invincible = Math.max(state.player.invincible, LANTERN_EMBER_CONFIG.ashZoneDamageInvincibleFrames);
    }

    const rawFrame = Math.floor(zone.elapsed / LANTERN_EMBER_CONFIG.ashZoneFrameDuration);
    if (rawFrame < LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame) {
      zone.frame = rawFrame;
    } else {
      const loopCount = LANTERN_EMBER_ASH_ZONE_SHEET.count
        - LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame
        - 1;
      zone.frame = LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame
        + (rawFrame - LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame) % loopCount;
    }

    if (zone.life <= 0) state.lanternEmberAshZones.splice(i, 1);
  }
}

function middleLoopFrame(elapsed: number, frameDuration: number, frameCount: number) {
  const middleFrameCount = frameCount - 2;
  return 1 + Math.floor(elapsed / frameDuration) % middleFrameCount;
}

function isPlayerInLanternFireline(fireline: LanternEmberFirelineState) {
  const p = state.player;
  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;
  const rect = {
    x: fireline.x,
    y: fireline.y - fireline.h,
    w: fireline.w,
    h: fireline.h + FIRELINE_FOOT_PADDING,
  };
  recordCollisionDebugRect(rect, "enemyAttack");
  return footX >= rect.x
    && footX <= rect.x + rect.w
    && footY >= rect.y
    && footY <= rect.y + rect.h;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function isPlayerInLanternGrid(grid: LanternEmberAwakenedGridState) {
  const p = state.player;
  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;
  const geometry = {
    y: grid.y - grid.h,
    h: grid.h + AWAKENED_GRID_FOOT_PADDING,
    period: LANTERN_EMBER_CONFIG.awakenedGridPeriod,
    dangerW: LANTERN_EMBER_CONFIG.awakenedGridDangerW,
  };
  recordLanternGridDangerStrips(grid.x, geometry);
  if (footY < geometry.y || footY > geometry.y + geometry.h) return false;
  const localX = positiveModulo(footX - grid.x, geometry.period);
  return localX <= geometry.dangerW;
}

function isPlayerInLanternAshZone(zone: LanternEmberAshZoneState) {
  const p = state.player;
  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;
  const geometry = lanternAshZoneGeometry(zone);
  const dx = (footX - geometry.centerX) / geometry.radiusX;
  const dy = (footY - geometry.centerY) / geometry.radiusY;
  return dx * dx + dy * dy <= 1;
}

function lanternAshZoneGeometry(zone: LanternEmberAshZoneState) {
  return {
    centerX: zone.x,
    centerY: zone.y,
    radiusX: zone.radius,
    radiusY: zone.radius * LANTERN_EMBER_CONFIG.ashZoneVerticalRadiusScale,
  };
}

function recordLanternGridDangerStrips(
  originX: number,
  geometry: { y: number; h: number; period: number; dangerW: number },
) {
  const firstStripIndex = Math.floor(-originX / geometry.period);
  for (
    let x = originX + firstStripIndex * geometry.period;
    x < WIDTH;
    x += geometry.period
  ) {
    const clippedX = Math.max(0, x);
    const clippedRight = Math.min(WIDTH, x + geometry.dangerW);
    if (clippedRight <= clippedX) continue;
    recordCollisionDebugRect(
      {
        x: clippedX,
        y: geometry.y,
        w: clippedRight - clippedX,
        h: geometry.h,
      },
      "enemyAttack",
    );
  }
}

export function drawLanternEmberEffects() {
  drawLanternAshZones();
  drawLanternFirelines();
  drawLanternAwakenedGrids();
  drawLanternLures();
  drawLanternBuffTethers();
}

function drawLanternLures() {
  if (!ctx) return;
  for (const lure of state.lanternEmberLures) {
    const fade = clamp(lure.life / LANTERN_EMBER_CONFIG.lureLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = LURE_ALPHA_BASE + fade * LURE_ALPHA_SCALE;
    drawSheetFrame(
      LANTERN_EMBER_LURE_EFFECT_SHEET,
      lure.frame,
      lure.x - LANTERN_EMBER_CONFIG.lureDrawW / 2,
      lure.y - LANTERN_EMBER_CONFIG.lureDrawH / 2,
      LANTERN_EMBER_CONFIG.lureDrawW,
      LANTERN_EMBER_CONFIG.lureDrawH,
      lure.facing,
    );
    ctx.restore();
  }
}

function drawLanternFirelines() {
  if (!ctx) return;
  for (const fireline of state.lanternEmberFirelines) {
    const warning = fireline.elapsed <= fireline.warningFrames;
    const fade = clamp(fireline.life / LANTERN_EMBER_CONFIG.firelineLife, 0, 1);
    const drawH = LANTERN_EMBER_CONFIG.firelineDrawH;
    if (warning) drawLanternFirelineTrajectory(fireline);
    ctx.save();
    ctx.globalAlpha = warning ? FIRELINE_WARNING_ALPHA : FIRELINE_ALPHA_BASE + fade * FIRELINE_ALPHA_SCALE;
    drawSheetFrame(
      LANTERN_EMBER_FIRELINE_SHEET,
      fireline.frame,
      fireline.x,
      fireline.y - drawH + LANTERN_EMBER_CONFIG.firelineYOffset,
      fireline.w,
      drawH,
    );
    ctx.restore();
  }
}

function drawLanternAwakenedGrids() {
  if (!ctx) return;
  for (const grid of state.lanternEmberAwakenedGrids) {
    const warning = grid.elapsed <= grid.warningFrames;
    const fade = clamp(grid.life / LANTERN_EMBER_CONFIG.awakenedGridLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = warning ? GRID_WARNING_ALPHA : GRID_ALPHA_BASE + fade * GRID_ALPHA_SCALE;
    for (
      let tileX = grid.x;
      tileX < WIDTH;
      tileX += LANTERN_EMBER_CONFIG.awakenedGridPeriod
    ) {
      drawSheetFrame(
        LANTERN_EMBER_AWAKENED_GRID_SHEET,
        grid.frame,
        tileX,
        grid.y - LANTERN_EMBER_CONFIG.awakenedGridDrawH,
        LANTERN_EMBER_CONFIG.awakenedGridPeriod,
        LANTERN_EMBER_CONFIG.awakenedGridDrawH,
      );
    }
    ctx.restore();
  }
}

function drawLanternAshZones() {
  if (!ctx) return;
  for (const zone of state.lanternEmberAshZones) {
    const drawW = Math.round(zone.radius * LANTERN_EMBER_CONFIG.ashZoneDrawWidthScale);
    const drawH = Math.round(drawW * LANTERN_EMBER_ASH_ZONE_SHEET.frameH / LANTERN_EMBER_ASH_ZONE_SHEET.frameW);
    const fade = Math.min(1, zone.life / ASH_ZONE_FADE_FRAMES);
    ctx.save();
    ctx.globalAlpha = ASH_ZONE_ALPHA_SCALE * fade;
    drawSheetFrame(
      LANTERN_EMBER_ASH_ZONE_SHEET,
      zone.frame,
      zone.x - drawW / 2,
      zone.y - drawH,
      drawW,
      drawH,
    );
    ctx.restore();
  }
}

function drawLanternBuffTethers() {
  if (!ctx) return;
  for (const tether of state.lanternEmberBuffTethers) {
    const fade = clamp(tether.life / LANTERN_EMBER_CONFIG.buffTetherLife, 0, 1);
    drawLanternTether(
      tether.fromX,
      tether.fromY,
      tether.toX,
      tether.toY,
      tether.frame,
      TETHER_ALPHA_BASE + fade * TETHER_ALPHA_SCALE,
    );
  }
}

function drawLanternFirelineTrajectory(fireline: LanternEmberFirelineState) {
  const progress = clamp(fireline.elapsed / fireline.warningFrames, 0, 1);
  drawLanternTether(
    fireline.sourceX,
    fireline.sourceY,
    fireline.x + fireline.w / 2,
    fireline.y,
    middleLoopFrame(
      fireline.elapsed,
      LANTERN_EMBER_CONFIG.buffTetherFrameDuration,
      LANTERN_EMBER_BUFF_TETHER_SHEET.count,
    ),
    FIRELINE_TRAJECTORY_ALPHA_BASE + progress * FIRELINE_TRAJECTORY_ALPHA_SCALE,
  );
}

function drawLanternTether(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  frame: number,
  alpha: number,
) {
  const image = LANTERN_EMBER_BUFF_TETHER_SHEET.image;
  if (!ctx || !image) return;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const drawW = Math.hypot(dx, dy);
  const drawH = LANTERN_EMBER_CONFIG.buffTetherDrawH;
  const sx = frame * LANTERN_EMBER_BUFF_TETHER_SHEET.frameW;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(fromX, fromY);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.drawImage(
    image,
    sx,
    0,
    LANTERN_EMBER_BUFF_TETHER_SHEET.frameW,
    LANTERN_EMBER_BUFF_TETHER_SHEET.frameH,
    0,
    -drawH / 2,
    drawW,
    drawH,
  );
  ctx.restore();
}
