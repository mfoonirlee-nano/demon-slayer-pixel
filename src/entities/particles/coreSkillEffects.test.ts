import { beforeEach, describe, expect, it } from "vitest";
import {
  LINE_PROJECTILE_EFFECT_CONFIG,
} from "../../constants";
import { createBossEncounter } from "../bosses/encounter";
import { resetState, state } from "../../game/state";
import type { SkillLevel } from "../../types/game-state";
import { updateLineProjectileEffects } from "./coreSkillEffects";

const LINE_PROJECTILE_TEST_START_X = 250;
const LINE_PROJECTILE_TEST_Y = 300;
const LINE_PROJECTILE_TEST_BOSS_X = 600;
const LINE_PROJECTILE_TEST_FRAMES = 130;

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
});
