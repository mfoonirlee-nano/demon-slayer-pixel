import { BOSS_DEFEAT_SPLIT_VISUAL } from "../../constants";
import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type { BossDefeatSplitEffectState } from "../../types/game-state";
import { resolveBossVisualFrame } from "./renderBoss";
import type { LiveBoss } from "./types";

type RandomSource = () => number;

export function spawnBossDefeatSplitEffect(
  boss: LiveBoss,
  animationElapsed = state.elapsed,
  random: RandomSource = Math.random,
) {
  state.bossDefeatSplitEffect = {
    pose: resolveBossVisualFrame(boss, animationElapsed),
    cutAngle: random() * Math.PI,
    life: BOSS_DEFEAT_SPLIT_VISUAL.durationFrames,
    maxLife: BOSS_DEFEAT_SPLIT_VISUAL.durationFrames,
  };
}

export function updateBossDefeatSplitEffect() {
  const effect = state.bossDefeatSplitEffect;
  if (!effect) return;

  effect.life -= 1;
  if (effect.life <= 0) state.bossDefeatSplitEffect = null;
}

export function drawBossDefeatSplitEffect() {
  const effect = state.bossDefeatSplitEffect;
  if (!ctx || !effect) return;

  drawSplitHalf(effect, -1);
  drawSplitHalf(effect, 1);
}

function drawSplitHalf(effect: BossDefeatSplitEffectState, side: -1 | 1) {
  if (!ctx) return;

  const { pose } = effect;
  const progress = 1 - effect.life / effect.maxLife;
  const separation = easeOut(progress) * BOSS_DEFEAT_SPLIT_VISUAL.maxSeparation;
  const normalX = -Math.sin(effect.cutAngle);
  const normalY = Math.cos(effect.cutAngle);
  const centerX = pose.x + pose.w / 2;
  const centerY = pose.y + pose.h / 2;
  const clipExtent = Math.hypot(pose.w, pose.h) * BOSS_DEFEAT_SPLIT_VISUAL.clipExtentScale;

  ctx.save();
  ctx.globalAlpha = splitAlpha(progress);
  ctx.translate(
    centerX + normalX * separation * side,
    centerY
      + normalY * separation * side
      + progress * progress * BOSS_DEFEAT_SPLIT_VISUAL.maxDrop,
  );
  ctx.rotate(BOSS_DEFEAT_SPLIT_VISUAL.maxTiltRadians * progress * side);
  ctx.rotate(effect.cutAngle);
  ctx.beginPath();
  ctx.rect(
    -clipExtent,
    side < 0 ? -clipExtent : 0,
    clipExtent * 2,
    clipExtent,
  );
  ctx.clip();
  ctx.rotate(-effect.cutAngle);
  drawSheetFrame(
    pose.sheet,
    pose.frame,
    -pose.w / 2,
    -pose.h / 2,
    pose.w,
    pose.h,
    pose.facing,
  );
  ctx.restore();
}

function easeOut(progress: number) {
  return 1 - (1 - progress) ** BOSS_DEFEAT_SPLIT_VISUAL.easingExponent;
}

function splitAlpha(progress: number) {
  const fadeStart = BOSS_DEFEAT_SPLIT_VISUAL.fadeStartProgress;
  if (progress <= fadeStart) return 1;
  return Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart));
}
