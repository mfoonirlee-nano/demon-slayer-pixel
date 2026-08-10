import { afterEach, describe, expect, it, vi } from "vitest";
import { BLOOD_MOON_CONFIG, GROUND_Y, WIDTH } from "../../constants";
import * as debugApi from "../../game/debug";
import { resetState, state } from "../../game/state";
import type { BloodMoonFace, BloodMoonEffectState } from "../../types/game-state";
import { updateBoss } from "../boss";
import { updateBloodMoonBoss } from "./bloodMoonBehavior";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import type { LiveBoss } from "./types";

vi.mock("../../game/audio", () => ({ playSfx: vi.fn() }));

const BOSS_X = 180;
const PLAYER_X = 520;
const PHASE_TWO = 2;
const PHASE_THREE = 3;
const PHASE_FOUR = 4;
const FINAL_PHASE = 5;
const LANTERN_BEAT_COUNT = 3;
const TRAIL_ROUTE_FIRST_X = 360;
const TRAIL_ROUTE_SECOND_X = 520;
const TRAIL_ROUTE_THIRD_X = 680;
const PHASE_TWO_HP_RATIO = 0.7;
const MIN_WARNING_VISIBLE_RATIO = 0.8;

describe("blood moon encounter cadence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("waits for its post-entry AI delay even when the skill cooldown is ready", () => {
    const boss = readyBloodMoon(1);
    boss.aiTimer = 2;

    updateBloodMoonBoss(boss);

    expect(boss.actionState).toBe("move");
    expect(boss.castTimer).toBe(0);

    boss.aiTimer = 0;
    updateBloodMoonBoss(boss);

    expect(boss.actionState).toBe("cast");
    expect(boss.castTimer).toBe(BLOOD_MOON_CONFIG.castDuration);
  });

  it("records three points along the player's route before raising staggered spider mist", () => {
    const boss = readyBloodMoon(1);
    startCast(boss);
    const route = [
      TRAIL_ROUTE_FIRST_X,
      TRAIL_ROUTE_SECOND_X,
      TRAIL_ROUTE_THIRD_X,
    ];

    for (let frame = 0; frame <= BLOOD_MOON_CONFIG.spawnAtFrame; frame += 1) {
      const sampleIndex = BLOOD_MOON_CONFIG.trailSampleFrames.findIndex(
        (sampleFrame) => sampleFrame === frame,
      );
      const sampleX = route[sampleIndex];
      if (sampleX !== undefined) state.player.x = sampleX;
      updateBloodMoonBoss(boss);
    }

    const mists = state.bloodMoonEffects.filter(({ kind }) => kind === "spiderMist");
    expect(mists).toHaveLength(BLOOD_MOON_CONFIG.trailSampleFrames.length);
    expect(mists.map(({ x, w }) => Math.round(x + w / 2))).toEqual(
      route.map((x) => Math.round(x + state.player.w / 2)),
    );
    expect(mists.map(({ delay }) => delay)).toEqual(
      BLOOD_MOON_CONFIG.trailSampleFrames.map(
        (_, index) => index * BLOOD_MOON_CONFIG.trailStaggerFrames,
      ),
    );
  });

  it("telegraphs two harmless mirror feints before the true fang crosses from the unlit side", () => {
    const boss = readyBloodMoon(PHASE_TWO);
    startCast(boss);
    advanceCast(boss, BLOOD_MOON_CONFIG.spawnAtFrame + 1);

    const fangs = state.bloodMoonEffects.filter(({ kind }) => kind === "mirrorFang");
    const decoys = fangs.filter(({ decoy }) => decoy);
    const trueFang = fangs.find(({ decoy }) => !decoy);

    expect(decoys).toHaveLength(2);
    expect(decoys.every(({ damage }) => damage === 0)).toBe(true);
    expect(new Set(decoys.map(({ facing }) => facing))).toEqual(
      new Set([boss.castFacing]),
    );
    expect(fangs.every((fang) => (
      visibleMirrorFangWidth(fang)
        >= BLOOD_MOON_CONFIG.mirrorFangDrawW * MIN_WARNING_VISIBLE_RATIO
    ))).toBe(true);
    if (!trueFang) throw new Error("True mirror fang was not released");
    expect(trueFang).toMatchObject({
      decoy: false,
      facing: -boss.castFacing,
      delay: BLOOD_MOON_CONFIG.mirrorTrueDelayFrames,
    });
    expect(Math.sign(trueFang.vx)).toBe(-boss.castFacing);
    expect(
      Math.abs(trueFang.vx)
        * (BLOOD_MOON_CONFIG.mirrorFangLife - trueFang.warningFrames),
    ).toBeGreaterThanOrEqual(WIDTH);
  });

  it("splits Lantern Bell into summon, fireline, and blade beats instead of stacking them", () => {
    vi.spyOn(debugApi, "canAutoSpawnEntities").mockReturnValue(false);
    const boss = readyBloodMoon(PHASE_THREE);

    const beats = Array.from({ length: LANTERN_BEAT_COUNT }, () => {
      clearObservedHazards();
      startCast(boss);
      advanceCast(boss, BLOOD_MOON_CONFIG.spawnAtFrame + 1);
      return {
        firelines: state.lanternEmberFirelines.length,
        blades: state.deadBellBlades.length,
        cue: state.bloodMoonEffects.some(({ kind }) => kind === "lanternBell"),
      };
    });

    expect(beats).toEqual([
      { firelines: 0, blades: 0, cue: true },
      { firelines: 1, blades: 0, cue: true },
      { firelines: 0, blades: 1, cue: true },
    ]);
  });

  it("cycles all six readable techniques in order with one active danger source", () => {
    const boss = readyBloodMoon(PHASE_FOUR);
    const expectedFaces = [
      "spider",
      "bone",
      "mirror",
      "fang",
      "lantern",
      "bell",
    ] as const satisfies readonly BloodMoonFace[];
    const observed: BloodMoonFace[] = [];

    for (const expectedFace of expectedFaces) {
      clearObservedHazards();
      startCast(boss);
      expect(boss.bloodMoonActiveFace).toBe(expectedFace);
      expect(state.bloodMoonEffects).toContainEqual(
        expect.objectContaining({ kind: "phaseRune", runeFace: expectedFace }),
      );

      advanceCast(boss, BLOOD_MOON_CONFIG.spawnAtFrame + 1);
      observed.push(activeReviewFace());
      expect(activeDangerSourceCount()).toBe(1);
    }

    expect(observed).toEqual(expectedFaces);
  });

  it("relays all six faces in the finale, clears the last hazard, then exposes a safe break window", () => {
    const boss = readyBloodMoon(FINAL_PHASE);
    const observed: BloodMoonFace[] = [];
    let previousAttackStep = 0;
    startCast(boss);

    for (let frame = 0; frame < BLOOD_MOON_CONFIG.finalCastDuration; frame += 1) {
      updateBloodMoonBoss(boss);
      const attackStep = boss.bloodMoonFinalAttackStep ?? 0;
      if (attackStep > previousAttackStep) {
        observed.push(activeReviewFace());
        expect(activeDangerSourceCount()).toBe(1);
        previousAttackStep = attackStep;
      }
    }

    expect(observed).toEqual([
      "spider",
      "bone",
      "mirror",
      "fang",
      "lantern",
      "bell",
    ]);
    expect(boss.actionState).toBe("recover");
    expect(boss.bloodMoonExposed).toBe(false);

    advanceCast(boss, BLOOD_MOON_CONFIG.finalSettleFrames);

    expect(boss.bloodMoonExposed).toBe(true);
    expect(activeDangerSourceCount()).toBe(0);
    const hpBeforeContact = state.player.hp;
    state.player.x = boss.x;
    state.player.y = boss.y;
    updateBloodMoonBoss(boss);
    expect(state.player.hp).toBe(hpBeforeContact);
  });

  it("atomically cancels the old action and its hazards when a new face takes over", () => {
    const boss = readyBloodMoon(1);
    boss.castTimer = 20;
    boss.recoveryTimer = 18;
    boss.skillEffectSpawned = true;
    boss.hp = boss.hpMax * PHASE_TWO_HP_RATIO;
    state.bloodMoonEffects.push(testBloodMoonEffect());
    state.player.x = boss.x;
    state.player.y = boss.y;
    const hpBeforeShift = state.player.hp;

    updateBoss();

    expect(boss.phase).toBe(PHASE_TWO);
    expect(boss.castTimer).toBe(0);
    expect(boss.recoveryTimer).toBe(0);
    expect(boss.skillEffectSpawned).toBe(false);
    expect(boss.actionState).toBe("windup");
    expect(boss.phaseShiftTimer).toBe(BLOOD_MOON_CONFIG.phaseShiftFrames - 1);
    expect(state.bloodMoonEffects).toEqual([]);
    expect(state.player.hp).toBe(hpBeforeShift);
  });
});

function readyBloodMoon(phase: number) {
  resetState();
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.bloodMoon,
    bossKills: 12,
    elapsedSeconds: 0,
    animSeed: 0,
  });
  boss.entering = false;
  boss.phase = phase;
  boss.x = BOSS_X;
  boss.y = GROUND_Y - boss.h;
  boss.vx = 0;
  boss.skillCd = 0;
  boss.aiTimer = 0;
  state.boss = boss;
  state.player.x = PLAYER_X;
  state.player.y = GROUND_Y - state.player.h;
  state.player.onPlatform = null;
  return boss;
}

function startCast(boss: LiveBoss) {
  boss.castTimer = 0;
  boss.recoveryTimer = 0;
  boss.skillCd = 0;
  boss.aiTimer = 0;
  boss.bloodMoonExposed = false;
  updateBloodMoonBoss(boss);
  expect(boss.actionState).toBe("cast");
}

function advanceCast(boss: LiveBoss, frames: number) {
  for (let frame = 0; frame < frames; frame += 1) updateBloodMoonBoss(boss);
}

function clearObservedHazards() {
  state.spiderStringPillars.length = 0;
  state.mistBoneSpikes.length = 0;
  state.mirrorShards.length = 0;
  state.lanternEmberFirelines.length = 0;
  state.deadBellWaves.length = 0;
  state.deadBellBlades.length = 0;
  state.bloodMoonEffects.length = 0;
}

function activeReviewFace(): BloodMoonFace {
  if (state.spiderStringPillars.length > 0) return "spider";
  if (state.mistBoneSpikes.length > 0) return "bone";
  if (state.mirrorShards.length > 0) return "mirror";
  if (state.bloodMoonEffects.some(({ kind, decoy }) => kind === "mirrorFang" && !decoy)) {
    return "fang";
  }
  if (state.lanternEmberFirelines.length > 0) return "lantern";
  if (state.deadBellWaves.length > 0) return "bell";
  throw new Error("No active Blood Moon review face");
}

function activeDangerSourceCount() {
  return [
    state.spiderStringPillars,
    state.mistBoneSpikes,
    state.mirrorShards,
    state.bloodMoonEffects.filter(({ kind, damage }) => kind === "mirrorFang" && damage > 0),
    state.lanternEmberFirelines,
    state.deadBellWaves,
  ].filter(({ length }) => length > 0).length;
}

function visibleMirrorFangWidth(effect: BloodMoonEffectState) {
  const drawX = effect.x + effect.w / 2 - BLOOD_MOON_CONFIG.mirrorFangDrawW / 2;
  const drawRight = drawX + BLOOD_MOON_CONFIG.mirrorFangDrawW;
  return Math.max(0, Math.min(WIDTH, drawRight) - Math.max(0, drawX));
}

function testBloodMoonEffect(): BloodMoonEffectState {
  return {
    kind: "spiderMist",
    x: 0,
    y: 0,
    w: 20,
    h: 20,
    vx: 0,
    facing: 1,
    delay: 0,
    warningFrames: 1,
    elapsed: 0,
    frame: 0,
    life: 10,
    damage: 1,
    hitDone: false,
  };
}
