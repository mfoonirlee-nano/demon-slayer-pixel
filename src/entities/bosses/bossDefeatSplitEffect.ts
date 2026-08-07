import {
  BOSS_DEFEAT_SPLIT_VISUAL,
  MIST_BONE_DEFEAT_VISUAL,
} from "../../constants";
import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type {
  BossDefeatSplitEffectState,
  BossVisualFrameState,
  MistBoneDefeatFogWispState,
  MistBoneDefeatFragmentState,
} from "../../types/game-state";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { resolveBossVisualFrame } from "./renderBoss";
import type { LiveBoss } from "./types";

type RandomSource = () => number;

export function spawnBossDefeatSplitEffect(
  boss: LiveBoss,
  animationElapsed = state.elapsed,
  random: RandomSource = Math.random,
) {
  const pose = resolveBossVisualFrame(boss, animationElapsed);
  const commonState = {
    pose,
    life: BOSS_DEFEAT_SPLIT_VISUAL.durationFrames,
    maxLife: BOSS_DEFEAT_SPLIT_VISUAL.durationFrames,
  };
  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone) {
    state.bossDefeatSplitEffect = {
      ...commonState,
      kind: "mistBoneScatter",
      fragments: createMistBoneFragments(random),
      fogWisps: createMistBoneFogWisps(pose, random),
    };
    return;
  }

  state.bossDefeatSplitEffect = {
    ...commonState,
    kind: "split",
    cutAngle: random() * Math.PI,
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

  if (effect.kind === "mistBoneScatter") {
    drawMistBoneScatter(effect);
    return;
  }

  drawSplitHalf(effect, -1);
  drawSplitHalf(effect, 1);
}

function drawSplitHalf(effect: BossDefeatSplitEffectState, side: -1 | 1) {
  if (!ctx || effect.kind !== "split") return;

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

function createMistBoneFragments(random: RandomSource): MistBoneDefeatFragmentState[] {
  const fragments: MistBoneDefeatFragmentState[] = [];
  const centerColumn = (MIST_BONE_DEFEAT_VISUAL.fragmentColumns - 1) / 2;
  for (let row = 0; row < MIST_BONE_DEFEAT_VISUAL.fragmentRows; row += 1) {
    for (let column = 0; column < MIST_BONE_DEFEAT_VISUAL.fragmentColumns; column += 1) {
      const outwardDirection = (column - centerColumn) / Math.max(1, centerColumn);
      fragments.push({
        column,
        row,
        velocityX: outwardDirection * MIST_BONE_DEFEAT_VISUAL.fragmentHorizontalSpeed
          + signedRandom(random) * MIST_BONE_DEFEAT_VISUAL.fragmentHorizontalJitter,
        velocityY: -(
          MIST_BONE_DEFEAT_VISUAL.fragmentLiftMin
          + random() * MIST_BONE_DEFEAT_VISUAL.fragmentLiftRange
        ),
        angularVelocity: signedRandom(random)
          * MIST_BONE_DEFEAT_VISUAL.fragmentMaxAngularSpeed,
      });
    }
  }
  return fragments;
}

function createMistBoneFogWisps(
  pose: BossVisualFrameState,
  random: RandomSource,
): MistBoneDefeatFogWispState[] {
  const windDirection = random() < 0.5 ? -1 : 1;
  return Array.from({ length: MIST_BONE_DEFEAT_VISUAL.fogWispCount }, () => ({
    offsetX: signedRandom(random) * pose.w * MIST_BONE_DEFEAT_VISUAL.fogSpreadXRatio,
    offsetY: signedRandom(random) * pose.h * MIST_BONE_DEFEAT_VISUAL.fogSpreadYRatio,
    radiusX: MIST_BONE_DEFEAT_VISUAL.fogRadiusXMin
      + random() * MIST_BONE_DEFEAT_VISUAL.fogRadiusXRange,
    radiusY: MIST_BONE_DEFEAT_VISUAL.fogRadiusYMin
      + random() * MIST_BONE_DEFEAT_VISUAL.fogRadiusYRange,
    velocityX: windDirection * (
      MIST_BONE_DEFEAT_VISUAL.fogWindSpeedMin
      + random() * MIST_BONE_DEFEAT_VISUAL.fogWindSpeedRange
    ),
    velocityY: signedRandom(random) * MIST_BONE_DEFEAT_VISUAL.fogVerticalDrift,
    phase: random() * Math.PI * 2,
  }));
}

function drawMistBoneScatter(
  effect: Extract<BossDefeatSplitEffectState, { kind: "mistBoneScatter" }>,
) {
  if (!ctx) return;

  const elapsedFrames = effect.maxLife - effect.life;
  const progress = elapsedFrames / effect.maxLife;
  drawMistBoneFogWisps(effect, elapsedFrames, progress);
  drawMistBoneFragments(effect, elapsedFrames, progress);
}

function drawMistBoneFogWisps(
  effect: Extract<BossDefeatSplitEffectState, { kind: "mistBoneScatter" }>,
  elapsedFrames: number,
  progress: number,
) {
  if (!ctx) return;

  const centerX = effect.pose.x + effect.pose.w / 2;
  const centerY = effect.pose.y + effect.pose.h / 2;
  ctx.save();
  ctx.fillStyle = `rgb(${MIST_BONE_DEFEAT_VISUAL.fogColor})`;
  ctx.globalAlpha = MIST_BONE_DEFEAT_VISUAL.fogAlpha * (1 - progress);
  for (const wisp of effect.fogWisps) {
    const sway = Math.sin(
      wisp.phase + elapsedFrames * MIST_BONE_DEFEAT_VISUAL.fogSwayRate,
    ) * MIST_BONE_DEFEAT_VISUAL.fogSway;
    ctx.beginPath();
    ctx.ellipse(
      centerX + wisp.offsetX + wisp.velocityX * elapsedFrames,
      centerY + wisp.offsetY + wisp.velocityY * elapsedFrames + sway,
      wisp.radiusX * (1 + progress),
      wisp.radiusY * (1 + progress * 0.5),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawMistBoneFragments(
  effect: Extract<BossDefeatSplitEffectState, { kind: "mistBoneScatter" }>,
  elapsedFrames: number,
  progress: number,
) {
  if (!ctx) return;

  const { pose } = effect;
  const image = pose.sheet.image;
  if (!image) return;
  const safeFrame = ((pose.frame % pose.sheet.count) + pose.sheet.count) % pose.sheet.count;
  const sourceW = pose.sheet.frameW / MIST_BONE_DEFEAT_VISUAL.fragmentColumns;
  const sourceH = pose.sheet.frameH / MIST_BONE_DEFEAT_VISUAL.fragmentRows;
  const drawW = pose.w / MIST_BONE_DEFEAT_VISUAL.fragmentColumns;
  const drawH = pose.h / MIST_BONE_DEFEAT_VISUAL.fragmentRows;
  const centerX = pose.x + pose.w / 2;
  const centerY = pose.y + pose.h / 2;

  for (const fragment of effect.fragments) {
    const localX = -pose.w / 2 + (fragment.column + 0.5) * drawW;
    const localY = -pose.h / 2 + (fragment.row + 0.5) * drawH;
    const drop = MIST_BONE_DEFEAT_VISUAL.fragmentGravity
      * elapsedFrames
      * elapsedFrames
      / 2;
    ctx.save();
    ctx.globalAlpha = splitAlpha(progress);
    ctx.translate(
      centerX
        + localX * pose.facing
        + fragment.velocityX * pose.facing * elapsedFrames,
      centerY + localY + fragment.velocityY * elapsedFrames + drop,
    );
    ctx.rotate(fragment.angularVelocity * elapsedFrames);
    ctx.scale(pose.facing, 1);
    ctx.drawImage(
      image,
      safeFrame * pose.sheet.frameW + fragment.column * sourceW,
      fragment.row * sourceH,
      sourceW,
      sourceH,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH,
    );
    ctx.restore();
  }
}

function signedRandom(random: RandomSource) {
  return random() * 2 - 1;
}

function easeOut(progress: number) {
  return 1 - (1 - progress) ** BOSS_DEFEAT_SPLIT_VISUAL.easingExponent;
}

function splitAlpha(progress: number) {
  const fadeStart = BOSS_DEFEAT_SPLIT_VISUAL.fadeStartProgress;
  if (progress <= fadeStart) return 1;
  return Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart));
}
