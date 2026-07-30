import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BLOOD_MOON_CONFIG,
  DEAD_BELL_CONFIG,
  FANG_GALE_CONFIG,
  GROUND_Y,
  MIST_BONE_CONFIG,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { createBossEncounter } from "./encounter";
import { updateMirrorDreamBoss } from "./mirrorDreamBehavior";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { bossCastDuration } from "./attackTiming";
import {
  drawBossAttackTelegraphs,
  resolveBossAttackTelegraphs,
} from "./attackTelegraphs";
import type { LiveBoss } from "./types";
import type { BossArchetypeId, BossSkillMode } from "../../types/game-state";

const PHASE_ONE_RUSH_REACTION_FRAMES = 24;
const PHASE_TWO_RUSH_REACTION_FRAMES = 22;
const PHASE_THREE_RUSH_REACTION_FRAMES = 20;
const PHASE_FOUR_RUSH_REACTION_FRAMES = 18;
const SPIDER_RUSH_REACTION_FRAMES_BY_PHASE = [
  PHASE_ONE_RUSH_REACTION_FRAMES,
  PHASE_TWO_RUSH_REACTION_FRAMES,
  PHASE_THREE_RUSH_REACTION_FRAMES,
  PHASE_FOUR_RUSH_REACTION_FRAMES,
] as const;
const MIRROR_AFTERIMAGE_ROLL = 0.5;
const PLAYER_REPOSITION_DISTANCE = 500;
const RECOVERY_TIMER_FRAMES = 20;
const BAR_MIN_WIDTH = 30;
const BAR_MAX_HEIGHT = 8;
const CAST_CASES: readonly {
  id: BossArchetypeId;
  modes: readonly BossSkillMode[];
}[] = [
  {
    id: BOSS_ARCHETYPE_IDS.spiderString,
    modes: ["spiderString", "spiderStringCage"],
  },
  {
    id: BOSS_ARCHETYPE_IDS.mistBone,
    modes: ["mistBoneSpike", "mistBoneLine", "mistBoneCage"],
  },
  {
    id: BOSS_ARCHETYPE_IDS.mirrorDream,
    modes: ["mirrorShard", "mirrorAfterimage", "mirrorNightmare", "mirrorTrueImageShift"],
  },
  {
    id: BOSS_ARCHETYPE_IDS.fangGale,
    modes: ["fangGaleDash", "fangGaleWave", "fangGaleStorm"],
  },
  {
    id: BOSS_ARCHETYPE_IDS.lanternEmber,
    modes: ["lanternLure", "lanternFireline", "lanternBuff", "lanternAwakenedGrid"],
  },
  {
    id: BOSS_ARCHETYPE_IDS.deadBell,
    modes: ["deadBellSingle", "deadBellDouble", "deadBellCombo", "deadBellDuet"],
  },
  {
    id: BOSS_ARCHETYPE_IDS.bloodMoon,
    modes: [
      "bloodMoonSpiderMist",
      "bloodMoonMirrorFang",
      "bloodMoonLanternBell",
      "bloodMoonSixfold",
      "bloodMoonManyFaces",
    ],
  },
];

describe("boss attack telegraph timing", () => {
  it("gives early Spider String phases more rush reaction time without dropping below 18 frames", () => {
    const reactionFrames = SPIDER_RUSH_REACTION_FRAMES_BY_PHASE.map((expected, index) => {
      const boss = readyBoss(BOSS_ARCHETYPE_IDS.spiderString);
      boss.phase = index + 1;
      boss.actionState = "windup";
      boss.actionTimer = 0;

      const [cue] = resolveBossAttackTelegraphs(boss);

      expect(cue).toMatchObject({
        attackId: "spiderRush",
        pattern: "directional",
        severity: "quick",
        reactionFrames: expected,
        remainingFrames: expected,
      });
      return cue?.reactionFrames;
    });

    expect(reactionFrames).toEqual([...SPIDER_RUSH_REACTION_FRAMES_BY_PHASE]);
  });

  it("uses each attack's real release boundary instead of a universal warning duration", () => {
    const mistBone = readyBoss(BOSS_ARCHETYPE_IDS.mistBone);
    mistBone.actionState = "attack";
    mistBone.actionTimer = MIST_BONE_CONFIG.attackReleaseFrame / 2;
    mistBone.castFacing = 1;

    const [dartCue] = resolveBossAttackTelegraphs(mistBone);
    expect(dartCue).toMatchObject({
      attackId: "mistBoneDart",
      reactionFrames: MIST_BONE_CONFIG.attackReleaseFrame,
      remainingFrames: MIST_BONE_CONFIG.attackReleaseFrame / 2,
      progress: 0.5,
    });

    const bloodMoon = readyBoss(BOSS_ARCHETYPE_IDS.bloodMoon);
    bloodMoon.actionState = "cast";
    bloodMoon.skillMode = "bloodMoonManyFaces";
    bloodMoon.castTimer = BLOOD_MOON_CONFIG.finalCastDuration
      - BLOOD_MOON_CONFIG.finalSpawnAtFrame / 2;

    const [ultimateCue] = resolveBossAttackTelegraphs(bloodMoon);
    expect(ultimateCue).toMatchObject({
      attackId: "bloodMoonManyFaces",
      severity: "ultimate",
      reactionFrames: BLOOD_MOON_CONFIG.finalSpawnAtFrame,
      remainingFrames: BLOOD_MOON_CONFIG.finalSpawnAtFrame / 2,
      progress: 0.5,
    });
  });

  it("restarts the Mist Bone tell before every dart in a higher-phase volley", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.mistBone);
    boss.phase = 3;
    boss.actionState = "attack";
    boss.castFacing = 1;
    boss.comboStep = 1;
    boss.actionTimer = MIST_BONE_CONFIG.attackReleaseFrame;

    const [secondDartCue] = resolveBossAttackTelegraphs(boss);
    expect(secondDartCue).toMatchObject({
      attackId: "mistBoneDart",
      reactionFrames: MIST_BONE_CONFIG.attackShotInterval,
      remainingFrames: MIST_BONE_CONFIG.attackShotInterval,
      progress: 0,
    });

    boss.comboStep = 2;
    boss.actionTimer = MIST_BONE_CONFIG.attackReleaseFrame
      + MIST_BONE_CONFIG.attackShotInterval;
    const [thirdDartCue] = resolveBossAttackTelegraphs(boss);
    expect(thirdDartCue).toMatchObject({
      reactionFrames: MIST_BONE_CONFIG.attackShotInterval,
      remainingFrames: MIST_BONE_CONFIG.attackShotInterval,
      progress: 0,
    });
  });

  it("provides a visible source tell for every registered boss cast mode", () => {
    for (const castCase of CAST_CASES) {
      for (const skillMode of castCase.modes) {
        const boss = readyBoss(castCase.id);
        boss.actionState = "cast";
        boss.skillMode = skillMode;
        boss.castTimer = bossCastDuration(boss);

        const [cue] = resolveBossAttackTelegraphs(boss);

        expect(cue?.attackId).toBe(skillMode);
        expect(cue?.reactionFrames).toBeGreaterThan(0);
        expect(cue?.remainingFrames).toBe(cue?.reactionFrames);
        expect(cue?.progress).toBe(0);
      }
    }
  });

  it("keeps Fang Gale chain tells phase-sensitive and locked to the chosen direction", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.fangGale);
    boss.phase = 2;
    boss.actionState = "windup";
    boss.skillMode = "fangGaleStorm";
    boss.castFacing = -1;
    boss.facing = -1;
    boss.castTimer = 11;

    state.player.x = boss.x + PLAYER_REPOSITION_DISTANCE;
    const [cue] = resolveBossAttackTelegraphs(boss);

    expect(cue).toMatchObject({
      attackId: "fangGaleChain",
      pattern: "directional",
      facing: -1,
      reactionFrames: 22,
      remainingFrames: 11,
      progress: 0.5,
    });
  });

  it("hands Fang Gale's warning from wave release to a separate dash tell", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.fangGale);
    boss.actionState = "cast";
    boss.skillMode = "fangGaleWave";
    boss.castTimer = FANG_GALE_CONFIG.castDuration - FANG_GALE_CONFIG.spawnAtFrame;
    boss.skillEffectSpawned = false;

    const [waveCue] = resolveBossAttackTelegraphs(boss);
    expect(waveCue).toMatchObject({
      attackId: "fangGaleWave",
      reactionFrames: FANG_GALE_CONFIG.spawnAtFrame,
      remainingFrames: 0,
      progress: 1,
    });

    boss.skillEffectSpawned = true;
    boss.castTimer = FANG_GALE_CONFIG.castDuration
      - FANG_GALE_CONFIG.spawnAtFrame
      - 1;
    const [dashCue] = resolveBossAttackTelegraphs(boss);
    expect(dashCue).toMatchObject({
      attackId: "fangGaleFollowupDash",
      reactionFrames: boss.castTimer,
      remainingFrames: boss.castTimer,
      progress: 0,
    });
  });

  it("shows Dead Bell's reprisal warning only before its counter becomes active", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.deadBell);
    boss.actionState = "recover";
    boss.skillMode = "deadBellDuet";
    boss.deadBellReprisalTimer = DEAD_BELL_CONFIG.reprisalWarningFrames
      + DEAD_BELL_CONFIG.reprisalActiveFrames;

    const [warningCue] = resolveBossAttackTelegraphs(boss);
    expect(warningCue).toMatchObject({
      attackId: "deadBellReprisal",
      severity: "counter",
      reactionFrames: DEAD_BELL_CONFIG.reprisalWarningFrames,
      remainingFrames: DEAD_BELL_CONFIG.reprisalWarningFrames,
      progress: 0,
    });

    boss.deadBellReprisalTimer = DEAD_BELL_CONFIG.reprisalActiveFrames;
    expect(resolveBossAttackTelegraphs(boss)).toEqual([]);
  });

  it("does not show attack cues while moving, recovering, dashing, or changing phase", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.bloodMoon);

    for (const actionState of ["move", "recover", "dash"] as const) {
      boss.actionState = actionState;
      boss.castTimer = 0;
      boss.recoveryTimer = actionState === "recover" ? RECOVERY_TIMER_FRAMES : 0;
      expect(resolveBossAttackTelegraphs(boss)).toEqual([]);
    }

    boss.actionState = "windup";
    boss.phaseShiftTimer = BLOOD_MOON_CONFIG.phaseShiftFrames;
    expect(resolveBossAttackTelegraphs(boss)).toEqual([]);
  });

  it("locks Mirror Dream's teleport landing marker when the cast starts", () => {
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.mirrorDream);
    boss.skillCd = 0;
    state.player.x = 540;
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(MIRROR_AFTERIMAGE_ROLL);

    try {
      updateMirrorDreamBoss(boss);
      const firstTeleportCue = resolveBossAttackTelegraphs(boss).find(
        (cue) => cue.pattern === "teleport",
      );
      state.player.x = 80;
      const movedPlayerCue = resolveBossAttackTelegraphs(boss).find(
        (cue) => cue.pattern === "teleport",
      );

      expect(boss.skillMode).toBe("mirrorAfterimage");
      expect(firstTeleportCue?.targetX).toBeTypeOf("number");
      expect(movedPlayerCue?.targetX).toBe(firstTeleportCue?.targetX);
    } finally {
      randomSpy.mockRestore();
    }
  });
});

describe("boss attack telegraph rendering", () => {
  afterEach(() => {
    setCanvas(null);
  });

  it("draws a body charge ring and a directional danger corridor without a progress bar", () => {
    const context = createContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    const boss = readyBoss(BOSS_ARCHETYPE_IDS.spiderString);
    boss.actionState = "windup";
    boss.actionTimer = 12;
    boss.castFacing = 1;
    boss.facing = 1;

    drawBossAttackTelegraphs();

    expect(context.ellipse).toHaveBeenCalled();
    expect(context.arc).toHaveBeenCalled();
    expect(context.fillRect).toHaveBeenCalledWith(
      boss.x + boss.w,
      boss.y,
      expect.any(Number),
      boss.h,
    );
    expect(
      context.fillRect.mock.calls.some(
        ([, , width, height]) => width >= BAR_MIN_WIDTH && height <= BAR_MAX_HEIGHT,
      ),
    ).toBe(false);
  });
});

function readyBoss(id: Parameters<typeof createBossEncounter>[0]["id"]): LiveBoss {
  resetState();
  const boss = createBossEncounter({
    id,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
  });
  boss.entering = false;
  boss.x = 240;
  boss.y = GROUND_Y - boss.h;
  state.boss = boss;
  return boss;
}

function createContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    fillStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "",
  } as unknown as CanvasRenderingContext2D & {
    arc: ReturnType<typeof vi.fn>;
    ellipse: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
  };
}
