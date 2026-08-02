import {
  BLOOD_MOON_CONFIG,
  BLOOD_MOON_LANTERN_BELL_EFFECT_SHEET,
  BLOOD_MOON_MANY_FACES_EFFECT_SHEET,
  BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
  BLOOD_MOON_SIXFOLD_EFFECT_SHEET,
  BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
  WIDTH,
} from "../../constants";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { hurtPlayer } from "../player";
import type { BloodMoonEffectState } from "../../types/game-state";

const EFFECT_FADE_MIN_ALPHA = 0.24;
const EFFECT_WARNING_ALPHA = 0.42;
const EFFECT_WARNING_SPRITE_FRAMES = 2;

function bloodMoonEffectSpec(kind: BloodMoonEffectState["kind"]) {
  if (kind === "mirrorFang") {
    return {
      sheet: BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
      frameDuration: BLOOD_MOON_CONFIG.mirrorFangFrameDuration,
      drawW: BLOOD_MOON_CONFIG.mirrorFangDrawW,
      drawH: BLOOD_MOON_CONFIG.mirrorFangDrawH,
      groundAligned: false,
      bottomPadding: 0,
    };
  }
  if (kind === "lanternBell") {
    return {
      sheet: BLOOD_MOON_LANTERN_BELL_EFFECT_SHEET,
      frameDuration: BLOOD_MOON_CONFIG.lanternBellFrameDuration,
      drawW: BLOOD_MOON_CONFIG.lanternBellDrawW,
      drawH: BLOOD_MOON_CONFIG.lanternBellDrawH,
      groundAligned: false,
      bottomPadding: 0,
    };
  }
  if (kind === "sixfold") {
    return {
      sheet: BLOOD_MOON_SIXFOLD_EFFECT_SHEET,
      frameDuration: BLOOD_MOON_CONFIG.sixfoldFrameDuration,
      drawW: BLOOD_MOON_CONFIG.sixfoldDrawW,
      drawH: BLOOD_MOON_CONFIG.sixfoldDrawH,
      groundAligned: false,
      bottomPadding: 0,
    };
  }
  if (kind === "manyFaces") {
    return {
      sheet: BLOOD_MOON_MANY_FACES_EFFECT_SHEET,
      frameDuration: BLOOD_MOON_CONFIG.manyFacesFrameDuration,
      drawW: BLOOD_MOON_CONFIG.manyFacesDrawW,
      drawH: BLOOD_MOON_CONFIG.manyFacesDrawH,
      groundAligned: false,
      bottomPadding: 0,
    };
  }
  return {
    sheet: BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
    frameDuration: BLOOD_MOON_CONFIG.spiderMistFrameDuration,
    drawW: BLOOD_MOON_CONFIG.spiderMistDrawW,
    drawH: BLOOD_MOON_CONFIG.spiderMistDrawH,
    groundAligned: true,
    bottomPadding: 14,
  };
}

export function updateBloodMoonEffects() {
  for (let i = state.bloodMoonEffects.length - 1; i >= 0; i -= 1) {
    const effect = state.bloodMoonEffects[i] as BloodMoonEffectState;
    if (effect.delay > 0) {
      effect.delay -= 1;
      continue;
    }

    const spec = bloodMoonEffectSpec(effect.kind);
    effect.elapsed += 1;
    effect.life -= 1;
    if (effect.hitPlayerCd > 0) effect.hitPlayerCd -= 1;

    const warningSpriteFrames = effect.warningFrames > 0
      ? Math.min(EFFECT_WARNING_SPRITE_FRAMES, spec.sheet.count - 1)
      : 0;
    effect.frame = effect.elapsed <= effect.warningFrames
      ? Math.min(
        warningSpriteFrames - 1,
        Math.floor(
          Math.max(0, effect.elapsed - 1)
            * warningSpriteFrames
            / effect.warningFrames,
        ),
      )
      : Math.min(
        spec.sheet.count - 1,
        warningSpriteFrames + Math.floor(
          (effect.elapsed - effect.warningFrames) / spec.frameDuration,
        ),
      );

    if (effect.kind === "mirrorFang" && effect.elapsed > effect.warningFrames) {
      effect.x += effect.vx;
    }

    if (
      effect.damage > 0
      && effect.elapsed > effect.warningFrames
      && !effect.hitDone
      && effect.hitPlayerCd <= 0
      && hitbox(state.player, effect)
    ) {
      hurtPlayer(effect.damage, effect.vx || effect.x - (state.player.x + state.player.w / 2));
      effect.hitDone = true;
      effect.hitPlayerCd = BLOOD_MOON_CONFIG.hitPlayerCooldown;
    }

    const offLeft = effect.kind === "mirrorFang" && effect.x + effect.w < -spec.drawW;
    const offRight = effect.kind === "mirrorFang" && effect.x > WIDTH + spec.drawW;
    if (effect.life <= 0 || offLeft || offRight) state.bloodMoonEffects.splice(i, 1);
  }
}

export function drawBloodMoonEffects() {
  if (!ctx) return;
  for (const effect of state.bloodMoonEffects) {
    if (effect.delay > 0) continue;

    const spec = bloodMoonEffectSpec(effect.kind);
    if (!spec.sheet.image) continue;
    const centerX = effect.x + effect.w / 2;
    const drawX = centerX - spec.drawW / 2;
    const drawY = spec.groundAligned
      ? effect.y + effect.h - spec.drawH + spec.bottomPadding
      : effect.y + effect.h / 2 - spec.drawH / 2;
    const fade = clamp(effect.life / Math.max(1, effect.life + effect.elapsed), EFFECT_FADE_MIN_ALPHA, 1);

    ctx.save();
    ctx.globalAlpha = effect.elapsed <= effect.warningFrames ? EFFECT_WARNING_ALPHA : fade;
    drawSheetFrame(
      spec.sheet,
      effect.frame,
      drawX,
      drawY,
      spec.drawW,
      spec.drawH,
      effect.facing,
    );
    ctx.restore();
  }
}
