import { describe, expect, it } from "vitest";
import { BOSS_CONFIG, BOSS_SKILL1_CONFIG, GROUND_Y, SPIDER_STRING_CAGE_CONFIG, WIDTH } from "../../constants";
import {
  SPIDER_STRING_ATTACK_CONFIG,
  SPIDER_STRING_PILLAR_CONFIG,
} from "../../constants/assets";
import { resetState, state } from "../../game/state";
import type { EnemyState } from "../../types/game-state";
import { updateBoss } from "../boss";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { updateSpiderStringCageEffects } from "./spiderStringCageEffects";
import { updateSpiderStringBoss } from "./spiderStringBehavior";

describe("spider string boss behavior", () => {
  it("lunges, attacks, then backs away", () => {
    const boss = readySpiderForMovement();

    updateBoss();
    expect(boss.actionState).toBe("windup");
    expect(boss.vx).toBe(0);

    advanceBossFrames(BOSS_CONFIG.rushWindupFrames);
    expect(boss.actionState).toBe("dash");
    expect(boss.vx).toBeGreaterThan(0);

    const xBeforeRush = boss.x;
    advanceBossFrames(BOSS_CONFIG.rushFrames);
    expect(boss.x).toBeGreaterThan(xBeforeRush);
    expect(boss.actionState).toBe("attack");
    expect(boss.vx).toBe(0);

    advanceBossFrames(SPIDER_STRING_ATTACK_CONFIG.duration);
    expect(boss.actionState).toBe("recover");

    const xBeforeRetreat = boss.x;
    updateBoss();
    expect(boss.x).toBeLessThan(xBeforeRetreat);
    expect(boss.vx).toBeLessThan(0);
  });

  it("waits after retreating before starting another attack", () => {
    const boss = readySpiderForMovement();

    updateBoss();
    advanceBossFrames(
      BOSS_CONFIG.rushWindupFrames
      + BOSS_CONFIG.rushFrames
      + SPIDER_STRING_ATTACK_CONFIG.duration,
    );
    advanceBossFrames(BOSS_CONFIG.retreatFrames);

    const restingX = boss.x;
    expect(boss.actionState).toBe("recover");
    expect(boss.vx).toBe(0);

    boss.skillCd = 0;
    boss.aiTimer = 0;
    advanceBossFrames(BOSS_CONFIG.breathingFrames - 1);
    expect(boss.actionState).toBe("recover");
    expect(boss.x).toBe(restingX);
    expect(state.enemies).toEqual([]);

    updateBoss();
    expect(boss.actionState).toBe("move");
    updateBoss();
    expect(boss.actionState).toBe("windup");
  });

  it("commits to the direction chosen during the rush windup", () => {
    const boss = readySpiderForMovement();

    updateBoss();
    expect(boss.actionState).toBe("windup");
    expect(boss.facing).toBe(1);

    state.player.x = 0;
    advanceBossFrames(BOSS_CONFIG.rushWindupFrames);
    expect(boss.actionState).toBe("dash");
    expect(boss.facing).toBe(1);

    const xBeforeDash = boss.x;
    updateBoss();

    expect(boss.actionState).toBe("dash");
    expect(boss.facing).toBe(1);
    expect(boss.x).toBeGreaterThan(xBeforeDash);
  });

  it("deals damage once through the melee hitbox, not through dash or recovery contact", () => {
    const boss = readySpiderForMovement();

    updateBoss();
    advanceBossFrames(BOSS_CONFIG.rushWindupFrames);
    expect(boss.actionState).toBe("dash");

    state.player.x = boss.x;
    state.player.y = boss.y;
    const hpBeforeDashContact = state.player.hp;
    updateBoss();
    expect(state.player.hp).toBe(hpBeforeDashContact);

    advanceBossFrames(BOSS_CONFIG.rushFrames - 1);
    expect(boss.actionState).toBe("attack");

    movePlayerIntoSpiderAttack(boss);
    advanceBossFrames(SPIDER_STRING_ATTACK_CONFIG.hitStartFrame - 1);
    expect(state.player.hp).toBe(hpBeforeDashContact);

    updateBoss();
    expect(state.player.hp).toBeLessThan(hpBeforeDashContact);
    expect(boss.skillHitDone).toBe(true);

    const hpAfterAttack = state.player.hp;
    state.player.invincible = 0;
    updateBoss();
    expect(state.player.hp).toBe(hpAfterAttack);

    advanceBossFrames(
      SPIDER_STRING_ATTACK_CONFIG.duration
      - SPIDER_STRING_ATTACK_CONFIG.hitStartFrame
      - 1,
    );
    expect(boss.actionState).toBe("recover");

    state.player.invincible = 0;
    state.player.x = boss.x;
    state.player.y = boss.y;
    updateBoss();
    expect(state.player.hp).toBe(hpAfterAttack);
  });

  it("does not unlock a cast during phase one", () => {
    const boss = readySpiderForMovement();
    boss.skillCd = 0;

    updateSpiderStringBoss(boss);

    expect(boss.actionState).toBe("windup");
    expect(state.bossSkill1Effects).toEqual([]);
    expect(state.spiderStringPillars).toEqual([]);
  });

  it("starts the sprite-backed spider string cast when the skill is ready", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.phase = BOSS_SKILL1_CONFIG.minPhase;
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

  it("starts the pillar cast instead of the cage for a non-awakened phase three boss", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.phase = SPIDER_STRING_PILLAR_CONFIG.minPhase;
    boss.awakened = false;
    boss.skillCd = 0;

    updateSpiderStringBoss(boss);

    expect(boss.skillMode).toBe("spiderStringPillars");
    expect(boss.castTimer).toBe(SPIDER_STRING_PILLAR_CONFIG.castDuration);
    expect(boss.skillCd).toBe(SPIDER_STRING_PILLAR_CONFIG.cooldown);
    expect(state.spiderStringCages).toEqual([]);
  });

  it("alternates the phase-three pillar cast with the phase-two spider string", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.phase = SPIDER_STRING_PILLAR_CONFIG.minPhase;
    boss.skillCd = 0;

    updateSpiderStringBoss(boss);
    expect(boss.skillMode).toBe("spiderStringPillars");

    boss.castTimer = 0;
    boss.skillCd = 0;
    updateSpiderStringBoss(boss);

    expect(boss.skillMode).toBe("spiderString");
    expect(boss.castTimer).toBe(BOSS_SKILL1_CONFIG.castDuration);
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
    boss.phase = BOSS_SKILL1_CONFIG.minPhase;
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

  it("spawns the pillar pattern once at its configured cast frame", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.phase = SPIDER_STRING_PILLAR_CONFIG.minPhase;
    boss.skillCd = 0;

    updateSpiderStringBoss(boss);
    for (let i = 1; i < SPIDER_STRING_PILLAR_CONFIG.spawnAtFrame; i += 1) {
      updateSpiderStringBoss(boss);
    }
    expect(state.spiderStringPillars).toEqual([]);

    updateSpiderStringBoss(boss);

    expect(boss.skillEffectSpawned).toBe(true);
    expect(state.spiderStringPillars).toHaveLength(SPIDER_STRING_PILLAR_CONFIG.count);

    updateSpiderStringBoss(boss);
    expect(state.spiderStringPillars).toHaveLength(SPIDER_STRING_PILLAR_CONFIG.count);
  });

  it("does not summon enemies or generic projectiles in phase three", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.phase = SPIDER_STRING_PILLAR_CONFIG.minPhase;
    boss.aiTimer = 0;
    boss.skillCd = 999;

    updateSpiderStringBoss(boss);

    expect(state.enemies).toEqual([]);
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

function readySpiderForMovement() {
  resetState();
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.spiderString,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
  });
  boss.entering = false;
  boss.x = 200;
  boss.skillCd = 999;
  boss.aiTimer = 999;
  state.player.x = 600;
  state.boss = boss;
  return boss;
}

function advanceBossFrames(frames: number) {
  for (let i = 0; i < frames; i += 1) updateBoss();
}

function movePlayerIntoSpiderAttack(boss: NonNullable<typeof state.boss>) {
  state.player.x = boss.castFacing > 0
    ? boss.x + boss.w
    : boss.x - state.player.w;
  state.player.y = boss.y + SPIDER_STRING_ATTACK_CONFIG.hitboxTopOffset;
  state.player.invincible = 0;
}

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
