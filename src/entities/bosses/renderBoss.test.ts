import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BLOOD_MOON_LANTERN_BELL_CAST_SHEET,
  BLOOD_MOON_MANY_FACES_CAST_SHEET,
  BLOOD_MOON_MIRROR_FANG_CAST_SHEET,
  BLOOD_MOON_SIXFOLD_CAST_SHEET,
  BLOOD_MOON_SPIDER_MIST_CAST_SHEET,
  BOSS_SKILL1_SHEET,
  DEAD_BELL_CAST_SHEET,
  DEAD_BELL_CONFIG,
  FANG_GALE_WINDUP_SHEET,
  FANG_GALE_CONFIG,
  FANG_GALE_FINAL_BITE_SHEET,
  FANG_GALE_RECOVER_SHEET,
  FANG_GALE_RETREAT_SHEET,
  FANG_GALE_TURN_SHEET,
  GROUND_Y,
  LANTERN_EMBER_FIRELINE_CAST_SHEET,
  LANTERN_EMBER_BUFF_CAST_SHEET,
  LANTERN_EMBER_SUMMON_SHEET,
  MIRROR_DREAM_SHEET,
  MIRROR_DREAM_AWAKENED_CRACKS_SHEET,
  MIRROR_DREAM_CAST_SHEET,
  MIRROR_DREAM_CAST_AWAKENED_CRACKS_SHEET,
  MIRROR_DREAM_CONFIG,
  MIRROR_DREAM_RECOVER_AWAKENED_CRACKS_SHEET,
  MIRROR_DREAM_RECOVER_SHEET,
  MIST_BONE_SHEET,
  MIST_BONE_ATTACK_SHEET,
  MIST_BONE_CAGE_CAST_SHEET,
  MIST_BONE_CAST_SHEET,
  MIST_BONE_CONFIG,
  MIST_BONE_LINE_CAST_SHEET,
  SPIDER_STRING_ATTACK_CONFIG,
  SPIDER_STRING_ATTACK_SHEET,
  SPIDER_STRING_PILLAR_CAST_SHEET,
  SPIDER_STRING_PILLAR_CONFIG,
  SPIDER_STRING_ULTIMATE_CAST_SHEET,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { SpriteSheet } from "../../types/assets";
import type { BossArchetypeId, BossSkillMode } from "../../types/game-state";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import {
  bossCastDuration,
  fangChainWindupFrames,
  spiderRushWindupFrames,
} from "./attackTiming";
import { drawBoss, resolveBossVisualFrame } from "./renderBoss";

const originalFirelineCastImage = LANTERN_EMBER_FIRELINE_CAST_SHEET.image;
const originalSummonImage = LANTERN_EMBER_SUMMON_SHEET.image;
const originalMistBoneImage = MIST_BONE_SHEET.image;
const originalMirrorDreamImage = MIRROR_DREAM_SHEET.image;
const originalMirrorDreamCastImage = MIRROR_DREAM_CAST_SHEET.image;
const originalMirrorDreamRecoverImage = MIRROR_DREAM_RECOVER_SHEET.image;
const originalMirrorDreamAwakenedCracksImage = MIRROR_DREAM_AWAKENED_CRACKS_SHEET.image;
const originalMirrorDreamCastAwakenedCracksImage = (
  MIRROR_DREAM_CAST_AWAKENED_CRACKS_SHEET.image
);
const originalMirrorDreamRecoverAwakenedCracksImage = (
  MIRROR_DREAM_RECOVER_AWAKENED_CRACKS_SHEET.image
);
const AWAKENED_FINAL_PHASE = 4;
const MIRROR_DREAM_DASH_POSE_FRAME = 1;
const CAST_CASES = [
  {
    id: BOSS_ARCHETYPE_IDS.spiderString,
    modes: [
      ["spiderString", BOSS_SKILL1_SHEET],
      ["spiderStringPillars", SPIDER_STRING_PILLAR_CAST_SHEET],
      ["spiderStringCage", SPIDER_STRING_ULTIMATE_CAST_SHEET],
    ],
  },
  {
    id: BOSS_ARCHETYPE_IDS.mistBone,
    modes: [
      ["mistBoneSpike", MIST_BONE_CAST_SHEET],
      ["mistBoneLine", MIST_BONE_LINE_CAST_SHEET],
      ["mistBoneCage", MIST_BONE_CAGE_CAST_SHEET],
    ],
  },
  {
    id: BOSS_ARCHETYPE_IDS.mirrorDream,
    modes: [
      ["mirrorShard", MIRROR_DREAM_CAST_SHEET],
      ["mirrorAfterimage", MIRROR_DREAM_CAST_SHEET],
      ["mirrorNightmare", MIRROR_DREAM_CAST_SHEET],
      ["mirrorTrueImageShift", MIRROR_DREAM_CAST_SHEET],
    ],
  },
  {
    id: BOSS_ARCHETYPE_IDS.fangGale,
    modes: [
      ["fangGaleDash", FANG_GALE_WINDUP_SHEET],
      ["fangGaleWave", FANG_GALE_WINDUP_SHEET],
      ["fangGaleStorm", FANG_GALE_WINDUP_SHEET],
    ],
  },
  {
    id: BOSS_ARCHETYPE_IDS.lanternEmber,
    modes: [
      ["lanternLure", LANTERN_EMBER_SUMMON_SHEET],
      ["lanternFireline", LANTERN_EMBER_FIRELINE_CAST_SHEET],
      ["lanternBuff", LANTERN_EMBER_BUFF_CAST_SHEET],
      ["lanternAwakenedGrid", LANTERN_EMBER_FIRELINE_CAST_SHEET],
    ],
  },
  {
    id: BOSS_ARCHETYPE_IDS.deadBell,
    modes: [
      ["deadBellSingle", DEAD_BELL_CAST_SHEET],
      ["deadBellDouble", DEAD_BELL_CAST_SHEET],
      ["deadBellCombo", DEAD_BELL_CAST_SHEET],
      ["deadBellDuet", DEAD_BELL_CAST_SHEET],
    ],
  },
  {
    id: BOSS_ARCHETYPE_IDS.bloodMoon,
    modes: [
      ["bloodMoonSpiderMist", BLOOD_MOON_SPIDER_MIST_CAST_SHEET],
      ["bloodMoonMirrorFang", BLOOD_MOON_MIRROR_FANG_CAST_SHEET],
      ["bloodMoonLanternBell", BLOOD_MOON_LANTERN_BELL_CAST_SHEET],
      ["bloodMoonSixfold", BLOOD_MOON_SIXFOLD_CAST_SHEET],
      ["bloodMoonManyFaces", BLOOD_MOON_MANY_FACES_CAST_SHEET],
    ],
  },
] as const satisfies readonly {
  id: BossArchetypeId;
  modes: readonly (readonly [BossSkillMode, SpriteSheet])[];
}[];
type CoveredBossSkillMode = (typeof CAST_CASES)[number]["modes"][number][0];
type MissingBossSkillMode = Exclude<BossSkillMode, CoveredBossSkillMode>;
const _allBossSkillModesCovered: MissingBossSkillMode extends never ? true : never = true;

describe("boss casting visuals", () => {
  afterEach(() => {
    setCanvas(null);
    LANTERN_EMBER_FIRELINE_CAST_SHEET.image = originalFirelineCastImage;
    LANTERN_EMBER_SUMMON_SHEET.image = originalSummonImage;
    MIST_BONE_SHEET.image = originalMistBoneImage;
    MIRROR_DREAM_SHEET.image = originalMirrorDreamImage;
    MIRROR_DREAM_CAST_SHEET.image = originalMirrorDreamCastImage;
    MIRROR_DREAM_RECOVER_SHEET.image = originalMirrorDreamRecoverImage;
    MIRROR_DREAM_AWAKENED_CRACKS_SHEET.image = originalMirrorDreamAwakenedCracksImage;
    MIRROR_DREAM_CAST_AWAKENED_CRACKS_SHEET.image = (
      originalMirrorDreamCastAwakenedCracksImage
    );
    MIRROR_DREAM_RECOVER_AWAKENED_CRACKS_SHEET.image = (
      originalMirrorDreamRecoverAwakenedCracksImage
    );
  });

  it("uses the fireline cast pose for Lantern Ember's awakened grid", () => {
    resetState();
    const context = createContext();
    const firelineCastImage = {} as HTMLImageElement;
    const summonImage = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    LANTERN_EMBER_FIRELINE_CAST_SHEET.image = firelineCastImage;
    LANTERN_EMBER_SUMMON_SHEET.image = summonImage;

    state.boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.lanternEmber,
      bossKills: 0,
      elapsedSeconds: 0,
      awakened: true,
    });
    state.boss.entering = false;
    state.boss.y = GROUND_Y - state.boss.h;
    state.boss.castTimer = 1;
    state.boss.skillMode = "lanternAwakenedGrid";

    drawBoss();

    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage.mock.calls[0][0]).toBe(firelineCastImage);
  });

  it("uses the dedicated melee sequence for Spider String's post-rush attack", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
    });
    boss.entering = false;
    boss.actionState = "attack";
    boss.actionTimer = SPIDER_STRING_ATTACK_CONFIG.hitStartFrame;

    const pose = resolveBossVisualFrame(boss, 0);

    expect(pose).toMatchObject({
      sheet: SPIDER_STRING_ATTACK_SHEET,
      frame: 3,
      w: SPIDER_STRING_ATTACK_CONFIG.drawW,
      h: SPIDER_STRING_ATTACK_CONFIG.drawH,
    });
  });

  it("wraps awakened Mist Bone in dense fog and a cold bone glow", () => {
    resetState();
    const context = createContext();
    const drawnFilters: string[] = [];
    context.drawImage.mockImplementation(() => drawnFilters.push(context.filter));
    MIST_BONE_SHEET.image = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    state.boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.mistBone,
      bossKills: 0,
      elapsedSeconds: 0,
      awakened: true,
    });
    state.boss.entering = false;
    state.boss.y = GROUND_Y - state.boss.h;

    drawBoss();

    expect(context.ellipse).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();
    expect(drawnFilters).toContainEqual(expect.stringContaining("drop-shadow"));
  });

  it("keeps awakened Mirror Dream's true body outlined across movement and casting", () => {
    resetState();
    const context = createContext();
    const drawnFilters: string[] = [];
    context.drawImage.mockImplementation(() => drawnFilters.push(context.filter));
    MIRROR_DREAM_SHEET.image = {} as HTMLImageElement;
    MIRROR_DREAM_CAST_SHEET.image = {} as HTMLImageElement;
    MIRROR_DREAM_AWAKENED_CRACKS_SHEET.image = {} as HTMLImageElement;
    MIRROR_DREAM_CAST_AWAKENED_CRACKS_SHEET.image = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    state.boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.mirrorDream,
      bossKills: 0,
      elapsedSeconds: 0,
      awakened: true,
    });
    state.boss.entering = false;
    state.boss.y = GROUND_Y - state.boss.h;

    drawBoss();
    state.boss.actionState = "cast";
    state.boss.castTimer = 1;
    drawBoss();

    const bodyFilters = [drawnFilters[0], drawnFilters[2]];
    expect(bodyFilters.every((filter) => (
      filter.includes("contrast") && filter.includes("drop-shadow")
    ))).toBe(true);
  });

  it("gives Mirror Dream's dash a fixed pose and animates its safe recovery", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.mirrorDream,
      bossKills: 0,
      elapsedSeconds: 0,
    });
    boss.entering = false;
    boss.actionState = "dash";
    boss.mirrorNightmareDash = {
      stage: "active",
      targetX: boss.x,
      framesRemaining: 1,
    };

    const dashPose = resolveBossVisualFrame(boss, 0);
    boss.actionState = "recover";
    boss.mirrorNightmareDash = { stage: "recover" };
    const recoveryFrames = [
      MIRROR_DREAM_CONFIG.nightmareDashRecoveryFrames,
      Math.floor(MIRROR_DREAM_CONFIG.nightmareDashRecoveryFrames / 2),
      1,
    ].map((recoveryTimer) => {
      boss.recoveryTimer = recoveryTimer;
      return resolveBossVisualFrame(boss, 0);
    });

    expect(dashPose.sheet).toBe(MIRROR_DREAM_SHEET);
    expect(dashPose.frame).toBe(MIRROR_DREAM_DASH_POSE_FRAME);
    expect(recoveryFrames.map((pose) => pose.sheet)).toEqual([
      MIRROR_DREAM_RECOVER_SHEET,
      MIRROR_DREAM_RECOVER_SHEET,
      MIRROR_DREAM_RECOVER_SHEET,
    ]);
    expect(recoveryFrames.map((pose) => pose.frame)).toEqual([0, 1, 2]);
  });

  it("layers frame-matched cracks over every awakened Mirror Dream body pose", () => {
    resetState();
    const context = createContext();
    const bodyImages = {
      move: {} as HTMLImageElement,
      cast: {} as HTMLImageElement,
      recover: {} as HTMLImageElement,
    };
    const crackImages = {
      move: {} as HTMLImageElement,
      cast: {} as HTMLImageElement,
      recover: {} as HTMLImageElement,
    };
    MIRROR_DREAM_SHEET.image = bodyImages.move;
    MIRROR_DREAM_CAST_SHEET.image = bodyImages.cast;
    MIRROR_DREAM_RECOVER_SHEET.image = bodyImages.recover;
    MIRROR_DREAM_AWAKENED_CRACKS_SHEET.image = crackImages.move;
    MIRROR_DREAM_CAST_AWAKENED_CRACKS_SHEET.image = crackImages.cast;
    MIRROR_DREAM_RECOVER_AWAKENED_CRACKS_SHEET.image = crackImages.recover;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);

    const cases = [
      { state: "move", body: bodyImages.move, cracks: crackImages.move },
      { state: "cast", body: bodyImages.cast, cracks: crackImages.cast },
      { state: "dash", body: bodyImages.move, cracks: crackImages.move },
      { state: "recover", body: bodyImages.recover, cracks: crackImages.recover },
    ] as const;

    for (const visualCase of cases) {
      context.drawImage.mockClear();
      state.boss = createBossEncounter({
        id: BOSS_ARCHETYPE_IDS.mirrorDream,
        bossKills: 0,
        elapsedSeconds: 0,
        awakened: true,
      });
      state.boss.entering = false;
      state.boss.y = GROUND_Y - state.boss.h;
      if (visualCase.state === "cast") {
        state.boss.actionState = "cast";
        state.boss.skillMode = "mirrorNightmare";
        state.boss.castTimer = 1;
      } else if (visualCase.state === "dash") {
        state.boss.actionState = "dash";
        state.boss.mirrorNightmareDash = {
          stage: "active",
          targetX: state.boss.x,
          framesRemaining: 1,
        };
      } else if (visualCase.state === "recover") {
        state.boss.actionState = "recover";
        state.boss.mirrorNightmareDash = { stage: "recover" };
        state.boss.recoveryTimer = Math.floor(
          MIRROR_DREAM_CONFIG.nightmareDashRecoveryFrames / 2,
        );
      }

      const pose = resolveBossVisualFrame(state.boss, state.elapsed);
      drawBoss();

      expect(context.drawImage).toHaveBeenCalledTimes(2);
      expect(context.drawImage.mock.calls.map((call) => call[0])).toEqual([
        visualCase.body,
        visualCase.cracks,
      ]);
      expect(context.drawImage.mock.calls[0][1]).toBe(pose.frame * pose.sheet.frameW);
      expect(context.drawImage.mock.calls[1][1]).toBe(
        pose.frame * contextSheetFrameWidth(visualCase.state),
      );
    }
  });

  it("does not draw awakened cracks over Mirror Dream's base form", () => {
    resetState();
    const context = createContext();
    const bodyImage = {} as HTMLImageElement;
    MIRROR_DREAM_SHEET.image = bodyImage;
    MIRROR_DREAM_AWAKENED_CRACKS_SHEET.image = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    state.boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.mirrorDream,
      bossKills: 0,
      elapsedSeconds: 0,
    });
    state.boss.entering = false;
    state.boss.y = GROUND_Y - state.boss.h;

    drawBoss();

    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage.mock.calls[0][0]).toBe(bodyImage);
  });

  it("uses Mist Bone's attack sequence during its phase-three chase", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.mistBone,
      bossKills: 0,
      elapsedSeconds: 0,
    });
    boss.entering = false;
    boss.actionState = "dash";
    boss.skillMode = "mistBoneLine";
    boss.actionTimer = Math.floor(MIST_BONE_CONFIG.chaseFrames / 2);
    boss.castFacing = -1;

    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: MIST_BONE_ATTACK_SHEET,
      facing: -1,
    });
  });

  it("uses the dedicated upward-pull cast sequence for Spider String's pillars", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
    });
    boss.entering = false;
    boss.actionState = "cast";
    boss.skillMode = "spiderStringPillars";
    boss.castTimer = SPIDER_STRING_PILLAR_CONFIG.castDuration;

    const pose = resolveBossVisualFrame(boss, 0);

    expect(pose).toMatchObject({
      sheet: SPIDER_STRING_PILLAR_CAST_SHEET,
      frame: 0,
      w: SPIDER_STRING_PILLAR_CONFIG.castDrawW,
      h: SPIDER_STRING_PILLAR_CONFIG.castDrawH,
    });
  });

  it("uses an action-timed sequence for Spider String's rush windup", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
    });
    boss.entering = false;
    boss.actionState = "windup";
    boss.castFacing = -1;
    const windupFrames = spiderRushWindupFrames(boss.phase);

    const frames = [0, Math.floor(windupFrames / 2), windupFrames - 1].map((actionTimer) => {
      boss.actionTimer = actionTimer;
      const pose = resolveBossVisualFrame(boss, 0);
      expect(pose).toMatchObject({
        sheet: SPIDER_STRING_ATTACK_SHEET,
        facing: -1,
      });
      return pose.frame;
    });

    expect(frames).toEqual([0, 1, 2]);
  });

  it("uses dedicated Fang Gale sequences for retreat, turning, final bite, and recovery", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.fangGale,
      bossKills: 0,
      elapsedSeconds: 0,
      awakened: true,
    });
    boss.entering = false;
    boss.phase = AWAKENED_FINAL_PHASE;
    boss.fangPatternPhase = AWAKENED_FINAL_PHASE;
    boss.skillMode = "fangGaleStorm";

    boss.actionState = "retreat";
    boss.actionTimer = 0;
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: FANG_GALE_RETREAT_SHEET,
      frame: 0,
    });

    boss.actionState = "windup";
    boss.castTimer = fangChainWindupFrames(AWAKENED_FINAL_PHASE);
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: FANG_GALE_TURN_SHEET,
      frame: 0,
    });
    boss.castTimer = 1;
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: FANG_GALE_TURN_SHEET,
      frame: FANG_GALE_TURN_SHEET.count - 1,
    });

    boss.actionState = "dash";
    boss.castTimer = 0;
    boss.comboStep = 3;
    expect(resolveBossVisualFrame(boss, 0).sheet).toBe(FANG_GALE_FINAL_BITE_SHEET);

    boss.actionState = "recover";
    boss.recoveryTimer = FANG_GALE_CONFIG.stormRecoveryFrames;
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: FANG_GALE_RECOVER_SHEET,
      frame: 0,
    });
  });

  it("uses the bell sequence for Dead Bell's reprisal warning and active window", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.deadBell,
      bossKills: 0,
      elapsedSeconds: 0,
      awakened: true,
    });
    boss.entering = false;
    boss.actionState = "recover";
    boss.skillMode = "deadBellDuet";

    boss.deadBellReprisalTimer = DEAD_BELL_CONFIG.reprisalWarningFrames
      + DEAD_BELL_CONFIG.reprisalActiveFrames;
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: DEAD_BELL_CAST_SHEET,
      frame: 0,
    });

    boss.deadBellReprisalTimer = DEAD_BELL_CONFIG.reprisalActiveFrames;
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: DEAD_BELL_CAST_SHEET,
      frame: 3,
    });

    boss.deadBellReprisalTimer = 1;
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: DEAD_BELL_CAST_SHEET,
      frame: DEAD_BELL_CAST_SHEET.count - 1,
    });
  });

  it("maps every registered Boss cast mode to a body sequence through release", () => {
    for (const castCase of CAST_CASES) {
      for (const [skillMode, expectedSheet] of castCase.modes) {
        const boss = createBossEncounter({
          id: castCase.id,
          bossKills: 0,
          elapsedSeconds: 0,
          awakened: true,
        });
        boss.entering = false;
        boss.actionState = "cast";
        boss.skillMode = skillMode;
        boss.castFacing = -1;
        boss.castTimer = bossCastDuration(boss);

        const firstPose = resolveBossVisualFrame(boss, 0);
        expect(firstPose).toMatchObject({
          sheet: expectedSheet,
          frame: 0,
          facing: -1,
        });

        boss.castTimer = 1;
        const releasePose = resolveBossVisualFrame(boss, 0);
        expect(releasePose.sheet).toBe(expectedSheet);
        expect(releasePose.frame).toBeGreaterThan(0);
        expect(releasePose.facing).toBe(-1);
      }
    }
  });
});

function createContext() {
  return {
    beginPath: vi.fn(),
    drawImage: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
  } as unknown as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
    ellipse: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
  };
}

function contextSheetFrameWidth(stateName: "move" | "cast" | "dash" | "recover") {
  if (stateName === "cast") return MIRROR_DREAM_CAST_AWAKENED_CRACKS_SHEET.frameW;
  if (stateName === "recover") return MIRROR_DREAM_RECOVER_AWAKENED_CRACKS_SHEET.frameW;
  return MIRROR_DREAM_AWAKENED_CRACKS_SHEET.frameW;
}
