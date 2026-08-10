import {
  DEAD_BELL_BLADE_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_WAVE_SHEET,
  DEAD_BELL_WAVE_VISIBLE_BOUNDS,
  WIDTH,
} from "../../constants";
import {
  recordCollisionDebugPoint,
  recordCollisionDebugRect,
  recordCollisionDebugRing,
} from "../../game/collisionDebug";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp, rectsOverlap } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { hurtPlayer } from "../player";
import type { DeadBellBladeState, DeadBellWaveState } from "../../types/game-state";

const WAVE_WARNING_RADIUS_PULSE = 4;
const PLAYER_WAVE_RADIUS_RATIO = 0.35;
const WAVE_CLEANUP_EXTRA_FRAMES = 14;
const WAVE_FADE_EXTRA_FRAMES = 18;
const WAVE_FADE_MIN_ALPHA = 0.28;
const WAVE_WARNING_ALPHA = 0.72;
const BLADE_WARNING_SPRITE_FRAMES = 2;
const BLADE_FLIGHT_FIRST_FRAME = 2;
const BLADE_FLIGHT_FRAME_COUNT = 2;
const BLADE_DISSIPATE_FIRST_FRAME = 4;
const BLADE_DISSIPATE_FRAMES = 12;
const BLADE_DISSIPATE_FRAME_DURATION = BLADE_DISSIPATE_FRAMES / 2;
const AWAKENED_LOW_TONE_FILTER = "contrast(1.16) brightness(0.88) drop-shadow(0 0 5px rgba(132, 34, 23, 0.84))";
const HIGH_TONE_FILTER = "sepia(0.9) saturate(1.8) hue-rotate(332deg) brightness(0.82) contrast(1.16) drop-shadow(0 0 5px rgba(116, 31, 18, 0.76))";

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
    if (wave.elapsed === 1) {
      playSfx(wave.tone === "high" ? "bossDeadBellHighToll" : "bossDeadBellLowToll");
    }
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
      if (blade.delay <= blade.warningFrames) {
        blade.frame = Math.min(
          BLADE_WARNING_SPRITE_FRAMES - 1,
          Math.floor(
            (blade.warningFrames - blade.delay)
              * BLADE_WARNING_SPRITE_FRAMES
              / blade.warningFrames,
          ),
        );
      }
      blade.delay -= 1;
      continue;
    }

    blade.elapsed += 1;
    blade.life -= 1;
    if (blade.elapsed === 1) playSfx("bossDeadBellBlade");

    const dissipating = blade.life <= BLADE_DISSIPATE_FRAMES;
    if (dissipating) {
      const dissipateElapsed = BLADE_DISSIPATE_FRAMES - Math.max(0, blade.life);
      blade.frame = Math.min(
        DEAD_BELL_BLADE_SHEET.count - 1,
        BLADE_DISSIPATE_FIRST_FRAME
          + Math.floor(dissipateElapsed / BLADE_DISSIPATE_FRAME_DURATION),
      );
    } else {
      blade.x += blade.vx;
      blade.frame = BLADE_FLIGHT_FIRST_FRAME
        + Math.floor((blade.elapsed - 1) / DEAD_BELL_CONFIG.bladeFrameDuration)
          % BLADE_FLIGHT_FRAME_COUNT;
      recordCollisionDebugRect(blade, "enemyAttack");

      if (rectsOverlap(state.player, blade)) {
        hurtPlayer(blade.damage, blade.vx);
        state.deadBellBlades.splice(i, 1);
        continue;
      }
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
    const drawFrame = warning ? 0 : wave.frame;
    const { w: drawW, h: drawH } = deadBellWaveDrawSize(drawFrame, wave.radius);
    ctx.save();
    ctx.globalAlpha = warning ? WAVE_WARNING_ALPHA : fade;
    if (wave.tone === "high") ctx.filter = HIGH_TONE_FILTER;
    else if (wave.awakened) ctx.filter = AWAKENED_LOW_TONE_FILTER;
    drawSheetFrame(
      DEAD_BELL_WAVE_SHEET,
      drawFrame,
      wave.x - drawW / 2,
      wave.y - drawH / 2,
      drawW,
      drawH,
      1,
    );
    ctx.restore();
  }
}

export function deadBellWaveDrawSize(frame: number, radius: number) {
  const safeFrame = Math.min(
    DEAD_BELL_WAVE_VISIBLE_BOUNDS.length - 1,
    Math.max(0, Math.floor(frame)),
  );
  const visibleBounds = DEAD_BELL_WAVE_VISIBLE_BOUNDS[safeFrame];
  const diameter = radius * 2;
  return {
    w: diameter * DEAD_BELL_WAVE_SHEET.frameW / visibleBounds.w,
    h: diameter * DEAD_BELL_WAVE_SHEET.frameH / visibleBounds.h,
  };
}

function drawDeadBellBlades() {
  if (!ctx) return;
  for (const blade of state.deadBellBlades) {
    if (blade.delay > blade.warningFrames) continue;
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
