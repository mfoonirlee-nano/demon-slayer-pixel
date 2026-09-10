import { describe, expect, it } from "vitest";
import { FANG_GALE_CONFIG, FANG_GALE_FINAL_BITE_SHEET, GROUND_Y } from "../../constants";
import { createBossEncounter } from "./encounter";
import { resolveBossVisualFrame } from "./renderBoss";

const ORDINARY_BITE_BODY_HEIGHT = 183;
const FINAL_BITE_BODY_HEIGHT = 146;
const FINAL_BITE_FOOT_PIXEL = 357;
const MIN_MATCHING_BODY_RATIO = 0.95;
const MAX_MATCHING_BODY_RATIO = 1.05;
const FOOT_TOLERANCE_PX = 2;

describe("Fang Gale body registration", () => {
  it("keeps the final bite's body size and feet consistent with the preceding bite", () => {
    const boss = createBossEncounter({ id: "fang-gale", bossKills: 0, elapsedSeconds: 0, awakened: true });
    boss.entering = false;
    boss.y = GROUND_Y - boss.h;
    boss.actionState = "dash";
    boss.actionTimer = 0;
    boss.castTimer = 0;
    boss.skillMode = "fangGaleStorm";
    boss.comboStep = FANG_GALE_CONFIG.stormDashCount - 1;
    const before = resolveBossVisualFrame(boss, 0);
    const collisionBody = { x: boss.x, y: boss.y, w: boss.w, h: boss.h };

    boss.comboStep += 1;
    const final = resolveBossVisualFrame(boss, 0);

    expect(final.sheet).toBe(FANG_GALE_FINAL_BITE_SHEET);
    const bodyRatio = (final.h * FINAL_BITE_BODY_HEIGHT / final.sheet.frameH)
      / (before.h * ORDINARY_BITE_BODY_HEIGHT / before.sheet.frameH);
    expect(bodyRatio).toBeGreaterThan(MIN_MATCHING_BODY_RATIO);
    expect(bodyRatio).toBeLessThan(MAX_MATCHING_BODY_RATIO);
    expect(Math.abs(final.y + final.h * FINAL_BITE_FOOT_PIXEL / final.sheet.frameH - GROUND_Y))
      .toBeLessThan(FOOT_TOLERANCE_PX);
    expect(final.x + final.w / 2).toBeCloseTo(boss.x + boss.w / 2);
    expect(boss).toMatchObject(collisionBody);
  });
});
