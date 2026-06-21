import { describe, expect, it } from "vitest";
import { getRewardOverlayLayout } from "./rewardOverlayLayout";

const CHOICE_COUNT = 3;
const BOSS_SOURCE_CARD_HEIGHT = 398;
const BOSS_MIN_TEXT_INSET_X = 18;
const BOSS_MIN_TEXT_TOP = 56;
const BOSS_MIN_TEXT_BOTTOM = 48;
const CARD_BODY_QUARTER_DIVISOR = 4;
const UPGRADE_ICON_SLOT_SOURCE_CENTER_Y = 50;
const UPGRADE_ICON_CENTER_TOLERANCE = 1;
const UPGRADE_MAX_TITLE_TOP = 30;
const UPGRADE_MIN_CARD_ROW_TOP = 48;
const UPGRADE_MIN_TEXT_GAP_BELOW_ICON = 12;
const UPGRADE_MIN_CARD_SCALE = 0.82;
const UPGRADE_MIN_PANEL_BOTTOM_PADDING = 44;
const UPGRADE_MIN_TEXT_BOTTOM = 60;

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

  it("keeps upgrade cards inside the framed panel area", () => {
    const layout = getRewardOverlayLayout("upgrade", CHOICE_COUNT);

    expect(layout.titleTop).toBeLessThanOrEqual(UPGRADE_MAX_TITLE_TOP);
    expect(layout.cardRowTop).toBeGreaterThanOrEqual(UPGRADE_MIN_CARD_ROW_TOP);
    expect(layout.cardRowTop + layout.cardBoxH).toBeLessThanOrEqual(layout.panelDisplaySize.h);
    expect(layout.panelDisplaySize.h - (layout.cardRowTop + layout.cardBoxH)).toBeGreaterThanOrEqual(UPGRADE_MIN_PANEL_BOTTOM_PADDING);
    expect(layout.overlayH).toBe(layout.panelDisplaySize.h);
    expect(layout.cardScale).toBeLessThan(1);
    expect(layout.cardScale).toBeGreaterThanOrEqual(UPGRADE_MIN_CARD_SCALE);
  });

  it("aligns the upgrade card icon frame to the talisman slot", () => {
    const layout = getRewardOverlayLayout("upgrade", CHOICE_COUNT);

    expect(layout.cardIcon).not.toBeNull();
    expect(layout.cardIcon!.top + layout.cardIcon!.size / 2).toBeCloseTo(
      UPGRADE_ICON_SLOT_SOURCE_CENTER_Y * layout.cardScale,
      UPGRADE_ICON_CENTER_TOLERANCE,
    );
  });

  it("places upgrade card text below the icon slot and above the bottom seal", () => {
    const layout = getRewardOverlayLayout("upgrade", CHOICE_COUNT);

    expect(layout.cardContent.top).toBeGreaterThan(
      layout.cardIcon!.top + layout.cardIcon!.size + UPGRADE_MIN_TEXT_GAP_BELOW_ICON,
    );
    expect(layout.cardContent.top).toBeGreaterThan(layout.cardBoxH / CARD_BODY_QUARTER_DIVISOR);
    expect(layout.cardContent.bottom).toBeGreaterThanOrEqual(UPGRADE_MIN_TEXT_BOTTOM);
    expect(layout.cardContent.top + layout.cardContent.bottom).toBeLessThan(layout.cardBoxH);
  });
});
