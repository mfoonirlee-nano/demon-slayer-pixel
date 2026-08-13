import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESIDUAL_SPIRIT_CONFIG } from "../constants";
import { resetState, state } from "../game/state";
import { setCanvas } from "../rendering/context";
import {
  drawResidualSpirits,
  spawnResidualSpirit,
  updateResidualSpirits,
} from "./residualSpirit";

const TEST_ENEMY = { x: 100, y: 200, w: 40, h: 60 };
const TEST_SPAWN_AMOUNT = RESIDUAL_SPIRIT_CONFIG.dropByTier[2];
const TEST_PICKUP_AMOUNT = RESIDUAL_SPIRIT_CONFIG.dropByTier[1];
const DAMAGED_HP = 40;
const NEARBY_OFFSET_X = 100;
const UPDATE_SECONDS = 0.1;
const EXPIRING_LIFETIME_SECONDS = 0.05;
const LATER_GLOW_PHASE = Math.PI / 2;

type GradientRecord = {
  args: number[];
  stops: Array<{ offset: number; color: string }>;
};

function createGlowContext() {
  const gradients: GradientRecord[] = [];
  const compositeOperations: GlobalCompositeOperation[] = [];
  let compositeOperation: GlobalCompositeOperation = "source-over";
  const context = {
    globalAlpha: 1,
    get globalCompositeOperation() {
      return compositeOperation;
    },
    set globalCompositeOperation(operation: GlobalCompositeOperation) {
      compositeOperation = operation;
      compositeOperations.push(operation);
    },
    fillStyle: "",
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    createRadialGradient: vi.fn((...args: number[]) => {
      const record: GradientRecord = { args, stops: [] };
      gradients.push(record);
      return {
        addColorStop(offset: number, color: string) {
          record.stops.push({ offset, color });
        },
      };
    }),
  };

  setCanvas({
    getContext: () => context,
  } as unknown as HTMLCanvasElement);
  return { context, gradients, compositeOperations };
}

function spiritAtPlayer(amount: number) {
  state.residualSpirits.push({
    x: state.player.x + state.player.w / 2,
    y: state.player.y + state.player.h / 2,
    amount,
    phase: 0,
    lifetime: RESIDUAL_SPIRIT_CONFIG.pickup.lifetimeSeconds,
  });
}

describe("residual-spirit pickups", () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    setCanvas(null);
  });

  it("spawns at the defeated enemy center", () => {
    spawnResidualSpirit(TEST_ENEMY, TEST_SPAWN_AMOUNT);

    expect(state.residualSpirits).toEqual([
      expect.objectContaining({
        x: TEST_ENEMY.x + TEST_ENEMY.w / 2,
        y: TEST_ENEMY.y + TEST_ENEMY.h / 2,
        amount: TEST_SPAWN_AMOUNT,
      }),
    ]);
  });

  it("stores a pickup without immediately restoring health", () => {
    state.player.hp = DAMAGED_HP;
    spiritAtPlayer(TEST_PICKUP_AMOUNT);

    updateResidualSpirits(0);

    expect(state.player.residualSpirit).toBe(TEST_PICKUP_AMOUNT);
    expect(state.player.hp).toBe(DAMAGED_HP);
    expect(state.residualSpirits).toHaveLength(0);
    expect(state.residualSpiritPickupFlights).toEqual([
      expect.objectContaining({
        startX: state.player.x + state.player.w / 2,
        startY: state.player.y + state.player.h / 2,
        amount: TEST_PICKUP_AMOUNT,
        elapsed: 0,
      }),
    ]);
  });

  it("leaves the uncollected remainder when only part of a pickup fits", () => {
    state.player.residualSpirit = RESIDUAL_SPIRIT_CONFIG.maxStored - 1;
    spiritAtPlayer(TEST_PICKUP_AMOUNT);

    updateResidualSpirits(0);

    expect(state.player.residualSpirit).toBe(RESIDUAL_SPIRIT_CONFIG.maxStored);
    expect(state.residualSpirits).toEqual([
      expect.objectContaining({ amount: 2 }),
    ]);
    expect(state.residualSpiritPickupFlights).toEqual([
      expect.objectContaining({ amount: 1 }),
    ]);
  });

  it("leaves an overlapping pickup untouched when the vessel is full", () => {
    state.player.residualSpirit = RESIDUAL_SPIRIT_CONFIG.maxStored;
    spiritAtPlayer(TEST_PICKUP_AMOUNT);

    updateResidualSpirits(0);

    expect(state.residualSpirits).toEqual([
      expect.objectContaining({ amount: TEST_PICKUP_AMOUNT }),
    ]);
    expect(state.residualSpiritPickupFlights).toEqual([]);
  });

  it("waits for player contact without moving and expires stale pickups", () => {
    const playerCenterX = state.player.x + state.player.w / 2;
    state.residualSpirits.push({
      x: playerCenterX + NEARBY_OFFSET_X,
      y: state.player.y + state.player.h / 2,
      amount: TEST_PICKUP_AMOUNT,
      phase: 0,
      lifetime: RESIDUAL_SPIRIT_CONFIG.pickup.lifetimeSeconds,
    });

    updateResidualSpirits(UPDATE_SECONDS);

    expect(state.residualSpirits[0].x).toBe(playerCenterX + NEARBY_OFFSET_X);

    state.residualSpirits[0].lifetime = EXPIRING_LIFETIME_SECONDS;
    updateResidualSpirits(UPDATE_SECONDS);
    expect(state.residualSpirits).toHaveLength(0);
  });

  it("draws a layered, continuously breathing aura instead of a rigid block glow", () => {
    const { context, gradients, compositeOperations } = createGlowContext();
    spiritAtPlayer(TEST_PICKUP_AMOUNT);

    drawResidualSpirits();

    expect(context.createRadialGradient).toHaveBeenCalledTimes(2);
    expect(compositeOperations).toEqual(["screen", "source-over"]);
    expect(gradients[0].args[5]).toBeGreaterThan(gradients[1].args[5]);
    expect(gradients.every((gradient) => (
      gradient.stops[gradient.stops.length - 1]?.color.endsWith(", 0)")
    ))).toBe(true);
    const firstRadii = gradients.map((gradient) => gradient.args[5]);

    state.residualSpirits[0].phase = LATER_GLOW_PHASE;
    drawResidualSpirits();

    const laterGradients = gradients.slice(2);
    const laterRadii = laterGradients.map((gradient) => gradient.args[5]);
    expect(laterRadii).not.toEqual(firstRadii);
    expect(laterGradients.map((gradient) => gradient.args[1])).not.toEqual(
      gradients.slice(0, 2).map((gradient) => gradient.args[1]),
    );
  });
});
