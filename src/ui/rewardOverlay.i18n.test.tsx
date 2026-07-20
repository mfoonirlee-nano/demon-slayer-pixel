import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { gameSnapshotAtom, gameStore } from "../game/gameStore";
import { languageAtom } from "../i18n/language";
import { equipmentItem } from "../systems/equipment";
import type { EquipmentChoiceState, UpgradeChoiceState } from "../types/game-state";
import { RewardOverlay } from "./rewardOverlay";

const CHINESE_UPGRADE: UpgradeChoiceState = {
  id: "unlock-line-projectile",
  type: "unlockSkill",
  title: "习得新技能",
  name: "潮龙·破阵 I",
  description: "向前释放潮龙，造成窄长直线伤害，适合点杀和穿排。",
  skillId: SKILL_IDS.lineProjectile,
  nextLevel: 1,
};

describe("RewardOverlay localization", () => {
  it("derives an English skill reward from an existing Chinese snapshot", () => {
    const store = createStore();
    store.set(languageAtom, "en");
    const snapshot = {
      ...gameStore.get(gameSnapshotAtom),
      activeOverlay: "upgrade" as const,
      pendingUpgradeChoices: [CHINESE_UPGRADE],
    };

    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <RewardOverlay snapshot={snapshot} />
      </Provider>,
    );

    expect(markup).toContain("Choose an Upgrade");
    expect(markup).toContain("New Skill");
    expect(markup).toContain("Tidal Dragon: Breakthrough I");
    expect(markup).toContain("Hit Damage");
    expect(markup).not.toMatch(/[选择需要强化新术潮龙破阵命中伤害]/u);
  });

  it("derives an English equipment reward from an existing Chinese snapshot", () => {
    const store = createStore();
    store.set(languageAtom, "en");
    const item = equipmentItem("flow_blade", "common");
    if (!item) throw new Error("Expected flow blade equipment");
    const choice: EquipmentChoiceState = {
      ...item,
      previousTier: null,
      reason: "new",
    };
    const snapshot = {
      ...gameStore.get(gameSnapshotAtom),
      activeOverlay: "bossEquipment" as const,
      pendingEquipmentChoices: [choice],
    };

    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <RewardOverlay snapshot={snapshot} />
      </Provider>,
    );

    expect(markup).toContain("Nighttide Relics");
    expect(markup).toContain("Flow Blade");
    expect(markup).toContain("Blade · Common");
    expect(markup).toContain("New equipment: Common");
    expect(markup).not.toMatch(/[夜潮遗物流刃器凡品新装备]/u);
  });
});
