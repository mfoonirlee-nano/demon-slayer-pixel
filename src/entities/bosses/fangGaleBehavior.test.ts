import { describe, expect, it, vi } from "vitest";
import { FANG_GALE_CONFIG, GROUND_Y } from "../../constants";
import * as collisionDebug from "../../game/collisionDebug";
import { resetState, state } from "../../game/state";
import { updateBoss } from "../boss";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { updateFangGaleBoss } from "./fangGaleBehavior";
import type { LiveBoss } from "./types";

const WAVE_SKILL_ROLL = 0.7;
const STORM_SKILL_ROLL = 0.8;
const PHASE_FOUR_DASH_ROLL = 0.1;
const PHASE_FOUR_WAVE_ROLL = 0.3;
const DASH_FRINGE_OFFSET = 8;
const MAX_ADVANCE_FRAMES = 240;

describe("fang gale boss behavior", () => {
  it("retreats away from the player before phase-two wind blade casts", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(WAVE_SKILL_ROLL);

    try {
      const boss = readyFangGale();
      boss.phase = 2;
      const startX = boss.x;

      updateFangGaleBoss(boss);
      boss.aiTimer -= 1;
      updateFangGaleBoss(boss);

      expect(boss.skillMode).toBe("fangGaleWave");
      expect(boss.actionState).toBe("retreat");
      expect(boss.x).toBeLessThan(startX);
      expect(boss.facing).toBe(1);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("releases one wind blade only after the second phase-three dash", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(WAVE_SKILL_ROLL);

    try {
      const boss = readyFangGale();
      boss.phase = 3;

      updateFangGaleBoss(boss);
      boss.phase = 1;
      advanceUntil(boss, () => boss.actionState === "dash");

      expect(state.fangGaleWaves).toHaveLength(0);
      advanceUntil(boss, () => boss.actionState === "windup");
      expect(boss.comboStep).toBe(2);
      expect(state.fangGaleWaves).toHaveLength(0);

      advanceUntil(boss, () => boss.actionState === "recover");
      expect(state.fangGaleWaves).toHaveLength(1);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("uses a faster third storm dash followed by the longest safe recovery", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(STORM_SKILL_ROLL);

    try {
      const boss = readyFangGale();
      boss.awakened = true;
      boss.phase = 4;

      updateFangGaleBoss(boss);
      advanceUntil(boss, () => boss.actionState === "dash");
      const firstDashVelocity = boss.vx;

      advanceUntil(boss, () => boss.actionState === "windup");
      advanceUntil(boss, () => boss.actionState === "dash");
      expect(Math.sign(boss.vx)).toBe(-Math.sign(firstDashVelocity));

      advanceUntil(boss, () => boss.actionState === "windup");
      advanceUntil(boss, () => boss.actionState === "dash");
      expect(boss.comboStep).toBe(FANG_GALE_CONFIG.stormDashCount);
      expect(Math.abs(boss.vx)).toBeCloseTo(
        Math.abs(firstDashVelocity) * FANG_GALE_CONFIG.stormFinalDashSpeedMultiplier,
      );

      advanceUntil(boss, () => boss.actionState === "recover");
      expect(boss.recoveryTimer).toBe(FANG_GALE_CONFIG.stormRecoveryFrames);
      expect(state.fangGaleWaves).toHaveLength(0);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("starts the phase-four chase cooldown after a contact-safe recovery", () => {
    const boss = readyFangGale();
    boss.phase = 4;
    boss.fangPatternPhase = 4;
    boss.skillMode = "fangGaleStorm";
    boss.actionState = "recover";
    boss.recoveryTimer = 1;
    boss.skillCd = -100;
    state.player.x = boss.x;
    state.player.y = boss.y;
    const hpBefore = state.player.hp;

    updateFangGaleBoss(boss);

    expect(state.player.hp).toBe(hpBefore);
    expect(boss.actionState).toBe("move");
    expect(boss.skillCd).toBe(FANG_GALE_CONFIG.postRecoveryCooldowns[3]);
    expect(boss.fangPatternPhase).toBeUndefined();
  });

  it("uses a wide, foot-anchored attack box for the dash core", () => {
    const recordRect = vi.spyOn(collisionDebug, "recordCollisionDebugRect")
      .mockImplementation(() => {});

    try {
      const boss = readyFangGale();
      boss.actionState = "dash";
      boss.skillMode = "fangGaleDash";
      boss.aiTimer = 10;
      boss.vx = 0;
      state.player.x = boss.x + boss.w + DASH_FRINGE_OFFSET;
      state.player.y = GROUND_Y - state.player.h;
      const hpBefore = state.player.hp;

      updateFangGaleBoss(boss);

      expect(state.player.hp).toBeLessThan(hpBefore);
      expect(recordRect).toHaveBeenCalledWith(
        {
          x: boss.x + boss.w / 2 - FANG_GALE_CONFIG.dashHitW / 2,
          y: boss.y + boss.h - FANG_GALE_CONFIG.dashHitH,
          w: FANG_GALE_CONFIG.dashHitW,
          h: FANG_GALE_CONFIG.dashHitH,
        },
        "enemyAttack",
      );
    } finally {
      recordRect.mockRestore();
    }
  });

  it("does not extend the dash attack box into the air above the beast", () => {
    const boss = readyFangGale();
    boss.actionState = "dash";
    boss.skillMode = "fangGaleDash";
    boss.aiTimer = 10;
    boss.vx = 0;
    state.player.x = boss.x + boss.w / 2;
    state.player.y = boss.y;
    state.player.h = 32;
    const hpBefore = state.player.hp;

    updateFangGaleBoss(boss);

    expect(state.player.hp).toBe(hpBefore);
  });

  it("uses phase-specific skill weights", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    try {
      const phaseTwo = readyFangGale();
      phaseTwo.phase = 2;
      updateFangGaleBoss(phaseTwo);

      const phaseThree = readyFangGale();
      phaseThree.phase = 3;
      updateFangGaleBoss(phaseThree);

      expect(phaseTwo.skillMode).toBe("fangGaleDash");
      expect(phaseThree.skillMode).toBe("fangGaleWave");
    } finally {
      randomSpy.mockRestore();
    }
  });

  it.each([
    [PHASE_FOUR_DASH_ROLL, "fangGaleDash"],
    [PHASE_FOUR_WAVE_ROLL, "fangGaleWave"],
    [STORM_SKILL_ROLL, "fangGaleStorm"],
  ] as const)("maps phase-four roll %s to %s", (roll, expectedSkill) => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(roll);

    try {
      const boss = readyFangGale();
      boss.awakened = true;
      boss.phase = 4;

      updateFangGaleBoss(boss);

      expect(boss.skillMode).toBe(expectedSkill);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("honors the entry movement delay before starting a pattern", () => {
    const boss = readyFangGale();
    boss.aiTimer = 1;

    updateFangGaleBoss(boss);

    expect(boss.actionState).toBe("move");
    expect(boss.castTimer).toBe(0);
  });

  it("keeps the storm chain windup safe until the dash starts", () => {
    const boss = readyFangGale();
    boss.actionState = "windup";
    boss.skillMode = "fangGaleStorm";
    boss.castTimer = FANG_GALE_CONFIG.chainWindupFrames;
    state.player.x = boss.x;
    state.player.y = boss.y;
    const hpBeforeWindup = state.player.hp;

    updateFangGaleBoss(boss);

    expect(boss.actionState).toBe("windup");
    expect(state.player.hp).toBe(hpBeforeWindup);
  });
});

function readyFangGale(): LiveBoss {
  resetState();
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.fangGale,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
  });
  boss.entering = false;
  boss.skillCd = 0;
  boss.x = 180;
  boss.y = GROUND_Y - boss.h;
  state.player.x = 540;
  state.player.y = GROUND_Y - state.player.h;
  return boss;
}

function advanceUntil(
  boss: LiveBoss,
  predicate: () => boolean,
  maxFrames = MAX_ADVANCE_FRAMES,
) {
  state.boss = boss;
  for (let frame = 0; frame < maxFrames; frame += 1) {
    if (predicate()) return;
    updateBoss();
  }
  throw new Error("Fang Gale did not reach the expected state");
}
