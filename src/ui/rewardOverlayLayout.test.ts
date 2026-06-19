import { describe, expect, it } from "vitest";
import { getRewardOverlayLayout } from "./rewardOverlayLayout";

const CHOICE_COUNT = 3;
const BOSS_SOURCE_CARD_HEIGHT = 398;
const BOSS_MIN_TEXT_INSET_X = 18;
const BOSS_MIN_TEXT_TOP = 56;
const BOSS_MIN_TEXT_BOTTOM = 48;
const CARD_BODY_QUARTER_DIVISOR = 4;
const UPGRADE_MIN_TEXT_BOTTOM = 64;

describe("reward overlay layout", () => {
  it("keeps boss equipment cards inside the displayed panel", () => {
    const layout = getRewardOverlayLayout("bossEquipment", CHOICE_COUNT);

    expect(layout.cardRowTop + layout.cardBoxH).toBeLessThanOrEqual(layout.panelDisplaySize.h);
    expect(layout.overlayH).toBe(layout.panelDisplaySize.h);
    expect(layout.cardBoxH).toBeLessThan(BOSS_SOURCE_CARD_HEIGHT);
  });

  it("places boss equipment text away from the card border", () => {
    const layout = getRewardOverlayLayout("bossEquipment", CHOICE_COUNT);

    expect(layout.cardContent.insetX).toBeGreaterThanOrEqual(BOSS_MIN_TEXT_INSET_X);
    expect(layout.cardContent.top).toBeGreaterThanOrEqual(BOSS_MIN_TEXT_TOP);
    expect(layout.cardContent.bottom).toBeGreaterThanOrEqual(BOSS_MIN_TEXT_BOTTOM);
    expect(layout.cardContent.top + layout.cardContent.bottom).toBeLessThan(layout.cardBoxH);
  });

  it("keeps upgrade cards inside the displayed panel", () => {
    const layout = getRewardOverlayLayout("upgrade", CHOICE_COUNT);

    expect(layout.cardRowTop + layout.cardBoxH).toBeLessThanOrEqual(layout.panelDisplaySize.h);
    expect(layout.overlayH).toBe(layout.panelDisplaySize.h);
    expect(layout.cardScale).toBeLessThan(1);
  });

  it("places upgrade card text in the upper card body, away from the bottom decoration", () => {
    const layout = getRewardOverlayLayout("upgrade", CHOICE_COUNT);

    expect(layout.cardContent.top).toBeLessThan(layout.cardBoxH / CARD_BODY_QUARTER_DIVISOR);
    expect(layout.cardContent.bottom).toBeGreaterThanOrEqual(UPGRADE_MIN_TEXT_BOTTOM);
    expect(layout.cardContent.top + layout.cardContent.bottom).toBeLessThan(layout.cardBoxH);
  });
});
