import { describe, expect, it } from "vitest";

import {
  ACT_LANDMARK_SPRITES,
  ACT_OCCLUDER_SPRITES,
  MIST_BONE_ATTACK_SHEET,
  MIST_BONE_CAGE_CAST_SHEET,
  MIST_BONE_DART_SHEET,
  MIST_BONE_LINE_CAST_SHEET,
  PLAYER_ANIMATION_STATES,
  PLAYER_SHEETS,
} from "../constants";
import { spriteImageLoadTargets } from "./manifest";

describe("sprite manifest", () => {
  it("preloads the moving attack sheet exactly once", () => {
    const loadedSources = spriteImageLoadTargets().map((target) => target.src);
    const movingAttack = PLAYER_SHEETS[PLAYER_ANIMATION_STATES.movingAttack];

    expect(loadedSources.filter((src) => src === movingAttack.src)).toHaveLength(1);
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
});
