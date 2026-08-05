import { describe, expect, it } from "vitest";

import {
  ACT_LANDMARK_SPRITES,
  ACT_OCCLUDER_SPRITES,
  MIST_BONE_ATTACK_SHEET,
  MIST_BONE_CAGE_CAST_SHEET,
  MIST_BONE_DART_SHEET,
  MIST_BONE_LINE_CAST_SHEET,
  MOON_TIDE_PLAYER_SHEETS,
  PLAYER_ANIMATION_STATES,
  PLAYER_SHEETS,
  RESIDUAL_SPIRIT_PICKUP_SPRITE,
  SPIDER_STRING_ATTACK_SHEET,
  SPIDER_STRING_PILLAR_CAST_SHEET,
  SPIDER_STRING_PILLAR_EFFECT_SHEET,
} from "../constants";
import { spriteImageLoadTargets } from "./manifest";

describe("sprite manifest", () => {
  it("preloads the moving attack sheet exactly once", () => {
    const loadedSources = spriteImageLoadTargets().map((target) => target.src);
    const movingAttack = PLAYER_SHEETS[PLAYER_ANIMATION_STATES.movingAttack];

    expect(loadedSources.filter((src) => src === movingAttack.src)).toHaveLength(1);
  });

  it("preloads every Moon Tide player action sheet exactly once", () => {
    const loadedSources = spriteImageLoadTargets().map((target) => target.src);

    for (const sheet of Object.values(MOON_TIDE_PLAYER_SHEETS)) {
      expect(loadedSources.filter((src) => src === sheet.src)).toHaveLength(1);
    }
  });

  it("keeps Moon Tide player timing and anchors aligned with the normal actions", () => {
    for (const stateName of Object.values(PLAYER_ANIMATION_STATES)) {
      const normalSheet = PLAYER_SHEETS[stateName];
      const moonTideSheet = MOON_TIDE_PLAYER_SHEETS[stateName];

      expect(moonTideSheet).toMatchObject({
        frameW: normalSheet.frameW,
        frameH: normalSheet.frameH,
        count: normalSheet.count,
        animSpeed: normalSheet.animSpeed,
        anchorY: normalSheet.anchorY,
      });
      expect(moonTideSheet.anchorX).toBe(normalSheet.anchorX);
      expect(moonTideSheet.flipX).toBe(normalSheet.flipX);
    }
  });

  it("preloads every act landmark exactly once", () => {
    const loadedSources = spriteImageLoadTargets().map((target) => target.src);

    for (const landmark of ACT_LANDMARK_SPRITES) {
      expect(loadedSources.filter((src) => src === landmark.src)).toHaveLength(1);
    }
  });

  it("preloads every act occluder exactly once", () => {
    const loadedSources = spriteImageLoadTargets().map((target) => target.src);

    for (const occluder of ACT_OCCLUDER_SPRITES) {
      expect(loadedSources.filter((src) => src === occluder.src)).toHaveLength(1);
    }
  });

  it("preloads every Mist Bone action asset exactly once", () => {
    const loadedSources = spriteImageLoadTargets().map((target) => target.src);
    const mistBoneActions = [
      MIST_BONE_ATTACK_SHEET,
      MIST_BONE_LINE_CAST_SHEET,
      MIST_BONE_CAGE_CAST_SHEET,
      MIST_BONE_DART_SHEET,
    ];

    for (const action of mistBoneActions) {
      expect(loadedSources.filter((src) => src === action.src)).toHaveLength(1);
    }
  });

  it("preloads every Spider String phase action asset exactly once", () => {
    const loadedSources = spriteImageLoadTargets().map((target) => target.src);
    const spiderStringActions = [
      SPIDER_STRING_ATTACK_SHEET,
      SPIDER_STRING_PILLAR_CAST_SHEET,
      SPIDER_STRING_PILLAR_EFFECT_SHEET,
    ];

    for (const action of spiderStringActions) {
      expect(loadedSources.filter((src) => src === action.src)).toHaveLength(1);
    }
  });

  it("preloads the residual-spirit pickup exactly once", () => {
    const loadedSources = spriteImageLoadTargets().map((target) => target.src);

    expect(loadedSources.filter((src) => src === RESIDUAL_SPIRIT_PICKUP_SPRITE.src))
      .toHaveLength(1);
  });
});
