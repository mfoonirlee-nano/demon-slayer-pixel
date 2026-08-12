import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESIDUAL_SPIRIT_CONFIG } from "../constants";
import { resetState, state } from "../game/state";
import { setCanvas } from "../rendering/context";
import { residualSpiritVesselIntakePoint } from "../ui/gameHudLayout";
import {
  drawResidualSpiritPickupFlights,
  spawnResidualSpiritPickupFlight,
  updateResidualSpiritPickupFlights,
} from "./residualSpiritPickupFlight";

type FilledRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MockCanvasContext = CanvasRenderingContext2D & {
  filledRects: FilledRect[];
};

const START_X = 600;
const START_Y = 400;
const PICKUP_AMOUNT = 5;
const PHASE_DIVISOR = 3;
const PHASE = Math.PI / PHASE_DIVISOR;
const NEAR_ARRIVAL_PROGRESS = 0.98;

function createMockContext(): MockCanvasContext {
  const filledRects: FilledRect[] = [];
  return {
    filledRects,
    fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
      filledRects.push({ x, y, width, height });
    }),
    restore: vi.fn(),
    save: vi.fn(),
    fillStyle: "#000000",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
  } as unknown as MockCanvasContext;
}

function rectCenter(rect: FilledRect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

describe("residual-spirit pickup flight", () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    setCanvas(null);
  });

  it("uses the visible desktop or compact vessel intake as its destination", () => {
    expect(residualSpiritVesselIntakePoint(false)).toEqual({ x: 44, y: 96 });
    expect(residualSpiritVesselIntakePoint(true)).toEqual({ x: 36.16, y: 30 });
  });

  it("flies as a short-lived visual without changing stored spirit", () => {
    state.player.residualSpirit = PICKUP_AMOUNT;
    spawnResidualSpiritPickupFlight(START_X, START_Y, PICKUP_AMOUNT, PHASE);

    updateResidualSpiritPickupFlights(
      RESIDUAL_SPIRIT_CONFIG.pickupFlight.durationSeconds / 2,
    );

    expect(state.player.residualSpirit).toBe(PICKUP_AMOUNT);
    expect(state.residualSpiritPickupFlights).toHaveLength(1);

    updateResidualSpiritPickupFlights(
      RESIDUAL_SPIRIT_CONFIG.pickupFlight.durationSeconds / 2,
    );

    expect(state.player.residualSpirit).toBe(PICKUP_AMOUNT);
    expect(state.residualSpiritPickupFlights).toEqual([]);
  });

  it("draws a stream of light motes that converges on the vessel", () => {
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    spawnResidualSpiritPickupFlight(START_X, START_Y, PICKUP_AMOUNT, PHASE);
    updateResidualSpiritPickupFlights(
      RESIDUAL_SPIRIT_CONFIG.pickupFlight.durationSeconds * NEAR_ARRIVAL_PROGRESS,
    );

    drawResidualSpiritPickupFlights(false);

    expect(context.filledRects.length).toBeGreaterThan(1);
    const core = rectCenter(
      context.filledRects[context.filledRects.length - 1] as FilledRect,
    );
    const target = residualSpiritVesselIntakePoint(false);
    expect(Math.hypot(core.x - target.x, core.y - target.y)).toBeLessThan(2);
  });
});
