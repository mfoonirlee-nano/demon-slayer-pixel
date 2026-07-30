import { describe, expect, it } from "vitest";
import { EQUIPMENT_CHOICE_IDS, equipmentItemForTier } from "../systems/equipmentCatalog";
import type { EquipmentFamily, EquipmentSlot, EquipmentTier } from "../types/game-state";
import {
  equipmentFamilyLabel,
  equipmentFamilyMark,
  equipmentFamilyResonanceCopy,
  equipmentItemCopy,
  equipmentPrimaryStatLabel,
  equipmentSlotLabel,
  equipmentTierLabel,
  localizeEquipmentItem,
} from "./equipmentCopy";

const EQUIPMENT_TIERS: EquipmentTier[] = ["common", "fine", "awakened"];
const EQUIPMENT_FAMILIES: EquipmentFamily[] = ["flow", "burst", "shadowstep", "hunt", "risk", "tempo"];
const EQUIPMENT_SLOTS: EquipmentSlot[] = ["blade", "garb", "talisman"];
const EXPECTED_EQUIPMENT_ITEM_COUNT = 18;
const COPY_FIELD_COUNT = 3;
const MAX_ITEM_NAME_LENGTH = 24;
const MAX_ITEM_SUMMARY_LENGTH = 120;
const MAX_ITEM_TAG_LENGTH = 24;
const MAX_RESONANCE_ROW_LENGTH = 64;

describe("equipment copy", () => {
  it("provides concise English copy for an equipment tier", () => {
    expect(equipmentItemCopy("en", "flow_blade", "common")).toEqual({
      name: "Flow Blade",
      summary: "After 4 basic hits, your next skill deals more damage.",
      tag: "Basic Charge",
    });
  });

  it("preserves every existing Chinese catalog string", () => {
    for (const itemId of EQUIPMENT_CHOICE_IDS) {
      for (const tier of EQUIPMENT_TIERS) {
        const catalogItem = equipmentItemForTier(itemId, tier);

        expect(equipmentItemCopy("zh-CN", itemId, tier)).toEqual({
          name: catalogItem.name,
          summary: catalogItem.summary,
          tag: catalogItem.uiTags[1],
        });
      }
    }
  });

  it("preserves the existing Chinese equipment labels", () => {
    expect(EQUIPMENT_FAMILIES.map((family) =>
      equipmentFamilyLabel("zh-CN", family),
    )).toEqual(["流水", "破势", "影步", "狩猎", "残心", "节奏"]);
    expect(EQUIPMENT_FAMILIES.map((family) =>
      equipmentFamilyMark("zh-CN", family),
    )).toEqual(["流", "破", "影", "猎", "残", "奏"]);
    expect(EQUIPMENT_TIERS.map((tier) => equipmentTierLabel("zh-CN", tier))).toEqual([
      "普通",
      "精良",
      "觉醒",
    ]);
    expect(EQUIPMENT_SLOTS.map((slot) => equipmentSlotLabel("zh-CN", slot))).toEqual([
      "刃器",
      "衣装",
      "饰符",
    ]);
    expect(EQUIPMENT_SLOTS.map((slot) => equipmentPrimaryStatLabel("zh-CN", slot))).toEqual([
      "攻击力",
      "最大生命",
      "技能能量上限",
    ]);
  });

  it("provides concise English equipment labels", () => {
    expect(EQUIPMENT_FAMILIES.map((family) =>
      equipmentFamilyLabel("en", family),
    )).toEqual(["Flow", "Burst", "Shadowstep", "Hunt", "Risk", "Tempo"]);
    expect(EQUIPMENT_FAMILIES.map((family) =>
      equipmentFamilyMark("en", family),
    )).toEqual(["F", "B", "S", "H", "R", "T"]);
    expect(EQUIPMENT_TIERS.map((tier) => equipmentTierLabel("en", tier))).toEqual([
      "Common",
      "Fine",
      "Awakened",
    ]);
    expect(EQUIPMENT_SLOTS.map((slot) => equipmentSlotLabel("en", slot))).toEqual([
      "Blade",
      "Garb",
      "Talisman",
    ]);
    expect(EQUIPMENT_SLOTS.map((slot) => equipmentPrimaryStatLabel("en", slot))).toEqual([
      "Attack",
      "Max HP",
      "Skill Energy Cap",
    ]);
  });

  it("describes every family resonance tier and exposes missing effects explicitly", () => {
    const shadowstep = equipmentFamilyResonanceCopy("zh-CN", "shadowstep");
    const risk = equipmentFamilyResonanceCopy("zh-CN", "risk");
    const tempo = equipmentFamilyResonanceCopy("zh-CN", "tempo");

    expect(shadowstep.pair).toContain("15% 闪避");
    expect(shadowstep.full).toContain("额外获得 10 点技能能量");
    expect(risk.pair).toContain("攻击速度、移动速度提高 15%");
    expect(tempo.pair).toContain("暂无套装效果");
    expect(tempo.full).toContain("暂无套装效果");

    for (const language of ["zh-CN", "en"] as const) {
      for (const family of EQUIPMENT_FAMILIES) {
        const copy = equipmentFamilyResonanceCopy(language, family);
        expect(copy.pair.length).toBeGreaterThan(0);
        expect(copy.full.length).toBeGreaterThan(0);
        expect(copy.pair.length).toBeLessThanOrEqual(MAX_RESONANCE_ROW_LENGTH);
        expect(copy.full.length).toBeLessThanOrEqual(MAX_RESONANCE_ROW_LENGTH);
      }
    }

    const englishCopy = EQUIPMENT_FAMILIES.flatMap((family) =>
      Object.values(equipmentFamilyResonanceCopy("en", family)),
    );
    expect(englishCopy.join(" ")).not.toMatch(/\p{Script=Han}/u);
  });

  it("describes the exact hunt two-piece and three-piece breakpoints", () => {
    expect(equipmentFamilyResonanceCopy("zh-CN", "hunt")).toEqual({
      pair: "2 件：狩牙刃 2→1；逐猎衣 3→2；连珠符冷却 4→3 秒。",
      full: "3 件：狩牙刃常态生效；逐猎衣 3→1；连珠符冷却 4→2 秒。",
    });
    expect(equipmentFamilyResonanceCopy("en", "hunt")).toEqual({
      pair: "2-piece: Blade 2→1; garb 3→2; talisman cooldown 4→3s.",
      full: "3-piece: Blade always on; garb 3→1; talisman cooldown 4→2s.",
    });
  });

  it("describes the exact risk two-piece and three-piece low-health bonuses", () => {
    expect(equipmentFamilyResonanceCopy("zh-CN", "risk")).toEqual({
      pair: "2 件：低血时攻击速度、移动速度提高 15%。",
      full: "3 件：低血时攻击速度、移动速度提高 30%；免伤护盾抵挡 1 次伤害，冷却 5 秒。",
    });
    expect(equipmentFamilyResonanceCopy("en", "risk")).toEqual({
      pair: "2-piece: Low HP +15% attack/move speed.",
      full: "3-piece: Low HP +30% attack/move speed; 1-hit shield, 5s CD.",
    });
  });

  it("describes the risk talisman's continuous regeneration and awakened burst", () => {
    expect(equipmentItemCopy("zh-CN", "risk_talisman", "common").summary)
      .toBe("生命 ≤35% 时，每秒恢复 2 点技能能量。");
    expect(equipmentItemCopy("zh-CN", "risk_talisman", "awakened").summary)
      .toBe("生命 ≤35% 时，每秒恢复 4 点技能能量；每幕首次进入低血时补足至少一格技能能量，并获得 8 点大招能量。");
    expect(equipmentItemCopy("en", "risk_talisman", "fine").summary)
      .toBe("At ≤35% HP, regenerate 3 skill energy/sec.");
  });

  it("marks every hunt talisman tier as requiring ultimate energy", () => {
    for (const tier of EQUIPMENT_TIERS) {
      expect(equipmentItemForTier("hunt_talisman", tier).requiresUltimate).toBe(true);
    }
  });

  it("covers every English item tier without Han characters or oversized UI copy", () => {
    const itemText = EQUIPMENT_CHOICE_IDS.flatMap((itemId) =>
      EQUIPMENT_TIERS.flatMap((tier) => Object.values(equipmentItemCopy("en", itemId, tier))),
    );
    const labelText = [
      ...EQUIPMENT_FAMILIES.map((family) => equipmentFamilyLabel("en", family)),
      ...EQUIPMENT_TIERS.map((tier) => equipmentTierLabel("en", tier)),
      ...EQUIPMENT_SLOTS.map((slot) => equipmentSlotLabel("en", slot)),
      ...EQUIPMENT_SLOTS.map((slot) => equipmentPrimaryStatLabel("en", slot)),
    ];

    expect(itemText).toHaveLength(
      EXPECTED_EQUIPMENT_ITEM_COUNT * EQUIPMENT_TIERS.length * COPY_FIELD_COUNT,
    );
    expect([...itemText, ...labelText].every((text) => text.length > 0)).toBe(true);
    expect([...itemText, ...labelText].join(" ")).not.toMatch(/\p{Script=Han}/u);
    expect(
      EQUIPMENT_CHOICE_IDS.flatMap((itemId) =>
        EQUIPMENT_TIERS.map((tier) => equipmentItemCopy("en", itemId, tier)),
      ).every(
        ({ name, summary, tag }) =>
          name.length <= MAX_ITEM_NAME_LENGTH &&
          summary.length <= MAX_ITEM_SUMMARY_LENGTH &&
          tag.length <= MAX_ITEM_TAG_LENGTH,
      ),
    ).toBe(true);
  });

  it("localizes display fields while preserving equipment choice state", () => {
    const item = {
      ...equipmentItemForTier("tempo_talisman", "awakened"),
      previousTier: "fine" as const,
      reason: "tierUpgrade" as const,
    };

    expect(localizeEquipmentItem("en", item)).toEqual({
      ...item,
      name: "Beatcall Talisman",
      summary: "Skill cost reaches its floor; casting different skills in succession refunds skill energy.",
      uiTags: ["Awakened", "Skill Swap Refund"],
    });
    expect(item.name).toBe("鸣拍符");
    expect(localizeEquipmentItem("zh-CN", item)).toEqual(item);
  });
});
