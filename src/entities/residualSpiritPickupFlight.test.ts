import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESIDUAL_SPIRIT_CONFIG } from "../constants";
import { resetState, state } from "../game/state";
import { setCanvas } from "../rendering/context";
import { resolveVisibleResidualSpiritVesselIntakePoint } from "../ui/gameHudLayout";
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
const SWAY_PHASE = Math.PI / PHASE_DIVISOR;
const NEAR_ARRIVAL_PROGRESS = 0.98;
const LOGICAL_TARGET = { x: 44, y: 96 };
const OVERLAY_RECT = { left: 100, top: 50, width: 480, height: 270 };
const HIDDEN_RECT = { left: 0, top: 0, width: 0, height: 0 };
const VISIBLE_INTAKE_RECT = { left: 120, top: 96, width: 4, height: 4 };

function fakeElement(rect: typeof OVERLAY_RECT, overlay?: object) {
  return {
    getBoundingClientRect: () => rect,
    closest: () => overlay ?? null,
  };
}

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
    vi.unstubAllGlobals();
  });

  it("maps the currently visible vessel intake into canvas coordinates", () => {
    const overlay = fakeElement(OVERLAY_RECT);
    const hiddenIntake = fakeElement(HIDDEN_RECT, overlay);
    const visibleIntake = fakeElement(VISIBLE_INTAKE_RECT, overlay);
    vi.stubGlobal("document", {
      querySelectorAll: () => [hiddenIntake, visibleIntake],
    });

    expect(resolveVisibleResidualSpiritVesselIntakePoint()).toEqual(
      LOGICAL_TARGET,
    );
  });

  it("flies as a short-lived visual without changing stored spirit", () => {
    state.player.residualSpirit = PICKUP_AMOUNT;
    spawnResidualSpiritPickupFlight(START_X, START_Y, PICKUP_AMOUNT, SWAY_PHASE);

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

  it("does not measure the HUD while no pickup flight is active", () => {
    const querySelectorAll = vi.fn(() => []);
    vi.stubGlobal("document", { querySelectorAll });

    drawResidualSpiritPickupFlights();

    expect(querySelectorAll).not.toHaveBeenCalled();
  });

  it("draws a stream of light motes that converges on the vessel", () => {
    const context = createMockContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    spawnResidualSpiritPickupFlight(START_X, START_Y, PICKUP_AMOUNT, SWAY_PHASE);
    updateResidualSpiritPickupFlights(
      RESIDUAL_SPIRIT_CONFIG.pickupFlight.durationSeconds * NEAR_ARRIVAL_PROGRESS,
    );

    drawResidualSpiritPickupFlights(LOGICAL_TARGET);

    expect(context.filledRects.length).toBeGreaterThan(1);
    const core = rectCenter(
      context.filledRects[context.filledRects.length - 1] as FilledRect,
    );
    expect(
      Math.hypot(core.x - LOGICAL_TARGET.x, core.y - LOGICAL_TARGET.y),
    ).toBeLessThan(2);
  });
});
