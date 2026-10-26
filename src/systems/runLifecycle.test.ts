import { beforeEach, describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { spawnEnemyById } from "../entities/enemy";
import { resetState, state } from "../game/state";
import { clearRun, endRun } from "./runLifecycle";
import { recordEquipmentReactionHit } from "./equipmentReactions";
import { equipEquipment } from "./equipment";

beforeEach(() => resetState());

function prepareReactions() {
  state.equipmentInventory = [{ id: "flow_blade", tier: "common" }];
  equipEquipment(state, "blade", "flow_blade");
  spawnEnemyById("chaser", "debug", "right");
  const target = state.enemies[0];
  const source = { skillId: SKILL_IDS.lineProjectile, castId: 1, equipmentRevision: state.equipmentReactions.revision };
  recordEquipmentReactionHit(state, target, source, 1, false);
  recordEquipmentReactionHit(state, target, { ...source, skillId: SKILL_IDS.closeArc, castId: 2 }, 1, false);
  expect(state.equipmentReactions.effects).toHaveLength(1);
}

describe("equipment reaction run lifecycle", () => {
  it.each([endRun, clearRun])("clears anchors and effects immediately when ending the run", (finishRun) => {
    prepareReactions();
    const effects = state.equipmentReactions.effects;
    finishRun(state);
    expect(state.equipmentReactions.marks).toHaveLength(0);
    expect(state.equipmentReactions.effects).toBe(effects);
    expect(effects).toHaveLength(0);
  });

  it("restarting clears all build state along with the old skill entities", () => {
    prepareReactions();
    resetState();
    expect(state.equipmentReactions.marks).toHaveLength(0);
    expect(state.equipmentReactions.effects).toHaveLength(0);
    expect(state.equipmentReactions.revision).toBe(0);
    expect(state.player.activeSkillCast).toBeNull();
    expect(state.playerSkillEffects).toHaveLength(0);
  });
});
