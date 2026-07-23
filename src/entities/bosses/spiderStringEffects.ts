import { BOSS_SKILL1_CONFIG, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import { playSfx } from "../../game/audio";
import { hurtPlayer } from "../player";
import { damageEnemy } from "../enemies/common";
import { resolveEnemyDefeat } from "../enemies/defeat";
import { BOSS_ARCHETYPE_IDS, bossArchetypeForId } from "./registry";
import { bossAttackDamage } from "./shared";
import type { BossSkill1EffectState } from "../../types/game-state";
import type { LiveBoss } from "./types";

const PROJECTILE_SFX_PITCH = 0.86;

export function spawnBossSkill1Effect(boss: LiveBoss) {
  const facing = boss.castFacing;
  const archetype = bossArchetypeForId(boss.id);
  const damage = bossAttackDamage(
    (archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase)
      * BOSS_SKILL1_CONFIG.damageMultiplier,
  );
  const startX = boss.x + boss.w / 2 + facing * BOSS_SKILL1_CONFIG.effectSpawnXOffset;
  const startY = boss.y + BOSS_SKILL1_CONFIG.effectSpawnYOffset;
  const vx = facing * BOSS_SKILL1_CONFIG.effectSpeed;

  const p = state.player;
  const targetX = p.x + p.w / 2;
  const targetY = p.y + p.h / 2;
  const g = BOSS_SKILL1_CONFIG.effectGravity;
  const dx = Math.abs(targetX - startX);
  const t = Math.max(BOSS_SKILL1_CONFIG.effectMinTravelFrames, dx / BOSS_SKILL1_CONFIG.effectSpeed);
  let vy = (targetY - startY - 0.5 * g * t * t) / t;
  vy = Math.max(BOSS_SKILL1_CONFIG.effectMaxInitialVy, Math.min(BOSS_SKILL1_CONFIG.effectMinInitialVy, vy));

  state.bossSkill1Effects.push({
    kind: "spiderString",
    x: startX,
    y: startY,
    vx,
    vy,
    facing,
    frame: 0,
    elapsed: 0,
    damage,
    hitPlayerCd: 0,
  });
  playSfx("bossProjectile", PROJECTILE_SFX_PITCH);
}

export function updateBossSkill1Effects() {
  const sheet = bossArchetypeForId(BOSS_ARCHETYPE_IDS.spiderString).sheets.effect;
  const drawW = sheet.frameW * BOSS_SKILL1_CONFIG.effectDrawScale;
  const drawH = sheet.frameH * BOSS_SKILL1_CONFIG.effectDrawScale;
  const animTotalFrames = sheet.count * BOSS_SKILL1_CONFIG.effectFrameDuration;

  for (let i = state.bossSkill1Effects.length - 1; i >= 0; i -= 1) {
    const eff = state.bossSkill1Effects[i] as BossSkill1EffectState;
    eff.vy += BOSS_SKILL1_CONFIG.effectGravity;
    eff.x += eff.vx;
    eff.y += eff.vy;
    eff.elapsed += 1;
    if (eff.hitPlayerCd > 0) eff.hitPlayerCd -= 1;

    eff.frame = Math.min(
      sheet.count - 1,
      Math.floor(eff.elapsed / BOSS_SKILL1_CONFIG.effectFrameDuration),
    );

    const effLeft = eff.x - drawW / 2;
    const effRight = eff.x + drawW / 2;
    const effTop = eff.y - drawH / 2;
    const effBottom = eff.y + drawH / 2;

    const p = state.player;
    if (eff.hitPlayerCd <= 0) {
      const overlapX = effRight > p.x && effLeft < p.x + p.w;
      const overlapY = effBottom > p.y && effTop < p.y + p.h;
      if (overlapX && overlapY) {
        hurtPlayer(eff.damage, eff.vx);
        eff.hitPlayerCd = BOSS_SKILL1_CONFIG.hitPlayerCooldown;
      }
    }

    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (enemy.hitCd > 0) continue;
      const overlapX = effRight > enemy.x && effLeft < enemy.x + enemy.w;
      const overlapY = effBottom > enemy.y && effTop < enemy.y + enemy.h;
      if (!overlapX || !overlapY) continue;
      damageEnemy(enemy, eff.damage, BOSS_SKILL1_CONFIG.hitEnemyCooldown);
      resolveEnemyDefeat(enemy, j, "none");
    }

    const offLeft = eff.facing === -1 && effRight < 0;
    const offRight = eff.facing === 1 && effLeft > WIDTH;
    const animDone = eff.elapsed >= animTotalFrames;
    if (offLeft || offRight || animDone) state.bossSkill1Effects.splice(i, 1);
  }
}

export function drawBossSkill1Effects() {
  const sheet = bossArchetypeForId(BOSS_ARCHETYPE_IDS.spiderString).sheets.effect;
  if (!ctx || !sheet.image) return;
  const drawW = sheet.frameW * BOSS_SKILL1_CONFIG.effectDrawScale;
  const drawH = sheet.frameH * BOSS_SKILL1_CONFIG.effectDrawScale;
  for (const e of state.bossSkill1Effects) {
    const sx = e.frame * sheet.frameW;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(e.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}
