import { MIST_BONE_CONFIG, MIST_BONE_SPIKES_SHEET } from "../../constants";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type { MistBoneSpikeState } from "../../types/game-state";
import { hurtPlayer } from "../player";

const DELAY_WARNING_PROGRESS = 0.25;
const WARNING_STROKE_ALPHA_BASE = 0.24;
const WARNING_STROKE_ALPHA_SCALE = 0.36;
const WARNING_DASH_LENGTH = 8;
const WARNING_OUTER_RADIUS_X_SCALE = 0.72;
const WARNING_OUTER_RADIUS_Y_BASE = 9;
const WARNING_OUTER_RADIUS_Y_SCALE = 5;
const WARNING_FILL_ALPHA_BASE = 0.18;
const WARNING_FILL_ALPHA_SCALE = 0.22;
const WARNING_INNER_RADIUS_X_SCALE = 0.52;
const WARNING_INNER_RADIUS_Y_BASE = 6;
const WARNING_INNER_RADIUS_Y_SCALE = 4;
const SPIKE_BOTTOM_OFFSET = 0;
const SPIKE_FADE_EXTRA_FRAMES = 8;
const SPIKE_MIN_FADE = 0.35;
const SPIKE_ANIMATION_FRAMES = MIST_BONE_SPIKES_SHEET.count * MIST_BONE_CONFIG.spikeFrameDuration;

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

    spike.frame = Math.min(
      MIST_BONE_SPIKES_SHEET.count - 1,
      Math.floor(Math.max(0, activeElapsed) / MIST_BONE_CONFIG.spikeFrameDuration),
    );

    if (!spike.hitPlayer && activeElapsed >= 0 && hitbox(state.player, spike)) {
      spike.hitPlayer = true;
      hurtPlayer(spike.damage, state.player.x + state.player.w / 2 - (spike.x + spike.w / 2));
    }
  }
}

export function drawMistBoneEffects() {
  if (!ctx) return;
  for (const spike of state.mistBoneSpikes) {
    if (spike.delay > 0 || spike.elapsed <= spike.warningFrames) {
      drawMistBoneWarning(spike);
    } else {
      drawMistBoneSpike(spike);
    }
  }
}

function drawMistBoneWarning(spike: MistBoneSpikeState) {
  if (!ctx) return;
  const t = spike.delay > 0
    ? DELAY_WARNING_PROGRESS
    : clamp(spike.elapsed / spike.warningFrames, 0, 1);
  const centerX = spike.x + spike.w / 2;
  const centerY = spike.y + spike.h;

  ctx.save();
  ctx.globalAlpha = WARNING_STROKE_ALPHA_BASE + t * WARNING_STROKE_ALPHA_SCALE;
  ctx.strokeStyle = "#d8e7ea";
  ctx.lineWidth = 2;
  ctx.setLineDash([WARNING_DASH_LENGTH, WARNING_DASH_LENGTH]);
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    centerY,
    spike.w * WARNING_OUTER_RADIUS_X_SCALE,
    WARNING_OUTER_RADIUS_Y_BASE + t * WARNING_OUTER_RADIUS_Y_SCALE,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = WARNING_FILL_ALPHA_BASE + t * WARNING_FILL_ALPHA_SCALE;
  ctx.fillStyle = "#cdd6d0";
  ctx.beginPath();
  ctx.ellipse(
    centerX,
    centerY,
    spike.w * WARNING_INNER_RADIUS_X_SCALE,
    WARNING_INNER_RADIUS_Y_BASE + t * WARNING_INNER_RADIUS_Y_SCALE,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
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
