import { RESIDUAL_SPIRIT_CONFIG, RESIDUAL_SPIRIT_PICKUP_SPRITE } from "../constants";
import { playTone } from "../game/audio";
import { recordCollisionDebugRect } from "../game/collisionDebug";
import { state } from "../game/state";
import { hitbox } from "../game/utils";
import { ctx } from "../rendering/context";
import type { EnemyState, ResidualSpiritState } from "../types/game-state";
import { storeResidualSpirit } from "../systems/residualSpirit";
import { emitHitBurst } from "./particle";
import { spawnResidualSpiritPickupFlight } from "./residualSpiritPickupFlight";

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const HALF = 0.5;
const SPIRIT_BURST_COLOR = "#8feaff";
const OUTER_AURA_MID_STOP = 0.42;
const INNER_AURA_MID_STOP = 0.32;
const AURA_HORIZONTAL_DRIFT_SPEED = 1.37;
const AURA_VERTICAL_DRIFT_SPEED = 0.83;

type AuraLayerProfile = {
  radiusRatio: number;
  radiusPulse: number;
  alphaBase: number;
  alphaPulse: number;
  phaseSpeed: number;
  phaseOffset: number;
  driftX: number;
  driftY: number;
  verticalOffset: number;
  colorStops: ReadonlyArray<readonly [number, string]>;
};

const OUTER_AURA_PROFILE: AuraLayerProfile = {
  radiusRatio: 1,
  radiusPulse: 0.06,
  alphaBase: 0.68,
  alphaPulse: 0.16,
  phaseSpeed: 0.43,
  phaseOffset: 0.2,
  driftX: 0.75,
  driftY: 0.45,
  verticalOffset: 1,
  colorStops: [
    [0, "rgba(157, 238, 255, 0.48)"],
    [OUTER_AURA_MID_STOP, "rgba(80, 204, 255, 0.24)"],
    [1, "rgba(80, 204, 255, 0)"],
  ],
};

const INNER_AURA_PROFILE: AuraLayerProfile = {
  radiusRatio: 0.64,
  radiusPulse: 0.045,
  alphaBase: 0.9,
  alphaPulse: 0.12,
  phaseSpeed: 0.71,
  phaseOffset: 1.7,
  driftX: 0.4,
  driftY: 0.3,
  verticalOffset: -1,
  colorStops: [
    [0, "rgba(231, 253, 255, 0.76)"],
    [INNER_AURA_MID_STOP, "rgba(125, 235, 255, 0.42)"],
    [1, "rgba(125, 235, 255, 0)"],
  ],
};

const AURA_LAYER_PROFILES = [OUTER_AURA_PROFILE, INNER_AURA_PROFILE] as const;

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

function drawAuraLayer(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  baseRadius: number,
  phase: number,
  baseAlpha: number,
  profile: AuraLayerProfile,
) {
  const layerPhase = phase * profile.phaseSpeed + profile.phaseOffset;
  const pulse = Math.sin(layerPhase);
  const radius = baseRadius * (profile.radiusRatio + pulse * profile.radiusPulse);
  const centerX = x
    + Math.sin(layerPhase * AURA_HORIZONTAL_DRIFT_SPEED) * profile.driftX;
  const centerY = y
    + profile.verticalOffset
    + Math.cos(layerPhase * AURA_VERTICAL_DRIFT_SPEED) * profile.driftY;
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  for (const [offset, color] of profile.colorStops) {
    gradient.addColorStop(offset, color);
  }

  context.globalAlpha = baseAlpha
    * RESIDUAL_SPIRIT_CONFIG.pickup.auraAlpha
    * (profile.alphaBase + pulse * profile.alphaPulse);
  context.fillStyle = gradient;
  context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
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

function collectResidualSpirit(spirit: ResidualSpiritState) {
  const storedAmount = storeResidualSpirit(state.player, spirit.amount);
  if (storedAmount <= 0) return false;

  spirit.amount -= storedAmount;
  const position = residualSpiritPosition(spirit);
  spawnResidualSpiritPickupFlight(
    position.x,
    position.y,
    storedAmount,
    spirit.phase,
  );
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
    const auraRadius = sprite.drawW * HALF + RESIDUAL_SPIRIT_CONFIG.pickup.auraPadding;

    ctx.save();
    const baseAlpha = ctx.globalAlpha;
    const baseCompositeOperation = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "screen";
    for (const profile of AURA_LAYER_PROFILES) {
      drawAuraLayer(
        ctx,
        position.x,
        position.y,
        auraRadius,
        spirit.phase,
        baseAlpha,
        profile,
      );
    }
    ctx.globalAlpha = baseAlpha;
    ctx.globalCompositeOperation = baseCompositeOperation;
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
