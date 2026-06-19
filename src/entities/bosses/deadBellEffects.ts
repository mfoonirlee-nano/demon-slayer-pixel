import { DEAD_BELL_BLADE_SHEET, DEAD_BELL_CONFIG, DEAD_BELL_WAVE_SHEET, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { hurtPlayer } from "../player";
import type { DeadBellBladeState, DeadBellWaveState } from "../../types/game-state";

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
      wave.radius = DEAD_BELL_CONFIG.waveStartRadius + Math.sin(wave.elapsed * 0.5) * 4;
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
      const playerRadius = Math.max(p.w, p.h) * 0.35;
      const dist = Math.hypot(px - wave.x, py - wave.y);
      if (Math.abs(dist - wave.radius) <= wave.thickness + playerRadius) {
        wave.hitPlayer = true;
        hurtPlayer(wave.damage, wave.x - px);
      }
    }

    if (wave.elapsed > wave.warningFrames + wave.expandFrames + 14) {
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
    const fade = clamp(1 - activeElapsed / (wave.expandFrames + 18), 0.28, 1);
    const drawW = wave.radius * 2;
    const drawH = drawW * (DEAD_BELL_WAVE_SHEET.frameH / DEAD_BELL_WAVE_SHEET.frameW);
    ctx.save();
    ctx.globalAlpha = warning ? 0.52 : fade;
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
      ctx.save();
      ctx.globalAlpha = 0.2 + (1 - blade.delay / DEAD_BELL_CONFIG.bladeWarningFrames) * 0.35;
      ctx.strokeStyle = "#d7b66d";
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(0, blade.y + blade.h / 2);
      ctx.lineTo(WIDTH, blade.y + blade.h / 2);
      ctx.stroke();
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
