import { MIST_BONE_CONFIG, MIST_BONE_SPIKES_SHEET } from "../../constants";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type { MistBoneSpikeState } from "../../types/game-state";
import { hurtPlayer } from "../player";

export function updateMistBoneEffects() {
  for (let i = state.mistBoneSpikes.length - 1; i >= 0; i -= 1) {
    const spike = state.mistBoneSpikes[i] as MistBoneSpikeState;
    if (spike.delay > 0) {
      spike.delay -= 1;
      continue;
    }

    spike.elapsed += 1;
    const activeElapsed = Math.max(0, spike.elapsed - spike.warningFrames);
    spike.frame = Math.min(
      MIST_BONE_SPIKES_SHEET.count - 1,
      Math.floor(activeElapsed / MIST_BONE_CONFIG.spikeFrameDuration),
    );

    if (!spike.hitPlayer && spike.elapsed > spike.warningFrames && hitbox(state.player, spike)) {
      spike.hitPlayer = true;
      hurtPlayer(spike.damage, state.player.x + state.player.w / 2 - (spike.x + spike.w / 2));
    }

    if (spike.elapsed > spike.warningFrames + spike.life) {
      state.mistBoneSpikes.splice(i, 1);
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
    ? 0.25
    : clamp(spike.elapsed / spike.warningFrames, 0, 1);
  const centerX = spike.x + spike.w / 2;
  const centerY = spike.y + spike.h;

  ctx.save();
  ctx.globalAlpha = 0.24 + t * 0.36;
  ctx.strokeStyle = "#d8e7ea";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, spike.w * 0.72, 9 + t * 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.18 + t * 0.22;
  ctx.fillStyle = "#cdd6d0";
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, spike.w * 0.52, 6 + t * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMistBoneSpike(spike: MistBoneSpikeState) {
  if (!ctx) return;
  const centerX = spike.x + spike.w / 2;
  const bottomY = spike.y + spike.h + 12;
  const activeElapsed = spike.elapsed - spike.warningFrames;
  const fade = clamp(1 - activeElapsed / (spike.life + 8), 0.35, 1);
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
