import { afterEach, describe, expect, it, vi } from "vitest";
import { BOSS_DEFEAT_SPLIT_VISUAL, BOSS_SHEET } from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import {
  drawBossDefeatSplitEffect,
  spawnBossDefeatSplitEffect,
  updateBossDefeatSplitEffect,
} from "./bossDefeatSplitEffect";

const RANDOM_CUT_ROLL = 0.25;
const SNAPSHOT_ACTION_TIMER = 17;
const UPDATES_BEFORE_EXPIRY = BOSS_DEFEAT_SPLIT_VISUAL.durationFrames - 1;
const originalBossImage = BOSS_SHEET.image;

describe("boss defeat split effect", () => {
  afterEach(() => {
    resetState();
    setCanvas(null);
    BOSS_SHEET.image = originalBossImage;
  });

  it("snapshots the lethal pose and chooses one stable random cut direction", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.actionTimer = SNAPSHOT_ACTION_TIMER;
    const random = vi.fn(() => RANDOM_CUT_ROLL);

    spawnBossDefeatSplitEffect(boss, 0, random);

    expect(random).toHaveBeenCalledOnce();
    expect(state.bossDefeatSplitEffect).toMatchObject({
      cutAngle: RANDOM_CUT_ROLL * Math.PI,
      life: BOSS_DEFEAT_SPLIT_VISUAL.durationFrames,
      maxLife: BOSS_DEFEAT_SPLIT_VISUAL.durationFrames,
    });
    expect(state.bossDefeatSplitEffect?.pose.sheet).toBe(BOSS_SHEET);
    expect(boss.actionTimer).toBe(SNAPSHOT_ACTION_TIMER);

    updateBossDefeatSplitEffect();

    expect(state.bossDefeatSplitEffect?.cutAngle).toBe(RANDOM_CUT_ROLL * Math.PI);
    expect(random).toHaveBeenCalledOnce();
  });

  it("remains active for about one second at the game's 60-frame timing", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });

    spawnBossDefeatSplitEffect(boss, 0);
    for (let frame = 0; frame < UPDATES_BEFORE_EXPIRY; frame += 1) {
      updateBossDefeatSplitEffect();
    }

    expect(state.bossDefeatSplitEffect?.life).toBe(1);

    updateBossDefeatSplitEffect();

    expect(state.bossDefeatSplitEffect).toBeNull();
  });

  it("draws two complementary clipped copies of the same captured frame", () => {
    const context = createContext();
    const bossImage = {} as HTMLImageElement;
    BOSS_SHEET.image = bossImage;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });

    spawnBossDefeatSplitEffect(boss, 0, () => RANDOM_CUT_ROLL);
    updateBossDefeatSplitEffect();
    drawBossDefeatSplitEffect();

    expect(context.clip).toHaveBeenCalledTimes(2);
    expect(context.rect).toHaveBeenCalledTimes(2);
    expect(context.rect.mock.calls[0][1]).toBeLessThan(0);
    expect(context.rect.mock.calls[1][1]).toBe(0);
    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls[0]).toEqual(context.drawImage.mock.calls[1]);
    expect(context.drawImage.mock.calls[0][0]).toBe(bossImage);
  });
});

function createContext() {
  return {
    beginPath: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
    rect: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D & {
    clip: ReturnType<typeof vi.fn>;
    drawImage: ReturnType<typeof vi.fn>;
    rect: ReturnType<typeof vi.fn>;
  };
}
