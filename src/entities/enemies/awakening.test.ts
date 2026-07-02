import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y, RUNNER_SHEET_INDEX, WIDTH } from "../../constants";
import { resetState, state } from "../../game/state";
import type { ActBand, EnemyId } from "../../types/game-state";
import { spawnEnemyById, spawnEnemyBySheetIndex, updateEnemies } from "../enemy";
import { applyWardenAuraBuffs } from "./warden";

const TEST_PLAYER_CENTER_X = 360;
const CHASER_EXIT_X_OFFSET = 80;
const LEAPER_TRIGGER_TEST_OFFSET = 100;
const BURROWER_AWAKENED_ONLY_DISTANCE = 180;
const WARDEN_AWAKENED_ONLY_AURA_DISTANCE = 200;
const AWAKENED_SPLITLING_COUNT = 3;

function spawn(enemyId: EnemyId, growthStage: ActBand = "intro") {
  expect(spawnEnemyById(enemyId, "debug", "left", { growthStage })).toBe(true);
  return state.enemies[0];
}

function setPlayerCenterX(centerX: number) {
  state.player.x = centerX - state.player.w / 2;
}

function moveEnemyCenterX(enemy: { x: number; w: number }, centerX: number) {
  enemy.x = centerX - enemy.w / 2;
}

describe("enemy awakening behavior", () => {
  beforeEach(() => {
    resetState();
    vi.spyOn(Math, "random").mockReturnValue(0);
    setPlayerCenterX(TEST_PLAYER_CENTER_X);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets debug sheet spawns choose an awakened growth stage and matching stats", () => {
    spawnEnemyBySheetIndex(RUNNER_SHEET_INDEX, 1, { growthStage: "intro" });
    const introRunner = state.enemies[0];
    const introHp = introRunner.hp;
    const introDamage = introRunner.damage;

    resetState();
    spawnEnemyBySheetIndex(RUNNER_SHEET_INDEX, 1, { growthStage: "awakened" });
    const awakenedRunner = state.enemies[0];

    expect(awakenedRunner.growthStage).toBe("awakened");
    expect(awakenedRunner.hp).toBeGreaterThan(introHp);
    expect(awakenedRunner.damage).toBeGreaterThan(introDamage);
  });

  it("shortens awakened chaser re-entry windows", () => {
    const introChaser = spawn("chaser");
    introChaser.x = WIDTH + CHASER_EXIT_X_OFFSET;
    introChaser.chaserFacing = 1;
    updateEnemies();
    const introReenterDuration = introChaser.chaserReenterDuration ?? 0;

    resetState();
    const awakenedChaser = spawn("chaser", "awakened");
    awakenedChaser.x = WIDTH + CHASER_EXIT_X_OFFSET;
    awakenedChaser.chaserFacing = 1;
    updateEnemies();

    expect(awakenedChaser.chaserReenterDuration).toBeLessThan(introReenterDuration);
  });

  it("turns awakened crawler windups into aerial leaps", () => {
    const introCrawler = spawn("crawler");
    introCrawler.crawlerPhase = "windup";
    introCrawler.crawlerTimer = 1;
    updateEnemies();

    resetState();
    const awakenedCrawler = spawn("crawler", "awakened");
    awakenedCrawler.crawlerPhase = "windup";
    awakenedCrawler.crawlerTimer = 1;
    updateEnemies();

    expect(introCrawler.crawlerPhase).toBe("lunge");
    expect(awakenedCrawler.crawlerPhase).toBe("leap");
    expect(awakenedCrawler.crawlerLeapTargetX).toBeDefined();
  });

  it("shortens awakened glider dive cycles", () => {
    const introGlider = spawn("glider");
    introGlider.gliderPhase = "windup";
    introGlider.gliderTimer = 1;
    updateEnemies();
    const introDiveFrames = introGlider.gliderTimer ?? 0;

    resetState();
    const awakenedGlider = spawn("glider", "awakened");
    awakenedGlider.gliderPhase = "windup";
    awakenedGlider.gliderTimer = 1;
    updateEnemies();

    expect(awakenedGlider.gliderPhase).toBe("dive");
    expect(awakenedGlider.gliderTimer).toBeLessThan(introDiveFrames);
  });

  it("shortens awakened leaper windups", () => {
    const introLeaper = spawn("leaper");
    moveEnemyCenterX(introLeaper, TEST_PLAYER_CENTER_X + LEAPER_TRIGGER_TEST_OFFSET);
    introLeaper.y = GROUND_Y - introLeaper.h;
    introLeaper.leaperPhase = "stalk";
    introLeaper.leaperTimer = 0;
    updateEnemies();
    const introWindupFrames = introLeaper.leaperTimer ?? 0;

    resetState();
    setPlayerCenterX(TEST_PLAYER_CENTER_X);
    const awakenedLeaper = spawn("leaper", "awakened");
    moveEnemyCenterX(awakenedLeaper, TEST_PLAYER_CENTER_X + LEAPER_TRIGGER_TEST_OFFSET);
    awakenedLeaper.y = GROUND_Y - awakenedLeaper.h;
    awakenedLeaper.leaperPhase = "stalk";
    awakenedLeaper.leaperTimer = 0;
    updateEnemies();

    expect(awakenedLeaper.leaperPhase).toBe("windup");
    expect(awakenedLeaper.leaperTimer).toBeLessThan(introWindupFrames);
  });

  it("splits awakened splitter parents into three children", () => {
    const splitter = spawn("splitter", "awakened");
    splitter.splitterPhase = "split";
    splitter.splitterTimer = 1;
    splitter.splitterHasSplit = false;
    updateEnemies();

    const children = state.enemies.filter((enemy) => enemy.splitterVariant === "child");
    expect(children).toHaveLength(AWAKENED_SPLITLING_COUNT);
    expect(children.every((child) => child.growthStage === "awakened")).toBe(true);
  });

  it("extends awakened warden aura support range", () => {
    const introWarden = spawn("warden");
    introWarden.wardenPhase = "aura";
    moveEnemyCenterX(introWarden, TEST_PLAYER_CENTER_X);
    expect(spawnEnemyById("chaser", "debug", "left")).toBe(true);
    const introAlly = state.enemies[1];
    moveEnemyCenterX(introAlly, TEST_PLAYER_CENTER_X + WARDEN_AWAKENED_ONLY_AURA_DISTANCE);
    introAlly.vx = 10;
    const introAllyX = introAlly.x;
    applyWardenAuraBuffs();
    expect(introAlly.wardenBuffedFrames).toBe(0);
    expect(introAlly.x).toBe(introAllyX);

    resetState();
    setPlayerCenterX(TEST_PLAYER_CENTER_X);
    const awakenedWarden = spawn("warden", "awakened");
    awakenedWarden.wardenPhase = "aura";
    moveEnemyCenterX(awakenedWarden, TEST_PLAYER_CENTER_X);
    expect(spawnEnemyById("chaser", "debug", "left")).toBe(true);
    const awakenedAlly = state.enemies[1];
    moveEnemyCenterX(awakenedAlly, TEST_PLAYER_CENTER_X + WARDEN_AWAKENED_ONLY_AURA_DISTANCE);
    awakenedAlly.vx = 10;
    const awakenedAllyX = awakenedAlly.x;
    applyWardenAuraBuffs();

    expect(awakenedAlly.wardenBuffedFrames).toBe(2);
    expect(awakenedAlly.x).toBeGreaterThan(awakenedAllyX);
  });

  it("lets awakened burrowers trigger from farther away", () => {
    const introBurrower = spawn("burrower");
    moveEnemyCenterX(introBurrower, TEST_PLAYER_CENTER_X + BURROWER_AWAKENED_ONLY_DISTANCE);
    introBurrower.burrowerPhase = "move";
    updateEnemies();
    expect(introBurrower.burrowerPhase).toBe("move");

    resetState();
    setPlayerCenterX(TEST_PLAYER_CENTER_X);
    const awakenedBurrower = spawn("burrower", "awakened");
    moveEnemyCenterX(awakenedBurrower, TEST_PLAYER_CENTER_X + BURROWER_AWAKENED_ONLY_DISTANCE);
    awakenedBurrower.burrowerPhase = "move";
    updateEnemies();

    expect(awakenedBurrower.burrowerPhase).toBe("sink");
  });
});
