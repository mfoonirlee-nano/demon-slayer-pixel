import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOSS_SKILL1_CONFIG,
  DEAD_BELL_CONFIG,
} from "../../constants";
import * as collisionDebug from "../../game/collisionDebug";
import { resetState, state } from "../../game/state";
import type {
  BossSkill1EffectState,
  DeadBellWaveState,
} from "../../types/game-state";
import { updateDeadBellEffects } from "./deadBellEffects";
import { BOSS_ARCHETYPE_IDS, bossArchetypeForId } from "./registry";
import { updateBossSkill1Effects } from "./spiderStringEffects";

const PLAYER_WAVE_RADIUS_RATIO = 0.35;

describe("boss hazard collision debug records", () => {
  beforeEach(() => {
    resetState();
    vi.spyOn(collisionDebug, "recordCollisionDebugPoint").mockImplementation(() => {});
    vi.spyOn(collisionDebug, "recordCollisionDebugRect").mockImplementation(() => {});
    vi.spyOn(collisionDebug, "recordCollisionDebugRing").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records an active Dead Bell ring but not its warning or consumed tail", () => {
    const wave = deadBellWave({
      elapsed: DEAD_BELL_CONFIG.waveWarningFrames - 1,
    });
    state.player.x = 10_000;
    state.deadBellWaves.push(wave);
    const recordPoint = vi.mocked(collisionDebug.recordCollisionDebugPoint);
    const recordRing = vi.mocked(collisionDebug.recordCollisionDebugRing);

    updateDeadBellEffects();
    expect(recordRing).not.toHaveBeenCalled();

    updateDeadBellEffects();
    expect(recordRing).toHaveBeenCalledOnce();
    expect(recordRing).toHaveBeenCalledWith(
      wave.x,
      wave.y,
      wave.radius,
      wave.thickness
        + Math.max(state.player.w, state.player.h) * PLAYER_WAVE_RADIUS_RATIO,
      "enemyAttack",
    );
    expect(recordPoint).toHaveBeenCalledWith(
      state.player.x + state.player.w / 2,
      state.player.y + state.player.h / 2,
      "player",
    );

    wave.hitPlayer = true;
    recordRing.mockClear();
    updateDeadBellEffects();
    expect(recordRing).not.toHaveBeenCalled();
  });

  it("records the Spider String effect's current temporary AABB", () => {
    const effect = spiderStringEffect();
    state.player.x = 10_000;
    state.bossSkill1Effects.push(effect);
    const recordRect = vi.mocked(collisionDebug.recordCollisionDebugRect);
    const sheet = bossArchetypeForId(BOSS_ARCHETYPE_IDS.spiderString).sheets.effect;
    const drawW = sheet.frameW * BOSS_SKILL1_CONFIG.effectDrawScale;
    const drawH = sheet.frameH * BOSS_SKILL1_CONFIG.effectDrawScale;

    updateBossSkill1Effects();

    expect(recordRect).toHaveBeenCalledOnce();
    expect(recordRect).toHaveBeenCalledWith(
      {
        x: effect.x - drawW / 2,
        y: effect.y - drawH / 2,
        w: drawW,
        h: drawH,
      },
      "enemyAttack",
    );
  });
});

function deadBellWave(
  overrides: Partial<DeadBellWaveState> = {},
): DeadBellWaveState {
  return {
    x: 420,
    y: 260,
    radius: DEAD_BELL_CONFIG.waveStartRadius,
    maxRadius: DEAD_BELL_CONFIG.waveMaxRadius,
    thickness: DEAD_BELL_CONFIG.waveThickness,
    warningFrames: DEAD_BELL_CONFIG.waveWarningFrames,
    expandFrames: DEAD_BELL_CONFIG.waveExpandFrames,
    delay: 0,
    elapsed: 0,
    frame: 0,
    damage: 1,
    hitPlayer: false,
    ...overrides,
  };
}

function spiderStringEffect(): BossSkill1EffectState {
  return {
    kind: "spiderString",
    x: 320,
    y: 180,
    vx: 4,
    vy: -2,
    facing: 1,
    frame: 0,
    elapsed: 0,
    damage: 1,
    hitPlayerCd: 0,
  };
}
