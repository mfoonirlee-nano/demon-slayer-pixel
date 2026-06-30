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

function rgba(color: readonly number[], alpha: number) {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

function lerpColor(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): readonly [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function clampAlpha(alpha: number) {
  return Math.max(0, Math.min(1, alpha));
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

function drawMoonPhaseGlowLayer(
  context: CanvasRenderingContext2D,
  frame: MoonPhaseFrame,
  color: readonly number[],
  alpha: number,
  blur: number,
) {
  const clampedAlpha = clampAlpha(alpha);
  if (clampedAlpha <= 0) return;

  context.save();
  context.globalAlpha = clampedAlpha;
  context.shadowColor = rgba(color, 1);
  context.shadowBlur = Math.max(0, blur);
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  drawMoonPhaseFrame(context, frame);
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
  const currentFarColor = lerpColor(MOON_GLOW_CONFIG.farGlowColor, MOON_GLOW_CONFIG.bloodFarColor, bloodLerp);
  const currentOuterColor = lerpColor(MOON_GLOW_CONFIG.outerGlowColor, MOON_GLOW_CONFIG.bloodOuterColor, bloodLerp);
  const farGlowAlpha = Math.max(
    0,
    (MOON_GLOW_CONFIG.farGlowAlpha
      + (MOON_GLOW_CONFIG.bloodFarAlpha - MOON_GLOW_CONFIG.farGlowAlpha) * bloodLerp
      + motion.basePulse * FAR_GLOW_ALPHA_PULSE) * phaseGlowScale,
  ) * FAR_GLOW_ALPHA_SCALE;
  const farGlowBlur = (
    MOON_GLOW_CONFIG.farGlowBlur
      + motion.basePulse * FAR_GLOW_BASE_PULSE_BLUR
      + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost * FAR_GLOW_BLOOD_BLUR_SCALE
  ) * phaseGlowScale;
  const outerGlowAlpha = Math.max(
    0,
    (MOON_GLOW_CONFIG.outerGlowAlpha
      + (MOON_GLOW_CONFIG.bloodOuterAlpha - MOON_GLOW_CONFIG.outerGlowAlpha) * bloodLerp
      + motion.basePulse * OUTER_GLOW_ALPHA_PULSE) * phaseGlowScale,
  ) * OUTER_GLOW_ALPHA_SCALE;
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

  drawMoonPhaseGlowLayer(context, frame, currentFarColor, farGlowAlpha, farGlowBlur);
  drawMoonPhaseGlowLayer(context, frame, currentOuterColor, outerGlowAlpha, outerGlowBlur);
  drawMoonPhaseGlowLayer(context, frame, MOON_GLOW_CONFIG.coolGlowColor, coolAlpha, coolBlur);

  if (bloodLerp > 0) {
    const ringAlpha = bloodLerp * (
      MOON_GLOW_CONFIG.bloodRingAlpha + Math.max(0, motion.bloodWaveAmount) * MOON_MOTION_CONFIG.bloodWave.alphaBoost
    ) * bloodRingGlowScale * BLOOD_RING_ALPHA_SCALE;
    const ringBlur = (
      MOON_GLOW_CONFIG.bloodRingBlur + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost
    ) * bloodRingGlowScale;
    drawMoonPhaseGlowLayer(context, frame, MOON_GLOW_CONFIG.bloodRingColor, ringAlpha, ringBlur);
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
    upperOverlay: rgba(MOON_SKY_CONFIG.upperOverlayColor, bloodLerp * MOON_SKY_CONFIG.upperOverlayAlpha),
    midOverlay: rgba(MOON_SKY_CONFIG.midOverlayColor, bloodLerp * MOON_SKY_CONFIG.midOverlayAlpha),
  };
}
