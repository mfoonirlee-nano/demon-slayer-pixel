import { beforeEach, describe, expect, it, vi } from "vitest";
import { RETURNING_BLADE_CONFIG as CONFIG, SKILL_IDS, WIDTH } from "../../constants";
import { getStateSnapshot, resetState, state } from "../../game/state";
import type { SkillLevel } from "../../types/game-state";
import { createBossEncounter } from "../bosses/encounter";
import { spawnEnemyById, updateEnemies } from "../enemy";
import { castSelectedSkill, updateSkillCastRelease } from "../players/skillCasting";
import { spawnPlayerSkillEffect } from "./playerSkillSpawn";
import { updatePlayerSkillEffects } from "./playerSkillRuntime";
import { activeReturningBlade, recallReturningBlade } from "./returningBlade";

vi.mock("../../game/audio", () => ({ playSfx: vi.fn() }));

const TEST = {
  hp: 10000, energyCost: 30, playerWidth: 44,
  settledFrames: 30, outboundFrames: 22, cleanupFrames: 80,
  shortWait: 20, longWait: 50, returnFrames: 40, earlyRecallFrames: 8,
  upgradedHoverFrames: 150, targetX: 380, returnOnlyTargetX: 390,
  diagonalHitX: 405, diagonalHitY: 220, diagonalMissX: 470, diagonalMissY: 120,
  outboundRatio: 0.3, returnRatio: 0.7, fullCrossRatio: 1.35, returnCrossRatio: 1.05,
} as const;

function advance(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) updatePlayerSkillEffects();
}

function blade(level: SkillLevel = 1) {
  state.player.skillLevels[SKILL_IDS.returningBlade] = level;
  expect(spawnPlayerSkillEffect(SKILL_IDS.returningBlade)).toBe(true);
  return activeReturningBlade()!;
}

function enemyAt(x: number, y = state.player.y) {
  spawnEnemyById("chaser", "debug");
  const enemy = state.enemies[state.enemies.length - 1]!;
  Object.assign(enemy, { x, y, hp: TEST.hp, w: 30, h: 90, spawnOccluder: undefined });
  return enemy;
}

beforeEach(() => {
  resetState();
  state.player.x = 300;
  state.player.y = 300;
  state.player.facing = 1;
});

describe("returning blade route", () => {
  it.each([1, -1])("leaves a stationary blade within the arena facing %s", (facing) => {
    state.player.facing = facing;
    const effect = blade();
    const startX = effect.x;
    advance(TEST.settledFrames);
    expect(effect.phase).toBe("hover");
    expect(effect.x).toBe(startX + CONFIG.distance * facing);
    const enemy = enemyAt(effect.x, effect.y);
    advance(TEST.shortWait);
    expect(effect.x).toBe(startX + CONFIG.distance * facing);
    expect(enemy.hp).toBe(TEST.hp);
  });

  it.each([0, WIDTH - TEST.playerWidth])("keeps edge casts visible at %s", (x) => {
    state.player.x = x;
    state.player.facing = x === 0 ? -1 : 1;
    const effect = blade();
    advance(TEST.settledFrames);
    expect(effect.x - effect.w / 2).toBeGreaterThanOrEqual(0);
    expect(effect.x + effect.w / 2).toBeLessThanOrEqual(WIDTH);
    expect(effect.phase).toBe("hover");
  });

  it("locks recall to the player's position before the windup and never homes", () => {
    const effect = blade();
    advance(TEST.settledFrames);
    state.player.x = 250;
    state.player.y = 100;
    const target = { x: state.player.x + state.player.w / 2, y: state.player.y + state.player.h / 2 };
    expect(recallReturningBlade()).toBe(true);
    const start = { x: effect.x, y: effect.y };
    state.player.x = 900;
    state.player.y = 400;
    advance(CONFIG.recallFrames);
    expect(effect.x).toBe(start.x);
    expect(effect.y).toBe(start.y);
    expect(effect.returningBlade).toMatchObject({ targetX: target.x, targetY: target.y });
    advance(TEST.cleanupFrames);
    expect(effect.x).toBeCloseTo(target.x);
    expect(effect.y).toBeCloseTo(target.y);
    expect(activeReturningBlade()).toBeUndefined();
  });

  it("automatically recalls on expiry and gives level two more planning time", () => {
    const effect = blade(2);
    advance(TEST.outboundFrames);
    expect(effect.returningBlade!.hoverRemaining).toBe(TEST.upgradedHoverFrames);
    advance(TEST.upgradedHoverFrames - 1);
    expect(effect.phase).toBe("hover");
    advance(1);
    expect(effect.phase).toBe("recall");
    advance(TEST.cleanupFrames);
    expect(activeReturningBlade()).toBeUndefined();
  });

  it("allows early recall and rejects a second blade or repeated recall", () => {
    const effect = blade();
    advance(TEST.earlyRecallFrames);
    expect(spawnPlayerSkillEffect(SKILL_IDS.returningBlade)).toBe(false);
    expect(recallReturningBlade()).toBe(true);
    expect(recallReturningBlade()).toBe(false);
    advance(TEST.returnFrames);
    expect(effect.phase).toBe("return");
    expect(activeReturningBlade()).toBeUndefined();
  });

  it("clears route and marks on reset, and stops damage after death", () => {
    const effect = blade(CONFIG.requiredLevel);
    state.player.hp = 0;
    const enemy = enemyAt(effect.x);
    advance(1);
    expect(enemy.hp).toBe(TEST.hp);
    expect(activeReturningBlade()).toBeUndefined();
    resetState();
    expect(getStateSnapshot().player.returningBladePhase).toBeNull();
  });
});

describe("returning blade damage", () => {
  it.each([1, CONFIG.requiredLevel] as const)("hits once per leg with a deterministic level %s payoff", (level) => {
    const enemy = enemyAt(TEST.targetX);
    const effect = blade(level);
    advance(TEST.settledFrames);
    expect(enemy.hp).toBeCloseTo(TEST.hp - effect.damage * TEST.outboundRatio);
    advance(TEST.longWait);
    expect(enemy.hp).toBeCloseTo(TEST.hp - effect.damage * TEST.outboundRatio);
    recallReturningBlade();
    advance(TEST.settledFrames);
    expect(enemy.hp).toBeCloseTo(TEST.hp - effect.damage * (level === CONFIG.requiredLevel ? TEST.fullCrossRatio : 1));
    expect(enemy.returningBladeStaggerTimer ?? 0).toBe(level === CONFIG.requiredLevel ? CONFIG.staggerFrames : 0);
  });

  it("does not grant a cross-slash when only the return leg hits", () => {
    const effect = blade(CONFIG.requiredLevel);
    advance(TEST.settledFrames);
    const enemy = enemyAt(TEST.returnOnlyTargetX);
    recallReturningBlade();
    advance(TEST.settledFrames);
    expect(enemy.hp).toBeCloseTo(TEST.hp - effect.damage * TEST.returnRatio);
    expect(enemy.returningBladeStaggerTimer).toBeUndefined();
  });

  it("cuts a diagonal route without hitting a target away from that line", () => {
    const effect = blade();
    advance(TEST.settledFrames);
    state.player.y = 100;
    const onLine = enemyAt(TEST.diagonalHitX, TEST.diagonalHitY);
    const offLine = enemyAt(TEST.diagonalMissX, TEST.diagonalMissY);
    recallReturningBlade();
    advance(TEST.longWait);
    expect(onLine.hp).toBeLessThan(TEST.hp);
    expect(offLine.hp).toBe(TEST.hp);
    expect(effect.returnHitEnemies).toContain(onLine);
  });

  it("limits a large boss to one hit on each leg, including the final endpoint", () => {
    state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0, animSeed: 0 });
    const boss = state.boss;
    Object.assign(boss, { x: 300, y: 280, w: 220, h: 160, hp: TEST.hp, hpMax: TEST.hp });
    const effect = blade(CONFIG.requiredLevel);
    advance(TEST.settledFrames);
    expect(boss.hp).toBeCloseTo(TEST.hp - effect.bossDamage * TEST.outboundRatio);
    recallReturningBlade();
    advance(TEST.returnFrames);
    expect(boss.hp).toBeCloseTo(TEST.hp - effect.bossDamage * TEST.fullCrossRatio);
  });

  it("uses the blade's incoming side for shields and never staggers a brute", () => {
    spawnEnemyById("brute", "debug");
    const enemy = state.enemies[state.enemies.length - 1]!;
    Object.assign(enemy, { x: TEST.targetX, y: 300, w: 40, h: 100, hp: TEST.hp, bruteFacing: -1, bruteShieldHp: TEST.hp, bruteShieldBroken: false });
    const effect = blade(CONFIG.requiredLevel);
    advance(TEST.settledFrames);
    expect(enemy.hp).toBe(TEST.hp);
    expect(enemy.bruteShieldHp).toBeLessThan(TEST.hp);
    recallReturningBlade();
    advance(TEST.returnFrames);
    expect(enemy.hp).toBeCloseTo(TEST.hp - effect.damage * TEST.returnCrossRatio);
    expect(enemy.returningBladeStaggerTimer).toBeUndefined();
  });

  it("briefly suspends light enemy actions and contact damage, then resumes", () => {
    const enemy = enemyAt(state.player.x);
    enemy.returningBladeStaggerTimer = CONFIG.requiredLevel;
    const hp = state.player.hp;
    const x = enemy.x;
    updateEnemies();
    expect(enemy.x).toBe(x);
    expect(state.player.hp).toBe(hp);
    updateEnemies();
    updateEnemies();
    updateEnemies();
    expect(enemy.returningBladeStaggerTimer).toBe(0);
    expect(enemy.x).not.toBe(x);
  });
});

describe("returning blade casting and snapshot", () => {
  it("charges only the initial cast and recalls without energy after switching away and back", () => {
    const player = state.player;
    player.equippedSkillIds[0] = SKILL_IDS.returningBlade;
    player.skillLevels[SKILL_IDS.returningBlade] = 1;
    player.skillEnergy = TEST.settledFrames;
    castSelectedSkill();
    castSelectedSkill();
    expect(player.offenseActionSequence).toBe(1);
    while (player.skillTimer > 0) updateSkillCastRelease();
    expect(player.skillEnergy).toBe(0);
    expect(state.playerSkillEffects.filter((effect) => effect.kind === "returningBlade")).toHaveLength(1);
    advance(TEST.settledFrames);
    player.skillIndex = 1;
    expect(getStateSnapshot().player.returningBladePhase).toBe("hover");
    castSelectedSkill();
    expect(activeReturningBlade()!.phase).toBe("hover");
    player.skillIndex = 0;
    castSelectedSkill();
    expect(getStateSnapshot().player.returningBladePhase).toBe("recall");
    expect(player.skillEnergy).toBe(0);
    expect(player.skillTimer).toBe(0);
    expect(player.offenseActionSequence).toBe(2);
    castSelectedSkill();
    expect(player.offenseActionSequence).toBe(2);
  });
});
