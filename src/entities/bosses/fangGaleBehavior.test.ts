import { describe, expect, it, vi } from "vitest";
import { FANG_GALE_CONFIG, GROUND_Y } from "../../constants";
import { resetState, state } from "../../game/state";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { updateFangGaleBoss } from "./fangGaleBehavior";
import type { LiveBoss } from "./types";

const PHASE_THREE_DASH_ROLL = 0.9;

describe("fang gale boss behavior", () => {
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

  it("shortens skill cooldowns in higher phases", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(PHASE_THREE_DASH_ROLL);

    try {
      const phaseOne = readyFangGale();
      phaseOne.phase = 1;
      updateFangGaleBoss(phaseOne);

      const phaseThree = readyFangGale();
      phaseThree.phase = 3;
      updateFangGaleBoss(phaseThree);

      expect(phaseOne.skillMode).toBe("fangGaleDash");
      expect(phaseThree.skillMode).toBe("fangGaleDash");
      expect(phaseOne.skillCd).toBe(FANG_GALE_CONFIG.dashCooldown);
      expect(phaseThree.skillCd).toBeLessThan(phaseOne.skillCd);
    } finally {
      randomSpy.mockRestore();
    }
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
