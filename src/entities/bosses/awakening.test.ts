import { describe, expect, it, vi } from "vitest";
import {
  DEAD_BELL_CONFIG,
  GROUND_Y,
  LANTERN_EMBER_CONFIG,
  MIRROR_DREAM_CONFIG,
  MIST_BONE_CONFIG,
} from "../../constants";
import { getStateSnapshot, resetState, state } from "../../game/state";
import { bossSummonBudgetForPhase } from "../../systems/enemyDirector";
import { spawnBoss } from "../boss";
import { spawnEnemyById } from "../enemy";
import { createBossEncounter } from "./encounter";
import { updateDeadBellBoss } from "./deadBellBehavior";
import { updateFangGaleBoss } from "./fangGaleBehavior";
import { updateLanternEmberBoss } from "./lanternEmberBehavior";
import { updateMirrorDreamBoss } from "./mirrorDreamBehavior";
import { updateMistBoneBoss } from "./mistBoneBehavior";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import type { LiveBoss } from "./types";

const DEAD_BELL_DUET_WAVE_COUNT = 3;
const DEAD_BELL_DUET_BLADE_COUNT = 2;
const FANG_GALE_STORM_ROLL = 0.8;
const MIST_BONE_AWAKENED_ACT = 8;
const MIRROR_DREAM_AWAKENED_ACT = 9;
const MIRROR_DREAM_SPLITTER_PHASE = 3;
const SUPPRESS_BOSS_SKILL_COOLDOWN = 999;
const PAIR_DIVISOR = 2;
const MIST_BONE_CAGE_HALF = (MIST_BONE_CONFIG.cageCount - 1) / PAIR_DIVISOR;
const MIST_BONE_CAGE_DELAYS = Array.from(
  { length: MIST_BONE_CONFIG.cageCount },
  (_, index) => (
    MIST_BONE_CAGE_HALF - Math.abs(index - MIST_BONE_CAGE_HALF)
  ) * MIST_BONE_CONFIG.spikeDelayStep,
);

describe("boss awakening behavior", () => {
  it("lets debug-style boss spawns force awakened mode without changing the final boss", () => {
    resetState();
    spawnBoss(BOSS_ARCHETYPE_IDS.mirrorDream, { awakened: true });

    expect(state.boss?.awakened).toBe(true);
    expect(getStateSnapshot().boss?.phaseTitle).toBe("血月眷属 · 镜魇·蚀醒 · 阶段 1");

    spawnBoss(BOSS_ARCHETYPE_IDS.bloodMoon, { awakened: true });

    expect(state.boss?.awakened).toBe(false);
  });

  it("turns Mist Bone's awakened cage into a fog-covered outside-in burial", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.mistBone, true);
    boss.phase = 4;
    state.enemyDirector.act = MIST_BONE_AWAKENED_ACT;

    updateMistBoneBoss(boss);
    advanceBoss(updateMistBoneBoss, boss, MIST_BONE_CONFIG.spawnAtFrame + 2);

    expect(boss.skillMode).toBe("mistBoneCage");
    expect(state.mistBoneSpikes).toHaveLength(MIST_BONE_CONFIG.cageCount);
    expect(state.mistBoneSpikes.map((spike) => spike.delay)).toEqual(
      MIST_BONE_CAGE_DELAYS,
    );
    expect(state.mistBoneFogs).toEqual([
      expect.objectContaining({
        kind: "burial",
        x: state.player.x + state.player.w / 2,
        y: GROUND_Y,
      }),
    ]);
    expect(state.enemies).toHaveLength(2);
    expect(state.enemies.filter((enemy) => enemy.id === "warden")).toHaveLength(1);
    expect(state.enemies.filter((enemy) => enemy.id !== "warden")).toHaveLength(1);
    expect(state.enemies.every((enemy) => enemy.spawnSource === "boss")).toBe(true);
    expect(state.enemies.every((enemy) => enemy.growthStage === "awakened")).toBe(true);
    const summonIds = state.enemies.map((enemy) => enemy.id).sort();

    boss.actionState = "move";
    boss.castTimer = 0;
    boss.recoveryTimer = 0;
    boss.skillCd = 0;
    boss.skillEffectSpawned = false;
    boss.mistBonePatternStep = 3;
    updateMistBoneBoss(boss);
    advanceBoss(updateMistBoneBoss, boss, MIST_BONE_CONFIG.spawnAtFrame + 2);

    expect(state.enemies.map((enemy) => enemy.id).sort()).toEqual(summonIds);
  });

  it("starts Mirror Dream's true image shift on awakened phase changes", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.mirrorDream, true);
    boss.phase = 2;
    boss.skillCd = SUPPRESS_BOSS_SKILL_COOLDOWN;

    updateMirrorDreamBoss(boss);
    advanceBoss(updateMirrorDreamBoss, boss, MIRROR_DREAM_CONFIG.spawnAtFrame + 2);

    expect(boss.skillMode).toBe("mirrorTrueImageShift");
    expect(boss.mirrorTrueImageShiftPhase).toBe(2);
    expect(state.mirrorAfterimages.length).toBeGreaterThan(1);
  });

  it("adds one awakened splitter to Mirror Dream's phase-three shift", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.mirrorDream, true);
    boss.phase = MIRROR_DREAM_SPLITTER_PHASE;
    boss.skillCd = SUPPRESS_BOSS_SKILL_COOLDOWN;
    state.enemyDirector.act = MIRROR_DREAM_AWAKENED_ACT;

    updateMirrorDreamBoss(boss);
    advanceBoss(updateMirrorDreamBoss, boss, MIRROR_DREAM_CONFIG.spawnAtFrame + 2);

    expect(state.enemies).toEqual([
      expect.objectContaining({
        id: "splitter",
        spawnSource: "boss",
        growthStage: "awakened",
      }),
    ]);

    boss.actionState = "move";
    boss.castTimer = 0;
    boss.recoveryTimer = 0;
    boss.mirrorTrueImageShiftPhase = undefined;
    updateMirrorDreamBoss(boss);
    advanceBoss(updateMirrorDreamBoss, boss, MIRROR_DREAM_CONFIG.spawnAtFrame + 2);

    expect(state.enemies.filter((enemy) => enemy.id === "splitter")).toHaveLength(1);
  });

  it("does not bypass the Boss summon count budget for Mirror Dream's splitter", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.mirrorDream, true);
    boss.phase = MIRROR_DREAM_SPLITTER_PHASE;
    boss.skillCd = SUPPRESS_BOSS_SKILL_COOLDOWN;
    state.enemyDirector.act = MIRROR_DREAM_AWAKENED_ACT;
    const summonBudget = bossSummonBudgetForPhase(boss.phase, true, false);
    for (let index = 0; index < summonBudget.maxCount; index += 1) {
      expect(spawnEnemyById("chaser", "boss")).toBe(true);
    }

    updateMirrorDreamBoss(boss);
    advanceBoss(updateMirrorDreamBoss, boss, MIRROR_DREAM_CONFIG.spawnAtFrame + 2);

    expect(state.enemies).toHaveLength(summonBudget.maxCount);
    expect(state.enemies.every((enemy) => enemy.spawnSource === "boss")).toBe(true);
    expect(state.enemies.some((enemy) => enemy.id === "splitter")).toBe(false);
    expect(boss.hasMirrorSplitterSummoned).toBe(true);
  });

  it("adds Fang Gale's awakened storm chain", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(FANG_GALE_STORM_ROLL);
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.fangGale, true);
    boss.phase = 4;

    try {
      updateFangGaleBoss(boss);

      expect(boss.skillMode).toBe("fangGaleStorm");
      expect(boss.actionState).toBe("retreat");
      expect(state.fangGaleWaves).toHaveLength(0);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("adds Lantern Ember's awakened grid and ash zone", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.lanternEmber, true);
    boss.phase = 4;

    updateLanternEmberBoss(boss);
    advanceBoss(updateLanternEmberBoss, boss, LANTERN_EMBER_CONFIG.awakenedSpawnAtFrame + 2);

    expect(boss.skillMode).toBe("lanternAwakenedGrid");
    expect(state.lanternEmberAwakenedGrids).toHaveLength(1);
    expect(state.lanternEmberAshZones).toHaveLength(1);
  });

  it("adds Dead Bell's awakened duet and stop-beat reprisal", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.deadBell, true);
    boss.phase = 4;

    updateDeadBellBoss(boss);
    advanceBoss(updateDeadBellBoss, boss, DEAD_BELL_CONFIG.comboCastDuration + 2);

    expect(boss.skillMode).toBe("deadBellDuet");
    expect(state.deadBellWaves).toHaveLength(DEAD_BELL_DUET_WAVE_COUNT);
    expect(state.deadBellBlades).toHaveLength(DEAD_BELL_DUET_BLADE_COUNT);
    expect(boss.deadBellReprisalTimer).toBeGreaterThan(0);

    state.player.attackTimer = 1;
    state.player.invincible = 0;
    const hpBefore = state.player.hp;
    const remainingWarningFrames = (boss.deadBellReprisalTimer ?? 0)
      - DEAD_BELL_CONFIG.reprisalActiveFrames;

    advanceBoss(updateDeadBellBoss, boss, remainingWarningFrames);

    expect(state.player.hp).toBe(hpBefore);
    expect(boss.deadBellReprisalHit).toBe(false);

    updateDeadBellBoss(boss);
    expect(state.player.hp).toBeLessThan(hpBefore);
    expect(boss.deadBellReprisalHit).toBe(true);
  });
});

function readyBoss(id: LiveBoss["id"], awakened: boolean) {
  resetState();
  const boss = createBossEncounter({
    id,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
    awakened,
  });
  boss.entering = false;
  boss.skillCd = 0;
  boss.x = 180;
  boss.y = GROUND_Y - boss.h;
  state.player.x = 540;
  state.player.y = GROUND_Y - state.player.h;
  state.player.onPlatform = null;
  state.boss = boss;
  return boss;
}

function advanceBoss(update: (boss: LiveBoss) => void, boss: LiveBoss, frames: number) {
  for (let i = 0; i < frames; i += 1) update(boss);
}
