import { state } from "../state";
import {
  WIDTH,
  GROUND_Y,
  BOSS_SHEET,
  BOSS_SKILL1_SHEET,
  BOSS_SKILL1_EFFECT_SHEET,
  BOSS_CONFIG,
  BOSS_SKILL1_CONFIG,
} from "../constants";
import type { BossSkill1EffectState, BossState } from "../types/game-state";
import { hitbox, frameIndex } from "../utils";
import { drawSheetFrame } from "../graphics";
import { ctx } from "../context";
import { playTone } from "../audio";
import { hurtPlayer } from "./player";
import { spawnEnemy } from "./enemy";

export function spawnBoss() {
  const hp = BOSS_CONFIG.baseHp + state.elapsed * BOSS_CONFIG.hpScaleByElapsed;
  state.boss = {
    x: WIDTH + BOSS_CONFIG.spawnOffsetX,
    y: GROUND_Y - BOSS_CONFIG.yOffsetFromGround,
    w: BOSS_CONFIG.w,
    h: BOSS_CONFIG.h,
    vx: BOSS_CONFIG.entryVelocityX,
    targetX: WIDTH - BOSS_CONFIG.targetXOffset,
    entering: true,
    hpMax: hp,
    hp,
    phase: 1,
    hitCd: 0,
    aiTimer: 0,
    jumpCd: 0,
    animSeed: Math.floor(Math.random() * BOSS_CONFIG.animSeedMax),
    skillCd: BOSS_SKILL1_CONFIG.initialCooldown,
    castTimer: 0,
    skillEffectSpawned: false,
    castFacing: -1,
  };
  playTone(
    BOSS_CONFIG.tones.spawnPrimary.frequency,
    BOSS_CONFIG.tones.spawnPrimary.duration,
    "sawtooth",
    BOSS_CONFIG.tones.spawnPrimary.volume,
  );
  playTone(
    BOSS_CONFIG.tones.spawnSecondary.frequency,
    BOSS_CONFIG.tones.spawnSecondary.duration,
    "sawtooth",
    BOSS_CONFIG.tones.spawnSecondary.volume,
  );
}

export function updateBoss() {
  const boss = state.boss as BossState;
  if (!boss) return;

  boss.hitCd -= 1;
  boss.aiTimer -= 1;
  boss.jumpCd -= 1;
  boss.skillCd -= 1;

  if (boss.entering) {
    boss.x += boss.vx;
    if (boss.x <= boss.targetX) {
      boss.x = boss.targetX;
      boss.vx = 0;
      boss.entering = false;
      boss.aiTimer = BOSS_CONFIG.entryAiDelay;
    }
    return;
  }

  if (boss.hp < boss.hpMax * BOSS_CONFIG.phaseTwoThreshold) boss.phase = 2;
  if (boss.hp < boss.hpMax * BOSS_CONFIG.phaseThreeThreshold) boss.phase = 3;

  if (boss.castTimer > 0) {
    boss.vx = 0;
    boss.castTimer -= 1;
    const framesSinceCastStart = BOSS_SKILL1_CONFIG.castDuration - boss.castTimer;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= BOSS_SKILL1_CONFIG.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnBossSkill1Effect(boss);
    }
    if (hitbox(state.player, boss)) {
      hurtPlayer(BOSS_CONFIG.touchDamageBase + boss.phase * BOSS_CONFIG.touchDamagePhase, boss.vx);
    }
    return;
  }

  if (boss.skillCd <= 0 && boss.phase >= BOSS_SKILL1_CONFIG.minPhase) {
    const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
    boss.castFacing = toPlayer >= 0 ? 1 : -1;
    boss.castTimer = BOSS_SKILL1_CONFIG.castDuration;
    boss.skillEffectSpawned = false;
    boss.skillCd = BOSS_SKILL1_CONFIG.cooldown;
    boss.vx = 0;
    playTone(220, 0.14, "sawtooth", 0.06);
    playTone(320, 0.1, "triangle", 0.05);
    return;
  }

  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.vx += Math.sign(toward) * (BOSS_CONFIG.baseSteeringForce + boss.phase * BOSS_CONFIG.phaseSteeringForce);
  boss.vx *= BOSS_CONFIG.drag;
  boss.vx = Math.max(-(BOSS_CONFIG.baseMaxVelocity + boss.phase), Math.min(BOSS_CONFIG.baseMaxVelocity + boss.phase, boss.vx));
  boss.x += boss.vx;
  boss.x = Math.max(0, Math.min(WIDTH - boss.w, boss.x));

  if (boss.aiTimer <= 0) {
    if (boss.phase >= 2 && Math.random() < BOSS_CONFIG.projectileChance) {
      const dir = Math.sign(toward) || 1;
      for (let i = 0; i < boss.phase; i += 1) {
        state.projectiles.push({
          x: boss.x + boss.w / 2,
          y: boss.y + BOSS_CONFIG.projectileYOffset + i * BOSS_CONFIG.projectileYOffsetStep,
          w: BOSS_CONFIG.projectileW,
          h: BOSS_CONFIG.projectileH,
          vx: (BOSS_CONFIG.projectileBaseSpeed + i * BOSS_CONFIG.projectileSpeedStep) * dir,
          life: BOSS_CONFIG.projectileLife,
          damage: BOSS_CONFIG.projectileBaseDamage + boss.phase,
        });
      }
      playTone(
        BOSS_CONFIG.tones.projectile.frequency,
        BOSS_CONFIG.tones.projectile.duration,
        "sawtooth",
        BOSS_CONFIG.tones.projectile.volume,
      );
    } else {
      spawnEnemy();
      if (boss.phase >= BOSS_CONFIG.summonExtraEnemyPhase) spawnEnemy();
      playTone(
        BOSS_CONFIG.tones.summon.frequency,
        BOSS_CONFIG.tones.summon.duration,
        "square",
        BOSS_CONFIG.tones.summon.volume,
      );
    }
    boss.aiTimer = BOSS_CONFIG.aiBaseCooldown - boss.phase * BOSS_CONFIG.aiPhaseReduction;
  }

  if (boss.jumpCd <= 0 && Math.random() < BOSS_CONFIG.jumpChancePerPhase * boss.phase) {
    boss.vx += Math.sign(toward) * (BOSS_CONFIG.jumpVelocityBase + boss.phase);
    boss.jumpCd = BOSS_CONFIG.jumpCooldown;
  }

  if (hitbox(state.player, boss)) {
    hurtPlayer(BOSS_CONFIG.touchDamageBase + boss.phase * BOSS_CONFIG.touchDamagePhase, boss.vx);
  }
}

export function drawBoss() {
  const boss = state.boss as BossState;
  if (!boss) return;

  if (boss.castTimer > 0) {
    const framesSinceCastStart = BOSS_SKILL1_CONFIG.castDuration - boss.castTimer;
    const frame = Math.min(
      BOSS_SKILL1_SHEET.count - 1,
      Math.floor(framesSinceCastStart / BOSS_SKILL1_CONFIG.castFrameDuration),
    );
    const centerX = boss.x + boss.w / 2;
    const feetY = boss.y + boss.h;
    const drawX = centerX - BOSS_SKILL1_CONFIG.drawW / 2;
    const drawY = feetY - BOSS_SKILL1_CONFIG.drawH + BOSS_SKILL1_CONFIG.drawBottomPadding;
    drawSheetFrame(
      BOSS_SKILL1_SHEET,
      frame,
      drawX,
      drawY,
      BOSS_SKILL1_CONFIG.drawW,
      BOSS_SKILL1_CONFIG.drawH,
      boss.castFacing,
    );
    return;
  }

  const frame = frameIndex(BOSS_SHEET.count, BOSS_CONFIG.baseAnimSpeed - boss.phase, state.elapsed, boss.animSeed);
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  const facing = toward >= 0 ? 1 : -1;
  const centerX = boss.x + boss.w / 2;
  const feetY = boss.y + boss.h;
  drawSheetFrame(
    BOSS_SHEET,
    frame,
    centerX - BOSS_CONFIG.drawW / 2,
    feetY - BOSS_CONFIG.drawH,
    BOSS_CONFIG.drawW,
    BOSS_CONFIG.drawH,
    facing,
  );
}

function spawnBossSkill1Effect(boss: NonNullable<BossState>) {
  const facing = boss.castFacing;
  const damage = (BOSS_CONFIG.touchDamageBase + boss.phase * BOSS_CONFIG.touchDamagePhase) * BOSS_SKILL1_CONFIG.damageMultiplier;
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
  playTone(180, 0.1, "sawtooth", 0.06);
}

export function updateBossSkill1Effects() {
  const sheet = BOSS_SKILL1_EFFECT_SHEET;
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
      enemy.hp -= eff.damage;
      enemy.hitCd = BOSS_SKILL1_CONFIG.hitEnemyCooldown;
      if (enemy.hp <= 0) state.enemies.splice(j, 1);
    }

    const offLeft = eff.facing === -1 && effRight < 0;
    const offRight = eff.facing === 1 && effLeft > WIDTH;
    const animDone = eff.elapsed >= animTotalFrames;
    if (offLeft || offRight || animDone) state.bossSkill1Effects.splice(i, 1);
  }
}

export function drawBossSkill1Effects() {
  if (!ctx) return;
  const sheet = BOSS_SKILL1_EFFECT_SHEET;
  if (!sheet.image) return;
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
