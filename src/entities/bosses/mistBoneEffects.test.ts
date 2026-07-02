import { describe, expect, it } from "vitest";
import { GROUND_Y, MIST_BONE_CONFIG, MIST_BONE_SPIKES_SHEET } from "../../constants";
import { resetState, state } from "../../game/state";
import { updateMistBoneEffects } from "./mistBoneEffects";

describe("mist bone effects", () => {
  it("removes the spike effect when its sprite animation finishes", () => {
    resetState();
    state.mistBoneSpikes.push({
      x: 320,
      y: GROUND_Y - MIST_BONE_CONFIG.spikeHitH,
      w: MIST_BONE_CONFIG.spikeHitW,
      h: MIST_BONE_CONFIG.spikeHitH,
      delay: 0,
      warningFrames: MIST_BONE_CONFIG.spikeWarningFrames,
      elapsed: 0,
      frame: 0,
      life: MIST_BONE_CONFIG.spikeLife,
      damage: MIST_BONE_CONFIG.damageBase,
      hitPlayer: false,
    });

    const animationFrames = MIST_BONE_SPIKES_SHEET.count * MIST_BONE_CONFIG.spikeFrameDuration;
    const framesBeforeRemoval = MIST_BONE_CONFIG.spikeWarningFrames + animationFrames;
    for (let i = 0; i < framesBeforeRemoval; i += 1) updateMistBoneEffects();

    expect(state.mistBoneSpikes).toHaveLength(1);
    expect(state.mistBoneSpikes[0].frame).toBe(MIST_BONE_SPIKES_SHEET.count - 1);

    updateMistBoneEffects();

    expect(state.mistBoneSpikes).toEqual([]);
  });
});
