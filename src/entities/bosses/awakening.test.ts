import { describe, expect, it, vi } from "vitest";
import {
  DEAD_BELL_CONFIG,
  GROUND_Y,
  LANTERN_EMBER_CONFIG,
  MIRROR_DREAM_CONFIG,
  MIST_BONE_CONFIG,
} from "../../constants";
import { getStateSnapshot, resetState, state } from "../../game/state";
import { spawnBoss } from "../boss";
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

describe("boss awakening behavior", () => {
  it("lets debug-style boss spawns force awakened mode without changing the final boss", () => {
    resetState();
    spawnBoss(BOSS_ARCHETYPE_IDS.mirrorDream, { awakened: true });

    expect(state.boss?.awakened).toBe(true);
    expect(getStateSnapshot().boss?.phaseTitle).toBe("血月眷属 · 镜魇·蚀醒 · 阶段 1");

    spawnBoss(BOSS_ARCHETYPE_IDS.bloodMoon, { awakened: true });

    expect(state.boss?.awakened).toBe(false);
  });

  it("adds Mist Bone's awakened cage pattern", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.mistBone, true);
    boss.phase = 4;

    updateMistBoneBoss(boss);
    advanceBoss(updateMistBoneBoss, boss, MIST_BONE_CONFIG.spawnAtFrame + 2);

    expect(boss.skillMode).toBe("mistBoneCage");
    expect(state.mistBoneSpikes).toHaveLength(MIST_BONE_CONFIG.cageCount);
  });

  it("starts Mirror Dream's true image shift on awakened phase changes", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.mirrorDream, true);
    boss.phase = 2;
    boss.skillCd = 999;

    updateMirrorDreamBoss(boss);
    advanceBoss(updateMirrorDreamBoss, boss, MIRROR_DREAM_CONFIG.spawnAtFrame + 2);

    expect(boss.skillMode).toBe("mirrorTrueImageShift");
    expect(boss.mirrorTrueImageShiftPhase).toBe(2);
    expect(state.mirrorAfterimages.length).toBeGreaterThan(1);
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
  return boss;
}

function advanceBoss(update: (boss: LiveBoss) => void, boss: LiveBoss, frames: number) {
  for (let i = 0; i < frames; i += 1) update(boss);
}
