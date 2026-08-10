import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BLOOD_MOON_CONFIG,
  BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
  BLOOD_MOON_PHASE_RUNES_SHEET,
  BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { BloodMoonEffectState } from "../../types/game-state";
import { drawBloodMoonEffects, updateBloodMoonEffects } from "./bloodMoonEffects";

const warningSheets = [
  BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
  BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
];
const originalImages = warningSheets.map((sheet) => sheet.image);
const TEST_WARNING_FRAMES = 4;
const LANTERN_RUNE_INDEX = 4;
const FAR_PLAYER_X = 800;

describe("blood moon effects", () => {
  afterEach(() => {
    warningSheets.forEach((sheet, index) => {
      sheet.image = originalImages[index];
    });
    setCanvas(null);
  });

  it.each(["spiderMist", "mirrorFang"] as const)(
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

  it("keeps the lantern-bell animation cadence without a warning window", () => {
    resetState();
    const effect = createEffect("lanternBell", 0);
    effect.damage = 0;
    effect.hitDone = true;
    state.bloodMoonEffects.push(effect);

    for (let frame = 1; frame < BLOOD_MOON_CONFIG.lanternBellFrameDuration; frame += 1) {
      updateBloodMoonEffects();
      expect(effect.frame).toBe(0);
    }

    updateBloodMoonEffects();
    expect(effect.frame).toBe(1);
  });

  it("keeps translucent mirror feints harmless even if a caller supplies damage", () => {
    resetState();
    const effect = createEffect("mirrorFang");
    if (effect.kind !== "mirrorFang") throw new Error("Mirror fang was not created");
    effect.decoy = true;
    effect.damage = 99;
    state.bloodMoonEffects.push(effect);
    state.player.x = effect.x;
    state.player.y = effect.y;
    const hpBefore = state.player.hp;

    for (let frame = 0; frame <= effect.warningFrames; frame += 1) {
      updateBloodMoonEffects();
    }

    expect(state.player.hp).toBe(hpBefore);
    expect(effect.hitDone).toBe(false);
  });

  it("switches each face rune from its dim frame to its paired bright frame", () => {
    resetState();
    const effect = createEffect("phaseRune", 0);
    if (effect.kind !== "phaseRune") throw new Error("Phase rune was not created");
    effect.runeFace = "lantern";
    effect.damage = 0;
    effect.hitDone = true;
    state.bloodMoonEffects.push(effect);

    for (let frame = 0; frame < BLOOD_MOON_CONFIG.runeDimFrames; frame += 1) {
      updateBloodMoonEffects();
      expect(effect.frame).toBe(LANTERN_RUNE_INDEX * 2);
    }

    updateBloodMoonEffects();
    expect(effect.frame).toBe(LANTERN_RUNE_INDEX * 2 + 1);
    expect(effect.frame).toBeLessThan(BLOOD_MOON_PHASE_RUNES_SHEET.count);
  });

  it("retires a damaging effect when its visible sequence ends", () => {
    resetState();
    const effect = createEffect("spiderMist");
    effect.vx = 0;
    state.bloodMoonEffects.push(effect);
    const activeSpriteFrames = BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET.count - 2;
    const visibleFrames = effect.warningFrames
      + activeSpriteFrames * BLOOD_MOON_CONFIG.spiderMistFrameDuration;

    for (let frame = 0; frame < visibleFrames - 1; frame += 1) {
      updateBloodMoonEffects();
    }
    expect(state.bloodMoonEffects).toContain(effect);

    updateBloodMoonEffects();
    expect(state.bloodMoonEffects).not.toContain(effect);
  });

  it("loops readable fang motion frames before a short harmless dissipate frame", () => {
    resetState();
    const effect = createEffect("mirrorFang");
    effect.x = 0;
    effect.vx = 0;
    effect.life = BLOOD_MOON_CONFIG.mirrorFangLife;
    state.player.x = FAR_PLAYER_X;
    state.bloodMoonEffects.push(effect);

    const updatesBeforeDissipate = effect.life
      - BLOOD_MOON_CONFIG.mirrorFangFrameDuration;
    for (let frame = 0; frame < updatesBeforeDissipate; frame += 1) {
      updateBloodMoonEffects();
    }

    expect(state.bloodMoonEffects).toContain(effect);
    expect(effect.frame).toBe(BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET.count - 1);
    state.player.x = effect.x;
    state.player.y = effect.y;
    const hpBefore = state.player.hp;
    updateBloodMoonEffects();
    expect(state.player.hp).toBe(hpBefore);
  });
});

function createEffect(
  kind: BloodMoonEffectState["kind"],
  warningFrames = TEST_WARNING_FRAMES,
): BloodMoonEffectState {
  const base = {
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
    hitDone: false,
  };
  if (kind === "mirrorFang") return { ...base, kind, decoy: false };
  if (kind === "phaseRune") return { ...base, kind, runeFace: "spider" };
  return { ...base, kind };
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
