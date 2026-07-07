import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import {
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  CLOSE_ARC_BASIC_CRESCENT_SHEET,
  PLAYER_COMBAT,
  SKILL_IDS,
  WIDTH,
} from "../../constants";
import type {
  CloseArcBasicCrescentState,
  CloseArcEffectState,
  LineProjectileEffectState,
} from "../../types/game-state";
import { applySkillHitEquipmentRefund, recordBasicAttackHit } from "../../systems/equipment";
import { resolveBossHit, resolveEnemyHit } from "../../systems/combatResolution";
import { hitbox } from "../../game/utils";
import {
  CORE_PLAYER_SKILL_EFFECT_CONFIGS,
  CORE_PLAYER_SKILL_EFFECT_SHEETS,
  lineProjectileEffectSheetForLevel,
  playerSkillColor,
} from "../../systems/skillCatalog";
import { emitHitBurst, emitSlash } from "./bursts";

const LINE_PROJECTILE_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.lineProjectile];
const CLOSE_ARC_EFFECT_SHEET = CORE_PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.closeArc];
const CLOSE_ARC_EFFECT_CONFIG = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.closeArc];
const CLOSE_ARC_FADE_ALPHA_GAIN = 0.7;
const CLOSE_ARC_BASIC_CRESCENT_HIT_COLOR = playerSkillColor(SKILL_IDS.closeArc);
const CLOSE_ARC_BASIC_CRESCENT_ALPHA_FADE = 0.72;

function closeArcBasicCrescentBox(effect: CloseArcBasicCrescentState) {
  return {
    x: effect.x - effect.w / 2,
    y: effect.y - effect.h / 2,
    w: effect.w,
    h: effect.h,
  };
}

export function updateLineProjectileEffects() {
  const p = state.player;
  const baseDamage = (p.baseAttack + p.attackBonus) * LINE_PROJECTILE_EFFECT_CONFIG.damageMultiplier;

  for (let i = state.lineProjectileEffects.length - 1; i >= 0; i -= 1) {
    const eff = state.lineProjectileEffects[i] as LineProjectileEffectState;
    const sheet = lineProjectileEffectSheetForLevel(eff.effectLevel);
    const drawScale = eff.drawScale ?? LINE_PROJECTILE_EFFECT_CONFIG.drawScale;
    const drawW = sheet.frameW * drawScale;
    const drawH = sheet.frameH * drawScale;
    const damage = baseDamage * eff.damageMultiplier;
    let hitTargets = 0;
    let bossHit = false;
    eff.x += eff.vx;
    eff.elapsed += 1;

    // advance frame
    const rawFrame = Math.floor(eff.elapsed / LINE_PROJECTILE_EFFECT_CONFIG.frameDuration);
    if (rawFrame < sheet.count) {
      eff.frame = rawFrame;
    } else {
      const loopLen = sheet.count - LINE_PROJECTILE_EFFECT_CONFIG.loopFromFrame;
      eff.frame = LINE_PROJECTILE_EFFECT_CONFIG.loopFromFrame + ((rawFrame - sheet.count) % loopLen);
    }

    // hitbox of the effect
    const effLeft = eff.x - drawW / 2;
    const effRight = eff.x + drawW / 2;
    const effTop = eff.y;
    const effBottom = eff.y + drawH;

    // damage enemies
    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (enemy.hitCd > 0) continue;
      const overlapX = effRight > enemy.x && effLeft < enemy.x + enemy.w;
      const overlapY = effBottom > enemy.y && effTop < enemy.y + enemy.h;
      if (!overlapX || !overlapY) continue;
      const hit = resolveEnemyHit({
        enemy,
        enemyIndex: j,
        hitRect: { x: effLeft, y: effTop, w: drawW, h: drawH },
        damage,
        hitCooldown: LINE_PROJECTILE_EFFECT_CONFIG.hitCooldown,
        reward: "enemyNoCover",
      });
      hitTargets += 1;
      emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, enemy.w);
      emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
    }

    // damage boss
    if (state.boss && state.boss.hitCd <= 0) {
      const boss = state.boss;
      const overlapX = effRight > boss.x && effLeft < boss.x + boss.w;
      const overlapY = effBottom > boss.y && effTop < boss.y + boss.h;
      if (overlapX && overlapY) {
        bossHit = true;
        const hit = resolveBossHit(
          {
            boss,
            hitRect: { x: effLeft, y: effTop, w: drawW, h: drawH },
            damage,
            hitCooldown: LINE_PROJECTILE_EFFECT_CONFIG.hitCooldown,
          },
        );
        emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossSlashColor);
        emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
      }
    }

    if (!eff.refundedSkillEnergy && applySkillHitEquipmentRefund(state, hitTargets, bossHit)) {
      eff.refundedSkillEnergy = true;
    }

    // despawn when fully offscreen
    const offLeft = eff.facing === -1 && effRight < 0;
    const offRight2 = eff.facing === 1 && effLeft > WIDTH;
    if (offLeft || offRight2) state.lineProjectileEffects.splice(i, 1);
  }
}

export function updateCloseArcEffects() {
  const sheet = CLOSE_ARC_EFFECT_SHEET;
  const p = state.player;
  const baseDamage = (p.baseAttack + p.attackBonus) * CLOSE_ARC_EFFECT_CONFIG.damageMultiplier;

  for (let i = state.closeArcEffects.length - 1; i >= 0; i -= 1) {
    const eff = state.closeArcEffects[i] as CloseArcEffectState;
    const drawScale = eff.drawScale ?? CLOSE_ARC_EFFECT_CONFIG.drawScale;
    const drawW = sheet.frameW * drawScale;
    const drawH = sheet.frameH * drawScale;
    const maxTravel = eff.maxTravel ?? CLOSE_ARC_EFFECT_CONFIG.maxTravel;
    const damage = baseDamage * eff.damageMultiplier;
    let hitTargets = 0;
    let bossHit = false;
    eff.x += eff.vx;
    eff.traveled += Math.abs(eff.vx);
    eff.elapsed += 1;

    const rawFrame = Math.floor(eff.elapsed / CLOSE_ARC_EFFECT_CONFIG.frameDuration);
    eff.frame = Math.min(sheet.count - 1, rawFrame);

    const effLeft = eff.x - drawW / 2;
    const effRight = eff.x + drawW / 2;
    const effTop = eff.y;
    const effBottom = eff.y + drawH;

    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (enemy.hitCd > 0) continue;
      const overlapX = effRight > enemy.x && effLeft < enemy.x + enemy.w;
      const overlapY = effBottom > enemy.y && effTop < enemy.y + enemy.h;
      if (!overlapX || !overlapY) continue;
      const hit = resolveEnemyHit({
        enemy,
        enemyIndex: j,
        hitRect: { x: effLeft, y: effTop, w: drawW, h: drawH },
        damage,
        hitCooldown: CLOSE_ARC_EFFECT_CONFIG.hitCooldown,
        reward: "enemyNoCover",
      });
      hitTargets += 1;
      emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, enemy.w);
      emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillEnemyBurstColor, PLAYER_COMBAT.skillEnemyBurstPower);
    }

    if (state.boss && state.boss.hitCd <= 0) {
      const boss = state.boss;
      const overlapX = effRight > boss.x && effLeft < boss.x + boss.w;
      const overlapY = effBottom > boss.y && effTop < boss.y + boss.h;
      if (overlapX && overlapY) {
        bossHit = true;
        const hit = resolveBossHit(
          {
            boss,
            hitRect: { x: effLeft, y: effTop, w: drawW, h: drawH },
            damage,
            hitCooldown: CLOSE_ARC_EFFECT_CONFIG.hitCooldown,
          },
        );
        emitSlash(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossSlashColor);
        emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.skillBossBurstColor, PLAYER_COMBAT.skillBossBurstPower);
      }
    }

    if (!eff.refundedSkillEnergy && applySkillHitEquipmentRefund(state, hitTargets, bossHit)) {
      eff.refundedSkillEnergy = true;
    }

    if (eff.traveled >= maxTravel) state.closeArcEffects.splice(i, 1);
  }
}

export function updateCloseArcBasicCrescentEffects() {
  for (let i = state.closeArcBasicCrescents.length - 1; i >= 0; i -= 1) {
    const effect = state.closeArcBasicCrescents[i] as CloseArcBasicCrescentState;
    const box = closeArcBasicCrescentBox(effect);

    effect.elapsed += 1;
    effect.life -= 1;
    effect.frame = Math.min(
      CLOSE_ARC_BASIC_CRESCENT_SHEET.count - 1,
      Math.floor(effect.elapsed / CLOSE_ARC_BASIC_CRESCENT_CONFIG.frameDuration),
    );

    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (enemy.hitCd > 0 || effect.hitEnemies.includes(enemy) || !hitbox(box, enemy)) continue;

      effect.hitEnemies.push(enemy);
      const hit = resolveEnemyHit({
        enemy,
        enemyIndex: j,
        hitRect: box,
        damage: effect.damage,
        hitCooldown: PLAYER_COMBAT.attackEnemyHitCooldown,
        reward: "attack",
        afterDamage: () => recordBasicAttackHit(state, "enemy"),
      });
      emitSlash(hit.hitX, hit.hitY, CLOSE_ARC_BASIC_CRESCENT_HIT_COLOR, enemy.w);
      emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.attackEnemyBurstColor, PLAYER_COMBAT.attackEnemyBurstPower);
    }

    if (
      state.boss
      && !effect.bossHit
      && state.boss.hitCd <= 0
      && hitbox(box, state.boss)
    ) {
      effect.bossHit = true;
      const hit = resolveBossHit({
        boss: state.boss,
        hitRect: box,
        damage: effect.damage,
        hitCooldown: PLAYER_COMBAT.attackBossHitCooldown,
        afterDamage: () => recordBasicAttackHit(state, "boss"),
      });
      emitSlash(hit.hitX, hit.hitY, CLOSE_ARC_BASIC_CRESCENT_HIT_COLOR);
      emitHitBurst(hit.hitX, hit.hitY, PLAYER_COMBAT.effects.attackBossBurstColor, PLAYER_COMBAT.attackBossBurstPower);
    }

    if (effect.life <= 0) state.closeArcBasicCrescents.splice(i, 1);
  }
}

export function drawLineProjectileEffects() {
  if (!ctx) return;
  for (const e of state.lineProjectileEffects) {
    const sheet = lineProjectileEffectSheetForLevel(e.effectLevel);
    if (!sheet.image) continue;
    const drawScale = e.drawScale ?? LINE_PROJECTILE_EFFECT_CONFIG.drawScale;
    const drawH = sheet.frameH * drawScale;
    const drawW = sheet.frameW * drawScale;
    const sx = e.frame * sheet.frameW;
    ctx.save();
    ctx.translate(e.x, e.y + drawH / 2);
    ctx.scale(e.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

export function drawCloseArcEffects() {
  if (!ctx) return;
  const sheet = CLOSE_ARC_EFFECT_SHEET;
  if (!sheet.image) return;
  for (const e of state.closeArcEffects) {
    const drawScale = e.drawScale ?? CLOSE_ARC_EFFECT_CONFIG.drawScale;
    const drawH = sheet.frameH * drawScale;
    const drawW = sheet.frameW * drawScale;
    const maxTravel = e.maxTravel ?? CLOSE_ARC_EFFECT_CONFIG.maxTravel;
    const sx = e.frame * sheet.frameW;
    const fadeT = Math.max(0, e.traveled / maxTravel * 2 - 1);
    const alpha = 1 - fadeT * CLOSE_ARC_FADE_ALPHA_GAIN;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(e.x - e.facing * CLOSE_ARC_EFFECT_CONFIG.visualBackOffset, e.y + drawH / 2);
    ctx.scale(e.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

export function drawCloseArcBasicCrescentEffects() {
  const sheet = CLOSE_ARC_BASIC_CRESCENT_SHEET;
  const image = sheet.image;
  if (!ctx || !image) return;

  for (const effect of state.closeArcBasicCrescents) {
    const drawW = sheet.frameW * effect.drawScale;
    const drawH = sheet.frameH * effect.drawScale;
    const sx = effect.frame * sheet.frameW;
    const fadeT = 1 - Math.max(0, effect.life) / effect.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - fadeT * CLOSE_ARC_BASIC_CRESCENT_ALPHA_FADE;
    ctx.translate(effect.x, effect.y);
    ctx.scale(effect.facing, 1);
    ctx.drawImage(image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}
