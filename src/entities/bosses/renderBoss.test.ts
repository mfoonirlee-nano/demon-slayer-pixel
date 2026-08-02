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
  GROUND_Y,
  LANTERN_EMBER_FIRELINE_CAST_SHEET,
  LANTERN_EMBER_BUFF_CAST_SHEET,
  LANTERN_EMBER_SUMMON_SHEET,
  MIRROR_DREAM_CAST_SHEET,
  MIST_BONE_CAGE_CAST_SHEET,
  MIST_BONE_CAST_SHEET,
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
import { bossCastDuration, spiderRushWindupFrames } from "./attackTiming";
import { drawBoss, resolveBossVisualFrame } from "./renderBoss";

const originalFirelineCastImage = LANTERN_EMBER_FIRELINE_CAST_SHEET.image;
const originalSummonImage = LANTERN_EMBER_SUMMON_SHEET.image;
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
    drawImage: vi.fn(),
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
  };
}
