import { ctx } from "../rendering/context";
import { COVER_MOON_PHASE_SPRITES } from "../constants";
import { getCoverMoonPhaseIndex } from "../game/coverProgress";
import { colorLerp } from "../game/utils";
import {
  MOON_GLOW_CONFIG,
  MOON_LAYOUT,
  MOON_MOTION_CONFIG,
  MOON_SKY_CONFIG,
} from "./constants";
import { getMoonBloodRingGlowScale, getMoonPhaseGlowScale } from "./phaseGlow";
import type { MoonState } from "./types";

const BASE_PULSE_SPEED_SCALE = 0.5;
const PULSE_WAVE_BASE = 0.5;
const PULSE_WAVE_AMPLITUDE = 0.5;
const BLOOD_WAVE_BASE = 0.35;
const BLOOD_WAVE_SCALE = 0.65;
const OUTER_GLOW_BASE_PULSE_BLUR = 8;
const OUTER_GLOW_BLOOD_BLUR_SCALE = 1.5;
const FAR_GLOW_BASE_PULSE_BLUR = 15;
const FAR_GLOW_BLOOD_BLUR_SCALE = 2;
const FAR_GLOW_ALPHA_PULSE = 0.03;
const OUTER_GLOW_ALPHA_PULSE = 0.05;
const FAR_GLOW_ALPHA_SCALE = 2.2;
const OUTER_GLOW_ALPHA_SCALE = 2.0;
const COOL_GLOW_BLOOD_FADE = 0.8;
const COOL_GLOW_PULSE_BLUR_SCALE = 1.4;
const BLOOD_RING_ALPHA_SCALE = 2.0;
const GLOW_CACHE_PADDING_SCALE = 2;
const GLOW_CACHE_MIN_PADDING = 12;
const GLOW_SCALE_MIN = 0.72;
const GLOW_SCALE_MAX = 1.28;
const MIN_GLOW_ALPHA = 0.003;

type MoonPhaseFrame = {
  image: HTMLImageElement;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
};

type MoonGlowCanvas = HTMLCanvasElement | OffscreenCanvas;
type MoonGlowContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type MoonGlowSprite = {
  canvas: MoonGlowCanvas;
};

const moonGlowCache = new WeakMap<HTMLImageElement, Map<string, MoonGlowSprite>>();

function rgba(color: readonly number[], alpha: number) {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

function clampAlpha(alpha: number) {
  return Math.max(0, Math.min(1, alpha));
}

function clampGlowScale(scale: number) {
  return Math.max(GLOW_SCALE_MIN, Math.min(GLOW_SCALE_MAX, scale));
}

function createGlowCanvas(width: number, height: number): MoonGlowCanvas | null {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function glowCanvasContext(canvas: MoonGlowCanvas): MoonGlowContext | null {
  return canvas.getContext("2d") as MoonGlowContext | null;
}

function glowCacheKey(frame: MoonPhaseFrame, color: readonly number[], blur: number) {
  return [
    frame.sx,
    frame.sy,
    frame.sw,
    frame.sh,
    color[0],
    color[1],
    color[2],
    Math.round(blur),
  ].join(":");
}

function getMoonGlowSprite(
  frame: MoonPhaseFrame,
  color: readonly number[],
  blur: number,
): MoonGlowSprite | null {
  if (typeof HTMLImageElement === "undefined" || !(frame.image instanceof HTMLImageElement)) {
    return null;
  }

  const cacheBlur = Math.max(1, Math.round(blur));
  const key = glowCacheKey(frame, color, cacheBlur);
  let imageCache = moonGlowCache.get(frame.image);
  if (!imageCache) {
    imageCache = new Map();
    moonGlowCache.set(frame.image, imageCache);
  }

  const cached = imageCache.get(key);
  if (cached) return cached;

  const padding = Math.max(GLOW_CACHE_MIN_PADDING, Math.ceil(cacheBlur * GLOW_CACHE_PADDING_SCALE));
  const glowCanvas = createGlowCanvas(frame.sw + padding * 2, frame.sh + padding * 2);
  if (!glowCanvas) return null;

  const glowCtx = glowCanvasContext(glowCanvas);
  if (!glowCtx) return null;

  glowCtx.imageSmoothingEnabled = false;
  glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
  glowCtx.save();
  glowCtx.shadowColor = rgba(color, 1);
  glowCtx.shadowBlur = cacheBlur;
  glowCtx.shadowOffsetX = glowCanvas.width;
  glowCtx.shadowOffsetY = 0;
  glowCtx.drawImage(
    frame.image,
    frame.sx,
    frame.sy,
    frame.sw,
    frame.sh,
    padding - glowCanvas.width,
    padding,
    frame.sw,
    frame.sh,
  );
  glowCtx.restore();

  const sprite = { canvas: glowCanvas };
  imageCache.set(key, sprite);
  return sprite;
}

function drawMoonPhaseFrame(context: CanvasRenderingContext2D, frame: MoonPhaseFrame) {
  context.drawImage(
    frame.image,
    frame.sx,
    frame.sy,
    frame.sw,
    frame.sh,
    frame.dx,
    frame.dy,
    frame.dw,
    frame.dh,
  );
}

function drawScaledMoonPhaseFrame(
  context: CanvasRenderingContext2D,
  frame: MoonPhaseFrame,
  scale: number,
) {
  const centerX = frame.dx + frame.dw / 2;
  const centerY = frame.dy + frame.dh / 2;
  const drawW = frame.dw * scale;
  const drawH = frame.dh * scale;
  context.drawImage(
    frame.image,
    frame.sx,
    frame.sy,
    frame.sw,
    frame.sh,
    centerX - drawW / 2,
    centerY - drawH / 2,
    drawW,
    drawH,
  );
}

function drawMoonPhaseGlowLayer(
  context: CanvasRenderingContext2D,
  frame: MoonPhaseFrame,
  color: readonly number[],
  alpha: number,
  blur: number,
  cacheBlur: number,
) {
  const clampedAlpha = clampAlpha(alpha);
  if (clampedAlpha <= MIN_GLOW_ALPHA) return;

  const scale = clampGlowScale(blur / Math.max(1, cacheBlur));
  const sprite = getMoonGlowSprite(frame, color, cacheBlur);

  context.save();
  context.globalAlpha = clampedAlpha;
  if (sprite) {
    const sourceToDrawScaleX = frame.dw / frame.sw;
    const sourceToDrawScaleY = frame.dh / frame.sh;
    const centerX = frame.dx + frame.dw / 2;
    const centerY = frame.dy + frame.dh / 2;
    const drawW = sprite.canvas.width * sourceToDrawScaleX * scale;
    const drawH = sprite.canvas.height * sourceToDrawScaleY * scale;
    context.drawImage(sprite.canvas, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
  } else {
    drawScaledMoonPhaseFrame(context, frame, scale);
  }
  context.restore();
}

function drawMoonPhaseGlow(
  context: CanvasRenderingContext2D,
  frame: MoonPhaseFrame,
  options: {
    bloodLerp: number;
    phaseGlowScale: number;
    bloodRingGlowScale: number;
    motion: ReturnType<typeof getMoonMotion>;
  },
) {
  const { bloodLerp, phaseGlowScale, bloodRingGlowScale, motion } = options;
  const farGlowPulse = motion.basePulse * FAR_GLOW_ALPHA_PULSE;
  const farGlowNormalAlpha = Math.max(
    0,
    (MOON_GLOW_CONFIG.farGlowAlpha + farGlowPulse) * phaseGlowScale,
  ) * FAR_GLOW_ALPHA_SCALE * (1 - bloodLerp);
  const farGlowBloodAlpha = Math.max(
    0,
    (MOON_GLOW_CONFIG.bloodFarAlpha + farGlowPulse) * phaseGlowScale,
  ) * FAR_GLOW_ALPHA_SCALE * bloodLerp;
  const farGlowBlur = (
    MOON_GLOW_CONFIG.farGlowBlur
      + motion.basePulse * FAR_GLOW_BASE_PULSE_BLUR
      + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost * FAR_GLOW_BLOOD_BLUR_SCALE
  ) * phaseGlowScale;
  const outerGlowPulse = motion.basePulse * OUTER_GLOW_ALPHA_PULSE;
  const outerGlowNormalAlpha = Math.max(
    0,
    (MOON_GLOW_CONFIG.outerGlowAlpha + outerGlowPulse) * phaseGlowScale,
  ) * OUTER_GLOW_ALPHA_SCALE * (1 - bloodLerp);
  const outerGlowBloodAlpha = Math.max(
    0,
    (MOON_GLOW_CONFIG.bloodOuterAlpha + outerGlowPulse) * phaseGlowScale,
  ) * OUTER_GLOW_ALPHA_SCALE * bloodLerp;
  const outerGlowBlur = (
    MOON_GLOW_CONFIG.outerGlowBlur
      + motion.basePulse * OUTER_GLOW_BASE_PULSE_BLUR
      + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost * OUTER_GLOW_BLOOD_BLUR_SCALE
  ) * phaseGlowScale;
  const coolAlpha = (
    1 - bloodLerp * COOL_GLOW_BLOOD_FADE
  ) * MOON_GLOW_CONFIG.coolGlowAlpha * phaseGlowScale * OUTER_GLOW_ALPHA_SCALE;
  const coolBlur = (
    MOON_GLOW_CONFIG.coolGlowBlur + motion.pulseWave * COOL_GLOW_PULSE_BLUR_SCALE
  ) * phaseGlowScale;

  drawMoonPhaseGlowLayer(
    context,
    frame,
    MOON_GLOW_CONFIG.farGlowColor,
    farGlowNormalAlpha,
    farGlowBlur,
    MOON_GLOW_CONFIG.farGlowBlur,
  );
  drawMoonPhaseGlowLayer(
    context,
    frame,
    MOON_GLOW_CONFIG.bloodFarColor,
    farGlowBloodAlpha,
    farGlowBlur,
    MOON_GLOW_CONFIG.farGlowBlur,
  );
  drawMoonPhaseGlowLayer(
    context,
    frame,
    MOON_GLOW_CONFIG.outerGlowColor,
    outerGlowNormalAlpha,
    outerGlowBlur,
    MOON_GLOW_CONFIG.outerGlowBlur,
  );
  drawMoonPhaseGlowLayer(
    context,
    frame,
    MOON_GLOW_CONFIG.bloodOuterColor,
    outerGlowBloodAlpha,
    outerGlowBlur,
    MOON_GLOW_CONFIG.outerGlowBlur,
  );
  drawMoonPhaseGlowLayer(
    context,
    frame,
    MOON_GLOW_CONFIG.coolGlowColor,
    coolAlpha,
    coolBlur,
    MOON_GLOW_CONFIG.coolGlowBlur,
  );

  if (bloodLerp > 0) {
    const ringAlpha = bloodLerp * (
      MOON_GLOW_CONFIG.bloodRingAlpha + Math.max(0, motion.bloodWaveAmount) * MOON_MOTION_CONFIG.bloodWave.alphaBoost
    ) * bloodRingGlowScale * BLOOD_RING_ALPHA_SCALE;
    const ringBlur = (
      MOON_GLOW_CONFIG.bloodRingBlur + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost
    ) * bloodRingGlowScale;
    drawMoonPhaseGlowLayer(
      context,
      frame,
      MOON_GLOW_CONFIG.bloodRingColor,
      ringAlpha,
      ringBlur,
      MOON_GLOW_CONFIG.bloodRingBlur,
    );
  }
}

function getMoonMotion(elapsed: number, bloodLerp: number) {
  const { moonDrift, shimmer, pulse, bloodWave } = MOON_MOTION_CONFIG;
  // 保持血月原有的脉冲，增加一个始终存在的柔和基础呼吸脉冲
  const basePulse = Math.sin(elapsed * pulse.speed * BASE_PULSE_SPEED_SCALE);
  const pulseWave = (PULSE_WAVE_BASE + PULSE_WAVE_AMPLITUDE * Math.sin(elapsed * pulse.speed + pulse.phase)) * bloodLerp;
  const bloodWaveAmount = Math.sin(elapsed * bloodWave.speed + bloodWave.phase) * (BLOOD_WAVE_BASE + bloodLerp * BLOOD_WAVE_SCALE);

  return {
    basePulse,
    pulseWave,
    bloodWaveAmount,
    moonX:
      Math.sin(elapsed * moonDrift.primarySpeedX + moonDrift.phaseX) * moonDrift.primaryAmplitudeX +
      Math.cos(elapsed * moonDrift.secondarySpeedX) * moonDrift.secondaryAmplitudeX,
    moonY:
      Math.cos(elapsed * moonDrift.primarySpeedY + moonDrift.phaseY) * moonDrift.primaryAmplitudeY +
      Math.sin(elapsed * moonDrift.secondarySpeedY) * moonDrift.secondaryAmplitudeY,
    shimmerX: Math.sin(elapsed * shimmer.speedX + shimmer.phaseX) * shimmer.amplitudeX,
    shimmerY: Math.cos(elapsed * shimmer.speedY + shimmer.phaseY) * shimmer.amplitudeY,
  };
}

export function drawMoon(options: { elapsed: number; moon: MoonState }) {
  if (!ctx) return;

  const { elapsed, moon } = options;
  const bloodLerp = moon.bloodLerp;
  const coverProgress = moon.coverProgress;
  const phaseSpriteImg = COVER_MOON_PHASE_SPRITES.image;
  const phaseIndex = getCoverMoonPhaseIndex(coverProgress, COVER_MOON_PHASE_SPRITES.frames);
  const phaseGlowScale = getMoonPhaseGlowScale(phaseIndex);
  const bloodRingGlowScale = getMoonBloodRingGlowScale(phaseIndex);
  const motion = getMoonMotion(elapsed, bloodLerp);
  const moonX = MOON_LAYOUT.x + motion.moonX;
  const moonY = MOON_LAYOUT.y + motion.moonY;
  const context = ctx;
  const moonDrawSize = MOON_LAYOUT.coreRadius * 2;
  const moonDrawX = moonX - MOON_LAYOUT.coreRadius;
  const moonDrawY = moonY - MOON_LAYOUT.coreRadius;

  if (phaseSpriteImg) {
    const phaseFrame = {
      image: phaseSpriteImg,
      sx: phaseIndex * COVER_MOON_PHASE_SPRITES.frameW,
      sy: 0,
      sw: COVER_MOON_PHASE_SPRITES.frameW,
      sh: COVER_MOON_PHASE_SPRITES.frameH,
      dx: moonDrawX,
      dy: moonDrawY,
      dw: moonDrawSize,
      dh: moonDrawSize,
    };
    drawMoonPhaseGlow(context, phaseFrame, {
      bloodLerp,
      phaseGlowScale,
      bloodRingGlowScale,
      motion,
    });
    drawMoonPhaseFrame(context, phaseFrame);
  }
}

export function getMoonSkyColors(moon: MoonState) {
  const bloodLerp = moon.bloodLerp;

  return {
    nightTop: colorLerp(MOON_SKY_CONFIG.baseTop, MOON_SKY_CONFIG.bloodTop, bloodLerp),
    nightMid: colorLerp(MOON_SKY_CONFIG.baseMid, MOON_SKY_CONFIG.bloodMid, bloodLerp * MOON_SKY_CONFIG.midBlend),
    nightLow: colorLerp(MOON_SKY_CONFIG.baseLow, MOON_SKY_CONFIG.bloodLow, bloodLerp * MOON_SKY_CONFIG.lowBlend),
    upperOverlay: rgba(MOON_SKY_CONFIG.upperOverlayColor, MOON_SKY_CONFIG.upperOverlayAlpha * bloodLerp),
    midOverlay: rgba(MOON_SKY_CONFIG.midOverlayColor, MOON_SKY_CONFIG.midOverlayAlpha * bloodLerp),
  };
}
