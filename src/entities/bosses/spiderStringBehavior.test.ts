import { describe, expect, it, vi } from "vitest";
import { BOSS_SKILL1_CONFIG } from "../../constants";
import { resetState, state } from "../../game/state";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
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
});
