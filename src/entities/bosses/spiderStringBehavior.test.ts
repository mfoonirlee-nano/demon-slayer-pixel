import { describe, expect, it, vi } from "vitest";
import { BOSS_SKILL1_CONFIG, GROUND_Y, SPIDER_STRING_CAGE_CONFIG, WIDTH } from "../../constants";
import { resetState, state } from "../../game/state";
import type { EnemyState } from "../../types/game-state";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { updateSpiderStringCageEffects } from "./spiderStringCageEffects";
import { updateSpiderStringBoss } from "./spiderStringBehavior";

describe("spider string boss behavior", () => {
  it("starts the sprite-backed spider string cast when the skill is ready", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.x = 200;
    state.player.x = 500;
    boss.skillCd = 0;
    boss.vx = 2;

    updateSpiderStringBoss(boss);

    expect(boss.actionState).toBe("cast");
    expect(boss.skillMode).toBe("spiderString");
    expect(boss.castTimer).toBe(BOSS_SKILL1_CONFIG.castDuration);
    expect(boss.castFacing).toBe(1);
    expect(boss.facing).toBe(1);
    expect(boss.skillEffectSpawned).toBe(false);
    expect(boss.skillCd).toBe(BOSS_SKILL1_CONFIG.cooldown);
    expect(boss.vx).toBe(0);
    expect(state.bossSkill1Effects).toEqual([]);
  });

  it("does not start the cage ultimate for a non-awakened phase three boss", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.phase = SPIDER_STRING_CAGE_CONFIG.minPhase;
    boss.awakened = false;
    boss.skillCd = 0;

    updateSpiderStringBoss(boss);

    expect(boss.skillMode).toBe("spiderString");
    expect(boss.castTimer).toBe(BOSS_SKILL1_CONFIG.castDuration);
    expect(state.spiderStringCages).toEqual([]);
  });

  it("starts Spider String Cage for an awakened phase three boss", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.phase = SPIDER_STRING_CAGE_CONFIG.minPhase;
    boss.awakened = true;
    boss.skillCd = 0;
    boss.x = 200;
    state.player.x = 500;

    updateSpiderStringBoss(boss);

    expect(boss.actionState).toBe("cast");
    expect(boss.skillMode).toBe("spiderStringCage");
    expect(boss.castTimer).toBe(SPIDER_STRING_CAGE_CONFIG.castDuration);
    expect(boss.spiderStringCageUsed).toBe(true);
    expect(boss.spiderStringCageCd).toBe(SPIDER_STRING_CAGE_CONFIG.cooldown);
    expect(state.spiderStringCages).toHaveLength(1);
    expect(state.bossSkill1Effects).toEqual([]);
  });

  it("keeps the boss locked during Spider String Cage and delays the next AI action", () => {
    resetState();
    const boss = startAwakenedPhaseThreeCage();
    boss.aiTimer = 0;
    boss.jumpCd = 0;
    boss.vx = 4;
    state.player.x = boss.x;
    state.player.y = boss.y;
    const hpBefore = state.player.hp;

    updateSpiderStringBoss(boss);

    expect(boss.vx).toBe(0);
    expect(state.player.hp).toBe(hpBefore);
    expect(state.enemies).toEqual([]);

    boss.castTimer = 1;
    updateSpiderStringBoss(boss);

    expect(boss.castTimer).toBe(0);
    expect(boss.aiTimer).toBe(SPIDER_STRING_CAGE_CONFIG.postAiTimer);
  });

  it("spawns the spider string effect once at the configured cast frame", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.x = 200;
    state.player.x = 500;
    boss.skillCd = 0;

    updateSpiderStringBoss(boss);
    for (let i = 1; i < BOSS_SKILL1_CONFIG.spawnAtFrame; i += 1) {
      updateSpiderStringBoss(boss);
    }
    expect(state.bossSkill1Effects).toEqual([]);

    updateSpiderStringBoss(boss);

    expect(boss.skillEffectSpawned).toBe(true);
    expect(state.bossSkill1Effects).toHaveLength(1);
    expect(state.bossSkill1Effects[0]).toMatchObject({
      kind: "spiderString",
      facing: 1,
    });

    updateSpiderStringBoss(boss);

    expect(state.bossSkill1Effects).toHaveLength(1);
  });

  it("does not spawn generic code-drawn boss projectiles in later phases", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.phase = 2;
    boss.aiTimer = 0;
    boss.skillCd = 999;

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    updateSpiderStringBoss(boss);

    randomSpy.mockRestore();
    expect(state.projectiles).toEqual([]);
  });

  it("keeps the first cage safe column near the player and avoids repeated safe columns", () => {
    resetState();
    startAwakenedPhaseThreeCage();
    const firstSafeColumn = state.spiderStringCages[0].safeColumn;
    const playerColumn = playerColumnIndex();

    expect(Math.abs(firstSafeColumn - playerColumn)).toBeLessThanOrEqual(1);

    advanceCageFrames(
      state.spiderStringCages[0].warningFrames
      + state.spiderStringCages[0].hitFrames
      + state.spiderStringCages[0].afterFrames,
    );

    expect(state.spiderStringCages[0].segmentIndex).toBe(1);
    expect(state.spiderStringCages[0].safeColumn).not.toBe(firstSafeColumn);
  });

  it("damages and slows only the player during a cage hit window", () => {
    resetState();
    startAwakenedPhaseThreeCage();
    movePlayerToDangerColumn();
    const enemy = createTestEnemyInPlayerColumn();
    state.enemies.push(enemy);
    const playerHpBefore = state.player.hp;
    const enemyHpBefore = enemy.hp;

    advanceCageFrames(SPIDER_STRING_CAGE_CONFIG.firstWarningFrames + 1);

    expect(state.player.hp).toBeLessThan(playerHpBefore);
    expect(state.player.spiderSilkSlowTimer).toBe(SPIDER_STRING_CAGE_CONFIG.slowFrames);
    expect(enemy.hp).toBe(enemyHpBefore);
    expect(enemy.hitCd).toBe(0);
  });

  it("does not pierce player invincibility during a cage hit window", () => {
    resetState();
    startAwakenedPhaseThreeCage();
    movePlayerToDangerColumn();
    state.player.invincible = 12;
    const hpBefore = state.player.hp;

    advanceCageFrames(SPIDER_STRING_CAGE_CONFIG.firstWarningFrames + 1);

    expect(state.player.hp).toBe(hpBefore);
    expect(state.player.spiderSilkSlowTimer).toBe(0);
  });
});

function startAwakenedPhaseThreeCage() {
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.spiderString,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
  });
  boss.entering = false;
  boss.phase = SPIDER_STRING_CAGE_CONFIG.minPhase;
  boss.awakened = true;
  boss.skillCd = 0;
  boss.x = 200;
  state.player.x = WIDTH / 2 - state.player.w / 2;
  state.player.y = GROUND_Y - state.player.h;
  updateSpiderStringBoss(boss);
  return boss;
}

function advanceCageFrames(frames: number) {
  for (let i = 0; i < frames; i += 1) {
    updateSpiderStringCageEffects();
  }
}

function playerColumnIndex() {
  const columnW = WIDTH / SPIDER_STRING_CAGE_CONFIG.columns;
  return Math.floor((state.player.x + state.player.w / 2) / columnW);
}

function movePlayerToDangerColumn() {
  const safeColumn = state.spiderStringCages[0].safeColumn;
  const dangerColumn = safeColumn === 0 ? 2 : 0;
  movePlayerToColumn(dangerColumn);
}

function movePlayerToColumn(column: number) {
  const columnW = WIDTH / SPIDER_STRING_CAGE_CONFIG.columns;
  state.player.x = column * columnW + columnW / 2 - state.player.w / 2;
  state.player.y = GROUND_Y - state.player.h;
}

function createTestEnemyInPlayerColumn(): EnemyState {
  return {
    id: "chaser",
    spawnSource: "debug",
    spawnCost: 0,
    aiState: "move",
    aiTimer: 0,
    x: state.player.x,
    y: state.player.y,
    w: 40,
    h: 70,
    vx: 0,
    hp: 30,
    damage: 5,
    hitCd: 0,
    animSeed: 0,
    sheetIndex: 0,
  };
}
