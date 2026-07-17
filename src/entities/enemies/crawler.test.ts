import { describe, expect, it } from "vitest";
import { CRAWLER_SHEETS, GROUND_Y } from "../../constants";
import { resetState, state } from "../../game/state";
import type { ActBand, EnemyState } from "../../types/game-state";
import { spawnEnemyById, updateEnemies } from "../enemy";

const INTRO_LUNGE_DISTANCE = 74.2;
const LUNGE_DISTANCE_TOLERANCE = 0.01;
const LUNGE_COMPLETION_GUARD_FRAMES = 30;
const LEAP_COMPLETION_GUARD_FRAMES = 40;
const LEAP_ARC_SAMPLE_FRAMES = 8;
const TEST_PLAYER_CENTER_OFFSET = 118;
const TARGET_SHIFT = 260;
const LIMITED_CORRECTION_MAX_STEP = 20;
const EXPECTED_BLOCKED_RETRY_FRAMES = 2;
const SPIN_LUNGE_FRAME_COUNT = 8;
const TEST_CRAWLER_DAMAGE = 6;
const EXPECTED_INTRO_LUNGE_HP = 90.3;

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

function setPlayerCenterX(centerX: number) {
  state.player.x = centerX - state.player.w / 2;
}

function enemyCenterX(enemy: EnemyState) {
  return enemy.x + enemy.w / 2;
}

function spawnCrawler(growthStage: ActBand) {
  expect(spawnEnemyById("crawler", "debug", "left", { growthStage })).toBe(true);
  return state.enemies[state.enemies.length - 1];
}

function enterCrawlerLeap(growthStage: Exclude<ActBand, "intro"> = "awakened") {
  resetState();
  state.elapsed = 0;

  const crawler = spawnCrawler(growthStage);
  crawler.x = 240;
  crawler.y = GROUND_Y - crawler.h;
  crawler.crawlerPhase = "windup";
  crawler.crawlerTimer = 1;
  crawler.crawlerFacing = 1;
  crawler.vx = 0;
  setPlayerCenterX(enemyCenterX(crawler) + TEST_PLAYER_CENTER_OFFSET);

  const startY = crawler.y;
  updateEnemies();

  expect(crawler.crawlerPhase).toBe("leap");
  expect(crawler.crawlerLeapTargetX).toBeDefined();
  return { crawler, startY, targetX: crawler.crawlerLeapTargetX ?? crawler.x };
}

describe("crawler lunge tuning", () => {
  it("uses a dedicated drawn spin-lunge sheet for leap frames", () => {
    expect(CRAWLER_SHEETS.leap.src).toBe("assets/sprites/enemies/crawler/crawler_spin_lunge.png");
    expect(CRAWLER_SHEETS.leap.count).toBe(SPIN_LUNGE_FRAME_COUNT);
    expect(CRAWLER_SHEETS.leap).not.toBe(CRAWLER_SHEETS.lunge);
  });

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

  it("keeps intro crawlers on the ground-lunge teaching attack", () => {
    const { crawler } = enterIntroCrawlerLunge();

    expect(crawler.crawlerPhase).toBe("lunge");
    expect(crawler.crawlerLeapTargetX).toBeUndefined();
  });

  it("makes the readable intro lunge deal a perceptible hit", () => {
    const { crawler } = enterIntroCrawlerLunge();
    crawler.damage = TEST_CRAWLER_DAMAGE;
    setPlayerCenterX(enemyCenterX(crawler) + crawler.w / 2);

    updateEnemies();

    expect(state.player.hp).toBeCloseTo(EXPECTED_INTRO_LUNGE_HP);
  });

  it("uses an aerial leap for awakened and final crawlers", () => {
    const awakened = enterCrawlerLeap("awakened").crawler;

    expect(awakened.crawlerPhase).toBe("leap");
    expect(awakened.crawlerLeapStartX).toBeDefined();

    const final = enterCrawlerLeap("final").crawler;

    expect(final.crawlerPhase).toBe("leap");
    expect(final.crawlerLeapStartX).toBeDefined();
  });

  it("moves awakened crawler leaps through a visible arc into recovery", () => {
    const { crawler, startY, targetX } = enterCrawlerLeap("awakened");

    for (let frame = 0; frame < LEAP_ARC_SAMPLE_FRAMES; frame += 1) updateEnemies();

    expect(crawler.crawlerPhase).toBe("leap");
    expect(crawler.y).toBeLessThan(startY);

    for (
      let guard = 0;
      crawler.crawlerPhase === "leap" && guard < LEAP_COMPLETION_GUARD_FRAMES;
      guard += 1
    ) {
      updateEnemies();
    }

    expect(crawler.crawlerPhase).toBe("recover");
    expect(crawler.y + crawler.h).toBe(GROUND_Y);
    expect(crawler.x).toBeCloseTo(targetX);
  });

  it("corrects leap targets without locking onto late player movement", () => {
    const { crawler } = enterCrawlerLeap("awakened");
    const lockedTargetX = crawler.crawlerLeapTargetX ?? crawler.x;
    setPlayerCenterX(enemyCenterX(crawler) + TARGET_SHIFT);

    updateEnemies();

    const correctedTargetX = crawler.crawlerLeapTargetX ?? lockedTargetX;
    expect(correctedTargetX).toBeGreaterThan(lockedTargetX);
    expect(correctedTargetX - lockedTargetX).toBeLessThan(LIMITED_CORRECTION_MAX_STEP);
  });

  it("keeps the active leap count under the crawler lunge cap", () => {
    resetState();
    const first = spawnCrawler("awakened");
    const second = spawnCrawler("awakened");
    const blocked = spawnCrawler("awakened");

    first.crawlerPhase = "leap";
    first.crawlerTimer = 20;
    second.crawlerPhase = "leap";
    second.crawlerTimer = 20;
    blocked.crawlerPhase = "windup";
    blocked.crawlerTimer = 1;

    updateEnemies();

    expect(blocked.crawlerPhase).toBe("windup");
    expect(blocked.crawlerTimer).toBe(EXPECTED_BLOCKED_RETRY_FRAMES);
  });
});
