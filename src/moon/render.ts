import { ctx } from "../context";
import { WIDTH, SKY_SPRITES } from "../constants";
import { colorLerp } from "../utils";
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

// Reused offscreen canvas for blood tint compositing
let moonOffscreen: HTMLCanvasElement | null = null;
let moonOffCtx: CanvasRenderingContext2D | null = null;

function getMoonOffscreen(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  if (!moonOffscreen || moonOffscreen.width !== size) {
    moonOffscreen = document.createElement("canvas");
    moonOffscreen.width = size;
    moonOffscreen.height = size;
    moonOffCtx = moonOffscreen.getContext("2d");
  }
  return [moonOffscreen, moonOffCtx!];
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
  const moonX = MOON_LAYOUT.x + motion.moonX;
  const moonY = MOON_LAYOUT.y + motion.moonY;
  const bloodRingRadius = MOON_GLOW_CONFIG.bloodRingRadius + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost;
  // 放大呼吸动画的振幅 (原本 1.5 -> 8, 2.5 -> 15)，让变化更明显
  const outerGlowRadius = MOON_GLOW_CONFIG.outerGlowRadius + motion.basePulse * 8 + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost * 1.5;
  const farGlowRadius = MOON_GLOW_CONFIG.farGlowRadius + motion.basePulse * 15 + motion.bloodWaveAmount * MOON_MOTION_CONFIG.bloodWave.radiusBoost * 2;

  const context = ctx;

  // 光晕颜色随 bloodLerp 从蓝白月光插值到血红，叠加呼吸波动
  const currentFarColor = lerpColor(MOON_GLOW_CONFIG.farGlowColor, MOON_GLOW_CONFIG.bloodFarColor, bloodLerp);
  const farGlowAlpha = Math.max(0, MOON_GLOW_CONFIG.farGlowAlpha + (MOON_GLOW_CONFIG.bloodFarAlpha - MOON_GLOW_CONFIG.farGlowAlpha) * bloodLerp + motion.basePulse * 0.03);
  const currentOuterColor = lerpColor(MOON_GLOW_CONFIG.outerGlowColor, MOON_GLOW_CONFIG.bloodOuterColor, bloodLerp);
  const outerGlowAlpha = Math.max(0, MOON_GLOW_CONFIG.outerGlowAlpha + (MOON_GLOW_CONFIG.bloodOuterAlpha - MOON_GLOW_CONFIG.outerGlowAlpha) * bloodLerp + motion.basePulse * 0.05);

  drawMoonStars(context, elapsed, bloodLerp);

  context.save();
  // 最外层散射：蓝白 → 暗血红
  context.shadowColor = rgba(currentFarColor, farGlowAlpha);
  context.shadowBlur = MOON_GLOW_CONFIG.farGlowBlur;
  context.fillStyle = rgba(currentFarColor, farGlowAlpha);
  context.beginPath();
  context.arc(moonX, moonY, farGlowRadius, 0, Math.PI * 2);
  context.fill();

  // 次外层散射：蓝白 → 亮血红
  context.shadowColor = rgba(currentOuterColor, outerGlowAlpha);
  context.shadowBlur = MOON_GLOW_CONFIG.outerGlowBlur;
  context.fillStyle = rgba(currentOuterColor, outerGlowAlpha);
  context.beginPath();
  context.arc(moonX, moonY, outerGlowRadius, 0, Math.PI * 2);
  context.fill();

  // 内层月光晕（蓝白，血月时减弱）
  context.shadowColor = rgba(MOON_GLOW_CONFIG.coolGlowColor, (1 - bloodLerp * 0.8) * MOON_GLOW_CONFIG.coolGlowAlpha);
  context.shadowBlur = MOON_GLOW_CONFIG.coolGlowBlur;
  context.fillStyle = rgba(MOON_GLOW_CONFIG.coolGlowColor, (1 - bloodLerp * 0.8) * MOON_GLOW_CONFIG.coolGlowAlpha);
  context.beginPath();
  context.arc(moonX, moonY, MOON_GLOW_CONFIG.coolGlowRadius + motion.pulseWave * 1.4, 0, Math.PI * 2);
  context.fill();

  // 血月光环（bloodLerp > 0 才有）
  if (bloodLerp > 0) {
    context.shadowColor = rgba(MOON_GLOW_CONFIG.bloodRingColor, bloodLerp * (MOON_GLOW_CONFIG.bloodRingAlpha + Math.max(0, motion.bloodWaveAmount) * MOON_MOTION_CONFIG.bloodWave.alphaBoost));
    context.shadowBlur = MOON_GLOW_CONFIG.bloodRingBlur;
    context.fillStyle = rgba(MOON_GLOW_CONFIG.bloodRingColor, bloodLerp * MOON_GLOW_CONFIG.bloodRingAlpha);
    context.beginPath();
    context.arc(moonX, moonY, bloodRingRadius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  const spriteImg = SKY_SPRITES.image;
  const moonDrawSize = MOON_LAYOUT.coreRadius * 2;
  const moonDrawX = moonX - MOON_LAYOUT.coreRadius;
  const moonDrawY = moonY - MOON_LAYOUT.coreRadius;
  const { sx, sy, sw, sh } = SKY_SPRITES.moon;

  if (spriteImg) {
    if (bloodLerp > 0) {
      // 血月叠色：先画原始 sprite，再叠两层：深化（multiply 暗化）+ 血红 tint
      const [offscreen, offCtx] = getMoonOffscreen(moonDrawSize);
      offCtx.clearRect(0, 0, moonDrawSize, moonDrawSize);
      offCtx.drawImage(spriteImg, sx, sy, sw, sh, 0, 0, moonDrawSize, moonDrawSize);

      // source-atop 确保所有叠色只覆盖 sprite 的不透明像素（圆形月亮区域）
      offCtx.globalCompositeOperation = "source-atop";

      // 第一层：暗化（深红低透明度模拟月蚀压暗）
      offCtx.fillStyle = `rgba(60,0,0,${bloodLerp * 0.55})`;
      offCtx.fillRect(0, 0, moonDrawSize, moonDrawSize);

      // 第二层：血红 tint
      const [tintR, tintG, tintB] = MOON_SURFACE_CONFIG.bloodCoreColor;
      offCtx.fillStyle = `rgba(${tintR},${tintG},${tintB},${bloodLerp * 0.5})`;
      offCtx.fillRect(0, 0, moonDrawSize, moonDrawSize);

      offCtx.globalCompositeOperation = "source-over";
      context.drawImage(offscreen, moonDrawX, moonDrawY);
    } else {
      context.drawImage(spriteImg, sx, sy, sw, sh, moonDrawX, moonDrawY, moonDrawSize, moonDrawSize);
    }
  } else {
    context.fillStyle = rgba(MOON_SURFACE_CONFIG.shadowColor, bloodLerp * MOON_SURFACE_CONFIG.shadowAlpha);
    context.beginPath();
    context.arc(moonX, moonY, MOON_LAYOUT.shadowRadius + motion.pulseWave * 1.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = colorLerp(MOON_SURFACE_CONFIG.baseColorA, MOON_SURFACE_CONFIG.bloodCoreColor, bloodLerp);
    context.beginPath();
    context.arc(moonX, moonY, MOON_LAYOUT.coreRadius, 0, Math.PI * 2);
    context.fill();
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
