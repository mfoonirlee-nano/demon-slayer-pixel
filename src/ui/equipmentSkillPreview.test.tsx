import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { gameSnapshotAtom, gameStore, type GameSnapshot } from "../game/gameStore";
import { equipmentItemForTier } from "../systems/equipmentCatalog";
import type { EquipmentItemId } from "../types/game-state";
import { EquipmentSkillPreview, SkillEquipmentPreview } from "./equipmentSkillPreview";
import { equipmentDetailCopy, skillDetailCopy } from "./pause/detailCopy";
import { PauseDetailPanel } from "./pause/components";
import { RewardOverlay } from "./rewardOverlay";

function withEquipment(...ids: EquipmentItemId[]): GameSnapshot {
  const base = gameStore.get(gameSnapshotAtom);
  const equipment: GameSnapshot["equipment"] = {
    inventory: ids.map((id) => equipmentItemForTier(id, "common")),
    equipped: { blade: null, garb: null, talisman: null },
  };
  for (const item of equipment.inventory) equipment.equipped[item.slot] = item;
  return { ...base, equipment };
}

describe("equipment-skill combo previews", () => {
  it("explains gained shapes and lost effects before an equipment choice", () => {
    const snapshot = withEquipment("flow_blade", "hunt_talisman");
    const markup = renderToStaticMarkup(<EquipmentSkillPreview
      equipment={snapshot.equipment}
      item={equipmentItemForTier("tempo_talisman", "common")}
      language="zh-CN"
    />);
    expect(markup).toContain("装备后获得");
    expect(markup).toContain("原地聚潮牵引");
    expect(markup).toContain("装备后失去 · 异技扫潮");
    expect(markup).toContain("装备后失去 · 连珠传印");
  });

  it("labels missing equipment dependencies in English", () => {
    const snapshot = withEquipment();
    const markup = renderToStaticMarkup(<EquipmentSkillPreview
      equipment={snapshot.equipment}
      item={equipmentItemForTier("hunt_talisman", "common")}
      language="en"
    />);
    expect(markup).toContain("Requires Flow Blade");
    expect(markup).not.toContain("On equip");
    expect(markup).not.toMatch(/[一-龥]/u);
  });

  it("does not claim a learned but unequipped skill is already active", () => {
    const snapshot = withEquipment("flow_blade");
    const markup = renderToStaticMarkup(<SkillEquipmentPreview
      snapshot={snapshot}
      skillId={SKILL_IDS.returningBlade}
      language="zh-CN"
    />);
    expect(markup).toContain("习得并装备此招后");
    expect(markup).toContain("回刃去回沿线铺标");
    expect(markup).not.toContain("当前装备联动");
  });

  it("exposes active rupture setup in pause skill details", () => {
    const snapshot = withEquipment("burst_blade", "shadowstep_garb");
    const detail = skillDetailCopy(
      { type: "item", skillId: SKILL_IDS.armorBreak },
      snapshot.player,
      "en",
      snapshot.equipment,
    );
    expect(detail.body).toContain("Moonbreak Blade");
    expect(detail.body).toContain("Shadowstep Garb");
    expect(detail.body).toContain("Armor Break triggers rupture on impact");
    expect(detail.body).not.toContain("Flow Blade");
  });

  it("labels locked equipment previews and makes full pause details scrollable", () => {
    const snapshot = withEquipment("flow_blade");
    const detail = equipmentDetailCopy(
      { type: "item", itemId: "tempo_talisman" }, snapshot.equipment, new Set(["flow_blade"]), "zh-CN",
    );
    expect(detail.body).toContain("获得并装备后联动");
    expect(detail.body).toContain("装备后失去 · 异技扫潮");
    const markup = renderToStaticMarkup(<PauseDetailPanel detail={detail} />);
    expect(markup).toContain("overflow-y-auto");
    expect(markup).not.toContain("line-clamp");
  });

  it.each(["bossEquipment", "treasure"] as const)("mounts the combo change panel for %s rewards", (activeOverlay) => {
    const snapshot = withEquipment("flow_blade", "hunt_talisman");
    const choice = {
      ...equipmentItemForTier("tempo_talisman", "common"),
      previousTier: null,
      reason: "replacement" as const,
    };
    const markup = renderToStaticMarkup(<RewardOverlay snapshot={{
      ...snapshot,
      activeOverlay,
      pendingEquipmentChoices: [choice],
      pendingTreasureChoices: [{ id: "combo", kind: "equipment", equipment: choice, replacedEquippedId: "hunt_talisman" }],
    }} />);
    expect(markup).toContain("装备组合变化");
    expect(markup).toContain("装备后失去 · 异技扫潮");
    expect(markup).toContain("装备后失去 · 连珠传印");
  });
});
