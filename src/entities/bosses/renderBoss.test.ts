import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GROUND_Y,
  LANTERN_EMBER_FIRELINE_CAST_SHEET,
  LANTERN_EMBER_SUMMON_SHEET,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { drawBoss } from "./renderBoss";

const originalFirelineCastImage = LANTERN_EMBER_FIRELINE_CAST_SHEET.image;
const originalSummonImage = LANTERN_EMBER_SUMMON_SHEET.image;

describe("boss casting visuals", () => {
  afterEach(() => {
    setCanvas(null);
    LANTERN_EMBER_FIRELINE_CAST_SHEET.image = originalFirelineCastImage;
    LANTERN_EMBER_SUMMON_SHEET.image = originalSummonImage;
  });

  it("uses the fireline cast pose for Lantern Ember's awakened grid", () => {
    resetState();
    const context = createContext();
    const firelineCastImage = {} as HTMLImageElement;
    const summonImage = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    LANTERN_EMBER_FIRELINE_CAST_SHEET.image = firelineCastImage;
    LANTERN_EMBER_SUMMON_SHEET.image = summonImage;

    state.boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.lanternEmber,
      bossKills: 0,
      elapsedSeconds: 0,
      awakened: true,
    });
    state.boss.entering = false;
    state.boss.y = GROUND_Y - state.boss.h;
    state.boss.castTimer = 1;
    state.boss.skillMode = "lanternAwakenedGrid";

    drawBoss();

    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage.mock.calls[0][0]).toBe(firelineCastImage);
  });
});

function createContext() {
  return {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
  } as unknown as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
  };
}
