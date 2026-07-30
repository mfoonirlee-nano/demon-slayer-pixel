import { DEAD_BELL_BLADE_SHEET, DEAD_BELL_CONFIG, DEAD_BELL_WAVE_SHEET, WIDTH } from "../../constants";
import {
  recordCollisionDebugPoint,
  recordCollisionDebugRing,
} from "../../game/collisionDebug";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { hurtPlayer } from "../player";
import type { DeadBellBladeState, DeadBellWaveState } from "../../types/game-state";

const WAVE_WARNING_RADIUS_PULSE = 4;
const PLAYER_WAVE_RADIUS_RATIO = 0.35;
const WAVE_CLEANUP_EXTRA_FRAMES = 14;
const WAVE_FADE_EXTRA_FRAMES = 18;
const WAVE_FADE_MIN_ALPHA = 0.28;
const WAVE_WARNING_ALPHA = 0.52;
const BLADE_WARNING_ALPHA_BASE = 0.2;
const BLADE_WARNING_ALPHA_GAIN = 0.35;
const BLADE_WARNING_FILL_ALPHA = 0.12;
const BLADE_WARNING_FILL_ALPHA_GAIN = 0.08;
const BLADE_WARNING_DASH_LENGTH = 12;
const BLADE_WARNING_DASH_GAP = 10;

export function updateDeadBellEffects() {
  updateDeadBellWaves();
  updateDeadBellBlades();
}

function updateDeadBellWaves() {
  for (let i = state.deadBellWaves.length - 1; i >= 0; i -= 1) {
    const wave = state.deadBellWaves[i] as DeadBellWaveState;
    if (wave.delay > 0) {
      wave.delay -= 1;
      continue;
    }

    wave.elapsed += 1;
    if (wave.elapsed <= wave.warningFrames) {
      wave.radius = DEAD_BELL_CONFIG.waveStartRadius + Math.sin(wave.elapsed * 0.5) * WAVE_WARNING_RADIUS_PULSE;
      wave.frame = 0;
    } else {
      const activeElapsed = wave.elapsed - wave.warningFrames;
      const t = clamp(activeElapsed / wave.expandFrames, 0, 1);
      wave.radius = DEAD_BELL_CONFIG.waveStartRadius + (wave.maxRadius - DEAD_BELL_CONFIG.waveStartRadius) * t;
      wave.frame = Math.min(
        DEAD_BELL_WAVE_SHEET.count - 1,
        1 + Math.floor(activeElapsed / DEAD_BELL_CONFIG.waveFrameDuration),
      );
    }

    if (!wave.hitPlayer && wave.elapsed > wave.warningFrames) {
      const p = state.player;
      const px = p.x + p.w / 2;
      const py = p.y + p.h / 2;
      const playerRadius = Math.max(p.w, p.h) * PLAYER_WAVE_RADIUS_RATIO;
      const dist = Math.hypot(px - wave.x, py - wave.y);
      const collisionTolerance = wave.thickness + playerRadius;
      recordCollisionDebugRing(
        wave.x,
        wave.y,
        wave.radius,
        collisionTolerance,
        "enemyAttack",
      );
      recordCollisionDebugPoint(px, py, "player");
      if (Math.abs(dist - wave.radius) <= collisionTolerance) {
        wave.hitPlayer = true;
        hurtPlayer(wave.damage, wave.x - px);
      }
    }

    if (wave.elapsed > wave.warningFrames + wave.expandFrames + WAVE_CLEANUP_EXTRA_FRAMES) {
      state.deadBellWaves.splice(i, 1);
    }
  }
}

function updateDeadBellBlades() {
  for (let i = state.deadBellBlades.length - 1; i >= 0; i -= 1) {
    const blade = state.deadBellBlades[i] as DeadBellBladeState;
    if (blade.delay > 0) {
      blade.delay -= 1;
      continue;
    }

    blade.elapsed += 1;
    blade.life -= 1;
    blade.x += blade.vx;
    blade.frame = Math.min(
      DEAD_BELL_BLADE_SHEET.count - 1,
      Math.floor(blade.elapsed / DEAD_BELL_CONFIG.bladeFrameDuration),
    );

    if (hitbox(state.player, blade)) {
      hurtPlayer(blade.damage, blade.vx);
      state.deadBellBlades.splice(i, 1);
      continue;
    }

    const offLeft = blade.vx < 0 && blade.x + blade.w < -DEAD_BELL_CONFIG.bladeDrawW;
    const offRight = blade.vx > 0 && blade.x > WIDTH + DEAD_BELL_CONFIG.bladeDrawW;
    if (blade.life <= 0 || offLeft || offRight) state.deadBellBlades.splice(i, 1);
  }
}

export function drawDeadBellEffects() {
  drawDeadBellWaves();
  drawDeadBellBlades();
}

function drawDeadBellWaves() {
  if (!ctx) return;
  for (const wave of state.deadBellWaves) {
    const warning = wave.delay > 0 || wave.elapsed <= wave.warningFrames;
    const activeElapsed = Math.max(0, wave.elapsed - wave.warningFrames);
    const fade = clamp(1 - activeElapsed / (wave.expandFrames + WAVE_FADE_EXTRA_FRAMES), WAVE_FADE_MIN_ALPHA, 1);
    const drawW = wave.radius * 2;
    const drawH = drawW * (DEAD_BELL_WAVE_SHEET.frameH / DEAD_BELL_WAVE_SHEET.frameW);
    ctx.save();
    ctx.globalAlpha = warning ? WAVE_WARNING_ALPHA : fade;
    drawSheetFrame(
      DEAD_BELL_WAVE_SHEET,
      warning ? 0 : wave.frame,
      wave.x - drawW / 2,
      wave.y - drawH / 2,
      drawW,
      drawH,
    );
    ctx.restore();
  }
}

function drawDeadBellBlades() {
  if (!ctx) return;
  for (const blade of state.deadBellBlades) {
    if (blade.delay > 0) {
      const warningProgress = clamp(
        1 - blade.delay / Math.max(1, blade.warningFrames),
        0,
        1,
      );
      ctx.save();
      ctx.globalAlpha = BLADE_WARNING_FILL_ALPHA
        + warningProgress * BLADE_WARNING_FILL_ALPHA_GAIN;
      ctx.fillStyle = "#9c2f28";
      ctx.fillRect(0, blade.y, WIDTH, blade.h);
      ctx.globalAlpha = BLADE_WARNING_ALPHA_BASE
        + warningProgress * BLADE_WARNING_ALPHA_GAIN;
      ctx.strokeStyle = "#d7b66d";
      ctx.lineWidth = 2;
      ctx.setLineDash([BLADE_WARNING_DASH_LENGTH, BLADE_WARNING_DASH_GAP]);
      ctx.beginPath();
      ctx.moveTo(0, blade.y);
      ctx.lineTo(WIDTH, blade.y);
      ctx.moveTo(0, blade.y + blade.h);
      ctx.lineTo(WIDTH, blade.y + blade.h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      continue;
    }

    const drawX = blade.x + blade.w / 2 - DEAD_BELL_CONFIG.bladeDrawW / 2;
    const drawY = blade.y + blade.h / 2 - DEAD_BELL_CONFIG.bladeDrawH / 2;
    drawSheetFrame(
      DEAD_BELL_BLADE_SHEET,
      blade.frame,
      drawX,
      drawY,
      DEAD_BELL_CONFIG.bladeDrawW,
      DEAD_BELL_CONFIG.bladeDrawH,
      blade.facing,
    );
  }
}
