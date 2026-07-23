import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANTI_AIR_MULTI_BONUS_DROP_CONFIG,
  SKILL_IDS,
  VERTICAL_WAVE_PILLAR_CONFIG,
  WIDTH,
} from "../../constants";
import { resetState, state } from "../../game/state";
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
const VERTICAL_WAVE_LEVEL_TWO = 2;
const SUCCESSFUL_ROLL_MARGIN = 0.01;
const VERTICAL_WAVE_PILLAR_TRIGGER_ROLL = VERTICAL_WAVE_PILLAR_CONFIG.chance
  - SUCCESSFUL_ROLL_MARGIN;
const VERTICAL_WAVE_PILLAR_FORWARD_DISTANCES = Array.from(
  { length: VERTICAL_WAVE_PILLAR_CONFIG.count },
  (_, index) => VERTICAL_WAVE_PILLAR_CONFIG.firstForwardOffset
    + index * VERTICAL_WAVE_PILLAR_CONFIG.spacing,
);
const VERTICAL_WAVE_PILLAR_START_DELAYS = Array.from(
  { length: VERTICAL_WAVE_PILLAR_CONFIG.count },
  (_, index) => index * VERTICAL_WAVE_PILLAR_CONFIG.staggerFrames,
);
const VERTICAL_WAVE_PILLAR_PRE_IMPACT_FRAMES = VERTICAL_WAVE_PILLAR_CONFIG.impactFrame
  * VERTICAL_WAVE_PILLAR_CONFIG.frameDuration - 1;
const VERTICAL_WAVE_PILLAR_FAR_DELAY = (
  VERTICAL_WAVE_PILLAR_CONFIG.count - 1
) * VERTICAL_WAVE_PILLAR_CONFIG.staggerFrames;

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

function spawnVerticalWavePillars({
  facing = 1,
  playerX = PLAYER_TEST_X,
  roll = VERTICAL_WAVE_PILLAR_TRIGGER_ROLL,
}: {
  facing?: 1 | -1;
  playerX?: number;
  roll?: number;
} = {}) {
  state.player.x = playerX;
  state.player.facing = facing;
  state.player.skillLevels[SKILL_IDS.verticalWave] = VERTICAL_WAVE_PILLAR_CONFIG.requiredLevel;
  const random = vi.spyOn(Math, "random").mockReturnValue(roll);

  expect(spawnPlayerSkillEffect(SKILL_IDS.verticalWave)).toBe(true);

  return {
    random,
    baseWave: state.playerSkillEffects.find(({ kind }) => kind === "verticalWave")!,
    pillars: state.playerSkillEffects.filter(({ kind }) => kind === "verticalWavePillar"),
  };
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

describe("vertical wave level-three pillar chain", () => {
  beforeEach(() => {
    resetState();
    state.player.x = PLAYER_TEST_X;
    state.player.y = PLAYER_TEST_Y;
    state.player.facing = 1;
  });

  it("adds three half-damage downward pillars from near to far after a successful roll", () => {
    const { random, baseWave, pillars } = spawnVerticalWavePillars();
    const playerCenterX = state.player.x + state.player.w / 2;
    expect(random).toHaveBeenCalledTimes(1);
    expect(pillars).toHaveLength(VERTICAL_WAVE_PILLAR_CONFIG.count);
    expect(pillars.map(({ x }) => x - playerCenterX)).toEqual(VERTICAL_WAVE_PILLAR_FORWARD_DISTANCES);
    expect(pillars.map(({ startDelay }) => startDelay)).toEqual(VERTICAL_WAVE_PILLAR_START_DELAYS);
    for (const pillar of pillars) {
      expect(pillar.refundGroupId).toBe(baseWave.refundGroupId);
      expect(pillar.damage).toBeCloseTo(
        baseWave.damage * VERTICAL_WAVE_PILLAR_CONFIG.damageMultiplier,
      );
      expect(pillar.bossDamage).toBeCloseTo(
        baseWave.bossDamage * VERTICAL_WAVE_PILLAR_CONFIG.damageMultiplier,
      );
      expect(pillar.maxLife).toBe(VERTICAL_WAVE_PILLAR_CONFIG.activeLifeFrames);
    }
  });

  it("places the near-to-far chain in front when the player faces left", () => {
    const { pillars } = spawnVerticalWavePillars({ facing: -1 });
    const playerCenterX = state.player.x + state.player.w / 2;
    expect(pillars.map(({ x }) => (x - playerCenterX) * state.player.facing))
      .toEqual(VERTICAL_WAVE_PILLAR_FORWARD_DISTANCES);
  });

  it("preserves the forward chain spacing at the facing screen edge", () => {
    const { pillars } = spawnVerticalWavePillars({
      playerX: WIDTH - state.player.w,
    });
    const playerCenterX = state.player.x + state.player.w / 2;

    expect(pillars.map(({ x }) => x - playerCenterX))
      .toEqual(VERTICAL_WAVE_PILLAR_FORWARD_DISTANCES);
  });

  it("does not add pillars when the roll equals the fifteen-percent boundary", () => {
    const { pillars } = spawnVerticalWavePillars({
      roll: VERTICAL_WAVE_PILLAR_CONFIG.chance,
    });

    expect(pillars).toHaveLength(0);
    expect(state.playerSkillEffects).toHaveLength(1);
    expect(state.playerSkillEffects[0]?.kind).toBe("verticalWave");
  });

  it("does not roll for pillars below level three", () => {
    state.player.skillLevels[SKILL_IDS.verticalWave] = VERTICAL_WAVE_LEVEL_TWO;
    const random = vi.spyOn(Math, "random").mockReturnValue(0);

    expect(spawnPlayerSkillEffect(SKILL_IDS.verticalWave)).toBe(true);

    expect(random).not.toHaveBeenCalled();
    expect(state.playerSkillEffects).toHaveLength(1);
  });

  it("keeps the far pillar's full active lifetime after its start delay", () => {
    const { pillars } = spawnVerticalWavePillars();
    const farPillar = pillars[pillars.length - 1]!;

    for (let frame = 0; frame < VERTICAL_WAVE_PILLAR_FAR_DELAY; frame += 1) {
      updatePlayerSkillEffects();
    }

    expect(farPillar.life).toBe(farPillar.maxLife);
    for (let frame = 1; frame < farPillar.maxLife; frame += 1) {
      updatePlayerSkillEffects();
    }
    expect(state.playerSkillEffects).toContain(farPillar);

    updatePlayerSkillEffects();

    expect(state.playerSkillEffects).not.toContain(farPillar);
  });

  it("impacts from the nearest pillar to the farthest at six-frame intervals", () => {
    const { pillars } = spawnVerticalWavePillars();
    for (const pillar of pillars) {
      expect(spawnEnemyById("chaser", "debug", "right")).toBe(true);
      const enemy = state.enemies[state.enemies.length - 1]!;
      enemy.x = pillar.x - enemy.w / 2;
      enemy.y = pillar.y - enemy.h / 2;
    }
    const startingHp = state.enemies.map(({ hp }) => hp);
    const updateEffects = (frames: number) => {
      for (let frame = 0; frame < frames; frame += 1) updatePlayerSkillEffects();
    };

    updateEffects(VERTICAL_WAVE_PILLAR_PRE_IMPACT_FRAMES);

    expect(state.enemies.map(({ hp }) => hp)).toEqual(startingHp);

    for (let pillarIndex = 0; pillarIndex < VERTICAL_WAVE_PILLAR_CONFIG.count; pillarIndex += 1) {
      updateEffects(pillarIndex === 0 ? 1 : VERTICAL_WAVE_PILLAR_CONFIG.staggerFrames);
      expect(pillars[pillarIndex]?.frame).toBe(VERTICAL_WAVE_PILLAR_CONFIG.impactFrame);
      expect(state.enemies.map(({ hp }, enemyIndex) => hp < startingHp[enemyIndex])).toEqual(
        Array.from(
          { length: VERTICAL_WAVE_PILLAR_CONFIG.count },
          (_, enemyIndex) => enemyIndex <= pillarIndex,
        ),
      );
    }
  });
});
