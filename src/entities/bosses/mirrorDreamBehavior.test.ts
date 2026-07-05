import { describe, expect, it, vi } from "vitest";
import { resetState, state } from "../../game/state";
import { createBossEncounter } from "./encounter";
import { updateMirrorDreamBoss } from "./mirrorDreamBehavior";
import { BOSS_ARCHETYPE_IDS } from "./registry";

const PHASE_THREE = 3;
const PHASE_TWO_HIGH_HP_RATIO = 0.65;
const PHASE_TWO_LOW_HP_RATIO = 0.35;
const MIRROR_SHARD_RANDOM_ROLL = 0.8;

describe("mirror dream boss behavior", () => {
  it("shortens skill cooldowns in later phases", () => {
    const phaseOneCooldown = startCastAtPhaseAndHpRatio(1, 1);
    const phaseThreeCooldown = startCastAtPhaseAndHpRatio(PHASE_THREE, 1);

    expect(phaseThreeCooldown).toBeLessThan(phaseOneCooldown);
  });

  it("casts more frequently within the same phase as its HP gets lower", () => {
    const highHpCooldown = startCastAtPhaseAndHpRatio(2, PHASE_TWO_HIGH_HP_RATIO);
    const lowHpCooldown = startCastAtPhaseAndHpRatio(2, PHASE_TWO_LOW_HP_RATIO);

    expect(lowHpCooldown).toBeLessThan(highHpCooldown);
  });
});

function startCastAtPhaseAndHpRatio(phase: number, hpRatio: number) {
  resetState();
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.mirrorDream,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
  });
  boss.entering = false;
  boss.phase = phase;
  boss.hp = boss.hpMax * hpRatio;
  boss.skillCd = 0;
  boss.x = 180;
  state.player.x = 540;

  const randomSpy = vi.spyOn(Math, "random").mockReturnValue(MIRROR_SHARD_RANDOM_ROLL);
  updateMirrorDreamBoss(boss);
  randomSpy.mockRestore();

  return boss.skillCd;
}
