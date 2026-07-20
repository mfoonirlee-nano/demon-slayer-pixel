import { describe, expect, it } from "vitest";
import type { UpgradeChoiceState } from "../types/game-state";
import { localizeUpgradeChoice } from "./upgradeCopy";

const CHINESE_ULTIMATE: UpgradeChoiceState = {
  id: "upgrade-ultimate-2",
  type: "upgradeUltimate",
  title: "终式精进",
  name: "终式·无尽月潮 II",
  description: "延长强化状态。",
  nextLevel: 2,
};

describe("localizeUpgradeChoice", () => {
  it("derives English ultimate copy from a Chinese runtime choice", () => {
    const localized = localizeUpgradeChoice("en", CHINESE_ULTIMATE);

    expect(localized).toMatchObject({
      title: "Ultimate Mastery",
      name: "Final Art: Endless Moon Tide II",
    });
    expect(`${localized.title}${localized.name}${localized.description}`).not.toMatch(/[\u4e00-\u9fff]/u);
  });

  it("preserves the canonical Chinese choice", () => {
    expect(localizeUpgradeChoice("zh-CN", CHINESE_ULTIMATE)).toBe(CHINESE_ULTIMATE);
  });
});
