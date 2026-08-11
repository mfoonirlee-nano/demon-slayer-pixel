import {
  BOSS_CONFIG,
  GROUND_Y,
  MIRROR_AFTERIMAGE_DRAW_WIDTH,
  MIRROR_AFTERIMAGE_SHEET,
  MIRROR_DREAM_CONFIG,
  MIRROR_NIGHTMARE_SHEET,
  WIDTH,
} from "../../constants";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { hurtPlayer } from "../player";
import { spawnMirrorNightmareVolley } from "./mirrorDreamBehavior";
import { mirrorShardProfile } from "./mirrorDreamShardProfile";
import type { MirrorAfterimageState, MirrorShardState } from "../../types/game-state";

const SHARD_BOUNCE_FRAME = 4;
const SHARD_BOUNCE_SFX_PITCH = 1.28;
const AFTERIMAGE_FADE_ALPHA_BASE = 0.24;
const AFTERIMAGE_FADE_ALPHA_GAIN = 0.76;
const NIGHTMARE_CAST_FRAMES = (
  MIRROR_NIGHTMARE_SHEET.count * MIRROR_DREAM_CONFIG.nightmareCastFrameDuration
);

export function updateMirrorDreamEffects() {
  updateMirrorShards();
  updateMirrorAfterimages();
}

function updateMirrorAfterimages() {
  for (let i = state.mirrorAfterimages.length - 1; i >= 0; i -= 1) {
    const afterimage = state.mirrorAfterimages[i] as MirrorAfterimageState;
    if (afterimage.stage === "nightmareCast") {
      updateMirrorNightmareCast(afterimage, i);
      continue;
    }

    afterimage.elapsed += 1;
    afterimage.life -= 1;
    afterimage.frame = Math.min(
      MIRROR_AFTERIMAGE_SHEET.count - 1,
      Math.floor(afterimage.elapsed / MIRROR_DREAM_CONFIG.afterimageFrameDuration),
    );

    if (
      afterimage.spawnAt !== undefined
      && afterimage.elapsed >= afterimage.spawnAt
    ) {
      state.mirrorAfterimages[i] = startMirrorNightmareCast(afterimage);
      continue;
    }

    if (afterimage.life <= 0) state.mirrorAfterimages.splice(i, 1);
  }
}

function startMirrorNightmareCast(afterimage: MirrorAfterimageState) {
  const targetX = state.player.x + state.player.w / 2;
  const targetY = state.player.y + state.player.h / 2;
  const centerX = afterimage.x + afterimage.w / 2;
  return {
    ...afterimage,
    stage: "nightmareCast" as const,
    targetX,
    targetY,
    facing: targetX >= centerX ? 1 : -1,
    elapsed: 1,
    frame: 0,
    life: NIGHTMARE_CAST_FRAMES,
    maxLife: NIGHTMARE_CAST_FRAMES,
  };
}

function updateMirrorNightmareCast(
  afterimage: Extract<MirrorAfterimageState, { stage: "nightmareCast" }>,
  index: number,
) {
  if (afterimage.elapsed >= NIGHTMARE_CAST_FRAMES) {
    spawnMirrorNightmareVolley(afterimage);
    state.mirrorAfterimages.splice(index, 1);
    return;
  }

  afterimage.elapsed += 1;
  afterimage.life = NIGHTMARE_CAST_FRAMES - afterimage.elapsed + 1;
  afterimage.frame = Math.min(
    MIRROR_NIGHTMARE_SHEET.count - 1,
    Math.floor((afterimage.elapsed - 1) / MIRROR_DREAM_CONFIG.nightmareCastFrameDuration),
  );
}

function updateMirrorShards() {
  for (let i = state.mirrorShards.length - 1; i >= 0; i -= 1) {
    const shard = state.mirrorShards[i] as MirrorShardState;
    const profile = mirrorShardProfile(shard);

    shard.elapsed += 1;
    shard.life -= 1;
    shard.x += shard.vx;
    shard.y += shard.vy;
    shard.frame = Math.min(
      profile.sheet.count - 1,
      Math.floor(shard.elapsed / profile.frameDuration),
    );

    const hitLeftWall = shard.x <= 0 && shard.vx < 0;
    const hitRightWall = shard.x + shard.w >= WIDTH && shard.vx > 0;
    if (profile.canBounce && shard.bouncesRemaining > 0 && (hitLeftWall || hitRightWall)) {
      shard.x = clamp(shard.x, 0, WIDTH - shard.w);
      shard.vx *= -1;
      shard.facing = shard.vx >= 0 ? 1 : -1;
      shard.bouncesRemaining -= 1;
      shard.frame = Math.min(profile.sheet.count - 1, SHARD_BOUNCE_FRAME);
      playSfx("bossMirror", SHARD_BOUNCE_SFX_PITCH);
    }

    if (hitbox(state.player, shard)) {
      hurtPlayer(shard.damage, shard.vx);
      state.mirrorShards.splice(i, 1);
      continue;
    }

    const offLeft = shard.x + shard.w < -profile.drawW;
    const offRight = shard.x > WIDTH + profile.drawW;
    const offTop = shard.y + shard.h < -profile.drawW;
    const offBottom = shard.y > GROUND_Y + profile.drawW;
    if (shard.life <= 0 || offLeft || offRight || offTop || offBottom) {
      state.mirrorShards.splice(i, 1);
    }
  }
}

export function drawMirrorDreamEffects() {
  drawMirrorAfterimages();
  drawMirrorShards();
}

function drawMirrorAfterimages() {
  if (!ctx) return;
  const drawW = MIRROR_AFTERIMAGE_DRAW_WIDTH;
  const drawH = MIRROR_DREAM_CONFIG.afterimageDrawH * BOSS_CONFIG.bodyDrawScale;
  const bottomPadding = MIRROR_DREAM_CONFIG.afterimageBottomPadding * BOSS_CONFIG.bodyDrawScale;
  for (const afterimage of state.mirrorAfterimages) {
    if (afterimage.stage === "nightmareCast") {
      drawMirrorNightmareCast(afterimage);
      continue;
    }

    const centerX = afterimage.x + afterimage.w / 2;
    const feetY = afterimage.y + afterimage.h;
    const lifeT = clamp(afterimage.life / afterimage.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = MIRROR_DREAM_CONFIG.afterimageAlpha * (
      AFTERIMAGE_FADE_ALPHA_BASE + lifeT * AFTERIMAGE_FADE_ALPHA_GAIN
    );
    drawSheetFrame(
      MIRROR_AFTERIMAGE_SHEET,
      afterimage.frame,
      centerX - drawW / 2,
      feetY - drawH + bottomPadding,
      drawW,
      drawH,
      afterimage.facing,
    );
    ctx.restore();
  }
}

function drawMirrorNightmareCast(
  afterimage: Extract<MirrorAfterimageState, { stage: "nightmareCast" }>,
) {
  const centerX = afterimage.x + afterimage.w / 2;
  const centerY = (
    afterimage.y + afterimage.h * MIRROR_DREAM_CONFIG.nightmareShardStartYScale
  );
  const drawW = MIRROR_DREAM_CONFIG.nightmareCastDrawW;
  const drawH = MIRROR_DREAM_CONFIG.nightmareCastDrawH;
  drawSheetFrame(
    MIRROR_NIGHTMARE_SHEET,
    afterimage.frame,
    centerX - drawW / 2,
    centerY - drawH / 2,
    drawW,
    drawH,
    afterimage.facing,
  );
}

function drawMirrorShards() {
  if (!ctx) return;
  for (const shard of state.mirrorShards) {
    const profile = mirrorShardProfile(shard);
    const centerX = shard.x + shard.w / 2;
    const centerY = shard.y + shard.h / 2;
    ctx.save();
    if (profile.glowColor) {
      ctx.shadowColor = profile.glowColor;
      ctx.shadowBlur = MIRROR_DREAM_CONFIG.playerSkillReflectionGlowBlur;
    }
    drawSheetFrame(
      profile.sheet,
      shard.frame,
      centerX - profile.drawW / 2,
      centerY - profile.drawH / 2,
      profile.drawW,
      profile.drawH,
      shard.facing,
    );
    ctx.restore();
  }
}
