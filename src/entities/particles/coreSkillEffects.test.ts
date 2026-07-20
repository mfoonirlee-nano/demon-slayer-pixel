import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LINE_PROJECTILE_EFFECT_CONFIG,
  SKILL_IDS,
} from "../../constants";
import { createBossEncounter } from "../bosses/encounter";
import { spawnEnemyById } from "../enemy";
import { resetState, state } from "../../game/state";
import { lineProjectileEffectSheetForLevel } from "../../systems/skillCatalog";
import type { SkillLevel } from "../../types/game-state";
import { updateLineProjectileEffects } from "./coreSkillEffects";

const LINE_PROJECTILE_TEST_START_X = 250;
const LINE_PROJECTILE_TEST_Y = 300;
const LINE_PROJECTILE_TEST_BOSS_X = 600;
const LINE_PROJECTILE_TEST_FRAMES = 130;
const LINE_PROJECTILE_TEST_ENEMY_HP = 100_000;
const LINE_PROJECTILE_TEST_ENEMY_X = 400;

afterEach(() => {
  vi.restoreAllMocks();
});

function lineProjectileHitsAgainstBoss({
  effectLevel,
}: {
  effectLevel: SkillLevel;
}) {
  resetState();
  state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0, animSeed: 0 });
  state.boss.x = LINE_PROJECTILE_TEST_BOSS_X;
  state.boss.y = LINE_PROJECTILE_TEST_Y;
  state.boss.hp = 100_000;
  state.boss.hpMax = 100_000;

  state.lineProjectileEffects.push({
    x: LINE_PROJECTILE_TEST_START_X,
    y: LINE_PROJECTILE_TEST_Y,
    vx: LINE_PROJECTILE_EFFECT_CONFIG.speed,
    facing: 1,
    frame: 0,
    elapsed: 0,
    drawScale: LINE_PROJECTILE_EFFECT_CONFIG.drawScale,
    effectLevel,
    damageMultiplier: 1,
  });

  const startingHp = state.boss.hp;
  for (let frame = 0; frame < LINE_PROJECTILE_TEST_FRAMES; frame += 1) {
    state.boss.hitCd -= 1;
    updateLineProjectileEffects();
  }

  const baseDamage = (state.player.baseAttack + state.player.attackBonus)
    * LINE_PROJECTILE_EFFECT_CONFIG.damageMultiplier;
  return (startingHp - state.boss.hp) / baseDamage;
}

describe("line projectile runtime", () => {
  beforeEach(() => {
    resetState();
  });

  it("lets the upgraded longer dragon hit a boss more times", () => {
    const levelOneHits = lineProjectileHitsAgainstBoss({
      effectLevel: 1,
    });
    const levelThreeHits = lineProjectileHitsAgainstBoss({
      effectLevel: 3,
    });

    expect(levelThreeHits).toBeGreaterThan(levelOneHits);
  });

  it.each([
    { facing: 1, projectileX: 250, enemyX: 400 },
    { facing: -1, projectileX: 750, enemyX: 500 },
  ])("pushes a living enemy two of its widths in flight direction at level three", ({
    facing,
    projectileX,
    enemyX,
  }) => {
    expect(spawnEnemyById("runner", "debug", "left")).toBe(true);
    const enemy = state.enemies[0];
    enemy.x = enemyX;
    enemy.y = LINE_PROJECTILE_TEST_Y;
    enemy.hp = LINE_PROJECTILE_TEST_ENEMY_HP;
    enemy.hitCd = 0;
    state.player.skillLevels[SKILL_IDS.lineProjectile] = 3;
    vi.spyOn(Math, "random").mockReturnValue(0);
    state.lineProjectileEffects.push({
      x: projectileX,
      y: LINE_PROJECTILE_TEST_Y,
      vx: facing * LINE_PROJECTILE_EFFECT_CONFIG.speed,
      facing,
      frame: 0,
      elapsed: 0,
      drawScale: LINE_PROJECTILE_EFFECT_CONFIG.drawScale,
      effectLevel: 3,
      damageMultiplier: 1,
    });

    updateLineProjectileEffects();

    expect(enemy.x).toBe(enemyX + facing * enemy.w * 2);
  });

  it("does not knock an enemy back before level three", () => {
    expect(spawnEnemyById("runner", "debug", "left")).toBe(true);
    const enemy = state.enemies[0];
    enemy.x = LINE_PROJECTILE_TEST_ENEMY_X;
    enemy.y = LINE_PROJECTILE_TEST_Y;
    enemy.hp = LINE_PROJECTILE_TEST_ENEMY_HP;
    enemy.hitCd = 0;
    state.lineProjectileEffects.push({
      x: LINE_PROJECTILE_TEST_START_X,
      y: LINE_PROJECTILE_TEST_Y,
      vx: LINE_PROJECTILE_EFFECT_CONFIG.speed,
      facing: 1,
      frame: 0,
      elapsed: 0,
      drawScale: LINE_PROJECTILE_EFFECT_CONFIG.drawScale,
      effectLevel: 2,
      damageMultiplier: 1,
    });

    updateLineProjectileEffects();

    expect(enemy.x).toBe(LINE_PROJECTILE_TEST_ENEMY_X);
  });

  it("damages a boss at level three without moving it", () => {
    state.player.skillLevels.line_projectile = 3;
    state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0, animSeed: 0 });
    state.boss.x = LINE_PROJECTILE_TEST_ENEMY_X;
    state.boss.y = LINE_PROJECTILE_TEST_Y;
    const startingX = state.boss.x;
    const startingHp = state.boss.hp;
    state.lineProjectileEffects.push({
      x: LINE_PROJECTILE_TEST_START_X,
      y: LINE_PROJECTILE_TEST_Y,
      vx: LINE_PROJECTILE_EFFECT_CONFIG.speed,
      facing: 1,
      frame: 0,
      elapsed: 0,
      drawScale: LINE_PROJECTILE_EFFECT_CONFIG.drawScale,
      effectLevel: 3,
      damageMultiplier: 1,
    });

    updateLineProjectileEffects();

    expect(state.boss.x).toBe(startingX);
    expect(state.boss.hp).toBeLessThan(startingHp);
  });

  it("loops only max-length dash frames after the dragon growth finishes", () => {
    const sheet = lineProjectileEffectSheetForLevel(1);
    const loopLen = sheet.count - LINE_PROJECTILE_EFFECT_CONFIG.loopFromFrame;

    state.lineProjectileEffects.push({
      x: LINE_PROJECTILE_TEST_START_X,
      y: LINE_PROJECTILE_TEST_Y,
      vx: LINE_PROJECTILE_EFFECT_CONFIG.speed,
      facing: 1,
      frame: 0,
      elapsed: 0,
      drawScale: LINE_PROJECTILE_EFFECT_CONFIG.drawScale,
      effectLevel: 1,
      damageMultiplier: 1,
    });

    const sampledFrames = [state.lineProjectileEffects[0].frame];
    const sampleCount = sheet.count + loopLen * 2;
    const revealFrames = Array.from({ length: sheet.count }, (_, frame) => frame);
    const loopFrames = Array.from(
      { length: loopLen },
      (_, frame) => LINE_PROJECTILE_EFFECT_CONFIG.loopFromFrame + frame,
    );
    for (let sample = 1; sample < sampleCount; sample += 1) {
      for (let frame = 0; frame < LINE_PROJECTILE_EFFECT_CONFIG.frameDuration; frame += 1) {
        updateLineProjectileEffects();
      }
      sampledFrames.push(state.lineProjectileEffects[0].frame);
    }

    expect(sampledFrames).toEqual([...revealFrames, ...loopFrames, ...loopFrames]);
  });
});
