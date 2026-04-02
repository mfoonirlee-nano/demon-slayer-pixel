import { ctx } from "../context";
import { WIDTH } from "../constants";
import { colorLerp, lerp } from "../utils";
import {
  MOON_GLOW_CONFIG,
  MOON_LAYOUT,
  MOON_MOTION_CONFIG,
  MOON_SKY_CONFIG,
  MOON_STAR_CONFIG,
  MOON_SURFACE_CONFIG,
} from "./constants";
import type { MoonState } from "./types";

type StarPoint = {
  x: number;
  y: number;
  size: number;
  twinkle: number;
};

const STAR_FIELD: StarPoint[] = Array.from({ length: MOON_STAR_CONFIG.count }, (_, i) => ({
  x: (i * MOON_STAR_CONFIG.xStep) % WIDTH,
  y: MOON_STAR_CONFIG.minY + ((i * MOON_STAR_CONFIG.yStep) % MOON_STAR_CONFIG.yRange),
  size: i % MOON_STAR_CONFIG.largeEvery === 0 ? MOON_STAR_CONFIG.largeSize : MOON_STAR_CONFIG.smallSize,
  twinkle: (i * MOON_STAR_CONFIG.twinkleStep) % MOON_STAR_CONFIG.twinkleRange,
}));

function rgba(color: readonly number[], alpha: number) {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

function getMoonMotion(elapsed: number, bloodLerp: number) {
  const { moonDrift, shimmer, pulse, bloodWave } = MOON_MOTION_CONFIG;
  // 保持血月原有的脉冲，增加一个始终存在的柔和基础呼吸脉冲
  const basePulse = Math.sin(elapsed * pulse.speed * 0.5);
  const pulseWave = (0.5 + 0.5 * Math.sin(elapsed * pulse.speed + pulse.phase)) * bloodLerp;
  const bloodWaveAmount = Math.sin(elapsed * bloodWave.speed + bloodWave.phase) * (0.35 + bloodLerp * 0.65);

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

function drawMoonStars(context: CanvasRenderingContext2D, elapsed: number, bloodLerp: number) {
  for (const star of STAR_FIELD) {
    const twinkleOn = Math.floor(elapsed * MOON_STAR_CONFIG.twinkleSpeed + star.twinkle) % MOON_STAR_CONFIG.twinkleOffModulo !== 0;
    const suppressed = bloodLerp > MOON_STAR_CONFIG.skipThreshold
      && (star.twinkle + Math.floor(elapsed * MOON_STAR_CONFIG.bloodTwinkleSpeed)) % MOON_STAR_CONFIG.skipModulo === 0;
    if (!twinkleOn || suppressed) continue;

    context.fillStyle = star.size === MOON_STAR_CONFIG.largeSize
      ? rgba(MOON_STAR_CONFIG.brightColor, 1 - bloodLerp * MOON_STAR_CONFIG.brightDimAlpha)
      : rgba(MOON_STAR_CONFIG.dimColor, 1 - bloodLerp * MOON_STAR_CONFIG.dimDimAlpha);
    context.fillRect(star.x, star.y, star.size, star.size);
  }
}

export function drawMoon(options: { elapsed: number; moon: MoonState }) {
  if (!ctx) return;

  const { elapsed, moon } = options;
  const bloodLerp = moon.bloodLerp;
  const motion = getMoonMotion(elapsed, bloodLerp);
  const cycle = 0.5 + 0.5 * Math.sin(elapsed * MOON_MOTION_CONFIG.colorCycleSpeed);
  const moonBaseRGB = [
    Math.round(lerp(MOON_SURFACE_CONFIG.baseColorA[0], MOON_SURFACE_CONFIG.baseColorB[0], cycle)),
    Math.round(lerp(MOON_SURFACE_CONFIG.baseColorA[1], MOON_SURFACE_CONFIG.baseColorB[1], cycle)),
    Math.round(lerp(MOON_SURFACE_CONFIG.baseColorA[2], MOON_SURFACE_CONFIG.baseColorB[2], cycle)),
  ];
  const moonColor = colorLerp(moonBaseRGB, MOON_SURFACE_CONFIG.bloodCoreColor as unknown as number[], bloodLerp);
  const moonX = MOON_LAYOUT.x + motion.moonX;
  const moonY = MOON_LAYOUT.y + motion.moonY;
  const bloodRingRadius = MOON_GLOW_CONFIG.bloodRingRadius + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost;
  // 放大呼吸动画的振幅 (原本 1.5 -> 8, 2.5 -> 15)，让变化更明显
  const outerGlowRadius = MOON_GLOW_CONFIG.outerGlowRadius + motion.basePulse * 8 + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost * 1.5;
  const farGlowRadius = MOON_GLOW_CONFIG.farGlowRadius + motion.basePulse * 15 + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost * 2;

  // 添加透明度波动，让呼吸更有质感
  const farGlowAlpha = Math.max(0, MOON_GLOW_CONFIG.farGlowAlpha + motion.basePulse * 0.03);
  const outerGlowAlpha = Math.max(0, MOON_GLOW_CONFIG.outerGlowAlpha + motion.basePulse * 0.05);

  const context = ctx;

  drawMoonStars(context, elapsed, bloodLerp);

  context.save();
  // 最外层模糊光晕
  context.shadowColor = rgba(MOON_GLOW_CONFIG.farGlowColor, farGlowAlpha);
  context.shadowBlur = MOON_GLOW_CONFIG.farGlowBlur;
  context.fillStyle = rgba(MOON_GLOW_CONFIG.farGlowColor, farGlowAlpha);
  context.beginPath();
  context.arc(moonX, moonY, farGlowRadius, 0, Math.PI * 2);
  context.fill();

  // 次外层模糊光晕
  context.shadowColor = rgba(MOON_GLOW_CONFIG.outerGlowColor, outerGlowAlpha);
  context.shadowBlur = MOON_GLOW_CONFIG.outerGlowBlur;
  context.fillStyle = rgba(MOON_GLOW_CONFIG.outerGlowColor, outerGlowAlpha);
  context.beginPath();
  context.arc(moonX, moonY, outerGlowRadius, 0, Math.PI * 2);
  context.fill();

  context.shadowColor = rgba(MOON_GLOW_CONFIG.coolGlowColor, (1 - bloodLerp * 0.35) * MOON_GLOW_CONFIG.coolGlowAlpha);
  context.shadowBlur = MOON_GLOW_CONFIG.coolGlowBlur;
  context.fillStyle = rgba(MOON_GLOW_CONFIG.coolGlowColor, (1 - bloodLerp * 0.35) * MOON_GLOW_CONFIG.coolGlowAlpha);
  context.beginPath();
  context.arc(moonX, moonY, MOON_GLOW_CONFIG.coolGlowRadius + motion.pulseWave * 1.4, 0, Math.PI * 2);
  context.fill();

  context.shadowColor = rgba(MOON_GLOW_CONFIG.bloodRingColor, bloodLerp * (MOON_GLOW_CONFIG.bloodRingAlpha + Math.max(0, motion.bloodWaveAmount) * MOON_MOTION_CONFIG.bloodWave.alphaBoost));
  context.shadowBlur = MOON_GLOW_CONFIG.bloodRingBlur;
  context.fillStyle = rgba(MOON_GLOW_CONFIG.bloodRingColor, bloodLerp * MOON_GLOW_CONFIG.bloodRingAlpha);
  context.beginPath();
  context.arc(moonX, moonY, bloodRingRadius, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.fillStyle = rgba(MOON_SURFACE_CONFIG.shadowColor, bloodLerp * MOON_SURFACE_CONFIG.shadowAlpha);
  context.beginPath();
  context.arc(moonX, moonY, MOON_LAYOUT.shadowRadius + motion.pulseWave * 1.2, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = moonColor;
  context.beginPath();
  context.arc(moonX, moonY, MOON_LAYOUT.coreRadius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = colorLerp([156, 176, 208], MOON_SURFACE_CONFIG.craterColor as unknown as number[], bloodLerp);
  for (const crater of MOON_SURFACE_CONFIG.craterRows) {
    context.fillRect(
      moonX + crater.x + motion.shimmerX * crater.driftX,
      moonY + crater.y + motion.shimmerY * crater.driftY,
      crater.w,
      crater.h,
    );
  }

  context.fillStyle = colorLerp([255, 255, 255], MOON_SURFACE_CONFIG.highlightColor as unknown as number[], bloodLerp);
  context.globalAlpha = MOON_SURFACE_CONFIG.highlightAlpha + (1 - bloodLerp) * 0.08 + motion.pulseWave * 0.04 + Math.max(0, motion.shimmerX) * MOON_SURFACE_CONFIG.shimmerAlpha;
  context.beginPath();
  context.arc(
    moonX + MOON_LAYOUT.highlightOffsetX + motion.shimmerX,
    moonY + MOON_LAYOUT.highlightOffsetY + motion.shimmerY,
    MOON_LAYOUT.highlightRadius,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.globalAlpha = 1;
}

export function getMoonSkyColors(moon: MoonState) {
  const bloodLerp = moon.bloodLerp;

  return {
    nightTop: colorLerp(MOON_SKY_CONFIG.baseTop as unknown as number[], MOON_SKY_CONFIG.bloodTop as unknown as number[], bloodLerp),
    nightMid: colorLerp(MOON_SKY_CONFIG.baseMid as unknown as number[], MOON_SKY_CONFIG.bloodMid as unknown as number[], bloodLerp * MOON_SKY_CONFIG.midBlend),
    nightLow: colorLerp(MOON_SKY_CONFIG.baseLow as unknown as number[], MOON_SKY_CONFIG.bloodLow as unknown as number[], bloodLerp * MOON_SKY_CONFIG.lowBlend),
    upperOverlay: rgba(MOON_SKY_CONFIG.upperOverlayColor, bloodLerp * MOON_SKY_CONFIG.upperOverlayAlpha),
    midOverlay: rgba(MOON_SKY_CONFIG.midOverlayColor, bloodLerp * MOON_SKY_CONFIG.midOverlayAlpha),
  };
}
