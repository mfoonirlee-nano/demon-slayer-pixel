import { describe, expect, it } from "vitest";
import { resetState, state } from "../../game/state";
import { spawnEnemyById, updateEnemies } from "../enemy";

const INTRO_LUNGE_DISTANCE = 74.2;
const LUNGE_DISTANCE_TOLERANCE = 0.01;
const LUNGE_COMPLETION_GUARD_FRAMES = 30;

function enterIntroCrawlerLunge() {
  resetState();
  state.elapsed = 0;

  expect(spawnEnemyById("crawler", "debug", "left", { growthStage: "intro" })).toBe(true);

  const crawler = state.enemies[0];
  crawler.crawlerPhase = "windup";
  crawler.crawlerTimer = 1;
  crawler.crawlerFacing = 1;
  crawler.vx = 0;

  const startX = crawler.x;
  updateEnemies();

  expect(crawler.crawlerPhase).toBe("lunge");
  return { crawler, startX };
}

describe("crawler lunge tuning", () => {
  it("travels the doubled intro lunge distance", () => {
    const { crawler, startX } = enterIntroCrawlerLunge();

    for (
      let guard = 0;
      crawler.crawlerPhase === "lunge" && guard < LUNGE_COMPLETION_GUARD_FRAMES;
      guard += 1
    ) {
      updateEnemies();
    }

    expect(crawler.crawlerPhase).toBe("recover");
    const distance = crawler.x - startX;

    expect(distance).toBeGreaterThanOrEqual(INTRO_LUNGE_DISTANCE - LUNGE_DISTANCE_TOLERANCE);
    expect(distance).toBeLessThanOrEqual(INTRO_LUNGE_DISTANCE + LUNGE_DISTANCE_TOLERANCE);
  });
});
