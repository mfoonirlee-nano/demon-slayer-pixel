import { describe, expect, it, vi } from "vitest";
import { MIRROR_AFTERIMAGE_DRAW_WIDTH, MIRROR_DREAM_CONFIG, WIDTH } from "../../constants";
import { resetState, state } from "../../game/state";
import { createBossEncounter } from "./encounter";
import { updateMirrorDreamBoss } from "./mirrorDreamBehavior";
import { BOSS_ARCHETYPE_IDS } from "./registry";

const PHASE_TWO = 2;
const PHASE_THREE = 3;
const PHASE_TWO_HIGH_HP_RATIO = 0.65;
const PHASE_TWO_LOW_HP_RATIO = 0.35;
const BOSS_START_X = 180;
const PLAYER_CAST_MOVEMENT = 64;
const MIRROR_IMAGE_PATTERN_RANDOM_ROLL = 0.1;
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

  it("leaves a collision-free player lane between nightmare images", () => {
    const boss = spawnMirrorImagePattern({ phase: PHASE_TWO });

    expect(boss.skillMode).toBe("mirrorNightmare");
    expect(state.mirrorAfterimages).toHaveLength(MIRROR_DREAM_CONFIG.nightmareMaxImages);
    expectCollisionFreePlayerLane();
  });

  it("keeps the player lane clear in an odd true-image formation", () => {
    const boss = spawnMirrorImagePattern({ awakened: true });

    expect(boss.skillMode).toBe("mirrorTrueImageShift");
    expectCollisionFreePlayerLane();
  });

  it("keeps the player lane clear in a full true-image formation", () => {
    const boss = spawnMirrorImagePattern({ awakened: true, phase: PHASE_TWO });

    expect(boss.skillMode).toBe("mirrorTrueImageShift");
    expect(state.mirrorAfterimages).toHaveLength(MIRROR_DREAM_CONFIG.nightmareMaxImages + 1);
    expectCollisionFreePlayerLane();
  });

  it("re-centers the true-image lane when the player moves during casting", () => {
    const centeredPlayerX = (WIDTH - state.player.w) / 2;
    const boss = spawnMirrorImagePattern({
      awakened: true,
      playerX: centeredPlayerX,
      playerXAtSpawn: centeredPlayerX + PLAYER_CAST_MOVEMENT,
    });

    expect(boss.skillMode).toBe("mirrorTrueImageShift");
    expectCollisionFreePlayerLane();
  });

  it("preserves distinct mirror positions at either screen edge", () => {
    for (const playerX of [0, WIDTH - state.player.w]) {
      spawnMirrorImagePattern({ phase: PHASE_TWO, playerX });

      expectCollisionFreePlayerLane();
      expect(new Set(state.mirrorAfterimages.map((image) => image.x))).toHaveLength(
        state.mirrorAfterimages.length,
      );
    }
  });
});

function spawnMirrorImagePattern(options: {
  phase?: number;
  awakened?: boolean;
  playerX?: number;
  playerXAtSpawn?: number;
}) {
  resetState();
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.mirrorDream,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
    awakened: options.awakened,
  });
  boss.entering = false;
  boss.phase = options.phase ?? 1;
  boss.skillCd = 0;
  boss.x = BOSS_START_X;
  state.player.x = options.playerX ?? (WIDTH - state.player.w) / 2;

  const randomSpy = vi.spyOn(Math, "random").mockReturnValue(MIRROR_IMAGE_PATTERN_RANDOM_ROLL);
  updateMirrorDreamBoss(boss);
  if (options.playerXAtSpawn !== undefined) state.player.x = options.playerXAtSpawn;
  for (let frame = 0; frame < MIRROR_DREAM_CONFIG.spawnAtFrame + 2; frame += 1) {
    updateMirrorDreamBoss(boss);
  }
  randomSpy.mockRestore();
  return boss;
}

function expectCollisionFreePlayerLane() {
  const playerCenter = state.player.x + state.player.w / 2;
  const playerRight = state.player.x + state.player.w;
  expect(state.mirrorAfterimages.every((image) => {
    const imageCenter = image.x + image.w / 2;
    const imageLeft = imageCenter - MIRROR_AFTERIMAGE_DRAW_WIDTH / 2;
    const imageRight = imageCenter + MIRROR_AFTERIMAGE_DRAW_WIDTH / 2;
    return imageRight <= state.player.x || imageLeft >= playerRight;
  })).toBe(true);
  expect(state.mirrorAfterimages.some((image) => image.x + image.w / 2 < playerCenter)).toBe(true);
  expect(state.mirrorAfterimages.some((image) => image.x + image.w / 2 > playerCenter)).toBe(true);
}

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
  boss.x = BOSS_START_X;
  state.player.x = 540;

  const randomSpy = vi.spyOn(Math, "random").mockReturnValue(MIRROR_SHARD_RANDOM_ROLL);
  updateMirrorDreamBoss(boss);
  randomSpy.mockRestore();

  return boss.skillCd;
}
