import {
  LANTERN_EMBER_ASH_ZONE_SHEET,
  LANTERN_EMBER_AWAKENED_GRID_SHEET,
  LANTERN_EMBER_BUFF_TETHER_SHEET,
  LANTERN_EMBER_CONFIG,
  LANTERN_EMBER_FIRELINE_SHEET,
  LANTERN_EMBER_LURE_EFFECT_SHEET,
} from "../../constants";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { hurtPlayer } from "../player";
import type { LanternEmberAshZoneState, LanternEmberAwakenedGridState, LanternEmberBuffTetherState, LanternEmberFirelineState, LanternEmberLureState } from "../../types/game-state";

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
    lure.frame = Math.min(
      LANTERN_EMBER_LURE_EFFECT_SHEET.count - 1,
      Math.floor(lure.elapsed / LANTERN_EMBER_CONFIG.lureFrameDuration),
    );
    if (lure.life <= 0) state.lanternEmberLures.splice(i, 1);
  }
}

function updateLanternBuffTethers() {
  for (let i = state.lanternEmberBuffTethers.length - 1; i >= 0; i -= 1) {
    const tether = state.lanternEmberBuffTethers[i] as LanternEmberBuffTetherState;
    tether.elapsed += 1;
    tether.life -= 1;
    tether.frame = Math.min(
      LANTERN_EMBER_BUFF_TETHER_SHEET.count - 1,
      Math.floor(tether.elapsed / LANTERN_EMBER_CONFIG.buffTetherFrameDuration),
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
      : Math.min(
        LANTERN_EMBER_FIRELINE_SHEET.count - 1,
        1 + Math.floor(activeElapsed / LANTERN_EMBER_CONFIG.firelineFrameDuration),
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
      : Math.min(
        LANTERN_EMBER_AWAKENED_GRID_SHEET.count - 1,
        1 + Math.floor(activeElapsed / LANTERN_EMBER_CONFIG.awakenedGridFrameDuration),
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
      const loopCount = LANTERN_EMBER_ASH_ZONE_SHEET.count - LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame;
      zone.frame = LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame
        + (rawFrame - LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame) % loopCount;
    }

    if (zone.life <= 0) state.lanternEmberAshZones.splice(i, 1);
  }
}

function isPlayerInLanternFireline(fireline: LanternEmberFirelineState) {
  const p = state.player;
  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;
  return footX >= fireline.x
    && footX <= fireline.x + fireline.w
    && footY >= fireline.y - fireline.h
    && footY <= fireline.y + 12;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function isPlayerInLanternGrid(grid: LanternEmberAwakenedGridState) {
  const p = state.player;
  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;
  if (footY < grid.y - grid.h || footY > grid.y + 14) return false;
  const localX = positiveModulo(footX - grid.x, LANTERN_EMBER_CONFIG.awakenedGridPeriod);
  return localX <= LANTERN_EMBER_CONFIG.awakenedGridDangerW;
}

function isPlayerInLanternAshZone(zone: LanternEmberAshZoneState) {
  const p = state.player;
  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;
  const radiusY = zone.radius * LANTERN_EMBER_CONFIG.ashZoneVerticalRadiusScale;
  const dx = (footX - zone.x) / zone.radius;
  const dy = (footY - zone.y) / radiusY;
  return dx * dx + dy * dy <= 1;
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
    ctx.globalAlpha = 0.36 + fade * 0.64;
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
    ctx.save();
    ctx.globalAlpha = warning ? 0.45 : 0.35 + fade * 0.65;
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
    ctx.globalAlpha = warning ? 0.38 : 0.32 + fade * 0.6;
    drawSheetFrame(
      LANTERN_EMBER_AWAKENED_GRID_SHEET,
      grid.frame,
      grid.x,
      grid.y - LANTERN_EMBER_CONFIG.awakenedGridDrawH,
      LANTERN_EMBER_CONFIG.awakenedGridDrawW,
      LANTERN_EMBER_CONFIG.awakenedGridDrawH,
    );
    ctx.restore();
  }
}

function drawLanternAshZones() {
  if (!ctx) return;
  for (const zone of state.lanternEmberAshZones) {
    const drawW = Math.round(zone.radius * LANTERN_EMBER_CONFIG.ashZoneDrawWidthScale);
    const drawH = Math.round(drawW * LANTERN_EMBER_ASH_ZONE_SHEET.frameH / LANTERN_EMBER_ASH_ZONE_SHEET.frameW);
    const fade = Math.min(
      1,
      zone.elapsed / 18,
      zone.life / 18,
    );
    ctx.save();
    ctx.globalAlpha = 0.78 * fade;
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
  const image = LANTERN_EMBER_BUFF_TETHER_SHEET.image;
  if (!ctx || !image) return;
  const sheet = LANTERN_EMBER_BUFF_TETHER_SHEET;
  for (const tether of state.lanternEmberBuffTethers) {
    const dx = tether.toX - tether.fromX;
    const dy = tether.toY - tether.fromY;
    const drawW = Math.max(LANTERN_EMBER_CONFIG.buffTetherDrawW, Math.hypot(dx, dy));
    const drawH = LANTERN_EMBER_CONFIG.buffTetherDrawH;
    const sx = tether.frame * sheet.frameW;
    const fade = clamp(tether.life / LANTERN_EMBER_CONFIG.buffTetherLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.35 + fade * 0.65;
    ctx.translate(tether.fromX, tether.fromY);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.drawImage(image, sx, 0, sheet.frameW, sheet.frameH, 0, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}
