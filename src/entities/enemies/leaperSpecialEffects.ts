import { GROUND_Y } from "../../constants";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { ctx } from "../../rendering/context";
import type { EnemyState, LeaperPhase } from "../../types/game-state";
import { emitParticle } from "../particles/bursts";
import { enemyAttackDamage, enemyCenterX, enemyFeetY } from "./common";

type ImpactBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const HALF_DIVISOR = 2;
const FULL_CIRCLE = Math.PI * 2;
const WARNING_RADIUS_Y = 7;
const WARNING_WINDUP_ALPHA_BASE = 0.2;
const WARNING_WINDUP_ALPHA_SCALE = 0.28;
const WARNING_LEAP_ALPHA_BASE = 0.42;
const WARNING_LEAP_ALPHA_SCALE = 0.12;
const WARNING_IMPACT_ALPHA = 0.24;
const WARNING_Y_OFFSET = 3;
const WARNING_CRACK_LEFT_X = -32;
const WARNING_CRACK_LEFT_W = 22;
const WARNING_CRACK_RIGHT_X = 10;
const WARNING_CRACK_RIGHT_W = 25;
const WARNING_CRACK_CENTER_X = -6;
const WARNING_CRACK_CENTER_Y = 3;
const WARNING_CRACK_CENTER_W = 14;
const WARNING_CRACK_H = 2;
const SKY_WARNING_LINE_WIDTH = 3;
const SKY_WARNING_RADIUS_Y = 9;
const SKY_WARNING_ALPHA_BASE = 0.38;
const SKY_WARNING_ALPHA_PULSE = 0.34;
const SKY_WARNING_PULSE_CYCLES = 2;
const SKY_WARNING_COLOR = "rgba(202, 34, 48, 1)";
const SKY_WARNING_FILL = "rgba(116, 20, 30, 1)";
const AWAKENED_SPIKES = {
  count: 8,
  speed: 3.2,
  lifeFrames: 84,
  damageMultiplier: 0.65,
  damageBonus: 1,
  size: 10,
  backOffsetRatio: 0.16,
  heightRatio: 0.28,
} as const;
const FINAL_IMPACT_ROCKS = {
  count: 16,
  speedBase: 3.2,
  speedVariance: 2.4,
  sizeBase: 4,
  sizeVariance: 5,
  lifeBase: 34,
  lifeVariance: 14,
  horizontalSpread: 46,
  gravity: 0.24,
  velocityFade: 0.985,
  angularVelocityRange: 0.22,
  colors: ["#796151", "#5d4a43", "#8d7861", "#46393a"],
} as const;

export function releaseAwakenedLeaperSpikes(enemy: EnemyState) {
  enemy.hasReleasedLeaperSpikes = true;
  const facing = enemy.leaperFacing ?? 1;
  const originX = enemyCenterX(enemy) - facing * enemy.w * AWAKENED_SPIKES.backOffsetRatio;
  const originY = enemy.y + enemy.h * AWAKENED_SPIKES.heightRatio;
  const damage = enemyAttackDamage(
    enemy,
    enemy.damage * AWAKENED_SPIKES.damageMultiplier + AWAKENED_SPIKES.damageBonus,
  );

  for (let index = 0; index < AWAKENED_SPIKES.count; index += 1) {
    const angle = -Math.PI / HALF_DIVISOR + index * FULL_CIRCLE / AWAKENED_SPIKES.count;
    state.projectiles.push({
      kind: "leaperSpike",
      x: originX - AWAKENED_SPIKES.size / HALF_DIVISOR,
      y: originY - AWAKENED_SPIKES.size / HALF_DIVISOR,
      w: AWAKENED_SPIKES.size,
      h: AWAKENED_SPIKES.size,
      vx: Math.cos(angle) * AWAKENED_SPIKES.speed,
      vy: Math.sin(angle) * AWAKENED_SPIKES.speed,
      life: AWAKENED_SPIKES.lifeFrames,
      damage,
    });
  }
}

export function emitFinalLeaperImpactRocks(enemy: EnemyState) {
  const originX = enemyCenterX(enemy);
  const originY = enemyFeetY(enemy);

  for (let index = 0; index < FINAL_IMPACT_ROCKS.count; index += 1) {
    const progress = (index + 0.5) / FINAL_IMPACT_ROCKS.count;
    const angle = -Math.PI + progress * Math.PI;
    const speed = FINAL_IMPACT_ROCKS.speedBase + Math.random() * FINAL_IMPACT_ROCKS.speedVariance;
    const size = FINAL_IMPACT_ROCKS.sizeBase + Math.random() * FINAL_IMPACT_ROCKS.sizeVariance;
    emitParticle({
      kind: "leaperRock",
      x: originX + (Math.random() - 0.5) * FINAL_IMPACT_ROCKS.horizontalSpread - size / HALF_DIVISOR,
      y: originY - size,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: FINAL_IMPACT_ROCKS.lifeBase + Math.random() * FINAL_IMPACT_ROCKS.lifeVariance,
      color: FINAL_IMPACT_ROCKS.colors[index % FINAL_IMPACT_ROCKS.colors.length],
      size,
      fade: FINAL_IMPACT_ROCKS.velocityFade,
      gravity: FINAL_IMPACT_ROCKS.gravity,
      rotation: Math.random() * FULL_CIRCLE,
      angularVelocity: (Math.random() - 0.5) * FINAL_IMPACT_ROCKS.angularVelocityRange,
    });
  }
}

function drawLandingWarning(enemy: EnemyState, phase: LeaperPhase, impactBox: ImpactBox) {
  if (!ctx || enemy.leaperLandingX === undefined) return;
  if (phase !== "windup" && phase !== "leap" && phase !== "impact") return;

  const duration = Math.max(1, enemy.leaperPhaseDuration ?? 1);
  const progress = clamp((duration - (enemy.leaperTimer ?? 0)) / duration, 0, 1);
  const alpha = phase === "windup"
    ? WARNING_WINDUP_ALPHA_BASE + progress * WARNING_WINDUP_ALPHA_SCALE
    : phase === "leap"
      ? WARNING_LEAP_ALPHA_BASE - progress * WARNING_LEAP_ALPHA_SCALE
      : WARNING_IMPACT_ALPHA;
  const x = enemy.leaperLandingX + enemy.w / HALF_DIVISOR;
  const y = (enemy.leaperLandingY ?? GROUND_Y - enemy.h) + enemy.h - WARNING_Y_OFFSET;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(136, 47, 34, 1)";
  ctx.fillStyle = "rgba(86, 31, 29, 1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, impactBox.w / HALF_DIVISOR, WARNING_RADIUS_Y, 0, 0, FULL_CIRCLE);
  ctx.stroke();
  ctx.fillRect(x + WARNING_CRACK_LEFT_X, y - 1, WARNING_CRACK_LEFT_W, WARNING_CRACK_H);
  ctx.fillRect(x + WARNING_CRACK_RIGHT_X, y - WARNING_CRACK_H, WARNING_CRACK_RIGHT_W, WARNING_CRACK_H);
  ctx.fillRect(
    x + WARNING_CRACK_CENTER_X,
    y + WARNING_CRACK_CENTER_Y,
    WARNING_CRACK_CENTER_W,
    WARNING_CRACK_H,
  );
  ctx.restore();
}

function drawSkyWarning(enemy: EnemyState, phase: LeaperPhase, impactBox: ImpactBox) {
  if (!ctx || enemy.leaperLandingX === undefined || enemy.leaperLandingY === undefined) return;
  if (phase !== "skyWait" && phase !== "skyFall") return;

  const duration = Math.max(1, enemy.leaperPhaseDuration ?? 1);
  const progress = clamp((duration - (enemy.leaperTimer ?? 0)) / duration, 0, 1);
  const pulse = (Math.sin(progress * FULL_CIRCLE * SKY_WARNING_PULSE_CYCLES) + 1) / HALF_DIVISOR;
  const surfaceY = enemy.leaperLandingY + enemy.h;
  const centerX = enemy.leaperLandingX + enemy.w / HALF_DIVISOR;

  ctx.save();
  ctx.globalAlpha = SKY_WARNING_ALPHA_BASE + pulse * SKY_WARNING_ALPHA_PULSE;
  ctx.fillStyle = SKY_WARNING_COLOR;
  ctx.fillRect(impactBox.x, 0, SKY_WARNING_LINE_WIDTH, surfaceY);
  ctx.fillRect(
    impactBox.x + impactBox.w - SKY_WARNING_LINE_WIDTH,
    0,
    SKY_WARNING_LINE_WIDTH,
    surfaceY,
  );
  ctx.strokeStyle = SKY_WARNING_COLOR;
  ctx.fillStyle = SKY_WARNING_FILL;
  ctx.lineWidth = SKY_WARNING_LINE_WIDTH;
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    surfaceY - WARNING_Y_OFFSET,
    impactBox.w / HALF_DIVISOR,
    SKY_WARNING_RADIUS_Y,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.stroke();
  ctx.restore();
}

export function drawLeaperAttackWarnings(enemy: EnemyState, phase: LeaperPhase, impactBox: ImpactBox) {
  drawSkyWarning(enemy, phase, impactBox);
  drawLandingWarning(enemy, phase, impactBox);
}
