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

function drawGlow(context: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: readonly number[], alpha: number) {
  const grad = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${alpha})`);
  grad.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  context.fillStyle = grad;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
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

  // 最外层散射（radialGradient 替代 shadowBlur）
  drawGlow(context, moonX, moonY, farGlowRadius, currentFarColor, farGlowAlpha * 2.2);

  // 次外层散射
  drawGlow(context, moonX, moonY, outerGlowRadius, currentOuterColor, outerGlowAlpha * 2.0);

  // 内层月光晕（血月时减弱）
  const coolAlpha = (1 - bloodLerp * 0.8) * MOON_GLOW_CONFIG.coolGlowAlpha;
  drawGlow(context, moonX, moonY, MOON_GLOW_CONFIG.coolGlowRadius + motion.pulseWave * 1.4, MOON_GLOW_CONFIG.coolGlowColor, coolAlpha * 2.0);

  // 血月光环
  if (bloodLerp > 0) {
    const ringAlpha = bloodLerp * (MOON_GLOW_CONFIG.bloodRingAlpha + Math.max(0, motion.bloodWaveAmount) * MOON_MOTION_CONFIG.bloodWave.alphaBoost);
    drawGlow(context, moonX, moonY, bloodRingRadius, MOON_GLOW_CONFIG.bloodRingColor, ringAlpha * 2.0);
  }

  const spriteImg = SKY_SPRITES.image;
  const moonDrawSize = MOON_LAYOUT.coreRadius * 2;
  const moonDrawX = moonX - MOON_LAYOUT.coreRadius;
  const moonDrawY = moonY - MOON_LAYOUT.coreRadius;
  const { sx, sy, sw, sh } = SKY_SPRITES.moon;

  if (spriteImg) {
    context.drawImage(spriteImg, sx, sy, sw, sh, moonDrawX, moonDrawY, moonDrawSize, moonDrawSize);
    if (bloodLerp > 0) {
      // 直接在主 canvas 叠色：用圆形裁剪区域限制到月亮范围
      context.save();
      context.beginPath();
      context.arc(moonX, moonY, MOON_LAYOUT.coreRadius, 0, Math.PI * 2);
      context.clip();
      context.fillStyle = `rgba(60,0,0,${bloodLerp * 0.55})`;
      context.fillRect(moonDrawX, moonDrawY, moonDrawSize, moonDrawSize);
      const [tintR, tintG, tintB] = MOON_SURFACE_CONFIG.bloodCoreColor;
      context.fillStyle = `rgba(${tintR},${tintG},${tintB},${bloodLerp * 0.5})`;
      context.fillRect(moonDrawX, moonDrawY, moonDrawSize, moonDrawSize);
      context.restore();
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
