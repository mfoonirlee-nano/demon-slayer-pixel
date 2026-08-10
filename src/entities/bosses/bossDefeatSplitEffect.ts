import {
  BOSS_DEFEAT_SPLIT_VISUAL,
  BLOOD_MOON_DEATH_SHEET,
  DEAD_BELL_AWAKENED_ECHO_BELL_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_WAVE_SHEET,
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
import { BOSS_ARCHETYPE_IDS, bossArchetypeForId } from "./registry";
import { deadBellWaveDrawSize } from "./deadBellEffects";
import { resolveBossVisualFrame } from "./renderBoss";
import type { LiveBoss } from "./types";

type RandomSource = () => number;

const DEAD_BELL_DEFEAT_MAX_WAVES = 3;
const DEAD_BELL_DEFEAT_FALLBACK_RADIUS = 86;
const DEAD_BELL_DEFEAT_FALLBACK_FRAME = 2;
const DEAD_BELL_DEFEAT_WAVE_SHRINK = 0.18;
const DEAD_BELL_DEFEAT_WAVE_ALPHA = 0.78;
const DEAD_BELL_DEFEAT_BELL_OFFSET_X = 48;
const DEAD_BELL_DEFEAT_BELL_OFFSET_Y_RATIO = 0.38;
const DEAD_BELL_DEFEAT_BELL_SEPARATION = 28;
const DEAD_BELL_DEFEAT_BELL_DROP = 38;
const DEAD_BELL_DEFEAT_BELL_TILT = 0.42;
const DEAD_BELL_DEFEAT_HIGH_TONE_EFFECT = {
  filter: "saturate(1.15) contrast(1.12) drop-shadow(0 0 4px rgba(176, 42, 25, 0.9))",
} as const;
const DEAD_BELL_DEFEAT_AWAKENED_LOW_TONE_EFFECT = {
  filter: "contrast(1.12) brightness(0.9) drop-shadow(0 0 4px rgba(132, 34, 23, 0.82))",
} as const;

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
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) {
    state.bossDefeatSplitEffect = {
      ...commonState,
      kind: "bloodMoonDissolve",
      pose: bloodMoonDeathPose(boss),
    };
    return;
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.mistBone) {
    state.bossDefeatSplitEffect = {
      ...commonState,
      kind: "mistBoneScatter",
      fragments: createMistBoneFragments(random),
      fogWisps: createMistBoneFogWisps(pose, random),
    };
    return;
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) {
    state.bossDefeatSplitEffect = {
      ...commonState,
      kind: "deadBellSilence",
      cutAngle: random() * Math.PI,
      frozenWaves: captureDeadBellDefeatWaves(boss),
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

  if (effect.kind === "bloodMoonDissolve") {
    drawBloodMoonDissolve(effect);
    return;
  }

  if (effect.kind === "mistBoneScatter") {
    drawMistBoneScatter(effect);
    return;
  }

  if (effect.kind === "deadBellSilence") {
    drawDeadBellFrozenWaves(effect);
    drawDeadBellFragments(effect);
  }

  drawSplitHalf(effect, -1);
  drawSplitHalf(effect, 1);
}

function bloodMoonDeathPose(boss: LiveBoss): BossVisualFrameState {
  const archetype = bossArchetypeForId(boss.id);
  const w = archetype.castDrawW;
  const h = w * BLOOD_MOON_DEATH_SHEET.frameH / BLOOD_MOON_DEATH_SHEET.frameW;
  const centerX = boss.x + boss.w / 2;
  const feetY = boss.y + boss.h;
  return {
    sheet: BLOOD_MOON_DEATH_SHEET,
    frame: 0,
    x: centerX - w / 2,
    y: feetY - h + archetype.castBottomPadding,
    w,
    h,
    facing: boss.facing,
  };
}

function drawBloodMoonDissolve(
  effect: Extract<BossDefeatSplitEffectState, { kind: "bloodMoonDissolve" }>,
) {
  if (!ctx) return;
  const elapsed = effect.maxLife - effect.life;
  const frame = Math.min(
    BLOOD_MOON_DEATH_SHEET.count - 1,
    Math.floor(elapsed * BLOOD_MOON_DEATH_SHEET.count / effect.maxLife),
  );
  drawSheetFrame(
    effect.pose.sheet,
    frame,
    effect.pose.x,
    effect.pose.y,
    effect.pose.w,
    effect.pose.h,
    effect.pose.facing,
  );
}

function drawSplitHalf(effect: BossDefeatSplitEffectState, side: -1 | 1) {
  if (!ctx || (effect.kind !== "split" && effect.kind !== "deadBellSilence")) return;

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

function captureDeadBellDefeatWaves(boss: LiveBoss) {
  const activeWaves = state.deadBellWaves
    .filter((wave) => wave.delay <= 0 && wave.elapsed > wave.warningFrames)
    .slice(-DEAD_BELL_DEFEAT_MAX_WAVES)
    .map(({ x, y, radius, frame, tone, awakened }) => ({
      x,
      y,
      radius,
      frame,
      tone,
      awakened,
    }));
  if (activeWaves.length > 0) return activeWaves;

  return [{
    x: boss.x + boss.w / 2,
    y: boss.y + boss.h / 2,
    radius: DEAD_BELL_DEFEAT_FALLBACK_RADIUS,
    frame: DEAD_BELL_DEFEAT_FALLBACK_FRAME,
    tone: boss.awakened ? "high" as const : "low" as const,
    awakened: boss.awakened,
  }];
}

function drawDeadBellFrozenWaves(
  effect: Extract<BossDefeatSplitEffectState, { kind: "deadBellSilence" }>,
) {
  if (!ctx) return;
  const progress = 1 - effect.life / effect.maxLife;
  const radiusScale = 1 - progress * DEAD_BELL_DEFEAT_WAVE_SHRINK;
  ctx.save();
  ctx.globalAlpha *= DEAD_BELL_DEFEAT_WAVE_ALPHA * (1 - progress) ** 2;
  for (const wave of effect.frozenWaves) {
    const radius = wave.radius * radiusScale;
    const { w, h } = deadBellWaveDrawSize(wave.frame, radius);
    drawSheetFrame(
      DEAD_BELL_WAVE_SHEET,
      wave.frame,
      wave.x - w / 2,
      wave.y - h / 2,
      w,
      h,
      1,
      wave.tone === "high"
        ? DEAD_BELL_DEFEAT_HIGH_TONE_EFFECT
        : wave.awakened
          ? DEAD_BELL_DEFEAT_AWAKENED_LOW_TONE_EFFECT
          : undefined,
    );
  }
  ctx.restore();
}

function drawDeadBellFragments(
  effect: Extract<BossDefeatSplitEffectState, { kind: "deadBellSilence" }>,
) {
  if (!ctx) return;
  const progress = 1 - effect.life / effect.maxLife;
  const centerX = effect.pose.x + effect.pose.w / 2
    + effect.pose.facing * DEAD_BELL_DEFEAT_BELL_OFFSET_X;
  const centerY = effect.pose.y + effect.pose.h * DEAD_BELL_DEFEAT_BELL_OFFSET_Y_RATIO;
  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.globalAlpha = splitAlpha(progress);
    ctx.translate(
      centerX + side * easeOut(progress) * DEAD_BELL_DEFEAT_BELL_SEPARATION,
      centerY + progress * progress * DEAD_BELL_DEFEAT_BELL_DROP,
    );
    ctx.rotate(side * progress * DEAD_BELL_DEFEAT_BELL_TILT);
    ctx.beginPath();
    ctx.rect(
      side < 0 ? -DEAD_BELL_CONFIG.awakenedEchoDrawW / 2 : 0,
      -DEAD_BELL_CONFIG.awakenedEchoDrawH / 2,
      DEAD_BELL_CONFIG.awakenedEchoDrawW / 2,
      DEAD_BELL_CONFIG.awakenedEchoDrawH,
    );
    ctx.clip();
    drawSheetFrame(
      DEAD_BELL_AWAKENED_ECHO_BELL_SHEET,
      0,
      -DEAD_BELL_CONFIG.awakenedEchoDrawW / 2,
      -DEAD_BELL_CONFIG.awakenedEchoDrawH / 2,
      DEAD_BELL_CONFIG.awakenedEchoDrawW,
      DEAD_BELL_CONFIG.awakenedEchoDrawH,
      effect.pose.facing,
      DEAD_BELL_DEFEAT_HIGH_TONE_EFFECT,
    );
    ctx.restore();
  }
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
