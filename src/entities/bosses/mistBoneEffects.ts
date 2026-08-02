import { MIST_BONE_CONFIG, MIST_BONE_SPIKES_SHEET } from "../../constants";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type { MistBoneSpikeState } from "../../types/game-state";
import { hurtPlayer } from "../player";

const SPIKE_BOTTOM_OFFSET = 0;
const SPIKE_FADE_EXTRA_FRAMES = 8;
const SPIKE_MIN_FADE = 0.35;
const SPIKE_ACTIVE_SPRITE_FRAMES = MIST_BONE_SPIKES_SHEET.count
  - MIST_BONE_CONFIG.spikeWarningSpriteFrames;
const SPIKE_ANIMATION_FRAMES = MIST_BONE_SPIKES_SHEET.count
  * MIST_BONE_CONFIG.spikeFrameDuration;

export function updateMistBoneEffects() {
  for (let i = state.mistBoneSpikes.length - 1; i >= 0; i -= 1) {
    const spike = state.mistBoneSpikes[i] as MistBoneSpikeState;
    if (spike.delay > 0) {
      spike.delay -= 1;
      continue;
    }

    spike.elapsed += 1;
    const activeElapsed = spike.elapsed - spike.warningFrames - 1;
    const visibleLife = Math.min(spike.life, SPIKE_ANIMATION_FRAMES);
    if (activeElapsed >= visibleLife) {
      state.mistBoneSpikes.splice(i, 1);
      continue;
    }

    spike.frame = spikeFrame(spike, activeElapsed);

    if (!spike.hitPlayer && activeElapsed >= 0 && hitbox(state.player, spike)) {
      spike.hitPlayer = true;
      hurtPlayer(spike.damage, state.player.x + state.player.w / 2 - (spike.x + spike.w / 2));
    }
  }
}

export function drawMistBoneEffects() {
  if (!ctx) return;
  for (const spike of state.mistBoneSpikes) {
    drawMistBoneSpike(spike);
  }
}

function spikeFrame(spike: MistBoneSpikeState, activeElapsed: number) {
  if (activeElapsed < 0) {
    return Math.min(
      MIST_BONE_CONFIG.spikeWarningSpriteFrames - 1,
      Math.floor(
        Math.max(0, spike.elapsed - 1)
          * MIST_BONE_CONFIG.spikeWarningSpriteFrames
          / spike.warningFrames,
      ),
    );
  }

  return Math.min(
    MIST_BONE_SPIKES_SHEET.count - 1,
    MIST_BONE_CONFIG.spikeWarningSpriteFrames
      + Math.floor(
        activeElapsed * SPIKE_ACTIVE_SPRITE_FRAMES / SPIKE_ANIMATION_FRAMES,
      ),
  );
}

function drawMistBoneSpike(spike: MistBoneSpikeState) {
  if (!ctx) return;
  const centerX = spike.x + spike.w / 2;
  const bottomY = spike.y + spike.h + SPIKE_BOTTOM_OFFSET;
  const activeElapsed = Math.max(0, spike.elapsed - spike.warningFrames - 1);
  const visibleLife = Math.min(spike.life, SPIKE_ANIMATION_FRAMES);
  const fade = clamp(1 - activeElapsed / (visibleLife + SPIKE_FADE_EXTRA_FRAMES), SPIKE_MIN_FADE, 1);
  ctx.save();
  ctx.globalAlpha = fade;
  drawSheetFrame(
    MIST_BONE_SPIKES_SHEET,
    spike.frame,
    centerX - MIST_BONE_CONFIG.spikeDrawW / 2,
    bottomY - MIST_BONE_CONFIG.spikeDrawH,
    MIST_BONE_CONFIG.spikeDrawW,
    MIST_BONE_CONFIG.spikeDrawH,
  );
  ctx.restore();
}
