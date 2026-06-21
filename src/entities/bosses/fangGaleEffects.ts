import { FANG_GALE_CONFIG, FANG_GALE_WAVE_SHEET, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type { FangGaleWaveState } from "../../types/game-state";
import { hurtPlayer } from "../player";

export function updateFangGaleEffects() {
  for (let i = state.fangGaleWaves.length - 1; i >= 0; i -= 1) {
    const wave = state.fangGaleWaves[i] as FangGaleWaveState;
    wave.elapsed += 1;
    wave.life -= 1;

    if (wave.elapsed > wave.warningFrames) {
      wave.x += wave.vx;
      wave.frame = Math.min(
        FANG_GALE_WAVE_SHEET.count - 1,
        Math.floor((wave.elapsed - wave.warningFrames) / FANG_GALE_CONFIG.waveFrameDuration),
      );
    }

    if (wave.elapsed > wave.warningFrames && hitbox(state.player, wave)) {
      hurtPlayer(wave.damage, wave.vx);
      state.fangGaleWaves.splice(i, 1);
      continue;
    }

    const offLeft = wave.vx < 0 && wave.x + wave.w < -FANG_GALE_CONFIG.waveDrawW;
    const offRight = wave.vx > 0 && wave.x > WIDTH + FANG_GALE_CONFIG.waveDrawW;
    if (wave.life <= 0 || offLeft || offRight) state.fangGaleWaves.splice(i, 1);
  }
}

export function drawFangGaleEffects() {
  if (!ctx) return;
  for (const wave of state.fangGaleWaves) {
    if (wave.elapsed <= wave.warningFrames) {
      drawFangWarning(wave);
    } else {
      drawFangWave(wave);
    }
  }
}

function drawFangWarning(wave: FangGaleWaveState) {
  if (!ctx) return;
  const t = clamp(wave.elapsed / wave.warningFrames, 0, 1);
  const y = wave.y + wave.h / 2;
  const startX = wave.facing > 0 ? wave.x : wave.x + wave.w;
  const endX = wave.facing > 0 ? WIDTH : 0;

  ctx.save();
  ctx.globalAlpha = 0.25 + t * 0.36;
  ctx.strokeStyle = "#e6e2d7";
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawFangWave(wave: FangGaleWaveState) {
  if (!ctx) return;
  const centerX = wave.x + wave.w / 2;
  const centerY = wave.y + wave.h / 2;
  drawSheetFrame(
    FANG_GALE_WAVE_SHEET,
    wave.frame,
    centerX - FANG_GALE_CONFIG.waveDrawW / 2,
    centerY - FANG_GALE_CONFIG.waveDrawH / 2,
    FANG_GALE_CONFIG.waveDrawW,
    FANG_GALE_CONFIG.waveDrawH,
    wave.facing,
  );
}
