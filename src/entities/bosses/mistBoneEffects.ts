import { MIST_BONE_CONFIG, MIST_BONE_SPIKES_SHEET } from "../../constants";
import { playSfx } from "../../game/audio";
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
const FOG_FADE_FRAMES = 18;
const FOG_CENTER_HEIGHT_SCALE = 0.45;
const FOG_WISP_COUNT = 4;
const FOG_WISP_PHASE_STEP = 1.7;
const FOG_WISP_SPEED = 0.035;
const FOG_WISP_OFFSET_X_SCALE = 0.18;
const FOG_WISP_OFFSET_Y_SCALE = 0.08;
const FOG_WISP_RADIUS_X_SCALE = 0.36;
const FOG_WISP_RADIUS_Y_SCALE = 0.42;
const THIN_FOG_COLOR = "rgba(188, 211, 216, 0.18)";
const BURIAL_FOG_COLOR = "rgba(174, 198, 204, 0.46)";
const FOG_WISP_COLOR = "rgba(213, 226, 225, 0.14)";

export function updateMistBoneEffects() {
  updateMistBoneFogs();
  for (let i = state.mistBoneSpikes.length - 1; i >= 0; i -= 1) {
    const spike = state.mistBoneSpikes[i] as MistBoneSpikeState;
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
    fog.elapsed += 1;
    fog.life -= 1;
    if (fog.life <= 0) state.mistBoneFogs.splice(i, 1);
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
  if (!ctx) return;
  for (const fog of state.mistBoneFogs) {
    const fade = Math.min(
      1,
      fog.elapsed / FOG_FADE_FRAMES,
      fog.life / FOG_FADE_FRAMES,
    );
    const centerY = fog.y - fog.radiusY * FOG_CENTER_HEIGHT_SCALE;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = fog.kind === "burial" ? BURIAL_FOG_COLOR : THIN_FOG_COLOR;
    ctx.beginPath();
    ctx.ellipse(fog.x, centerY, fog.radiusX, fog.radiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = FOG_WISP_COLOR;
    for (let index = 0; index < FOG_WISP_COUNT; index += 1) {
      const phase = fog.elapsed * FOG_WISP_SPEED + index * FOG_WISP_PHASE_STEP;
      ctx.beginPath();
      ctx.ellipse(
        fog.x + Math.sin(phase) * fog.radiusX * FOG_WISP_OFFSET_X_SCALE,
        centerY + Math.cos(phase) * fog.radiusY * FOG_WISP_OFFSET_Y_SCALE,
        fog.radiusX * FOG_WISP_RADIUS_X_SCALE,
        fog.radiusY * FOG_WISP_RADIUS_Y_SCALE,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
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
