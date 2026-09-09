import { RETURNING_BLADE_CONFIG as CONFIG, RETURNING_BLADE_TECHNIQUE_SHEET as SHEET } from "../../constants";
import { ctx } from "../../rendering/context";
import { state } from "../../game/state";
import type { PlayerSkillEffectState } from "../../types/game-state";

const ROUTE_ALPHA = 0.28;
const BLADE_ALPHA = 0.88;
const MARK_ALPHA = 0.6;
const RECALL_MIN_SCALE = 0.72;

function drawTechnique(frame: number, x: number, y: number, scale: number, alpha: number) {
  if (!ctx || !SHEET.image) return;
  const w = SHEET.frameW * scale;
  const h = SHEET.frameH * scale;
  ctx.globalAlpha = alpha;
  ctx.drawImage(SHEET.image, frame * SHEET.frameW, 0, SHEET.frameW, SHEET.frameH, x - w / 2, y - h / 2, w, h);
}

export function drawReturningBladeEffect(effect: PlayerSkillEffectState) {
  if (effect.kind !== "returningBlade" && effect.kind !== "returningBladeCross") return false;
  if (!ctx || state.gameOver || state.player.hp <= 0) return true;
  ctx.save();
  if (effect.kind === "returningBladeCross") {
    const frame = CONFIG.loopFrameCount + Math.min(CONFIG.loopFrameCount - 1, Math.floor(effect.elapsed / CONFIG.frameDuration));
    drawTechnique(frame, effect.x, effect.y, CONFIG.drawScale, effect.life / effect.maxLife);
    ctx.restore();
    return true;
  }
  const route = effect.returningBlade!;
  if (effect.phase === "hover" || effect.phase === "out" || effect.phase === "recall") {
    const locked = effect.phase === "recall";
    const targetX = locked ? route.targetX : state.player.x + state.player.w / 2;
    const targetY = locked ? route.targetY : state.player.y + state.player.h / 2;
    // This thin aiming guide has no collision or independently advancing timer.
    ctx.globalAlpha = ROUTE_ALPHA;
    ctx.strokeStyle = "#a1e5ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
  }
  if (route.level >= CONFIG.requiredLevel) {
    for (const enemy of route.markedEnemies) {
      if (!state.enemies.includes(enemy) || effect.returnHitEnemies?.includes(enemy)) continue;
      drawTechnique(CONFIG.loopFrameCount, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, CONFIG.markDrawScale, MARK_ALPHA);
    }
    const boss = route.markedBoss;
    if (boss && state.boss === boss && route.returnBoss !== boss) {
      drawTechnique(CONFIG.loopFrameCount, boss.x + boss.w / 2, boss.y + boss.h / 2, CONFIG.markDrawScale, MARK_ALPHA);
    }
  }
  if (effect.phase === "hover" || effect.phase === "recall") {
    const warning = effect.phase === "hover" && route.hoverRemaining <= CONFIG.expiryWarningFrames;
    const contraction = effect.phase === "recall"
      ? route.recallRemaining / CONFIG.recallFrames
      : warning ? route.hoverRemaining / CONFIG.expiryWarningFrames : 1;
    const scale = CONFIG.drawScale * (RECALL_MIN_SCALE + (1 - RECALL_MIN_SCALE) * contraction);
    ctx.translate(effect.x, effect.y);
    ctx.scale(effect.facing, 1);
    drawTechnique(Math.floor(effect.elapsed / CONFIG.frameDuration) % CONFIG.loopFrameCount,
      0, 0, scale, BLADE_ALPHA);
  } else {
    ctx.translate(effect.x, effect.y);
    ctx.rotate(Math.atan2(effect.vy, effect.vx || effect.facing));
    drawTechnique(Math.floor(effect.elapsed / CONFIG.frameDuration) % CONFIG.loopFrameCount,
      0, 0, CONFIG.drawScale, BLADE_ALPHA);
  }
  ctx.restore();
  return true;
}
