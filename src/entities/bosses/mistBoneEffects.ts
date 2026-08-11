import { MIST_BONE_CONFIG, MIST_BONE_SPIKES_SHEET } from "../../constants";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type {
  MistBoneFogState,
  MistBoneSpikeState,
} from "../../types/game-state";
import { hurtPlayer } from "../player";
import { drawMistBoneFogStack } from "./mistBoneFogVisuals";

const SPIKE_BOTTOM_OFFSET = 0;
const SPIKE_FADE_EXTRA_FRAMES = 8;
const SPIKE_MIN_FADE = 0.35;
const SPIKE_ACTIVE_SPRITE_FRAMES = MIST_BONE_SPIKES_SHEET.count
  - MIST_BONE_CONFIG.spikeWarningSpriteFrames;
const SPIKE_ANIMATION_FRAMES = MIST_BONE_SPIKES_SHEET.count
  * MIST_BONE_CONFIG.spikeFrameDuration;
const FOG_FADE_FRAMES = 18;
const FOG_BOTTOM_SINK_SCALE = 0.08;
const FOG_PHASE_X_SCALE = 0.37;
const FOG_PHASE_Y_SCALE = 0.13;
const THIN_FOG_ALPHA = 0.72;
const BURIAL_FOG_ALPHA = 0.9;

export function updateMistBoneEffects() {
  updateMistBoneFogs();
  for (let i = state.mistBoneSpikes.length - 1; i >= 0; i -= 1) {
    const spike = state.mistBoneSpikes[i] as MistBoneSpikeState;
    updateMistBonePlatformAnchor(spike);
    if (spike.delay > 0) {
      spike.delay -= 1;
      continue;
    }

    spike.elapsed += 1;
    const activeElapsed = spike.elapsed - spike.warningFrames - 1;
    if (activeElapsed === 0) playSfx("bossMistBoneSpike");
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

function updateMistBoneFogs() {
  for (let i = state.mistBoneFogs.length - 1; i >= 0; i -= 1) {
    const fog = state.mistBoneFogs[i];
    updateMistBonePlatformAnchor(fog);
    fog.elapsed += 1;
    fog.life -= 1;
    if (fog.life <= 0) state.mistBoneFogs.splice(i, 1);
  }
}

function updateMistBonePlatformAnchor(
  effect: MistBoneFogState | MistBoneSpikeState,
) {
  const anchor = effect.platformAnchor;
  if (!anchor) return;
  effect.x = anchor.platform.x + anchor.offsetX;
  effect.y = anchor.platform.y + anchor.offsetY;
  if (!state.platforms.includes(anchor.platform)) {
    delete effect.platformAnchor;
  }
}

export function drawMistBoneEffects() {
  if (!ctx) return;
  drawMistBoneFogs();
  for (const spike of state.mistBoneSpikes) {
    drawMistBoneSpike(spike);
  }
}

function drawMistBoneFogs() {
  for (const fog of state.mistBoneFogs) {
    const fade = Math.min(
      1,
      fog.elapsed / FOG_FADE_FRAMES,
      fog.life / FOG_FADE_FRAMES,
    );
    const phaseSeed = fog.phaseSeed ?? Math.abs(Math.floor(
      fog.x * FOG_PHASE_X_SCALE + fog.y * FOG_PHASE_Y_SCALE,
    ));
    drawMistBoneFogStack({
      kind: fog.kind,
      centerX: fog.x,
      bottomY: fog.y + fog.radiusY * FOG_BOTTOM_SINK_SCALE,
      width: fog.radiusX * 2,
      height: fog.radiusY * 2,
      elapsedFrames: fog.elapsed,
      phaseSeed,
      alpha: fade * (fog.kind === "burial" ? BURIAL_FOG_ALPHA : THIN_FOG_ALPHA),
    });
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
