import { describe, expect, it } from "vitest";
import { uiSpriteDisplaySize } from "../uiSprite";
import {
  EQUIPMENT_SLOTS,
  PAUSE_CHOICE_GRID_COLUMNS,
  PAUSE_CHOICE_GRID_COLUMN_W,
  PAUSE_CHOICE_GRID_GAP,
  PAUSE_CHOICES_COLUMN_W,
  PAUSE_COLUMN_GAP,
  PAUSE_CURRENT_COLUMN_W,
  PAUSE_CURRENT_FRAME_SIZE,
  PAUSE_CURRENT_ROW_GAP,
  PAUSE_DETAIL_PANEL_H,
  PAUSE_PANEL_CONTENT_BOTTOM,
  PAUSE_PANEL_CONTENT_TOP,
  PAUSE_PANEL_INSET_X,
  PAUSE_PANEL_H,
  PAUSE_PANEL_TITLE_TOP,
  PAUSE_PANEL_SPRITE,
  PAUSE_PANEL_W,
  PAUSE_TAB_BODY_GAP,
  PAUSE_TAB_GAP,
  PAUSE_TAB_H,
  PAUSE_TAB_INSET_X,
  PAUSE_TAB_W,
  PAUSE_TABS,
} from "./constants";

const MIN_TAB_WIDTH_USAGE = 0.95;
const MIN_BODY_WIDTH_USAGE = 0.98;
const MIN_CHOICE_COLUMN_USAGE = 0.93;

describe("pause layout", () => {
  it("keeps the reward-sized pause chrome and content rhythm readable", () => {
    const panelSize = uiSpriteDisplaySize(PAUSE_PANEL_SPRITE);

    expect(PAUSE_PANEL_W).toBe(panelSize.w);
    expect(PAUSE_PANEL_H).toBe(panelSize.h);
    expect(PAUSE_PANEL_TITLE_TOP).toBeLessThan(PAUSE_PANEL_CONTENT_TOP);
  });

  it("keeps tab and body grids inside their panel safe areas", () => {
    const tabSafeWidth = PAUSE_PANEL_W - PAUSE_TAB_INSET_X * 2;
    const tabWidth = PAUSE_TAB_W * PAUSE_TABS.length + PAUSE_TAB_GAP * (PAUSE_TABS.length - 1);
    const bodySafeWidth = PAUSE_PANEL_W - PAUSE_PANEL_INSET_X * 2;
    const bodyColumnWidth = PAUSE_CURRENT_COLUMN_W + PAUSE_COLUMN_GAP + PAUSE_CHOICES_COLUMN_W;

    expect(tabWidth).toBeLessThanOrEqual(tabSafeWidth);
    expect(bodyColumnWidth).toBeLessThanOrEqual(bodySafeWidth);
  });

  it("uses most of the available horizontal pause space", () => {
    const tabSafeWidth = PAUSE_PANEL_W - PAUSE_TAB_INSET_X * 2;
    const tabWidth = PAUSE_TAB_W * PAUSE_TABS.length + PAUSE_TAB_GAP * (PAUSE_TABS.length - 1);
    const bodySafeWidth = PAUSE_PANEL_W - PAUSE_PANEL_INSET_X * 2;
    const bodyColumnWidth = PAUSE_CURRENT_COLUMN_W + PAUSE_COLUMN_GAP + PAUSE_CHOICES_COLUMN_W;
    const choiceGridWidth = PAUSE_CHOICE_GRID_COLUMN_W * PAUSE_CHOICE_GRID_COLUMNS
      + PAUSE_CHOICE_GRID_GAP * (PAUSE_CHOICE_GRID_COLUMNS - 1);

    expect(tabWidth / tabSafeWidth).toBeGreaterThanOrEqual(MIN_TAB_WIDTH_USAGE);
    expect(bodyColumnWidth / bodySafeWidth).toBeGreaterThanOrEqual(MIN_BODY_WIDTH_USAGE);
    expect(choiceGridWidth / PAUSE_CHOICES_COLUMN_W).toBeGreaterThanOrEqual(MIN_CHOICE_COLUMN_USAGE);
  });

  it("keeps pause slot grids inside their columns", () => {
    const currentSlotsWidth = PAUSE_CURRENT_FRAME_SIZE * EQUIPMENT_SLOTS.length
      + PAUSE_CURRENT_ROW_GAP * (EQUIPMENT_SLOTS.length - 1);
    const choiceGridWidth = PAUSE_CHOICE_GRID_COLUMN_W * PAUSE_CHOICE_GRID_COLUMNS
      + PAUSE_CHOICE_GRID_GAP * (PAUSE_CHOICE_GRID_COLUMNS - 1);

    expect(currentSlotsWidth).toBeLessThanOrEqual(PAUSE_CURRENT_COLUMN_W);
    expect(choiceGridWidth).toBeLessThanOrEqual(PAUSE_CHOICES_COLUMN_W);
  });

  it("keeps a usable body row above the bottom detail panel", () => {
    const contentHeight = PAUSE_PANEL_H - PAUSE_PANEL_CONTENT_TOP - PAUSE_PANEL_CONTENT_BOTTOM;
    const minimumBodyHeight = PAUSE_CURRENT_FRAME_SIZE + PAUSE_CURRENT_ROW_GAP + PAUSE_DETAIL_PANEL_H;
    const minimumPanelContentHeight = PAUSE_TAB_H + PAUSE_TAB_BODY_GAP + minimumBodyHeight;

    expect(minimumPanelContentHeight).toBeLessThanOrEqual(contentHeight);
  });
});
