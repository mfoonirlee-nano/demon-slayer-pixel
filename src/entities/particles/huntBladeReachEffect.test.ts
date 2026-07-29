import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLOSE_ARC_BASIC_CRESCENT_SHEET } from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { attackBox, castUltimateSkill, triggerAttack } from "../player";
import {
  drawHuntBladeReachEffects,
  updateHuntBladeReachEffects,
} from "./huntBladeReachEffect";

const TEST_IMAGE = {} as HTMLImageElement;
const TEST_REACH_EXTENSION = 40;

describe("hunt blade reach effect", () => {
  beforeEach(() => {
    resetState();
    CLOSE_ARC_BASIC_CRESCENT_SHEET.image = TEST_IMAGE;
    state.player.facing = 1;
    state.equipmentInventory.push({ id: "hunt_blade", tier: "common" });
    state.equippedEquipment.blade = "hunt_blade";
  });

  afterEach(() => {
    CLOSE_ARC_BASIC_CRESCENT_SHEET.image = null;
    setCanvas(null);
  });

  it.each([
    { frame: 0, visibleAlphaWidth: 108 },
    { frame: 1, visibleAlphaWidth: 113 },
  ])(
    "scales source frame $frame so its visible alpha spans the full reach extension",
    ({ frame, visibleAlphaWidth }) => {
      const drawImage = vi.fn();
      setCanvas({
        getContext: () => ({
          drawImage,
          restore: vi.fn(),
          save: vi.fn(),
          scale: vi.fn(),
          translate: vi.fn(),
        }),
      } as unknown as HTMLCanvasElement);
      state.huntBladeReachEffects.push({
        x: 200,
        y: 100,
        facing: 1,
        frame,
        elapsed: 0,
        life: 18,
        reachExtension: TEST_REACH_EXTENSION,
      });

      drawHuntBladeReachEffects();

      const destinationWidth = drawImage.mock.calls[0]?.[7] as number;
      expect(destinationWidth).toBeCloseTo(
        CLOSE_ARC_BASIC_CRESCENT_SHEET.frameW
          * TEST_REACH_EXTENSION
          / visibleAlphaWidth,
      );
    },
  );

  it.each([1, -1] as const)(
    "spawns across the empowered reach extension when facing %s",
    (facing) => {
      state.player.facing = facing;
      state.player.huntBladeReady = true;

      triggerAttack();

      expect(state.huntBladeReachEffects).toHaveLength(1);
      expect(state.huntBladeReachEffects[0]).toMatchObject({
        facing,
        reachExtension: TEST_REACH_EXTENSION,
      });
      const empoweredAttack = attackBox();
      const effect = state.huntBladeReachEffects[0];
      const effectTipX = effect.x + facing * effect.reachExtension / 2;
      const attackTipX = facing === 1
        ? empoweredAttack.x + empoweredAttack.w
        : empoweredAttack.x;
      expect(effectTipX).toBe(attackTipX);
    },
  );

  it("spawns without a kill setup while the three-piece resonance is active", () => {
    state.equipmentInventory.push(
      { id: "hunt_garb", tier: "common" },
      { id: "hunt_talisman", tier: "common" },
    );
    state.equippedEquipment.garb = "hunt_garb";
    state.equippedEquipment.talisman = "hunt_talisman";

    triggerAttack();

    expect(state.huntBladeReachEffects).toHaveLength(1);
  });

  it("keeps the visible blade aligned when the attack box moves and turns", () => {
    state.player.huntBladeReady = true;
    triggerAttack();
    state.player.x += 24;
    state.player.y -= 12;
    state.player.facing = -1;

    updateHuntBladeReachEffects();

    const empoweredAttack = attackBox();
    const effect = state.huntBladeReachEffects[0];
    expect(effect.facing).toBe(-1);
    expect(effect.x - effect.reachExtension / 2).toBe(empoweredAttack.x);
    expect(effect.y).toBe(empoweredAttack.y + empoweredAttack.h / 2);
  });

  it("clears when an ultimate cast cancels the basic attack", () => {
    state.player.huntBladeReady = true;
    triggerAttack();
    state.player.ultimateLevel = 1;
    state.player.ultimateEnergy = state.player.ultimateEnergyMax;

    castUltimateSkill();

    expect(state.player.attackTimer).toBe(0);
    expect(state.huntBladeReachEffects).toHaveLength(0);
  });
});
