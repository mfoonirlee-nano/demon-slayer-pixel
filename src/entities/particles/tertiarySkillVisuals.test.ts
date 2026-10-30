import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RETURNING_BLADE_CONFIG, SKILL_IDS, VERTICAL_WAVE_EFFECT_GROUND_BASELINE_Y, VERTICAL_WAVE_PILLAR_CONFIG, VERTICAL_WAVE_PILLAR_SHEET } from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { playerSkillEffectSheet, playerSkillEffectSheets } from "../../systems/skillCatalog";
import { GENERIC_PLAYER_SKILL_TUNING } from "../../systems/playerSkills";
import type { SkillLevel } from "../../types/game-state";
import { castSelectedSkill, updateSkillCastRelease } from "../players/skillCasting";
import { spawnEnemyById } from "../enemy";
import { drawPlayerSkillEffects, updatePlayerSkillEffects } from "./playerSkillRuntime";
import { drawReturningBladeEffect } from "./returningBladeVisuals";
import { activeReturningBlade, recallReturningBlade } from "./returningBlade";

const MAX_LEVEL = 3;
const LEVELS: SkillLevel[] = [1, 2, MAX_LEVEL];
const SKILLS = [SKILL_IDS.antiAirMulti, SKILL_IDS.returningBlade, SKILL_IDS.verticalWave] as const;
const TEST = { upgradedLevel: 3, settleFrames: 30, returnFrames: 60, targetHp: 10000, enemyX: 380 } as const;
const drawImage = vi.fn();
const context = {
  drawImage, save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(),
  beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
} as unknown as CanvasRenderingContext2D;
const oldImages = new Map(playerSkillEffectSheets().map((sheet) => [sheet, sheet.image]));

function release(skillId: typeof SKILLS[number], level: SkillLevel, upgrade = false) {
  state.player.equippedSkillIds[0] = skillId;
  state.player.skillLevels[skillId] = level;
  state.player.skillEnergy = state.player.skillEnergyMax;
  castSelectedSkill();
  if (upgrade) state.player.skillLevels[skillId] = TEST.upgradedLevel;
  while (state.player.skillTimer > 0) updateSkillCastRelease();
  return state.playerSkillEffects[0]!;
}
function advance(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) updatePlayerSkillEffects();
}

beforeEach(() => {
  resetState();
  vi.clearAllMocks();
  vi.spyOn(Math, "random").mockReturnValue(1);
  for (const sheet of playerSkillEffectSheets()) sheet.image = {} as HTMLImageElement;
  setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const [sheet, image] of oldImages) sheet.image = image;
  setCanvas(null);
});

describe("rain, returning blade and upward wave tier visuals", () => {
  it.each(LEVELS)("preloads and draws level %i from its own sheet", (level) => {
    const sheets = playerSkillEffectSheets();
    expect(new Set(sheets.map((sheet) => sheet.src)).size).toBe(sheets.length);
    for (const skillId of SKILLS) {
      resetState();
      const effect = release(skillId, level);
      const sheet = playerSkillEffectSheet(skillId, effect.kind, level)!;
      expect(sheets).toContain(sheet);
      const stem = skillId === SKILL_IDS.returningBlade ? "tide_technique" : "effect";
      expect(sheet.src).toContain(`${stem}${level === 1 ? "" : `_lv${level}`}.png`);
      drawImage.mockClear();
      drawPlayerSkillEffects();
      expect(drawImage.mock.calls[0][0]).toBe(sheet.image);
      expect(context.globalCompositeOperation).toBe("source-over");
    }
  });

  it.each(SKILLS)("keeps the paid %s level during and after release", (skillId) => {
    const effect = release(skillId, 1, true);
    expect(effect.effectLevel).toBe(1);
    drawPlayerSkillEffects();
    expect(drawImage.mock.calls[0][0]).toBe(playerSkillEffectSheet(skillId, effect.kind, 1)!.image);
    if (skillId === SKILL_IDS.returningBlade) {
      advance(TEST.settleFrames);
      expect(effect.phase).toBe("hover");
      recallReturningBlade();
      advance(RETURNING_BLADE_CONFIG.recallFrames + 1);
      expect(effect.phase).toBe("return");
      drawImage.mockClear();
      drawReturningBladeEffect(effect);
      expect(drawImage.mock.calls[0][0]).toBe(playerSkillEffectSheet(skillId, undefined, 1)!.image);
      expect(context.rotate).toHaveBeenLastCalledWith(Math.atan2(effect.vy, effect.vx || effect.facing));
    }
  });

  it.each(LEVELS)("draws marks and cross hits only after actual level %i route hits", (level) => {
    state.player.x = 300;
    state.player.y = 300;
    spawnEnemyById("chaser", "debug");
    const enemy = state.enemies[0];
    Object.assign(enemy, { x: TEST.enemyX, y: state.player.y, hp: TEST.targetHp, w: 30, h: 90, spawnOccluder: undefined });
    const effect = release(SKILL_IDS.returningBlade, level);
    const sheet = playerSkillEffectSheet(effect.skillId, effect.kind, level)!;
    drawReturningBladeEffect(effect);
    expect(drawImage).toHaveBeenCalledTimes(1);
    advance(TEST.settleFrames);
    drawImage.mockClear();
    drawReturningBladeEffect(effect);
    expect(drawImage).toHaveBeenCalledTimes(level === TEST.upgradedLevel ? 2 : 1);
    if (level === TEST.upgradedLevel) {
      expect(drawImage.mock.calls[0][1]).toBe(RETURNING_BLADE_CONFIG.loopFrameCount * sheet.frameW);
    }
    recallReturningBlade();
    let sawCross = false;
    for (let tick = 0; tick < TEST.returnFrames; tick += 1) {
      updatePlayerSkillEffects();
      const cross = state.playerSkillEffects.find(({ kind }) => kind === "returningBladeCross");
      if (!cross) continue;
      sawCross = true;
      expect(cross.effectLevel).toBe(TEST.upgradedLevel);
      drawImage.mockClear();
      drawReturningBladeEffect(cross);
      expect(drawImage.mock.calls[0][0]).toBe(sheet.image);
      expect(drawImage.mock.calls[0][1]).toBeGreaterThanOrEqual(RETURNING_BLADE_CONFIG.loopFrameCount * sheet.frameW);
    }
    expect(sawCross).toBe(level === TEST.upgradedLevel);
    expect(activeReturningBlade()).toBeUndefined();
  });

  it.each(LEVELS)("keeps level %i water contact at the player's feet", (level) => {
    const effect = release(SKILL_IDS.verticalWave, level);
    const sheet = playerSkillEffectSheet(effect.skillId, effect.kind, level)!;
    const boxBefore = { x: effect.x, y: effect.y, w: effect.w, h: effect.h };
    const scale = GENERIC_PLAYER_SKILL_TUNING[SKILL_IDS.verticalWave].drawScale;
    drawPlayerSkillEffects();
    const [, centerY] = vi.mocked(context.translate).mock.calls[0];
    expect(centerY + (VERTICAL_WAVE_EFFECT_GROUND_BASELINE_Y - sheet.frameH / 2) * scale)
      .toBeCloseTo(state.player.y + state.player.h);
    expect({ x: effect.x, y: effect.y, w: effect.w, h: effect.h }).toEqual(boxBefore);
  });

  it("draws only the triggered pillars and retains their fixed downward orientation", () => {
    vi.mocked(Math.random).mockReturnValue(0);
    state.player.facing = -1;
    release(SKILL_IDS.verticalWave, TEST.upgradedLevel);
    const pillars = state.playerSkillEffects.filter(({ kind }) => kind === "verticalWavePillar");
    expect(pillars).toHaveLength(VERTICAL_WAVE_PILLAR_CONFIG.count);
    drawPlayerSkillEffects();
    expect(drawImage.mock.calls.filter(([image]) => image === VERTICAL_WAVE_PILLAR_SHEET.image)).toHaveLength(1);
    expect(context.scale).toHaveBeenLastCalledWith(1, 1);
    expect(pillars.map(({ startDelay }) => startDelay)).toEqual(pillars.map((_, index) => index * VERTICAL_WAVE_PILLAR_CONFIG.staggerFrames));
  });
});
