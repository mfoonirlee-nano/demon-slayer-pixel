import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BLOOD_MOON_DEATH_SHEET,
  BOSS_DEFEAT_SPLIT_VISUAL,
  BOSS_SHEET,
  MIST_BONE_DEFEAT_VISUAL,
  MIST_BONE_SHEET,
} from "../../constants";
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
const EXPECTED_MIST_BONE_FRAGMENT_COUNT = 12;
const EXPECTED_MIST_BONE_FOG_WISP_COUNT = 9;
const BLOOD_MOON_DEATH_FRAME_DURATION = BOSS_DEFEAT_SPLIT_VISUAL.durationFrames
  / BLOOD_MOON_DEATH_SHEET.count;
const originalBossImage = BOSS_SHEET.image;
const originalMistBoneImage = MIST_BONE_SHEET.image;
const originalBloodMoonDeathImage = BLOOD_MOON_DEATH_SHEET.image;

describe("boss defeat split effect", () => {
  afterEach(() => {
    resetState();
    setCanvas(null);
    BOSS_SHEET.image = originalBossImage;
    MIST_BONE_SHEET.image = originalMistBoneImage;
    BLOOD_MOON_DEATH_SHEET.image = originalBloodMoonDeathImage;
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

    const effect = state.bossDefeatSplitEffect;
    if (!effect || effect.kind !== "split") throw new Error("Split effect was not preserved");
    expect(effect.cutAngle).toBe(RANDOM_CUT_ROLL * Math.PI);
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

  it("scatters the captured Mist Bone pose into bone fragments while its fog blows away", () => {
    const context = createContext();
    const bossImage = {} as HTMLImageElement;
    MIST_BONE_SHEET.image = bossImage;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.mistBone,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });

    spawnBossDefeatSplitEffect(boss, 0, () => RANDOM_CUT_ROLL);

    expect(state.bossDefeatSplitEffect).toMatchObject({
      kind: "mistBoneScatter",
      fragments: expect.arrayContaining([
        expect.objectContaining({ column: 0, row: 0 }),
        expect.objectContaining({ column: 2, row: 3 }),
      ]),
      fogWisps: expect.any(Array),
      life: BOSS_DEFEAT_SPLIT_VISUAL.durationFrames,
    });
    const effect = state.bossDefeatSplitEffect;
    if (!effect || effect.kind !== "mistBoneScatter") {
      throw new Error("Mist Bone scatter effect was not created");
    }
    expect(effect.fragments).toHaveLength(EXPECTED_MIST_BONE_FRAGMENT_COUNT);
    expect(effect.fogWisps).toHaveLength(EXPECTED_MIST_BONE_FOG_WISP_COUNT);

    updateBossDefeatSplitEffect();
    drawBossDefeatSplitEffect();

    expect(context.clip).not.toHaveBeenCalled();
    expect(context.ellipse).toHaveBeenCalledTimes(EXPECTED_MIST_BONE_FOG_WISP_COUNT);
    expect(context.drawImage).toHaveBeenCalledTimes(EXPECTED_MIST_BONE_FRAGMENT_COUNT);
    expect(context.drawImage.mock.calls.every((call) => call[0] === bossImage)).toBe(true);
    const lastFogDrawOrder = context.fill.mock.invocationCallOrder[
      context.fill.mock.invocationCallOrder.length - 1
    ];
    expect(lastFogDrawOrder).toBeLessThan(
      context.drawImage.mock.invocationCallOrder[0],
    );
    const centerX = effect.pose.x + effect.pose.w / 2;
    const fragmentDrawW = effect.pose.w / MIST_BONE_DEFEAT_VISUAL.fragmentColumns;
    const rightFragmentInitialX = centerX + fragmentDrawW;
    const leftFragmentInitialX = centerX - fragmentDrawW;
    expect(context.translate.mock.calls[0][0]).toBeGreaterThan(rightFragmentInitialX);
    expect(
      context.translate.mock.calls[MIST_BONE_DEFEAT_VISUAL.fragmentColumns - 1][0],
    ).toBeLessThan(leftFragmentInitialX);
  });

  it("plays Blood Moon's authored collapse in sequence instead of cutting its snapshot", () => {
    const context = createContext();
    const deathImage = {} as HTMLImageElement;
    const random = vi.fn(() => RANDOM_CUT_ROLL);
    BLOOD_MOON_DEATH_SHEET.image = deathImage;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.bloodMoon,
      bossKills: 12,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;

    spawnBossDefeatSplitEffect(boss, 0, random);

    expect(random).not.toHaveBeenCalled();
    expect(state.bossDefeatSplitEffect).toMatchObject({
      kind: "bloodMoonDissolve",
      pose: { sheet: BLOOD_MOON_DEATH_SHEET },
    });

    drawBossDefeatSplitEffect();
    expect(context.clip).not.toHaveBeenCalled();
    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage.mock.calls[0][0]).toBe(deathImage);
    expect(context.drawImage.mock.calls[0][1]).toBe(0);

    context.drawImage.mockClear();
    for (let frame = 0; frame < BLOOD_MOON_DEATH_FRAME_DURATION; frame += 1) {
      updateBossDefeatSplitEffect();
    }
    drawBossDefeatSplitEffect();
    expect(context.drawImage.mock.calls[0][1]).toBe(BLOOD_MOON_DEATH_SHEET.frameW);
  });
});

function createContext() {
  return {
    beginPath: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
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
    ellipse: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    rect: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
  };
}
