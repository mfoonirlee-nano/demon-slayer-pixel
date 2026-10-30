import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SKILL_IDS } from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { playerSkillEffectSheet, playerSkillEffectSheets } from "../../systems/skillCatalog";
import { GENERIC_PLAYER_SKILL_TUNING } from "../../systems/playerSkills";
import type { SkillLevel } from "../../types/game-state";
import { castSelectedSkill, updateSkillCastRelease } from "../players/skillCasting";
import { spawnEnemyById } from "../enemy";
import { finishDashRepositionSkill } from "./playerSkillSpawn";
import { drawPlayerSkillEffects, updatePlayerSkillEffects } from "./playerSkillRuntime";
import { effectBox, playerSkillSheetFrame } from "./playerSkillShared";

const MAX_LEVEL = 3;
const LEVELS: SkillLevel[] = [1, 2, MAX_LEVEL];
const SKILLS = [SKILL_IDS.dashReposition, SKILL_IDS.vortexControl, SKILL_IDS.armorBreak] as const;
const RESIZE_DELTA = { width: 700, height: 500 };
const ARMOR_IMPACT_LIFE = 15;
const TARGET_HP = 10000;
const drawImage = vi.fn();
const context = {
  drawImage, save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
} as unknown as CanvasRenderingContext2D;
const oldImages = new Map(playerSkillEffectSheets().map((sheet) => [sheet, sheet.image]));

function release(skillId: typeof SKILLS[number], level: SkillLevel, upgradeDuringCast = false) {
  state.player.equippedSkillIds[0] = skillId;
  state.player.skillLevels[skillId] = level;
  state.player.skillEnergy = state.player.skillEnergyMax;
  castSelectedSkill();
  if (upgradeDuringCast) state.player.skillLevels[skillId] = MAX_LEVEL;
  while (state.player.skillTimer > 0) updateSkillCastRelease();
  return state.playerSkillEffects[state.playerSkillEffects.length - 1]!;
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

describe("secondary skill level art", () => {
  it.each(LEVELS)("preloads and draws all level %i effects without additive whitening", (level) => {
    const sheets = playerSkillEffectSheets();
    expect(new Set(sheets.map((sheet) => sheet.src)).size).toBe(sheets.length);
    for (const skillId of SKILLS) {
      resetState();
      const effect = release(skillId, level);
      const sheet = playerSkillEffectSheet(skillId, effect.kind, level)!;
      expect(sheets).toContain(sheet);
      expect(sheet.src).toContain(level === 1 ? "/effect.png" : `/effect_lv${level}.png`);
      drawImage.mockClear();
      drawPlayerSkillEffects();
      expect(drawImage.mock.calls[0][0]).toBe(sheet.image);
      expect(context.globalCompositeOperation).toBe("source-over");
    }
  });

  it.each(SKILLS)("keeps %s at the level paid when upgraded during the cast", (skillId) => {
    const effect = release(skillId, 1, true);
    expect(effect.effectLevel).toBe(1);
    state.player.skillLevels[skillId] = MAX_LEVEL;
    drawPlayerSkillEffects();
    expect(drawImage.mock.calls[0][0]).toBe(playerSkillEffectSheet(skillId, effect.kind, 1)!.image);
    if (skillId === SKILL_IDS.dashReposition) {
      const dash = state.player.dashReposition!;
      finishDashRepositionSkill(dash.level, dash.damageMultiplier, dash.refundGroupId, dash.facing,
        dash.hitEnemies, dash.bossHit, dash.skillSource);
      expect(state.playerSkillEffects[state.playerSkillEffects.length - 1].effectLevel).toBe(1);
      drawImage.mockClear();
      drawPlayerSkillEffects();
      expect(drawImage.mock.calls[1][0]).toBe(playerSkillEffectSheet(skillId, "dashSlash", 1)!.image);
    }
  });

  it.each(LEVELS)("uses only the travel frame until armor level %i actually collides", (level) => {
    const effect = release(SKILL_IDS.armorBreak, level);
    updatePlayerSkillEffects();
    expect(effect.phase).toBe("out");
    expect(effect.frame).toBe(0);
    spawnEnemyById("chaser", "debug");
    const enemy = state.enemies[0];
    Object.assign(enemy, { x: effect.x, y: effect.y - enemy.h / 2, hp: TARGET_HP, hitCd: 0 });
    updatePlayerSkillEffects();
    expect(effect.phase).toBe("impact");
    expect(effect.frame).toBe(1);
    expect(effect.life).toBe(ARMOR_IMPACT_LIFE);
    const healthAfterImpact = enemy.hp;
    const frames = new Set<number>();
    while (state.playerSkillEffects.includes(effect)) {
      frames.add(effect.frame);
      updatePlayerSkillEffects();
    }
    expect([...frames]).toEqual([1, 2, MAX_LEVEL]);
    expect(enemy.hp).toBe(healthAfterImpact);
    expect(enemy.hp).toBeLessThan(TARGET_HP);
  });

  it.each(LEVELS)("loops all six vortex phases at level %i without changing lifetime", (level) => {
    const effect = release(SKILL_IDS.vortexControl, level);
    const sheet = playerSkillEffectSheet(effect.skillId, effect.kind, level)!;
    const tuning = GENERIC_PLAYER_SKILL_TUNING[SKILL_IDS.vortexControl];
    for (let frame = 0; frame <= sheet.count; frame += 1) {
      effect.elapsed = frame * tuning.frameDuration;
      expect(playerSkillSheetFrame(effect)).toBe(frame % sheet.count);
    }
    expect(effect.life).toBe(tuning.life[level]);
  });

  it.each(LEVELS)("preserves level %i spawn, damage and geometry when art dimensions change", (level) => {
    for (const skillId of SKILLS) {
      const probe = () => {
        resetState();
        const effect = release(skillId, level);
        return { box: effectBox(effect), damage: effect.damage, life: effect.life,
          distance: effect.maxDistance, dashTarget: state.player.dashReposition?.targetX };
      };
      const baseline = probe();
      const sheet = playerSkillEffectSheet(skillId, undefined, level)!;
      const original = { frameW: sheet.frameW, frameH: sheet.frameH };
      try {
        sheet.frameW += RESIZE_DELTA.width;
        sheet.frameH += RESIZE_DELTA.height;
        expect(probe()).toEqual(baseline);
      } finally {
        Object.assign(sheet, original);
      }
    }
  });
});
