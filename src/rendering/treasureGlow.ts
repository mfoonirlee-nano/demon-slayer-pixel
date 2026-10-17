import { TREASURE_GLOW as GLOW } from "../constants/treasureVisual";

const TAU = Math.PI * 2;
const HALF = 0.5;

export type TreasureGlowInput = {
  x: number;
  y: number;
  phase: number;
  strength: number;
  hold?: number;
  reveal?: number;
};

function bloom(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width, height);
  // Canvas gradients capture the transform at creation, so anchor it after scaling.
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  gradient.addColorStop(0, GLOW.palette.bloomCore);
  gradient.addColorStop(GLOW.bloom.innerStop, GLOW.palette.bloomInner);
  gradient.addColorStop(GLOW.bloom.middleStop, GLOW.palette.bloomMiddle);
  gradient.addColorStop(GLOW.bloom.fringeStop, GLOW.palette.bloomFringe);
  gradient.addColorStop(1, GLOW.palette.clear);
  ctx.fillStyle = gradient;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function ribbon(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  radius: number, start: number, length: number, phase: number,
  strength: number, heightScale: number,
) {
  const points: { x: number; y: number }[] = [];
  for (let step = 0; step <= GLOW.ribbons.segments; step += 1) {
    const angle = start + length * step / GLOW.ribbons.segments;
    const ripple = Math.sin(angle * GLOW.ribbons.rippleFrequency + phase) * GLOW.ribbons.ripple;
    const px = Math.round(x + Math.cos(angle) * (radius + ripple));
    const py = Math.round(y + Math.sin(angle) * (radius + ripple) * heightScale);
    points.push({ x: px, y: py });
  }
  // A faint wide pass and a sharp core give local bloom without blurring the scene.
  const sectionSteps = GLOW.ribbons.segments / GLOW.ribbons.fadeSections;
  for (let section = 0; section < GLOW.ribbons.fadeSections; section += 1) {
    const head = (section + 1) / GLOW.ribbons.fadeSections;
    const taper = GLOW.ribbons.tailMinStrength + head * head * (1 - GLOW.ribbons.tailMinStrength);
    const startPoint = points[section * sectionSteps];
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    for (let step = 1; step <= sectionSteps; step += 1) {
      const point = points[section * sectionSteps + step];
      ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = GLOW.palette.tide;
    ctx.lineWidth = GLOW.ribbons.softWidth;
    ctx.globalAlpha = strength * GLOW.ribbons.softAlpha * taper;
    ctx.stroke();
    ctx.strokeStyle = GLOW.palette.silver;
    ctx.lineWidth = GLOW.ribbons.coreWidth;
    ctx.globalAlpha = strength * GLOW.ribbons.coreAlpha * taper;
    ctx.stroke();
  }
  if (length < TAU) {
    const tip = points[points.length - 1];
    ctx.globalAlpha = strength * GLOW.ribbons.coreAlpha;
    ctx.fillStyle = GLOW.palette.silver;
    ctx.fillRect(tip.x, tip.y, GLOW.ribbons.tipSize, GLOW.ribbons.tipSize);
  }
}

function shafts(ctx: CanvasRenderingContext2D, input: TreasureGlowInput, revealStrength: number) {
  for (let index = 0; index < GLOW.shafts.count; index += 1) {
    const angle = -Math.PI * HALF + (index - (GLOW.shafts.count - 1) * HALF) * GLOW.shafts.spread
      + Math.sin(input.phase * GLOW.shafts.speed + index) * GLOW.shafts.sway;
    const length = GLOW.shafts.length + Math.sin(index) * GLOW.shafts.lengthVariation
      + revealStrength * GLOW.reveal.rayGrowth;
    const centerY = input.y - GLOW.centerOffsetY;
    const endX = input.x + Math.cos(angle) * length;
    const endY = centerY + Math.sin(angle) * length;
    const gradient = ctx.createLinearGradient(input.x, centerY, endX, endY);
    gradient.addColorStop(0, GLOW.palette.silver);
    gradient.addColorStop(HALF, GLOW.palette.tide);
    gradient.addColorStop(1, GLOW.palette.clear);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = input.strength * GLOW.shafts.alpha;
    ctx.beginPath();
    ctx.moveTo(input.x - 1, centerY);
    ctx.lineTo(endX - GLOW.shafts.width, endY);
    ctx.lineTo(endX + GLOW.shafts.width, endY);
    ctx.lineTo(input.x + 1, centerY);
    ctx.closePath();
    ctx.fill();
  }
}

function dust(ctx: CanvasRenderingContext2D, input: TreasureGlowInput) {
  const hold = input.hold ?? 0;
  for (let index = 0; index < GLOW.dust.count; index += 1) {
    const age = (input.phase * GLOW.dust.cycleSpeed + index * GLOW.dust.phaseStep) % 1;
    const fade = Math.sin(age * Math.PI);
    const seedAngle = index * GLOW.dust.phaseStep * TAU;
    const offsetX = Math.cos(seedAngle) * GLOW.dust.spread
      + Math.sin(input.phase * GLOW.dust.swaySpeed + seedAngle) * GLOW.dust.sway;
    const x = Math.round(input.x + offsetX * (1 - hold));
    const y = Math.round(input.y - age * GLOW.dust.rise * (1 - hold) - GLOW.centerOffsetY * hold);
    const alpha = input.strength * fade * fade;
    ctx.fillStyle = index % GLOW.dust.goldEvery === 0 ? GLOW.palette.gold : GLOW.palette.tide;
    for (let trail = GLOW.dust.trailSteps; trail > 0; trail -= 1) {
      ctx.globalAlpha = alpha * GLOW.dust.trailAlpha / trail;
      ctx.fillRect(x, y + trail * GLOW.dust.trailSpacing, 1, GLOW.dust.coreSize);
    }
    ctx.globalAlpha = alpha * HALF;
    ctx.fillRect(x - GLOW.dust.sparkleSize * HALF, y, GLOW.dust.sparkleSize, 1);
    ctx.fillRect(x, y - GLOW.dust.sparkleSize * HALF, 1, GLOW.dust.sparkleSize);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = GLOW.palette.silver;
    ctx.fillRect(x, y, GLOW.dust.coreSize, GLOW.dust.coreSize);
  }
}

export function drawTreasureGlow(ctx: CanvasRenderingContext2D, input: TreasureGlowInput) {
  if (input.strength <= 0) return;
  const hold = input.hold ?? 0;
  const centerY = input.y - GLOW.centerOffsetY;
  const breath = (1 - Math.cos(input.phase * TAU / GLOW.breathSeconds)) * HALF;
  const radius = GLOW.radius + breath * GLOW.radiusBreath;
  const reveal = input.reveal;
  const opening = reveal === undefined ? 0
    : Math.max(0, (reveal - GLOW.reveal.openProgress) / (1 - GLOW.reveal.openProgress));

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = input.strength;
  bloom(ctx, input.x, centerY, radius, radius * GLOW.bloom.heightScale);
  bloom(ctx, input.x, input.y - 2, GLOW.bloom.floorWidth, GLOW.bloom.floorHeight);
  // Reserve additive light for small accents; keep the broad aura translucent.
  ctx.globalCompositeOperation = "lighter";
  shafts(ctx, input, Math.sin(opening * Math.PI));
  GLOW.ribbons.bands.forEach((band, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    ribbon(ctx, input.x, centerY,
      band.radius * (1 - hold * GLOW.ribbons.holdContraction),
      input.phase * GLOW.ribbons.rotationSpeed * direction + index * GLOW.ribbons.phaseStep,
      band.length * TAU, input.phase,
      input.strength, GLOW.ribbons.heightScale);
  });
  dust(ctx, input);
  if (hold > 0) {
    ctx.globalAlpha = hold * input.strength * GLOW.hold.alpha;
    bloom(ctx, input.x, centerY, GLOW.hold.coreRadius, GLOW.hold.coreRadius);
  }
  if (opening > 0) {
    for (let ring = 0; ring < GLOW.reveal.ringCount; ring += 1) {
      const age = (opening - ring * GLOW.reveal.ringDelay) / (1 - ring * GLOW.reveal.ringDelay);
      if (age <= 0 || age >= 1) continue;
      ribbon(ctx, input.x, centerY, GLOW.reveal.ringRadius + age * GLOW.reveal.ringGrowth,
        ring * GLOW.ribbons.phaseStep, TAU, input.phase,
        input.strength * (1 - age) * (1 - age), GLOW.reveal.ringHeightScale);
    }
  }
  ctx.restore();
}
