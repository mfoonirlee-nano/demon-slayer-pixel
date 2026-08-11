import { afterEach, assert, describe, expect, it, vi } from "vitest";
import {
  MIRROR_AFTERIMAGE_DRAW_WIDTH,
  MIRROR_DREAM_CONFIG,
  MIRROR_NIGHTMARE_SHEET,
  SKILL_IDS,
  WIDTH,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { createBossEncounter } from "./encounter";
import { updateMirrorDreamBoss } from "./mirrorDreamBehavior";
import { drawMirrorDreamEffects, updateMirrorDreamEffects } from "./mirrorDreamEffects";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import type { SkillId } from "../../types/assets";
import type { LiveBoss } from "./types";

const PHASE_TWO = 2;
const PHASE_THREE = 3;
const PHASE_FOUR = 4;
const PHASE_TWO_HIGH_HP_RATIO = 0.65;
const PHASE_TWO_LOW_HP_RATIO = 0.35;
const BOSS_START_X = 180;
const PLAYER_CAST_MOVEMENT = 64;
const MIRROR_IMAGE_PATTERN_RANDOM_ROLL = 0.1;
const MIRROR_SHARD_RANDOM_ROLL = 0.8;
const REFLECTION_SUCCESS_ROLL = 0;
const REFLECTION_MISS_ROLL = 0.99;
const MIRROR_DASH_TEST_FRAME_LIMIT = 180;
const NIGHTMARE_CAST_FRAMES = (
  MIRROR_NIGHTMARE_SHEET.count * MIRROR_DREAM_CONFIG.nightmareCastFrameDuration
);
const originalNightmareImage = MIRROR_NIGHTMARE_SHEET.image;

afterEach(() => {
  MIRROR_NIGHTMARE_SHEET.image = originalNightmareImage;
  setCanvas(null);
  vi.restoreAllMocks();
});

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

  it("plays each nightmare image in place before releasing a small-shard volley", () => {
    spawnMirrorImagePattern({ phase: PHASE_TWO });
    const firstImage = [...state.mirrorAfterimages]
      .sort((left, right) => (left.spawnAt ?? Infinity) - (right.spawnAt ?? Infinity))[0];
    if (!firstImage?.spawnAt) throw new Error("Expected a scheduled nightmare image");
    const origin = {
      x: firstImage.x + firstImage.w / 2,
      y: firstImage.y + firstImage.h * MIRROR_DREAM_CONFIG.nightmareShardStartYScale,
    };
    const playerHpBeforeCast = state.player.hp;

    for (let frame = 0; frame < firstImage.spawnAt; frame += 1) {
      updateMirrorDreamEffects();
    }

    const activeImage = state.mirrorAfterimages.find((image) => (
      image.x + image.w / 2 === origin.x
    ));
    assert(activeImage?.stage === "nightmareCast");
    expect(activeImage.frame).toBe(0);
    expect(state.mirrorShards).toHaveLength(0);

    const observedFrames = new Set([activeImage.frame]);
    for (let frame = 1; frame < NIGHTMARE_CAST_FRAMES; frame += 1) {
      updateMirrorDreamEffects();
      observedFrames.add(activeImage.frame);
      expect(activeImage.x + activeImage.w / 2).toBe(origin.x);
      expect(
        activeImage.y + activeImage.h * MIRROR_DREAM_CONFIG.nightmareShardStartYScale,
      ).toBe(origin.y);
      expect(state.mirrorShards).toHaveLength(0);
    }

    expect([...observedFrames]).toEqual(
      Array.from({ length: MIRROR_NIGHTMARE_SHEET.count }, (_, frame) => frame),
    );
    expect(state.player.hp).toBe(playerHpBeforeCast);

    updateMirrorDreamEffects();

    expect(state.mirrorShards).toHaveLength(MIRROR_DREAM_CONFIG.nightmareVolleyCount);
    expect(state.mirrorShards.every((shard) => shard.kind === "nightmare")).toBe(true);
    expect(state.mirrorShards.every((shard) => (
      shard.w < MIRROR_DREAM_CONFIG.nightmareCastDrawW
    ))).toBe(true);
    const targetDx = state.player.x + state.player.w / 2 - origin.x;
    const targetDy = state.player.y + state.player.h / 2 - origin.y;
    expect(state.mirrorShards.every((shard) => (
      shard.vx * targetDx + shard.vy * targetDy > 0
    ))).toBe(true);
    expect(new Set(state.mirrorShards.map((shard) => shard.vy)).size).toBeGreaterThan(1);

    const starts = state.mirrorShards.map(({ x, y }) => ({ x, y }));
    updateMirrorDreamEffects();
    expect(state.mirrorShards.every((shard, index) => (
      shard.x === starts[index]!.x + shard.vx
      && shard.y === starts[index]!.y + shard.vy
    ))).toBe(true);
  });

  it("draws mirror_nightmare as a stationary firing sequence", () => {
    const context = createContext();
    const image = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    MIRROR_NIGHTMARE_SHEET.image = image;
    spawnMirrorImagePattern({ phase: PHASE_TWO });
    const firstSpawnAt = Math.min(...state.mirrorAfterimages.map((item) => item.spawnAt ?? Infinity));

    for (let frame = 0; frame < firstSpawnAt; frame += 1) updateMirrorDreamEffects();
    drawMirrorDreamEffects();
    const firstCenter = context.translate.mock.calls[context.translate.mock.calls.length - 1];

    for (let frame = 0; frame < MIRROR_DREAM_CONFIG.nightmareCastFrameDuration; frame += 1) {
      updateMirrorDreamEffects();
    }
    drawMirrorDreamEffects();

    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls[0]?.[0]).toBe(image);
    expect(context.drawImage.mock.calls[0]?.[1]).toBe(0);
    expect(context.drawImage.mock.calls[1]?.[1]).toBe(MIRROR_NIGHTMARE_SHEET.frameW);
    expect(
      context.translate.mock.calls[context.translate.mock.calls.length - 1],
    ).toEqual(firstCenter);
  });

  it("turns the phase-three nightmare into one readable true-body dash", () => {
    const boss = spawnMirrorImagePattern({ phase: PHASE_THREE });
    const playerCenter = state.player.x + state.player.w / 2;
    const dashStartCenter = boss.x + boss.w / 2;
    assert(boss.mirrorNightmareDash?.stage === "warning");
    const dashTargetCenter = boss.mirrorNightmareDash.targetX + boss.w / 2;
    const hpBefore = state.player.hp;

    expect(boss.skillMode).toBe("mirrorNightmare");
    expect(Math.sign(dashStartCenter - playerCenter)).toBe(
      -Math.sign(dashTargetCenter - playerCenter),
    );
    expect(state.mirrorAfterimages.every((image) => (
      image.x + image.w / 2 !== dashStartCenter
    ))).toBe(true);
    expect(Math.min(...state.mirrorAfterimages.map((image) => image.spawnAt ?? Infinity))).toBe(
      MIRROR_DREAM_CONFIG.nightmareDashFirstBreakFrame,
    );

    for (let frame = 0; frame < MIRROR_DASH_TEST_FRAME_LIMIT; frame += 1) {
      if (boss.actionState === "dash") break;
      updateMirrorDreamBoss(boss);
    }

    expect(boss.actionState).toBe("dash");
    expect(state.player.hp).toBe(hpBefore);

    let hitFrames = 0;
    let previousHp = state.player.hp;
    for (let frame = 0; frame < MIRROR_DASH_TEST_FRAME_LIMIT; frame += 1) {
      if (boss.actionState === "recover") break;
      state.player.invincible = 0;
      updateMirrorDreamBoss(boss);
      if (state.player.hp < previousHp) hitFrames += 1;
      previousHp = state.player.hp;
    }

    expect(hitFrames).toBe(1);
    expect(boss.actionState).toBe("recover");
    expect(boss.recoveryTimer).toBeGreaterThan(0);
    expect(boss.x).toBeCloseTo(dashTargetCenter - boss.w / 2);

    boss.x = state.player.x;
    state.player.invincible = 0;
    const hpAtRecovery = state.player.hp;
    updateMirrorDreamBoss(boss);

    expect(state.player.hp).toBe(hpAtRecovery);
  });

  it("keeps the documented warning, dash, shard, and recovery cadence", () => {
    const boss = createIdleMirrorDreamBoss();
    boss.phase = PHASE_THREE;
    boss.skillCd = 0;
    vi.spyOn(Math, "random").mockReturnValue(MIRROR_IMAGE_PATTERN_RANDOM_ROLL);

    updateMirrorDreamBoss(boss);
    let warningFrames = 0;
    for (let frame = 0; frame < MIRROR_DASH_TEST_FRAME_LIMIT; frame += 1) {
      if (boss.actionState !== "cast") break;
      updateMirrorDreamBoss(boss);
      updateMirrorDreamEffects();
      if (boss.skillEffectSpawned) warningFrames += 1;
    }

    expect(warningFrames).toBe(
      MIRROR_DREAM_CONFIG.castDuration - MIRROR_DREAM_CONFIG.spawnAtFrame,
    );
    expect(boss.actionState).toBe("dash");
    expect(state.mirrorShards).toHaveLength(0);

    let dashFrames = 0;
    for (let frame = 0; frame < MIRROR_DASH_TEST_FRAME_LIMIT; frame += 1) {
      if (boss.actionState !== "dash") break;
      updateMirrorDreamBoss(boss);
      updateMirrorDreamEffects();
      dashFrames += 1;
    }

    expect(dashFrames).toBe(MIRROR_DREAM_CONFIG.nightmareDashFrames);
    expect(state.mirrorShards).toHaveLength(0);
    expect(state.mirrorAfterimages.some(({ stage }) => stage === "nightmareCast")).toBe(true);

    let recoveryFrames = 0;
    let firstVolleyRecoveryFrame: number | undefined;
    for (let frame = 0; frame < MIRROR_DASH_TEST_FRAME_LIMIT; frame += 1) {
      if (boss.mirrorNightmareDash?.stage !== "recover") break;
      updateMirrorDreamBoss(boss);
      updateMirrorDreamEffects();
      recoveryFrames += 1;
      if (firstVolleyRecoveryFrame === undefined && state.mirrorShards.length > 0) {
        firstVolleyRecoveryFrame = recoveryFrames;
      }
    }
    expect(firstVolleyRecoveryFrame).toBe(
      NIGHTMARE_CAST_FRAMES
        - MIRROR_DREAM_CONFIG.nightmareDashFrames
        + MIRROR_DREAM_CONFIG.nightmareDashFirstBreakFrame
        - warningFrames,
    );
    expect(recoveryFrames).toBe(MIRROR_DREAM_CONFIG.nightmareDashRecoveryFrames);
    expect(boss.mirrorNightmareDash).toBeUndefined();
    expect(boss.actionState).toBe("move");
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

  it("leaves the old body as a mirror without covering the shifted true body", () => {
    const boss = spawnMirrorImagePattern({ awakened: true, phase: PHASE_TWO });
    const originalCenter = BOSS_START_X + boss.w / 2;
    const shiftedCenter = boss.x + boss.w / 2;
    const mirrorCenters = state.mirrorAfterimages.map((image) => image.x + image.w / 2);

    expect(mirrorCenters).toContain(originalCenter);
    expect(mirrorCenters).not.toContain(shiftedCenter);
  });

  it("opens every awakened encounter with a true-image shift", () => {
    const boss = createIdleMirrorDreamBoss({ awakened: true });
    boss.mirrorTrueImageShiftPhase = undefined;

    updateMirrorDreamBoss(boss);

    expect(boss.skillMode).toBe("mirrorTrueImageShift");
    expect(boss.mirrorTrueImageShiftPhase).toBe(1);
    expect(boss.actionState).toBe("cast");
  });

  it("returns to the three base patterns after phase four's required shift", () => {
    const boss = createIdleMirrorDreamBoss({ awakened: true });
    boss.phase = PHASE_FOUR;
    boss.mirrorTrueImageShiftPhase = PHASE_FOUR;
    boss.skillCd = 0;
    vi.spyOn(Math, "random").mockReturnValue(MIRROR_SHARD_RANDOM_ROLL);

    updateMirrorDreamBoss(boss);

    expect(boss.skillMode).toBe("mirrorShard");
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

  it("reflects an awakened player's released skill once after a readable warning", () => {
    const boss = createIdleMirrorDreamBoss({ awakened: true });
    state.player.skillReleasedThisFrameId = SKILL_IDS.lineProjectile;
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(REFLECTION_SUCCESS_ROLL);

    updateMirrorDreamBoss(boss);
    updateMirrorDreamBoss(boss);

    expect(randomSpy).toHaveBeenCalledTimes(1);
    expect(state.player.skillReleasedThisFrameId).toBeNull();
    expect(state.mirrorAfterimages).toHaveLength(1);
    expect(state.mirrorAfterimages[0]).toMatchObject({
      spawnAt: MIRROR_DREAM_CONFIG.playerSkillReflectionWarningFrames,
      reflectedSkillId: SKILL_IDS.lineProjectile,
    });

    for (let frame = 0; frame < MIRROR_DREAM_CONFIG.playerSkillReflectionWarningFrames; frame += 1) {
      updateMirrorDreamEffects();
    }

    expect(state.mirrorShards).toHaveLength(0);
    expect(state.mirrorAfterimages[0]?.stage).toBe("nightmareCast");
    for (let frame = 0; frame < NIGHTMARE_CAST_FRAMES; frame += 1) {
      updateMirrorDreamEffects();
    }

    expect(state.mirrorShards).toHaveLength(1);
    expect(state.mirrorShards[0]).toMatchObject({
      kind: "reflection",
      reflectedSkillId: SKILL_IDS.lineProjectile,
    });
    expect(state.mirrorShards[0]?.vx).toBeGreaterThan(0);
  });

  it("carries the released skill's range and damage profile into the reflection", () => {
    vi.spyOn(Math, "random").mockReturnValue(REFLECTION_SUCCESS_ROLL);

    const lineProjectileReflection = spawnReflectedPlayerSkill(SKILL_IDS.lineProjectile);
    const vortexReflection = spawnReflectedPlayerSkill(SKILL_IDS.vortexControl);

    expect(lineProjectileReflection.reflectedSkillId).toBe(SKILL_IDS.lineProjectile);
    expect(vortexReflection.reflectedSkillId).toBe(SKILL_IDS.vortexControl);
    expect(lineProjectileReflection.w).toBeLessThan(vortexReflection.w);
    expect(Math.hypot(lineProjectileReflection.vx, lineProjectileReflection.vy)).toBeGreaterThan(
      Math.hypot(vortexReflection.vx, vortexReflection.vy),
    );
    expect(lineProjectileReflection.damage).toBeGreaterThan(vortexReflection.damage);
  });

  it("does not reroll a missed reflection for the same release", () => {
    const boss = createIdleMirrorDreamBoss({ awakened: true });
    state.player.skillReleasedThisFrameId = SKILL_IDS.closeArc;
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(REFLECTION_MISS_ROLL);

    updateMirrorDreamBoss(boss);
    updateMirrorDreamBoss(boss);

    expect(randomSpy).toHaveBeenCalledTimes(1);
    expect(state.player.skillReleasedThisFrameId).toBeNull();
    expect(state.mirrorAfterimages).toHaveLength(0);
  });

  it("prioritizes its own cast when both releases would start on the same frame", () => {
    const boss = createIdleMirrorDreamBoss({ awakened: true });
    boss.skillCd = 0;
    state.player.skillReleasedThisFrameId = SKILL_IDS.antiAirMulti;
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(REFLECTION_SUCCESS_ROLL);

    updateMirrorDreamBoss(boss);

    expect(randomSpy).toHaveBeenCalledTimes(1);
    expect(state.player.skillReleasedThisFrameId).toBeNull();
    expect(state.mirrorAfterimages).toHaveLength(0);
    expect(boss.castTimer).toBe(MIRROR_DREAM_CONFIG.castDuration);
    expect(boss.actionState).toBe("cast");
  });

  it("cancels a pending reflection if a phase cast starts during its warning", () => {
    const boss = createIdleMirrorDreamBoss({ awakened: true });
    state.player.skillReleasedThisFrameId = SKILL_IDS.vortexControl;
    vi.spyOn(Math, "random").mockReturnValue(REFLECTION_SUCCESS_ROLL);

    updateMirrorDreamBoss(boss);
    expect(state.mirrorAfterimages).toHaveLength(1);

    boss.phase = PHASE_TWO;
    updateMirrorDreamBoss(boss);

    expect(boss.skillMode).toBe("mirrorTrueImageShift");
    expect(boss.actionState).toBe("cast");
    expect(state.mirrorAfterimages).toHaveLength(0);
  });

  it("consumes without deferring a skill released while Mirror Dream is casting", () => {
    const boss = createIdleMirrorDreamBoss({ awakened: true });
    boss.actionState = "cast";
    boss.castTimer = 1;
    boss.skillEffectSpawned = true;
    state.player.skillReleasedThisFrameId = SKILL_IDS.verticalWave;
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(REFLECTION_SUCCESS_ROLL);

    updateMirrorDreamBoss(boss);
    boss.recoveryTimer = 0;
    boss.actionState = "move";
    updateMirrorDreamBoss(boss);

    expect(randomSpy).not.toHaveBeenCalled();
    expect(state.player.skillReleasedThisFrameId).toBeNull();
    expect(state.mirrorAfterimages).toHaveLength(0);
  });

  it("does not reflect during recovery or from the base form", () => {
    const recoveringBoss = createIdleMirrorDreamBoss({ awakened: true });
    recoveringBoss.actionState = "recover";
    recoveringBoss.recoveryTimer = 2;
    state.player.skillReleasedThisFrameId = SKILL_IDS.returningBlade;
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(REFLECTION_SUCCESS_ROLL);

    updateMirrorDreamBoss(recoveringBoss);

    expect(randomSpy).not.toHaveBeenCalled();
    expect(state.mirrorAfterimages).toHaveLength(0);

    const baseBoss = createIdleMirrorDreamBoss();
    randomSpy.mockClear();
    state.player.skillReleasedThisFrameId = SKILL_IDS.returningBlade;
    updateMirrorDreamBoss(baseBoss);

    expect(randomSpy).not.toHaveBeenCalled();
    expect(state.mirrorAfterimages).toHaveLength(0);
  });
});

function createIdleMirrorDreamBoss(options: { awakened?: boolean } = {}): LiveBoss {
  resetState();
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.mirrorDream,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
    awakened: options.awakened,
  });
  boss.entering = false;
  boss.x = BOSS_START_X;
  boss.skillCd = MIRROR_DREAM_CONFIG.initialCooldown;
  if (boss.awakened) boss.mirrorTrueImageShiftPhase = boss.phase;
  state.player.x = 540;
  return boss;
}

function spawnReflectedPlayerSkill(skillId: SkillId) {
  const boss = createIdleMirrorDreamBoss({ awakened: true });
  state.player.skillReleasedThisFrameId = skillId;
  updateMirrorDreamBoss(boss);
  for (let frame = 0; frame < MIRROR_DREAM_CONFIG.playerSkillReflectionWarningFrames; frame += 1) {
    updateMirrorDreamEffects();
  }
  for (let frame = 0; frame < NIGHTMARE_CAST_FRAMES; frame += 1) {
    updateMirrorDreamEffects();
  }
  const shard = state.mirrorShards[0];
  if (!shard) throw new Error(`Expected reflected shard for ${skillId}`);
  return shard;
}

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

function createContext() {
  return {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
  } as unknown as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
  };
}
