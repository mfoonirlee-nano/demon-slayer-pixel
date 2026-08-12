import { RESIDUAL_SPIRIT_CONFIG } from "../constants";
import { state } from "../game/state";
import { ctx } from "../rendering/context";
import type { ResidualSpiritPickupFlightState } from "../types/game-state";
import { resolveVisibleResidualSpiritVesselIntakePoint } from "../ui/gameHudLayout";

const FULL_ARC_RADIANS = Math.PI;
const HALF = 0.5;
const MIN_PARTICLE_SIZE = 1;
const CUBIC_POWER = 3;
const ARRIVAL_ALPHA_FADE = 0.2;
const FLIGHT_COLORS = ["#f4ffff", "#b8f4ff", "#61d8ff", "#4f9cff"] as const;

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** CUBIC_POWER;
}

function flightPoint(
  flight: ResidualSpiritPickupFlightState,
  target: { x: number; y: number },
  rawProgress: number,
) {
  const progress = easeOutCubic(clampUnit(rawProgress));
  const dx = target.x - flight.startX;
  const dy = target.y - flight.startY;
  const distance = Math.hypot(dx, dy);
  const arc = Math.sin(progress * FULL_ARC_RADIANS);
  const config = RESIDUAL_SPIRIT_CONFIG.pickupFlight;
  const arcHeight = Math.min(config.maxArcHeight, distance * config.arcHeightRatio);
  const sway = Math.min(config.maxSway, distance * config.swayRatio)
    * Math.cos(flight.swayPhase);

  return {
    x: flight.startX + dx * progress + arc * sway,
    y: flight.startY + dy * progress - arc * arcHeight,
  };
}

function flightParticleCount(amount: number) {
  const config = RESIDUAL_SPIRIT_CONFIG.pickupFlight;
  return Math.min(
    config.maxParticleCount,
    config.baseParticleCount + Math.ceil(amount / config.amountPerExtraParticle),
  );
}

export function spawnResidualSpiritPickupFlight(
  startX: number,
  startY: number,
  amount: number,
  swayPhase: number,
) {
  if (amount <= 0) return;

  const config = RESIDUAL_SPIRIT_CONFIG.pickupFlight;
  // Keep recent feedback under burst collection; evicting old visuals cannot lose settled rewards.
  while (state.residualSpiritPickupFlights.length >= config.maxActive) {
    state.residualSpiritPickupFlights.shift();
  }
  state.residualSpiritPickupFlights.push({
    startX,
    startY,
    amount,
    swayPhase,
    elapsed: 0,
  });
}

export function updateResidualSpiritPickupFlights(dt: number) {
  const duration = RESIDUAL_SPIRIT_CONFIG.pickupFlight.durationSeconds;
  for (
    let index = state.residualSpiritPickupFlights.length - 1;
    index >= 0;
    index -= 1
  ) {
    const flight = state.residualSpiritPickupFlights[index];
    flight.elapsed += dt;
    if (flight.elapsed >= duration) {
      state.residualSpiritPickupFlights.splice(index, 1);
    }
  }
}

export function drawResidualSpiritPickupFlights(
  target?: { x: number; y: number } | null,
) {
  if (!ctx || state.residualSpiritPickupFlights.length === 0) return;

  const destination = target === undefined
    ? resolveVisibleResidualSpiritVesselIntakePoint()
    : target;
  if (!destination) return;

  const config = RESIDUAL_SPIRIT_CONFIG.pickupFlight;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const flight of state.residualSpiritPickupFlights) {
    const progress = clampUnit(flight.elapsed / config.durationSeconds);
    const particleCount = flightParticleCount(flight.amount);
    for (let index = particleCount - 1; index >= 0; index -= 1) {
      const trailProgress = progress - index * config.trailProgressGap;
      if (trailProgress < 0) continue;

      const point = flightPoint(flight, destination, trailProgress);
      const size = Math.max(
        MIN_PARTICLE_SIZE,
        Math.round(config.coreSize - index * config.trailSizeStep),
      );
      ctx.globalAlpha = (1 - index / (particleCount + 1))
        * (1 - progress * ARRIVAL_ALPHA_FADE);
      ctx.fillStyle = FLIGHT_COLORS[index % FLIGHT_COLORS.length];
      ctx.fillRect(
        Math.round(point.x - size * HALF),
        Math.round(point.y - size * HALF),
        size,
        size,
      );
    }
  }

  ctx.restore();
}
