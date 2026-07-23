import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SKILL_IDS, WIDTH } from "../../constants";
import { resetState, state } from "../../game/state";
import { ANTI_AIR_MULTI_BONUS_DROP_CONFIG } from "../../systems/playerSkills";
import type { EnemyState } from "../../types/game-state";
import { spawnEnemyById } from "../enemy";
import { spawnPlayerSkillEffect } from "./playerSkillSpawn";
import { updatePlayerSkillEffects } from "./playerSkillRuntime";

const audioMock = vi.hoisted(() => ({
  playSfx: vi.fn(),
}));

vi.mock("../../game/audio", () => audioMock);

const PLAYER_TEST_X = 420;
const PLAYER_TEST_Y = 300;
const ANTI_AIR_LEVEL_TWO = 2;
const ANTI_AIR_LEVEL_TWO_LINE_COUNT = 5;
const ANTI_AIR_LEVEL_THREE_LINE_COUNT = 6;
const SUCCESSFUL_ROLL_MARGIN = 0.01;

afterEach(() => {
  vi.restoreAllMocks();
});

function spawnReturningBlade(facing: 1 | -1 = 1) {
  state.player.x = PLAYER_TEST_X;
  state.player.y = PLAYER_TEST_Y;
  state.player.facing = facing;
  state.player.skillLevels[SKILL_IDS.returningBlade] = 1;

  expect(spawnPlayerSkillEffect(SKILL_IDS.returningBlade)).toBe(true);
  return state.playerSkillEffects[0];
}

describe("returning blade runtime", () => {
  beforeEach(() => {
    resetState();
    audioMock.playSfx.mockClear();
  });

  it("travels beyond the facing screen edge before returning", () => {
    const effect = spawnReturningBlade(1);

    expect(effect.x + (effect.maxDistance ?? 0)).toBeGreaterThan(WIDTH);
  });

  it("does not return early just because the outbound hit cap is reached", () => {
    const effect = spawnReturningBlade(1);
    const hitCap = effect.maxHits ?? 0;
    effect.hitEnemies = Array.from({ length: hitCap }, () => ({}) as EnemyState);

    updatePlayerSkillEffects();

    expect(effect.phase).toBe("out");
  });

  it("returns after reaching the offscreen outbound distance", () => {
    const effect = spawnReturningBlade(1);
    effect.traveled = effect.maxDistance ?? 0;

    updatePlayerSkillEffects();

    expect(effect.phase).toBe("return");
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerSkillReturningBladeTurn");
  });

  it("plays the catch cue when the returning blade reaches the player", () => {
    const effect = spawnReturningBlade(1);
    effect.phase = "return";
    effect.x = state.player.x + state.player.w / 2;
    effect.y = state.player.y + state.player.h / 2;

    updatePlayerSkillEffects();

    expect(state.playerSkillEffects).toHaveLength(0);
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerSkillReturningBladeCatch");
  });
});

describe("armor break runtime", () => {
  beforeEach(() => {
    resetState();
    audioMock.playSfx.mockClear();
  });

  it("plays the armor-break impact cue when the projectile collides", () => {
    state.player.skillLevels[SKILL_IDS.armorBreak] = 1;
    expect(spawnPlayerSkillEffect(SKILL_IDS.armorBreak)).toBe(true);
    expect(spawnEnemyById("chaser", "debug", "right")).toBe(true);
    const effect = state.playerSkillEffects[0]!;
    const enemy = state.enemies[0]!;
    enemy.x = effect.x - enemy.w / 2;
    enemy.y = effect.y - enemy.h / 2;

    updatePlayerSkillEffects();

    expect(effect.phase).toBe("impact");
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerSkillArmorBreakImpact");
  });
});

describe("anti-air multi level-three bonus drop", () => {
  beforeEach(() => {
    resetState();
  });

  it("adds one stationary rain drop at half skill damage after a successful cast roll", () => {
    state.player.skillLevels[SKILL_IDS.antiAirMulti] = ANTI_AIR_MULTI_BONUS_DROP_CONFIG.requiredLevel;
    const random = vi.spyOn(Math, "random").mockReturnValue(ANTI_AIR_MULTI_BONUS_DROP_CONFIG.chance);
    expect(spawnPlayerSkillEffect(SKILL_IDS.antiAirMulti)).toBe(true);
    const baseTargets = state.playerSkillEffects.map(({ x, y }) => ({ x, y }));
    expect(random).toHaveBeenCalledTimes(1);

    resetState();
    state.player.skillLevels[SKILL_IDS.antiAirMulti] = ANTI_AIR_MULTI_BONUS_DROP_CONFIG.requiredLevel;
    random.mockClear();
    random.mockReturnValue(
      ANTI_AIR_MULTI_BONUS_DROP_CONFIG.chance - SUCCESSFUL_ROLL_MARGIN,
    );

    expect(spawnPlayerSkillEffect(SKILL_IDS.antiAirMulti)).toBe(true);

    expect(random).toHaveBeenCalledTimes(1);
    expect(state.playerSkillEffects).toHaveLength(ANTI_AIR_LEVEL_THREE_LINE_COUNT + 1);
    expect(state.playerSkillEffects.slice(0, ANTI_AIR_LEVEL_THREE_LINE_COUNT).map(
      ({ x, y }) => ({ x, y }),
    )).toEqual(baseTargets);
    const baseLine = state.playerSkillEffects[0]!;
    const bonusDrop = state.playerSkillEffects[ANTI_AIR_LEVEL_THREE_LINE_COUNT]!;
    expect(bonusDrop).toMatchObject({
      kind: "rainLine",
      vx: 0,
      vy: 0,
      refundGroupId: baseLine.refundGroupId,
    });
    expect(bonusDrop.damage).toBeCloseTo(
      baseLine.damage * ANTI_AIR_MULTI_BONUS_DROP_CONFIG.damageMultiplier,
    );
    expect(bonusDrop.bossDamage).toBeCloseTo(
      baseLine.bossDamage * ANTI_AIR_MULTI_BONUS_DROP_CONFIG.damageMultiplier,
    );
  });

  it("does not add a rain drop when the roll equals the thirty-percent boundary", () => {
    state.player.skillLevels[SKILL_IDS.antiAirMulti] = ANTI_AIR_MULTI_BONUS_DROP_CONFIG.requiredLevel;
    vi.spyOn(Math, "random").mockReturnValue(ANTI_AIR_MULTI_BONUS_DROP_CONFIG.chance);

    expect(spawnPlayerSkillEffect(SKILL_IDS.antiAirMulti)).toBe(true);

    expect(state.playerSkillEffects).toHaveLength(ANTI_AIR_LEVEL_THREE_LINE_COUNT);
  });

  it("does not roll for a bonus rain drop below level three", () => {
    state.player.skillLevels[SKILL_IDS.antiAirMulti] = ANTI_AIR_LEVEL_TWO;
    const random = vi.spyOn(Math, "random").mockReturnValue(0);

    expect(spawnPlayerSkillEffect(SKILL_IDS.antiAirMulti)).toBe(true);

    expect(random).not.toHaveBeenCalled();
    expect(state.playerSkillEffects).toHaveLength(ANTI_AIR_LEVEL_TWO_LINE_COUNT);
  });
});
