import { RESIDUAL_SPIRIT_CONFIG, RESIDUAL_SPIRIT_PICKUP_SPRITE } from "../constants";
import { playTone } from "../game/audio";
import { recordCollisionDebugRect } from "../game/collisionDebug";
import { state } from "../game/state";
import { hitbox } from "../game/utils";
import { ctx } from "../rendering/context";
import type { EnemyState, ResidualSpiritState } from "../types/game-state";
import { storeResidualSpirit } from "../systems/residualSpirit";
import { emitHitBurst } from "./particle";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const HALF = 0.5;
const SPIRIT_BURST_COLOR = "#8feaff";
const SPIRIT_AURA_COLOR_RGB = "116,224,255";
const AURA_PULSE_BASE = 0.75;
const AURA_PULSE_AMPLITUDE = 0.25;
const AURA_ARM_RATIO = 0.36;
const AURA_CORE_RATIO = 0.58;

function residualSpiritPosition(spirit: ResidualSpiritState) {
  return {
    x: spirit.x,
    y: spirit.y + Math.sin(spirit.phase) * RESIDUAL_SPIRIT_CONFIG.pickup.bobAmplitude,
  };
}

function residualSpiritBox(spirit: ResidualSpiritState) {
  const position = residualSpiritPosition(spirit);
  const size = RESIDUAL_SPIRIT_CONFIG.pickup.collisionSize;
  return {
    x: position.x - size * HALF,
    y: position.y - size * HALF,
    w: size,
    h: size,
  };
}

export function spawnResidualSpirit(
  enemy: Pick<EnemyState, "x" | "y" | "w" | "h">,
  amount: number,
) {
  if (amount <= 0) return;

  state.residualSpirits.push({
    x: enemy.x + enemy.w * HALF,
    y: enemy.y + enemy.h * HALF,
    amount,
    phase: Math.random() * FULL_CIRCLE_RADIANS,
    lifetime: RESIDUAL_SPIRIT_CONFIG.pickup.lifetimeSeconds,
  });
}

function moveTowardPlayer(spirit: ResidualSpiritState, dt: number) {
  if (state.player.residualSpirit >= RESIDUAL_SPIRIT_CONFIG.maxStored) return;

  const playerX = state.player.x + state.player.w * HALF;
  const playerY = state.player.y + state.player.h * HALF;
  const dx = playerX - spirit.x;
  const dy = playerY - spirit.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0 || distance > RESIDUAL_SPIRIT_CONFIG.pickup.magnetRadius) return;

  const travel = Math.min(distance, RESIDUAL_SPIRIT_CONFIG.pickup.magnetSpeed * dt);
  spirit.x += dx / distance * travel;
  spirit.y += dy / distance * travel;
}

function collectResidualSpirit(spirit: ResidualSpiritState) {
  const storedAmount = storeResidualSpirit(state.player, spirit.amount);
  if (storedAmount <= 0) return false;

  spirit.amount -= storedAmount;
  const position = residualSpiritPosition(spirit);
  emitHitBurst(
    position.x,
    position.y,
    SPIRIT_BURST_COLOR,
    RESIDUAL_SPIRIT_CONFIG.pickup.pickupBurstPower,
  );
  const tone = RESIDUAL_SPIRIT_CONFIG.pickup.pickupTone;
  playTone(tone.frequency, tone.duration, "triangle", tone.volume);
  return spirit.amount <= 0;
}

export function updateResidualSpirits(dt: number) {
  for (let index = state.residualSpirits.length - 1; index >= 0; index -= 1) {
    const spirit = state.residualSpirits[index];
    spirit.lifetime -= dt;
    if (spirit.lifetime <= 0) {
      state.residualSpirits.splice(index, 1);
      continue;
    }

    spirit.phase += dt * RESIDUAL_SPIRIT_CONFIG.pickup.bobSpeed;
    moveTowardPlayer(spirit, dt);
    const box = residualSpiritBox(spirit);
    recordCollisionDebugRect(box, "pickup");
    if (hitbox(state.player, box) && collectResidualSpirit(spirit)) {
      state.residualSpirits.splice(index, 1);
    }
  }
}

export function drawResidualSpirits() {
  if (!ctx) return;

  const sprite = RESIDUAL_SPIRIT_PICKUP_SPRITE;
  for (const spirit of state.residualSpirits) {
    const position = residualSpiritPosition(spirit);
    const drawX = Math.round(position.x);
    const drawY = Math.round(position.y);
    const pulse = AURA_PULSE_BASE + Math.sin(spirit.phase * HALF) * AURA_PULSE_AMPLITUDE;
    const auraSize = sprite.drawW + RESIDUAL_SPIRIT_CONFIG.pickup.auraPadding * 2;
    const auraArm = Math.round(auraSize * AURA_ARM_RATIO * HALF) / HALF;
    const auraCore = Math.round(auraSize * AURA_CORE_RATIO * HALF) / HALF;

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    ctx.globalAlpha = baseAlpha * RESIDUAL_SPIRIT_CONFIG.pickup.auraAlpha * pulse;
    ctx.fillStyle = `rgb(${SPIRIT_AURA_COLOR_RGB})`;
    ctx.fillRect(drawX - auraArm * HALF, drawY - auraSize * HALF, auraArm, auraSize);
    ctx.fillRect(drawX - auraSize * HALF, drawY - auraArm * HALF, auraSize, auraArm);
    ctx.fillRect(drawX - auraCore * HALF, drawY - auraCore * HALF, auraCore, auraCore);
    ctx.globalAlpha = baseAlpha;
    if (sprite.image) {
      ctx.drawImage(
        sprite.image,
        0,
        0,
        sprite.w,
        sprite.h,
        drawX - sprite.drawW * HALF,
        drawY - sprite.drawH * HALF,
        sprite.drawW,
        sprite.drawH,
      );
    }
    ctx.restore();
  }
}
