import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BLOOD_MOON_CONFIG,
  BLOOD_MOON_MANY_FACES_EFFECT_SHEET,
  BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
  BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { BloodMoonEffectState } from "../../types/game-state";
import { drawBloodMoonEffects, updateBloodMoonEffects } from "./bloodMoonEffects";

const warningSheets = [
  BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
  BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
  BLOOD_MOON_MANY_FACES_EFFECT_SHEET,
];
const originalImages = warningSheets.map((sheet) => sheet.image);
const TEST_WARNING_FRAMES = 4;

describe("blood moon effects", () => {
  afterEach(() => {
    warningSheets.forEach((sheet, index) => {
      sheet.image = originalImages[index];
    });
    setCanvas(null);
  });

  it.each(["spiderMist", "mirrorFang", "manyFaces"] as const)(
    "charges %s through its first two effect frames before activation",
    (kind) => {
      resetState();
      const effect = createEffect(kind);
      state.bloodMoonEffects.push(effect);
      const startX = effect.x;
      state.player.x = effect.x;
      state.player.y = effect.y;
      const hpBeforeWarning = state.player.hp;
      const warningFrames = new Set<number>();

      for (let frame = 0; frame < effect.warningFrames; frame += 1) {
        updateBloodMoonEffects();
        warningFrames.add(effect.frame);
        expect(effect.x).toBe(startX);
      }

      expect([...warningFrames]).toEqual([0, 1]);
      expect(state.player.hp).toBe(hpBeforeWarning);
      updateBloodMoonEffects();
      expect(effect.frame).toBe(2);
      expect(effect.x).toBe(kind === "mirrorFang" ? startX + effect.vx : startX);
      expect(state.player.hp).toBeLessThan(hpBeforeWarning);
      expect(effect.hitDone).toBe(true);
    },
  );

  it("draws a sprite frame for the warning without a procedural overlay", () => {
    resetState();
    const context = createContext();
    const image = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET.image = image;
    state.bloodMoonEffects.push(createEffect("spiderMist"));

    drawBloodMoonEffects();

    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage.mock.calls[0][0]).toBe(image);
  });

  it.each([
    ["lanternBell", BLOOD_MOON_CONFIG.lanternBellFrameDuration],
    ["sixfold", BLOOD_MOON_CONFIG.sixfoldFrameDuration],
  ] as const)("keeps the original %s animation cadence without a warning window", (
    kind,
    frameDuration,
  ) => {
    resetState();
    const effect = createEffect(kind, 0);
    effect.damage = 0;
    effect.hitDone = true;
    state.bloodMoonEffects.push(effect);

    for (let frame = 1; frame < frameDuration; frame += 1) {
      updateBloodMoonEffects();
      expect(effect.frame).toBe(0);
    }

    updateBloodMoonEffects();
    expect(effect.frame).toBe(1);
  });
});

function createEffect(
  kind: BloodMoonEffectState["kind"],
  warningFrames = TEST_WARNING_FRAMES,
): BloodMoonEffectState {
  return {
    kind,
    x: 420,
    y: 260,
    w: 120,
    h: 48,
    vx: kind === "mirrorFang" ? BLOOD_MOON_CONFIG.mirrorFangSpeed : 0,
    facing: 1,
    delay: 0,
    warningFrames,
    elapsed: 0,
    frame: 0,
    life: 60,
    damage: 1,
    hitPlayerCd: 0,
    hitDone: false,
  };
}

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
