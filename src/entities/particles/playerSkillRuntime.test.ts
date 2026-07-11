import { beforeEach, describe, expect, it, vi } from "vitest";
import { SKILL_IDS, WIDTH } from "../../constants";
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
