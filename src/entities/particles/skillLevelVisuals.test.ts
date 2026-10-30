import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GUARD_COUNTER_EFFECT_CONFIG, SKILL_IDS } from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import {
  CORE_PLAYER_SKILL_LEVEL_SHEETS,
  corePlayerSkillEffectSheetForLevel,
  guardCounterHitSheetForLevel,
  playerSkillEffectSheets,
  type CorePlayerSkillId,
} from "../../systems/skillCatalog";
import type { SkillLevel } from "../../types/game-state";
import { castSelectedSkill, updateSkillCastRelease } from "../players/skillCasting";
import { spawnEnemyById } from "../enemy";
import {
  drawCloseArcEffects, drawLineProjectileEffects,
  updateCloseArcEffects, updateLineProjectileEffects,
} from "./coreSkillEffects";
import { drawGuardCounterEffect, guardCounterVisualFrame, updateGuardCounterEffect } from "./guardCounter";

const MAX_LEVEL = 3;
const LEVELS: SkillLevel[] = [1, 2, MAX_LEVEL];
const ORIGINAL_HEIGHT = { dragon: 160, arc: 420 };
const GUARD_CONFIG = GUARD_COUNTER_EFFECT_CONFIG;
const SIZE_MUTATION = { width: 900, height: 700 };
const TARGET = { hp: 1000, size: 2 };
const oldImages = new Map(playerSkillEffectSheets().map((sheet) => [sheet, sheet.image]));
const drawImage = vi.fn();
const context = {
  drawImage, save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
  beginPath: vi.fn(), ellipse: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
} as unknown as CanvasRenderingContext2D;

function release(skill: CorePlayerSkillId, level: SkillLevel, upgradeDuringCast = false) {
  state.player.equippedSkillIds[0] = skill;
  state.player.skillLevels[skill] = level;
  state.player.skillEnergy = state.player.skillEnergyMax;
  castSelectedSkill();
  if (upgradeDuringCast) state.player.skillLevels[skill] = 3;
  while (state.player.skillTimer > 0) updateSkillCastRelease();
}

beforeEach(() => {
  resetState();
  vi.clearAllMocks();
  for (const sheet of playerSkillEffectSheets()) sheet.image = {} as HTMLImageElement;
  setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
});
afterEach(() => {
  for (const [sheet, image] of oldImages) sheet.image = image;
  setCanvas(null);
});

describe("level-specific skill visuals", () => {
  it.each(LEVELS)("draws the selected level %i for all three skills", (level) => {
    release(SKILL_IDS.lineProjectile, level);
    drawLineProjectileEffects();
    expect(drawImage.mock.calls[drawImage.mock.calls.length - 1]?.[0]).toBe(corePlayerSkillEffectSheetForLevel(SKILL_IDS.lineProjectile, level).image);
    release(SKILL_IDS.closeArc, level);
    drawCloseArcEffects();
    expect(drawImage.mock.calls[drawImage.mock.calls.length - 1]?.[0]).toBe(corePlayerSkillEffectSheetForLevel(SKILL_IDS.closeArc, level).image);
    release(SKILL_IDS.guardCounter, level);
    drawGuardCounterEffect();
    expect(drawImage.mock.calls[drawImage.mock.calls.length - 1]?.[0]).toBe(corePlayerSkillEffectSheetForLevel(SKILL_IDS.guardCounter, level).image);
  });

  it.each([SKILL_IDS.closeArc, SKILL_IDS.guardCounter] as const)("keeps %s appearance at the paid level after upgrades", (skill) => {
    release(skill, 1, true);
    state.player.skillLevels[skill] = 3;
    if (skill === SKILL_IDS.closeArc) {
      expect(state.closeArcEffects[0].effectLevel).toBe(1);
      drawCloseArcEffects();
    } else {
      expect(state.guardCounterEffect?.effectLevel).toBe(1);
      drawGuardCounterEffect();
    }
    expect(drawImage.mock.calls[drawImage.mock.calls.length - 1]?.[0]).toBe(corePlayerSkillEffectSheetForLevel(skill, 1).image);
  });

  it("shows counter art only on a real flash and hides exhausted protection", () => {
    release(SKILL_IDS.guardCounter, MAX_LEVEL);
    const effect = state.guardCounterEffect!;
    const counter = guardCounterHitSheetForLevel(MAX_LEVEL);
    effect.elapsed = 40;
    drawGuardCounterEffect();
    expect(drawImage.mock.calls.some(([image]) => image === counter.image)).toBe(false);
    expect(drawImage).toHaveBeenCalledTimes(1);
    effect.barrierFlash = 18;
    effect.hitsRemaining = 0;
    drawImage.mockClear();
    drawGuardCounterEffect();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage.mock.calls[0][0]).toBe(counter.image);
    const frames = new Set<number>();
    for (let tick = 0; tick < GUARD_CONFIG.barrierFlashFrames; tick += 1) {
      frames.add(guardCounterVisualFrame(effect, true));
      updateGuardCounterEffect();
    }
    expect([...frames]).toEqual(Array.from({ length: counter.count }, (_, i) => i));
    expect(state.guardCounterEffect).toBeNull();
  });

  it.each(LEVELS)("keeps level %i aura readable, looping and anchored to the floor", (level) => {
    release(SKILL_IDS.guardCounter, level);
    const effect = state.guardCounterEffect!;
    const sheet = corePlayerSkillEffectSheetForLevel(SKILL_IDS.guardCounter, level);
    const feetY = state.player.y + state.player.h;
    const maxWidth = 120;
    const minAlpha = 0.4;
    const maxAlpha = 0.75;
    drawGuardCounterEffect();
    const startup = drawImage.mock.calls[0];
    expect(startup[6] + startup[8] / 2).toBe(feetY - GUARD_CONFIG.centerYOffset);
    expect(startup[7]).toBeLessThanOrEqual(maxWidth);
    expect(context.globalAlpha).toBeGreaterThanOrEqual(minAlpha);
    expect(context.globalAlpha).toBeLessThanOrEqual(maxAlpha);
    expect(startup[0]).toBe(sheet.image);
    drawImage.mockClear();
    effect.elapsed = GUARD_CONFIG.startupFrames;
    drawGuardCounterEffect();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(context.globalAlpha).toBeGreaterThanOrEqual(minAlpha);
    expect(context.fill).not.toHaveBeenCalled();
    expect(context.ellipse).not.toHaveBeenCalled();
    expect(context.globalCompositeOperation).toBe("source-over");
    effect.elapsed = sheet.count * GUARD_CONFIG.frameDuration;
    expect(guardCounterVisualFrame(effect, false)).toBe(0);
    effect.barrierFlash = GUARD_CONFIG.barrierFlashFrames;
    drawImage.mockClear();
    drawGuardCounterEffect();
    const hit = drawImage.mock.calls[1];
    expect(hit[0]).toBe(guardCounterHitSheetForLevel(level).image);
    expect(hit[7]).toBeLessThanOrEqual(maxWidth);
    expect(context.translate).toHaveBeenCalledWith(state.player.x + state.player.w / 2,
      feetY - GUARD_CONFIG.centerYOffset);
    expect(context.globalAlpha).toBeLessThanOrEqual(maxAlpha);
    effect.hitsRemaining = 0;
    effect.barrierFlash = 0;
    drawImage.mockClear();
    drawGuardCounterEffect();
    expect(drawImage).not.toHaveBeenCalled();
  });

  it("preloads each tier and counter once", () => {
    const sheets = playerSkillEffectSheets();
    expect(new Set(sheets.map((sheet) => sheet.src)).size).toBe(sheets.length);
    for (const levels of Object.values(CORE_PLAYER_SKILL_LEVEL_SHEETS)) {
      for (const sheet of Object.values(levels)) expect(sheets).toContain(sheet);
    }
    for (const level of LEVELS) expect(sheets).toContain(guardCounterHitSheetForLevel(level));
  });
});

function collisionProbe(skill: typeof SKILL_IDS.lineProjectile | typeof SKILL_IDS.closeArc, level: SkillLevel) {
  resetState();
  release(skill, level);
  const effect = skill === SKILL_IDS.lineProjectile ? state.lineProjectileEffects[0] : state.closeArcEffects[0];
  const position = { x: effect.x, y: effect.y };
  effect.vx = 0;
  const height = (skill === SKILL_IDS.lineProjectile ? ORIGINAL_HEIGHT.dragon : ORIGINAL_HEIGHT.arc) * effect.drawScale;
  for (const offset of [-TARGET.size, TARGET.size]) {
    spawnEnemyById("chaser", "debug");
    Object.assign(state.enemies[state.enemies.length - 1], {
      x: effect.x, y: effect.y + height + offset, w: TARGET.size, h: TARGET.size,
      hp: TARGET.hp, hitCd: 0,
    });
  }
  if (skill === SKILL_IDS.lineProjectile) updateLineProjectileEffects();
  else updateCloseArcEffects();
  return { position, health: state.enemies.map((enemy) => enemy.hp) };
}

it.each(LEVELS)("preserves release coordinates and collision edges when level %i sprite dimensions change", (level) => {
  for (const skill of [SKILL_IDS.lineProjectile, SKILL_IDS.closeArc] as const) {
    const baseline = collisionProbe(skill, level);
    expect(baseline.health[0]).toBeLessThan(TARGET.hp);
    expect(baseline.health[1]).toBe(TARGET.hp);
    const sheet = corePlayerSkillEffectSheetForLevel(skill, level);
    const original = { frameW: sheet.frameW, frameH: sheet.frameH };
    try {
      sheet.frameW += SIZE_MUTATION.width;
      sheet.frameH += SIZE_MUTATION.height;
      expect(collisionProbe(skill, level)).toEqual(baseline);
    } finally {
      Object.assign(sheet, original);
    }
  }
});
