import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { createInitialState } from "../game/state";
import {
  applySkillCastEquipmentEffects,
  equipEquipment,
  tickEquipmentEffects,
} from "./equipment";
import { applySkillHitEquipmentRefund } from "./equipmentSkillHit";
import { FLOW_GARB_EXTEND_FRAMES, FLOW_GARB_TIMER_FRAMES } from "./equipmentTuning";

describe("flow garb status duration", () => {
  it("tracks extension against the full active window and resets it on unequip", () => {
    const state = createInitialState();
    state.equipmentInventory.push({ id: "flow_garb", tier: "awakened" });
    state.equippedEquipment.garb = "flow_garb";

    applySkillCastEquipmentEffects(state, SKILL_IDS.lineProjectile);
    expect(state.player).toMatchObject({
      flowGarbTimer: FLOW_GARB_TIMER_FRAMES,
      flowGarbDuration: FLOW_GARB_TIMER_FRAMES,
    });

    expect(applySkillHitEquipmentRefund(state, 2, false)).toBe(true);
    expect(state.player).toMatchObject({
      flowGarbTimer: FLOW_GARB_TIMER_FRAMES + FLOW_GARB_EXTEND_FRAMES,
      flowGarbDuration: FLOW_GARB_TIMER_FRAMES + FLOW_GARB_EXTEND_FRAMES,
    });

    tickEquipmentEffects(state);
    expect(state.player.flowGarbTimer).toBe(
      FLOW_GARB_TIMER_FRAMES + FLOW_GARB_EXTEND_FRAMES - 1,
    );
    expect(state.player.flowGarbDuration).toBe(
      FLOW_GARB_TIMER_FRAMES + FLOW_GARB_EXTEND_FRAMES,
    );

    state.equipmentInventory.push({ id: "tempo_garb", tier: "common" });
    expect(equipEquipment(state, "garb", "tempo_garb")).toBe(true);
    expect(state.player).toMatchObject({ flowGarbTimer: 0, flowGarbDuration: 0 });
  });
});
