import { describe, expect, it } from "vitest";
import { previewEquipmentSkillRules, resolveEquipmentSkillRules, type EquipmentSkillLoadout } from "./equipmentSkillRules";

const EMPTY: EquipmentSkillLoadout = { blade: null, garb: null, talisman: null };

describe("equipment skill rule discovery", () => {
  it("only enables mark conversions and relays when their source equipment is present", () => {
    expect(resolveEquipmentSkillRules({ ...EMPTY, talisman: "tempo_talisman" })).not.toContain("gather");
    expect(resolveEquipmentSkillRules({ ...EMPTY, talisman: "hunt_talisman" })).not.toContain("spread");
    expect(resolveEquipmentSkillRules({ ...EMPTY, blade: "flow_blade", talisman: "hunt_talisman" }))
      .toEqual(["mark", "sweep", "spread"]);
  });

  it("shows the shape tradeoff and lost relay when replacing Chainbead with Beatcall", () => {
    const preview = previewEquipmentSkillRules(
      { ...EMPTY, blade: "flow_blade", talisman: "hunt_talisman" },
      { id: "tempo_talisman", slot: "talisman" },
    );
    expect(preview.active).toEqual(["mark", "gather"]);
    expect(preview.added).toEqual(["gather"]);
    expect(preview.removed).toEqual(["sweep", "spread"]);
    expect(preview.dormant).toEqual([]);
  });

  it("shows dependencies without claiming inactive conversions are active", () => {
    const preview = previewEquipmentSkillRules(EMPTY, { id: "tempo_talisman", slot: "talisman" });
    expect(preview.added).toEqual([]);
    expect(preview.dormant).toEqual(["gather"]);
  });

  it("removes all mark-dependent combos when replacing the source blade", () => {
    const preview = previewEquipmentSkillRules(
      { ...EMPTY, blade: "flow_blade", talisman: "tempo_talisman", garb: "shadowstep_garb" },
      { id: "burst_blade", slot: "blade" },
    );
    expect(preview.active).toEqual(["rupture", "tideEye"]);
    expect(preview.added).toEqual(["rupture"]);
    expect(preview.removed).toEqual(["mark", "gather"]);
  });
});
