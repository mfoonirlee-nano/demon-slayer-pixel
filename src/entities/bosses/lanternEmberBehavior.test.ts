import { describe, expect, it } from "vitest";
import { GROUND_Y, LANTERN_EMBER_CONFIG } from "../../constants";
import { resetState, state } from "../../game/state";
import { createBossEncounter } from "./encounter";
import { updateLanternEmberBoss } from "./lanternEmberBehavior";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import type { LiveBoss } from "./types";

const PHASE_TWO = 2;
const PHASE_THREE = 3;
const PHASE_FOUR = 4;
const BOSS_X = 180;
const PLAYER_X = 540;
const NEARBY_ENEMY_GAP = 20;
const NEARBY_ENEMY_W = 40;
const NEARBY_ENEMY_H = 70;
const LEFT = -1;
const RIGHT = 1;

describe("lantern ember boss behavior", () => {
  it("releases exactly one fireline at the configured cast frame", () => {
    const boss = readyLanternEmber(PHASE_TWO);

    startNextCast(boss);

    expect(boss.skillMode).toBe("lanternFireline");
    advanceBoss(boss, LANTERN_EMBER_CONFIG.spawnAtFrame - 1);
    expect(state.lanternEmberFirelines).toEqual([]);

    updateLanternEmberBoss(boss);

    expect(boss.skillEffectSpawned).toBe(true);
    expect(state.lanternEmberFirelines).toHaveLength(1);

    updateLanternEmberBoss(boss);

    expect(state.lanternEmberFirelines).toHaveLength(1);
  });

  it("rotates phase two casts through fireline then lure", () => {
    const boss = readyLanternEmber(PHASE_TWO);

    expect(nextSkillMode(boss)).toBe("lanternFireline");
    expect(nextSkillMode(boss)).toBe("lanternLure");
  });

  it("rotates phase three casts through fireline, buff, then lure when an enemy is nearby", () => {
    const boss = readyLanternEmber(PHASE_THREE);
    addNearbyEnemy(boss);

    expect(nextSkillMode(boss)).toBe("lanternFireline");
    expect(nextSkillMode(boss)).toBe("lanternBuff");
    expect(nextSkillMode(boss)).toBe("lanternLure");
  });

  it("faces a buff target behind the boss instead of continuing to face the player", () => {
    const boss = readyLanternEmber(PHASE_THREE);
    addNearbyEnemy(boss, LEFT);

    expect(nextSkillMode(boss)).toBe("lanternFireline");
    expect(nextSkillMode(boss)).toBe("lanternBuff");
    expect(boss.castFacing).toBe(LEFT);
    expect(boss.facing).toBe(LEFT);
  });

  it("rotates awakened phase four casts through grid, fireline, buff, then lure", () => {
    const boss = readyLanternEmber(PHASE_FOUR, true);
    addNearbyEnemy(boss);

    expect(nextSkillMode(boss)).toBe("lanternAwakenedGrid");
    expect(nextSkillMode(boss)).toBe("lanternFireline");
    expect(nextSkillMode(boss)).toBe("lanternBuff");
    expect(nextSkillMode(boss)).toBe("lanternLure");
  });
});

function readyLanternEmber(phase: number, awakened = false): LiveBoss {
  resetState();
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.lanternEmber,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
    awakened,
  });
  boss.entering = false;
  boss.phase = phase;
  boss.x = BOSS_X;
  boss.y = GROUND_Y - boss.h;
  state.player.x = PLAYER_X;
  state.player.y = GROUND_Y - state.player.h;
  state.player.onPlatform = null;
  return boss;
}

function addNearbyEnemy(boss: LiveBoss, direction = RIGHT) {
  state.enemies.push({
    id: "chaser",
    spawnSource: "boss",
    spawnCost: 1,
    aiState: "move",
    aiTimer: 0,
    x: direction === RIGHT
      ? boss.x + boss.w + NEARBY_ENEMY_GAP
      : boss.x - NEARBY_ENEMY_GAP - NEARBY_ENEMY_W,
    y: GROUND_Y - NEARBY_ENEMY_H,
    w: NEARBY_ENEMY_W,
    h: NEARBY_ENEMY_H,
    vx: 0,
    hp: 10,
    damage: 4,
    hitCd: 0,
    animSeed: 0,
    sheetIndex: 0,
  });
}

function startNextCast(boss: LiveBoss) {
  boss.castTimer = 0;
  boss.recoveryTimer = 0;
  boss.skillCd = 0;
  updateLanternEmberBoss(boss);
}

function nextSkillMode(boss: LiveBoss) {
  startNextCast(boss);
  return boss.skillMode;
}

function advanceBoss(boss: LiveBoss, frames: number) {
  for (let frame = 0; frame < frames; frame += 1) {
    updateLanternEmberBoss(boss);
  }
}
