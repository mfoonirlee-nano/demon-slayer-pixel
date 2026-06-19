import { BOSS_CONFIG, GROUND_Y, MIRROR_AFTERIMAGE_SHEET, MIRROR_DREAM_CONFIG, MIRROR_NIGHTMARE_SHEET, MIRROR_SHARD_SHEET, WIDTH } from "../../constants";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { hurtPlayer } from "../player";
import { spawnMirrorNightmareShard } from "./mirrorDreamBehavior";
import type { MirrorAfterimageState, MirrorShardState } from "../../types/game-state";

export function updateMirrorDreamEffects() {
  updateMirrorAfterimages();
  updateMirrorShards();
}

function updateMirrorAfterimages() {
  for (let i = state.mirrorAfterimages.length - 1; i >= 0; i -= 1) {
    const afterimage = state.mirrorAfterimages[i] as MirrorAfterimageState;
    afterimage.elapsed += 1;
    afterimage.life -= 1;
    afterimage.frame = Math.min(
      MIRROR_AFTERIMAGE_SHEET.count - 1,
      Math.floor(afterimage.elapsed / MIRROR_DREAM_CONFIG.afterimageFrameDuration),
    );

    if (
      afterimage.spawnAt !== undefined
      && !afterimage.spawned
      && afterimage.elapsed >= afterimage.spawnAt
    ) {
      afterimage.spawned = true;
      afterimage.life = Math.min(afterimage.life, MIRROR_DREAM_CONFIG.nightmareBreakFadeFrames);
      spawnMirrorNightmareShard(afterimage);
    }

    if (afterimage.life <= 0) state.mirrorAfterimages.splice(i, 1);
  }
}

function updateMirrorShards() {
  for (let i = state.mirrorShards.length - 1; i >= 0; i -= 1) {
    const shard = state.mirrorShards[i] as MirrorShardState;
    const sheet = shard.kind === "nightmare" ? MIRROR_NIGHTMARE_SHEET : MIRROR_SHARD_SHEET;
    const frameDuration = shard.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareFrameDuration
      : MIRROR_DREAM_CONFIG.shardFrameDuration;

    shard.elapsed += 1;
    shard.life -= 1;
    shard.x += shard.vx;
    shard.y += shard.vy;
    shard.frame = Math.min(sheet.count - 1, Math.floor(shard.elapsed / frameDuration));

    const hitLeftWall = shard.x <= 0 && shard.vx < 0;
    const hitRightWall = shard.x + shard.w >= WIDTH && shard.vx > 0;
    if (shard.kind === "shard" && shard.bouncesRemaining > 0 && (hitLeftWall || hitRightWall)) {
      shard.x = clamp(shard.x, 0, WIDTH - shard.w);
      shard.vx *= -1;
      shard.facing = shard.vx >= 0 ? 1 : -1;
      shard.bouncesRemaining -= 1;
      shard.frame = Math.min(MIRROR_SHARD_SHEET.count - 1, 4);
      playSfx("bossMirror", 1.28);
    }

    if (hitbox(state.player, shard)) {
      hurtPlayer(shard.damage, shard.vx);
      state.mirrorShards.splice(i, 1);
      continue;
    }

    const drawW = shard.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareDrawW
      : MIRROR_DREAM_CONFIG.shardDrawW;
    const offLeft = shard.x + shard.w < -drawW;
    const offRight = shard.x > WIDTH + drawW;
    const offTop = shard.y + shard.h < -drawW;
    const offBottom = shard.y > GROUND_Y + drawW;
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
  const drawW = MIRROR_DREAM_CONFIG.afterimageDrawW * BOSS_CONFIG.bodyDrawScale;
  const drawH = MIRROR_DREAM_CONFIG.afterimageDrawH * BOSS_CONFIG.bodyDrawScale;
  const bottomPadding = MIRROR_DREAM_CONFIG.afterimageBottomPadding * BOSS_CONFIG.bodyDrawScale;
  for (const afterimage of state.mirrorAfterimages) {
    const centerX = afterimage.x + afterimage.w / 2;
    const feetY = afterimage.y + afterimage.h;
    const lifeT = clamp(afterimage.life / afterimage.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = MIRROR_DREAM_CONFIG.afterimageAlpha * (0.24 + lifeT * 0.76);
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

function drawMirrorShards() {
  if (!ctx) return;
  for (const shard of state.mirrorShards) {
    const sheet = shard.kind === "nightmare" ? MIRROR_NIGHTMARE_SHEET : MIRROR_SHARD_SHEET;
    const drawW = shard.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareDrawW
      : MIRROR_DREAM_CONFIG.shardDrawW;
    const drawH = shard.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareDrawH
      : MIRROR_DREAM_CONFIG.shardDrawH;
    const centerX = shard.x + shard.w / 2;
    const centerY = shard.y + shard.h / 2;
    drawSheetFrame(
      sheet,
      shard.frame,
      centerX - drawW / 2,
      centerY - drawH / 2,
      drawW,
      drawH,
      shard.facing,
    );
  }
}
