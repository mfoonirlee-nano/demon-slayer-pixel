import { describe, expect, it } from "vitest";
import { GROUND_Y, MIST_BONE_CONFIG, MIST_BONE_SPIKES_SHEET } from "../../constants";
import { resetState, state } from "../../game/state";
import { updateMistBoneEffects } from "./mistBoneEffects";

describe("mist bone effects", () => {
  it("keeps the original hazard lifetime while remapping its sprite animation", () => {
    resetState();
    state.player.x = 0;
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

    const animationFrames = MIST_BONE_SPIKES_SHEET.count
      * MIST_BONE_CONFIG.spikeFrameDuration;
    const framesBeforeRemoval = MIST_BONE_CONFIG.spikeWarningFrames + animationFrames;
    for (let i = 0; i < framesBeforeRemoval - 1; i += 1) updateMistBoneEffects();

    const spike = state.mistBoneSpikes[0];
    state.player.x = spike.x;
    state.player.y = spike.y;
    const hpBeforeLastActiveFrame = state.player.hp;
    updateMistBoneEffects();

    expect(state.mistBoneSpikes).toHaveLength(1);
    expect(state.mistBoneSpikes[0].frame).toBe(MIST_BONE_SPIKES_SHEET.count - 1);
    expect(state.player.hp).toBeLessThan(hpBeforeLastActiveFrame);

    updateMistBoneEffects();

    expect(state.mistBoneSpikes).toEqual([]);
  });

  it("uses the mist and bone-tip frames for the complete warning window", () => {
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

    const warningFrames = new Set<number>();
    for (let frame = 0; frame < MIST_BONE_CONFIG.spikeWarningFrames; frame += 1) {
      updateMistBoneEffects();
      warningFrames.add(state.mistBoneSpikes[0].frame);
    }

    expect([...warningFrames]).toEqual([0, 1]);
    updateMistBoneEffects();
    expect(state.mistBoneSpikes[0].frame).toBe(
      MIST_BONE_CONFIG.spikeWarningSpriteFrames,
    );
  });
});
