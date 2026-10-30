import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYER_COMBAT } from "../../constants";
import { MOON_TIDE_AURA } from "../../constants/moonTideVisual";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { ultimateAfterimageSheetForLevel, ultimateEffectSheetForLevel, ultimateSkillSheets } from "../../systems/skillCatalog";
import type { SkillLevel } from "../../types/game-state";
import { triggerUltimateOpeningEffect } from "../players/skillCasting";
import { triggerMoonTideAfterimageHit } from "../players/moonTide";
import { drawUltimateAfterimageSlashes, drawUltimateEffects, updateUltimateAfterimageSlashes, updateUltimateEffects } from "./ultimateEffects";

vi.mock("../../game/audio", () => ({ playSfx: vi.fn() }));
const MAX_LEVEL = 3;
const LEVELS: SkillLevel[] = [1, 2, MAX_LEVEL];
const TEST = { activeFrames: 300, x: 400, y: 300, spread: 80 };
const drawImage = vi.fn();
const context = {
  drawImage, save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
} as unknown as CanvasRenderingContext2D;
const oldImages = new Map(ultimateSkillSheets().map((sheet) => [sheet, sheet.image]));

beforeEach(() => {
  resetState();
  vi.clearAllMocks();
  vi.spyOn(Math, "random").mockReturnValue(0);
  for (const sheet of ultimateSkillSheets()) sheet.image = {} as HTMLImageElement;
  setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const [sheet, image] of oldImages) sheet.image = image;
  setCanvas(null);
});

describe("moon tide level visuals", () => {
  it.each(LEVELS)("preloads level %i and separates one-shot release from the floor loop", (level) => {
    state.player.ultimateLevel = level;
    state.player.ultimateCastTimer = PLAYER_COMBAT.ultimateCastFrames;
    triggerUltimateOpeningEffect();
    const effect = state.ultimateEffects[0];
    const floor = ultimateEffectSheetForLevel(level);
    const opening = ultimateEffectSheetForLevel(level, true);
    const sheets = ultimateSkillSheets();
    expect(sheets).toContain(floor);
    expect(sheets).toContain(opening);
    expect(sheets).toContain(ultimateAfterimageSheetForLevel(level));
    expect(new Set(sheets.map(({ src }) => src)).size).toBe(sheets.length);
    drawUltimateEffects();
    expect(drawImage.mock.calls.map(([image]) => image)).toEqual([floor.image, opening.image]);
    expect(context.globalCompositeOperation).toBe("source-over");
    // An upgrade after release must not replay a different opening or swap its aura.
    state.player.ultimateLevel = MAX_LEVEL;
    const releaseLife = opening.count * MOON_TIDE_AURA.openingFrameDuration;
    for (let tick = 0; tick < releaseLife; tick += 1) updateUltimateEffects();
    drawImage.mockClear();
    drawUltimateEffects();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage.mock.calls[0][0]).toBe(floor.image);
    for (let tick = 0; tick < floor.count * PLAYER_COMBAT.ultimateEffectFrameDuration; tick += 1) updateUltimateEffects();
    drawImage.mockClear();
    drawUltimateEffects();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(effect.effectLevel).toBe(level);
  });

  it("follows the feet without flipping the floor plane and fades only near expiry", () => {
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = TEST.activeFrames;
    triggerUltimateOpeningEffect();
    const effect = state.ultimateEffects[0];
    effect.elapsed = TEST.activeFrames;
    effect.life = TEST.activeFrames;
    state.player.x = TEST.x;
    state.player.y = TEST.y;
    state.player.facing = -1;
    drawUltimateEffects();
    expect(context.translate).toHaveBeenLastCalledWith(TEST.x + state.player.w / 2, TEST.y + state.player.h + MOON_TIDE_AURA.footYOffset);
    expect(context.scale).not.toHaveBeenCalled();
    expect(context.globalAlpha).toBe(MOON_TIDE_AURA.alpha);
    effect.life = MOON_TIDE_AURA.fadeOutFrames / 2;
    drawUltimateEffects();
    expect(context.globalAlpha).toBe(MOON_TIDE_AURA.alpha / 2);
    drawImage.mockClear();
    state.player.ultimateTimer = 0;
    drawUltimateEffects();
    expect(drawImage).not.toHaveBeenCalled();
  });

  it.each(LEVELS)("plays level %i afterimage frames only for a real proc", (level) => {
    state.player.ultimateLevel = level;
    const damage = vi.fn();
    expect(triggerMoonTideAfterimageHit(TEST.x, TEST.y, TEST.spread, damage)).toBe(false);
    expect(state.ultimateAfterimageSlashes).toHaveLength(0);
    state.player.ultimateTimer = TEST.activeFrames;
    expect(triggerMoonTideAfterimageHit(TEST.x, TEST.y, TEST.spread, damage)).toBe(true);
    expect(damage).toHaveBeenCalledTimes(1);
    state.player.ultimateLevel = MAX_LEVEL;
    const sheet = ultimateAfterimageSheetForLevel(level);
    const frames = new Set<number>();
    for (let tick = 0; tick < PLAYER_COMBAT.ultimateAfterimageLife; tick += 1) {
      drawImage.mockClear();
      drawUltimateAfterimageSlashes();
      for (const [image, sourceX] of drawImage.mock.calls) {
        expect(image).toBe(sheet.image);
        frames.add(sourceX / sheet.frameW);
      }
      updateUltimateAfterimageSlashes();
    }
    expect([...frames]).toEqual(Array.from({ length: sheet.count }, (_, index) => index));
    expect(state.ultimateAfterimageSlashes).toHaveLength(0);
    expect(damage).toHaveBeenCalledTimes(1);
  });

  it("hides opening and afterimages on death or game over", () => {
    state.player.ultimateLevel = MAX_LEVEL;
    state.player.ultimateTimer = TEST.activeFrames;
    triggerUltimateOpeningEffect();
    triggerMoonTideAfterimageHit(TEST.x, TEST.y, TEST.spread, vi.fn());
    state.player.hp = 0;
    drawUltimateEffects();
    drawUltimateAfterimageSlashes();
    expect(drawImage).not.toHaveBeenCalled();
    state.player.hp = 1;
    state.gameOver = true;
    drawUltimateEffects();
    drawUltimateAfterimageSlashes();
    expect(drawImage).not.toHaveBeenCalled();
  });
});
