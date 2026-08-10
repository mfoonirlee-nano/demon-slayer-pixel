import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEAD_BELL_BLADE_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_WAVE_SHEET,
  GROUND_Y,
  WIDTH,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { playSfx } from "../../game/audio";
import * as debugApi from "../../game/debug";
import * as enemyApi from "../enemy";
import { setCanvas } from "../../rendering/context";
import { updateBoss } from "../boss";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import {
  deadBellWaveDrawSize,
  drawDeadBellEffects,
  updateDeadBellEffects,
} from "./deadBellEffects";
import {
  spawnDeadBellBlade,
  spawnDeadBellWave,
  updateDeadBellBoss,
} from "./deadBellBehavior";

const LONG_BLADE_ACTIVATION_DELAY = 52;
const PHASE_THREE = 3;
const PHASE_FOUR = 4;
const PHASE_TWO_CAST_COUNT = 3;
const PHASE_THREE_CAST_COUNT = 4;
const PHASE_FOUR_CAST_COUNT = 5;
const GENERIC_SUPPORT_CALLS_AFTER_AWAKENED_CYCLE = 3;
const BLADE_DISSIPATE_FRAMES = 12;
const BLADE_DISSIPATE_FIRST_FRAME = 4;
const BLADE_DISSIPATE_SECOND_FRAME = 5;
const BLADE_DISSIPATE_HALF_FRAMES = 6;
const WARNING_VISIBLE_BOUNDS = { w: 177, h: 88 } as const;
const ACTIVE_VISIBLE_BOUNDS = { w: 371, h: 274 } as const;
const ACTIVE_WAVE_RADIUS = 240;
const originalBladeImage = DEAD_BELL_BLADE_SHEET.image;
const originalWaveImage = DEAD_BELL_WAVE_SHEET.image;

vi.mock("../../game/audio", () => ({ playSfx: vi.fn() }));

describe("dead bell deterministic cadence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { phase: 1, expected: ["deadBellSingle", "deadBellSingle", "deadBellSingle"] },
    { phase: 2, expected: ["deadBellDouble", "deadBellSingle", "deadBellDouble"] },
    { phase: 3, expected: ["deadBellCombo", "deadBellDouble", "deadBellSingle"] },
  ] as const)("introduces phase $phase's signature before its cumulative pattern", ({ phase, expected }) => {
    const boss = readyDeadBell(false, phase);

    expect(nextCasts(boss, expected.length)).toEqual(expected);
  });

  it("opens every awakened phase with duet, then repeats duet inside phase four's full sequence", () => {
    const boss = readyDeadBell(true, 1);

    expect(nextCasts(boss, 2)).toEqual(["deadBellDuet", "deadBellSingle"]);

    boss.phase = 2;
    expect(nextCasts(boss, PHASE_TWO_CAST_COUNT)).toEqual([
      "deadBellDuet",
      "deadBellDouble",
      "deadBellSingle",
    ]);

    boss.phase = PHASE_THREE;
    expect(nextCasts(boss, PHASE_THREE_CAST_COUNT)).toEqual([
      "deadBellDuet",
      "deadBellCombo",
      "deadBellDouble",
      "deadBellSingle",
    ]);

    boss.phase = PHASE_FOUR;
    expect(nextCasts(boss, PHASE_FOUR_CAST_COUNT)).toEqual([
      "deadBellDuet",
      "deadBellCombo",
      "deadBellDouble",
      "deadBellSingle",
      "deadBellDuet",
    ]);
  });

  it("reduces the awakened standard-pattern cooldown without crossing its floor", () => {
    const baseBoss = readyDeadBell(false, PHASE_FOUR);
    updateDeadBellBoss(baseBoss);
    const baseCooldown = baseBoss.skillCd;

    const awakenedBoss = readyDeadBell(true, PHASE_FOUR);
    awakenedBoss.deadBellDuetPhase = PHASE_FOUR;
    updateDeadBellBoss(awakenedBoss);

    expect(awakenedBoss.skillMode).toBe("deadBellCombo");
    expect(awakenedBoss.skillCd).toBeLessThan(baseCooldown);
    expect(awakenedBoss.skillCd)
      .toBeGreaterThanOrEqual(DEAD_BELL_CONFIG.awakenedMinimumSkillCooldown);
  });

  it("waits for its post-entry ai delay even when the skill cooldown is ready", () => {
    const boss = readyDeadBell(false, 1);
    boss.aiTimer = 2;

    updateDeadBellBoss(boss);

    expect(boss.actionState).toBe("move");
    expect(boss.castTimer).toBe(0);

    boss.aiTimer = 0;
    updateDeadBellBoss(boss);

    expect(boss.actionState).toBe("cast");
    expect(boss.castTimer).toBeGreaterThan(0);
  });
});

describe("dead bell duet orchestration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    { phase: 1, tones: ["low", "high"], bladeCount: 0 },
    { phase: 2, tones: ["low", "high"], bladeCount: 1 },
    { phase: 3, tones: ["low", "high", "low"], bladeCount: 2 },
    { phase: 4, tones: ["low", "high", "low"], bladeCount: 2 },
  ] as const)("scales the phase-$phase duet without skipping its two-tone lesson", ({ phase, tones, bladeCount }) => {
    vi.spyOn(debugApi, "canAutoSpawnEntities").mockReturnValue(false);
    const boss = readyDeadBell(true, phase);

    updateDeadBellBoss(boss);
    advanceUntilPatternSpawns(boss);

    expect(state.deadBellWaves.map(({ tone }) => tone)).toEqual(tones);
    expect(state.deadBellWaves[1].expandFrames)
      .toBeLessThan(state.deadBellWaves[0].expandFrames);
    expect(state.deadBellBlades).toHaveLength(bladeCount);
  });

  it("retries the support slot each combo cycle and alternates awakened specialists with the base pool", () => {
    vi.spyOn(debugApi, "canAutoSpawnEntities").mockReturnValue(true);
    const genericSpawn = vi.spyOn(enemyApi, "spawnBossSummonEnemy").mockReturnValue(false);
    const explicitSpawn = vi.spyOn(enemyApi, "spawnEnemyById").mockReturnValue(false);
    const baseBoss = readyDeadBell(false, PHASE_THREE);

    nextCasts(baseBoss, PHASE_THREE_CAST_COUNT);
    expect(genericSpawn).toHaveBeenCalledTimes(2);

    const awakenedBoss = readyDeadBell(true, PHASE_THREE);
    nextCasts(awakenedBoss, PHASE_FOUR_CAST_COUNT);
    expect(explicitSpawn).toHaveBeenCalledOnce();
    expect(explicitSpawn).toHaveBeenLastCalledWith(
      "binder",
      "boss",
      "random_edge",
      { growthStage: "awakened" },
    );
    expect(genericSpawn)
      .toHaveBeenCalledTimes(GENERIC_SUPPORT_CALLS_AFTER_AWAKENED_CYCLE);

    awakenedBoss.phase = PHASE_FOUR;
    nextCasts(awakenedBoss, 2);
    expect(explicitSpawn).toHaveBeenCalledTimes(2);
    expect(explicitSpawn).toHaveBeenLastCalledWith(
      "warden",
      "boss",
      "random_edge",
      { growthStage: "awakened" },
    );
  });

  it("cues a support summon only when the boss budget accepts it", () => {
    vi.spyOn(debugApi, "canAutoSpawnEntities").mockReturnValue(true);
    vi.spyOn(enemyApi, "spawnBossSummonEnemy").mockReturnValue(true);
    vi.mocked(playSfx).mockClear();
    const boss = readyDeadBell(false, PHASE_THREE);

    updateDeadBellBoss(boss);

    expect(playSfx).toHaveBeenCalledWith("bossSummon");
  });
});

describe("dead bell boss warnings", () => {
  afterEach(() => {
    DEAD_BELL_BLADE_SHEET.image = originalBladeImage;
    DEAD_BELL_WAVE_SHEET.image = originalWaveImage;
    setCanvas(null);
    vi.mocked(playSfx).mockClear();
  });

  it("allows offense begun during warning and cues the earned counter window once", () => {
    const boss = duetAtRecoveryStart();
    const hpBeforeWarning = state.player.hp;
    expect(vi.mocked(playSfx).mock.calls.filter(([id]) => id === "bossDeadBellSilence"))
      .toHaveLength(1);
    vi.mocked(playSfx).mockClear();

    state.player.offenseActionSequence += 1;
    advanceBossFrames(DEAD_BELL_CONFIG.reprisalWarningFrames);

    expect(playSfx).not.toHaveBeenCalledWith("bossDeadBellReprisal");

    updateBoss();
    expect(vi.mocked(playSfx).mock.calls.filter(([id]) => id === "bossDeadBellReprisal"))
      .toHaveLength(1);
    advanceBossFrames(DEAD_BELL_CONFIG.reprisalActiveFrames - 1);

    expect(state.player.hp).toBe(hpBeforeWarning);
    expect(boss.deadBellReprisalHit).toBe(false);
    expect(boss.deadBellReprisalTimer).toBe(0);
    expect(playSfx).toHaveBeenCalledWith("bossDeadBellBreak");
    expect(vi.mocked(playSfx).mock.calls.filter(([id]) => id === "bossDeadBellBreak"))
      .toHaveLength(1);
  });

  it("punishes an offense sequence begun during active even after its runtime timer clears", () => {
    const boss = duetAtRecoveryStart();
    vi.mocked(playSfx).mockClear();
    advanceBossFrames(DEAD_BELL_CONFIG.reprisalWarningFrames);
    const hpBeforeActive = state.player.hp;

    state.player.offenseActionSequence += 1;
    state.player.ultimateCastTimer = 0;
    state.player.invincible = 2;
    updateBoss();

    expect(state.player.hp).toBe(hpBeforeActive);
    expect(boss.deadBellReprisalHit).toBe(false);
    expect(vi.mocked(playSfx).mock.calls.filter(([id]) => id === "bossDeadBellReprisal"))
      .toHaveLength(1);

    state.player.invincible = 0;
    updateBoss();

    expect(state.player.hp).toBeLessThan(hpBeforeActive);
    expect(boss.deadBellReprisalHit).toBe(true);
    expect(boss.recoveryTimer).toBe(DEAD_BELL_CONFIG.counterFrames);
    expect(vi.mocked(playSfx).mock.calls.filter(([id]) => id === "bossDeadBellReprisal"))
      .toHaveLength(1);
  });

  it("holds the last active beat until an invincible offense can be punished", () => {
    const boss = duetAtRecoveryStart();
    advanceBossFrames(
      DEAD_BELL_CONFIG.reprisalWarningFrames
        + DEAD_BELL_CONFIG.reprisalActiveFrames
        - 1,
    );
    boss.deadBellReprisalTimer = 1;
    boss.recoveryTimer = DEAD_BELL_CONFIG.counterFrames + 1;
    state.player.offenseActionSequence += 1;
    state.player.invincible = 2;
    const hpBeforeOffense = state.player.hp;
    vi.mocked(playSfx).mockClear();

    updateBoss();

    expect(state.player.hp).toBe(hpBeforeOffense);
    expect(boss.deadBellReprisalTimer).toBe(1);
    expect(boss.recoveryTimer).toBe(DEAD_BELL_CONFIG.counterFrames + 1);
    expect(playSfx).not.toHaveBeenCalledWith("bossDeadBellBreak");

    state.player.invincible = 0;
    updateBoss();

    expect(state.player.hp).toBeLessThan(hpBeforeOffense);
    expect(boss.deadBellReprisalHit).toBe(true);
    expect(boss.recoveryTimer).toBe(DEAD_BELL_CONFIG.counterFrames);
  });

  it("replays the reprisal cue when a new offense begins after the active boundary", () => {
    duetAtRecoveryStart();
    vi.mocked(playSfx).mockClear();
    advanceBossFrames(DEAD_BELL_CONFIG.reprisalWarningFrames);
    updateBoss();
    const hpBeforeOffense = state.player.hp;

    state.player.offenseActionSequence += 1;
    updateBoss();

    expect(state.player.hp).toBeLessThan(hpBeforeOffense);
    expect(vi.mocked(playSfx).mock.calls.filter(([id]) => id === "bossDeadBellReprisal"))
      .toHaveLength(2);
  });

  it("uses the complete warning-active-counter recovery and disables contact damage", () => {
    const boss = readyDeadBell(true, PHASE_FOUR);
    boss.actionState = "cast";
    boss.skillMode = "deadBellDuet";
    boss.castTimer = 1;
    boss.skillEffectSpawned = true;
    state.player.x = boss.x;
    state.player.y = boss.y;
    const hpBeforeRecovery = state.player.hp;

    updateBoss();

    expect(boss.recoveryTimer).toBe(
      DEAD_BELL_CONFIG.reprisalWarningFrames
        + DEAD_BELL_CONFIG.reprisalActiveFrames
        + DEAD_BELL_CONFIG.counterFrames,
    );
    expect(state.player.hp).toBe(hpBeforeRecovery);

    updateBoss();

    expect(state.player.hp).toBe(hpBeforeRecovery);
  });

  it.each([-1, 1] as const)(
    "keeps a facing-%s blade lane harmless and stationary through its sprite warning",
    (facing) => {
      resetState();
      const context = createContext();
      const bladeImage = {} as HTMLImageElement;
      setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
      DEAD_BELL_BLADE_SHEET.image = bladeImage;
      const boss = createBossEncounter({
        id: BOSS_ARCHETYPE_IDS.deadBell,
        bossKills: 0,
        elapsedSeconds: 0,
        animSeed: 0,
      });
      boss.entering = false;
      boss.x = 400;
      boss.y = GROUND_Y - boss.h;
      boss.castFacing = facing;

      spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, LONG_BLADE_ACTIVATION_DELAY);
      const blade = state.deadBellBlades[0];
      const startX = blade.x;
      state.player.x = blade.x;
      state.player.y = blade.y;
      const hpBeforeWarning = state.player.hp;
      drawDeadBellEffects();

      expect(blade.warningFrames).toBe(DEAD_BELL_CONFIG.bladeWarningFrames);
      expect(context.drawImage).not.toHaveBeenCalled();

      const hiddenDelay = LONG_BLADE_ACTIVATION_DELAY - blade.warningFrames;
      for (let frame = 0; frame < hiddenDelay; frame += 1) {
        updateDeadBellEffects();
      }
      drawDeadBellEffects();

      expect(context.drawImage).toHaveBeenCalledOnce();
      expect(context.drawImage.mock.calls[0][0]).toBe(bladeImage);
      expect(context.drawImage.mock.calls[0][1]).toBe(0);
      expect(context.translate).toHaveBeenCalledWith(
        blade.x + blade.w / 2,
        blade.y + blade.h / 2,
      );
      expect(context.scale).toHaveBeenCalledWith(facing, 1);

      const halfwayUpdateCount = blade.warningFrames / 2 + 1;
      for (let frame = 0; frame < halfwayUpdateCount; frame += 1) {
        updateDeadBellEffects();
      }
      context.drawImage.mockClear();
      drawDeadBellEffects();

      expect(context.drawImage.mock.calls[0][1]).toBe(DEAD_BELL_BLADE_SHEET.frameW);
      for (
        let frame = halfwayUpdateCount;
        frame < blade.warningFrames;
        frame += 1
      ) {
        updateDeadBellEffects();
      }

      expect(blade.delay).toBe(0);
      expect(blade.x).toBe(startX);
      expect(state.player.hp).toBe(hpBeforeWarning);
      expect(state.deadBellBlades).toContain(blade);

      updateDeadBellEffects();

      expect(blade.x).toBe(startX + blade.vx);
      expect(state.player.hp).toBeLessThan(hpBeforeWarning);
      expect(state.deadBellBlades).not.toContain(blade);
    },
  );

  it("plays wave-tone and blade cues only on their delayed activation edge", () => {
    const boss = readyDeadBell(false, 1);
    state.player.x = 10_000;
    spawnDeadBellWave(boss, 2, DEAD_BELL_CONFIG.waveMaxRadius);
    spawnDeadBellWave(boss, 2, DEAD_BELL_CONFIG.waveMaxRadius, "high");
    spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, 2);
    const blade = state.deadBellBlades[0];
    vi.mocked(playSfx).mockClear();

    updateDeadBellEffects();
    updateDeadBellEffects();
    expect(playSfx).not.toHaveBeenCalled();

    updateDeadBellEffects();
    expect(playSfx).toHaveBeenCalledWith("bossDeadBellLowToll");
    expect(playSfx).toHaveBeenCalledWith("bossDeadBellHighToll");
    expect(playSfx).not.toHaveBeenCalledWith("bossDeadBellBlade");

    while (blade.delay > 0) updateDeadBellEffects();
    updateDeadBellEffects();
    expect(playSfx).toHaveBeenCalledWith("bossDeadBellBlade");

    updateDeadBellEffects();
    expect(vi.mocked(playSfx).mock.calls.filter(([id]) => id === "bossDeadBellLowToll"))
      .toHaveLength(1);
    expect(vi.mocked(playSfx).mock.calls.filter(([id]) => id === "bossDeadBellHighToll"))
      .toHaveLength(1);
    expect(vi.mocked(playSfx).mock.calls.filter(([id]) => id === "bossDeadBellBlade"))
      .toHaveLength(1);
  });

  it("keeps flight on visible frames before a harmless twelve-frame dissipation", () => {
    const boss = readyDeadBell(false, 1);
    state.player.x = 10_000;
    spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, 2);
    const blade = state.deadBellBlades[0];
    blade.life = 14;
    const startX = blade.x;

    for (let frame = 0; frame < blade.warningFrames; frame += 1) {
      updateDeadBellEffects();
    }
    expect(blade.x).toBe(startX);
    expect(blade.frame).toBe(1);

    updateDeadBellEffects();
    expect(blade.x).toBe(startX + blade.vx);
    expect(blade.frame).toBe(2);

    updateDeadBellEffects();
    const dissipateX = blade.x;
    expect(blade.life).toBe(BLADE_DISSIPATE_FRAMES);
    expect(blade.frame).toBe(BLADE_DISSIPATE_FIRST_FRAME);

    for (let frame = 0; frame < BLADE_DISSIPATE_HALF_FRAMES; frame += 1) {
      updateDeadBellEffects();
    }
    expect(blade.x).toBe(dissipateX);
    expect(blade.frame).toBe(BLADE_DISSIPATE_SECOND_FRAME);
  });

  it("compensates each wave frame so warning and active art match the circular ring", () => {
    resetState();
    const drawnFilters: string[] = [];
    const context = createContext();
    context.drawImage.mockImplementation(() => drawnFilters.push(context.filter));
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    DEAD_BELL_WAVE_SHEET.image = {} as HTMLImageElement;
    state.deadBellWaves.push({
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
      tone: "low",
      awakened: false,
      damage: 1,
      hitPlayer: false,
    });

    drawDeadBellEffects();
    const warningSize = deadBellWaveDrawSize(0, DEAD_BELL_CONFIG.waveStartRadius);
    const warningDiameter = DEAD_BELL_CONFIG.waveStartRadius * 2;
    expect(warningSize.w * WARNING_VISIBLE_BOUNDS.w / DEAD_BELL_WAVE_SHEET.frameW)
      .toBeCloseTo(warningDiameter);
    expect(warningSize.h * WARNING_VISIBLE_BOUNDS.h / DEAD_BELL_WAVE_SHEET.frameH)
      .toBeCloseTo(warningDiameter);
    expect(context.drawImage.mock.calls[0][7]).toBeCloseTo(warningSize.w);
    expect(context.drawImage.mock.calls[0][8]).toBeCloseTo(warningSize.h);

    context.drawImage.mockClear();
    context.filter = "none";
    state.deadBellWaves[0].awakened = true;
    drawDeadBellEffects();
    expect(drawnFilters[drawnFilters.length - 1]).toContain("drop-shadow");
    expect(drawnFilters[drawnFilters.length - 1]).not.toContain("sepia");

    context.drawImage.mockClear();
    context.filter = "none";
    state.deadBellWaves[0].elapsed = DEAD_BELL_CONFIG.waveWarningFrames + 1;
    state.deadBellWaves[0].frame = DEAD_BELL_WAVE_SHEET.count - 1;
    state.deadBellWaves[0].radius = ACTIVE_WAVE_RADIUS;
    state.deadBellWaves[0].tone = "high";
    drawDeadBellEffects();

    const activeSize = deadBellWaveDrawSize(
      DEAD_BELL_WAVE_SHEET.count - 1,
      ACTIVE_WAVE_RADIUS,
    );
    const activeDiameter = ACTIVE_WAVE_RADIUS * 2;
    expect(activeSize.w * ACTIVE_VISIBLE_BOUNDS.w / DEAD_BELL_WAVE_SHEET.frameW)
      .toBeCloseTo(activeDiameter);
    expect(activeSize.h * ACTIVE_VISIBLE_BOUNDS.h / DEAD_BELL_WAVE_SHEET.frameH)
      .toBeCloseTo(activeDiameter);
    expect(context.drawImage.mock.calls[0][7]).toBeCloseTo(activeSize.w);
    expect(context.drawImage.mock.calls[0][8]).toBeCloseTo(activeSize.h);
    expect(drawnFilters[drawnFilters.length - 1]).toContain("sepia");
  });
});

function advanceBossFrames(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) updateBoss();
}

function duetAtRecoveryStart() {
  const boss = readyDeadBell(true, PHASE_FOUR);
  boss.x = WIDTH - boss.w;
  boss.actionState = "cast";
  boss.skillMode = "deadBellDuet";
  boss.castTimer = 1;
  boss.skillEffectSpawned = true;
  state.player.x = 0;
  state.player.invincible = 0;

  updateBoss();
  return boss;
}

function readyDeadBell(awakened: boolean, phase: number) {
  resetState();
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.deadBell,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
    awakened,
  });
  boss.entering = false;
  boss.x = 180;
  boss.y = GROUND_Y - boss.h;
  boss.phase = phase;
  boss.aiTimer = 0;
  boss.skillCd = 0;
  state.player.x = 540;
  state.player.y = GROUND_Y - state.player.h;
  state.boss = boss;
  return boss;
}

function nextCasts(boss: ReturnType<typeof readyDeadBell>, count: number) {
  const modes = [];
  for (let index = 0; index < count; index += 1) {
    boss.castTimer = 0;
    boss.recoveryTimer = 0;
    boss.skillCd = 0;
    updateDeadBellBoss(boss);
    modes.push(boss.skillMode);
  }
  return modes;
}

function advanceUntilPatternSpawns(boss: ReturnType<typeof readyDeadBell>) {
  while (!boss.skillEffectSpawned) updateDeadBellBoss(boss);
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
    scale: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
  };
}
