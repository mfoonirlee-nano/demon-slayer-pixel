import { state } from "../state";
import { canAutoSpawnEntities } from "../debug";
import {
  WIDTH,
  GROUND_Y,
  BOSS_CONFIG,
  BOSS_SKILL1_CONFIG,
  DEAD_BELL_BLADE_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_WAVE_SHEET,
} from "../constants";
import type { BossSkill1EffectState, BossState, DeadBellBladeState, DeadBellWaveState } from "../types/game-state";
import { clamp, hitbox, frameIndex } from "../utils";
import { drawSheetFrame } from "../graphics";
import { ctx } from "../context";
import { playTone } from "../audio";
import { hurtPlayer } from "./player";
import { spawnEnemy } from "./enemy";
import { damageEnemy } from "./enemies/common";
import { BOSS_ARCHETYPE_IDS, bossArchetypeForId, bossArchetypeForKillCount } from "./bosses/registry";

type LiveBoss = NonNullable<BossState>;

export function spawnBoss() {
  const archetype = bossArchetypeForKillCount(state.bossKills);
  const hp = archetype.hpBase
    + state.bossKills * archetype.hpPerKill
    + state.elapsed * archetype.hpScaleByElapsed;

  state.boss = {
    id: archetype.id,
    x: WIDTH + BOSS_CONFIG.spawnOffsetX,
    y: GROUND_Y - archetype.yOffsetFromGround,
    w: archetype.collisionW,
    h: archetype.collisionH,
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
    actionState: "move",
    actionTimer: 0,
    facing: -1,
    skillCd: archetype.skillInitialCooldown,
    castTimer: 0,
    skillEffectSpawned: false,
    castFacing: -1,
    skillHitDone: false,
    skillMode: archetype.skillMode,
    recoveryTimer: 0,
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
  const boss = state.boss;
  if (!boss) return;

  boss.hitCd -= 1;
  boss.aiTimer -= 1;
  boss.jumpCd -= 1;
  boss.skillCd -= 1;
  boss.actionTimer += 1;

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

  updateBossPhase(boss);

  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) {
    updateDeadBellBoss(boss);
  } else {
    updateSpiderStringBoss(boss);
  }
}

function updateBossPhase(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  const hpRatio = boss.hp / boss.hpMax;
  boss.phase = 1;
  for (const threshold of archetype.phaseThresholds) {
    if (hpRatio < threshold) boss.phase += 1;
  }
}

function damagePlayerOnContact(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  if (hitbox(state.player, boss)) {
    hurtPlayer(archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase, boss.vx);
  }
}

function updateSpiderStringBoss(boss: LiveBoss) {
  if (boss.castTimer > 0) {
    boss.vx = 0;
    boss.castTimer -= 1;
    const framesSinceCastStart = BOSS_SKILL1_CONFIG.castDuration - boss.castTimer;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= BOSS_SKILL1_CONFIG.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnBossSkill1Effect(boss);
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0 && boss.phase >= BOSS_SKILL1_CONFIG.minPhase) {
    const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
    boss.castFacing = toPlayer >= 0 ? 1 : -1;
    boss.facing = boss.castFacing;
    boss.castTimer = BOSS_SKILL1_CONFIG.castDuration;
    boss.skillEffectSpawned = false;
    boss.skillMode = "spiderString";
    boss.actionState = "cast";
    boss.actionTimer = 0;
    boss.skillCd = BOSS_SKILL1_CONFIG.cooldown;
    boss.vx = 0;
    playTone(220, 0.14, "sawtooth", 0.06);
    playTone(320, 0.1, "triangle", 0.05);
    return;
  }

  moveChasingBoss(boss);

  if (boss.aiTimer <= 0) {
    const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
    if (boss.phase >= 2 && Math.random() < BOSS_CONFIG.projectileChance) {
      const dir = Math.sign(toward) || 1;
      for (let i = 0; i < boss.phase; i += 1) {
        state.projectiles.push({
          kind: "boss",
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
    } else if (canAutoSpawnEntities()) {
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
    const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
    boss.vx += Math.sign(toward) * (BOSS_CONFIG.jumpVelocityBase + boss.phase);
    boss.jumpCd = BOSS_CONFIG.jumpCooldown;
  }

  damagePlayerOnContact(boss);
}

function updateDeadBellBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= 0.82;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const castDuration = boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboCastDuration
      : DEAD_BELL_CONFIG.castDuration;
    const framesSinceCastStart = castDuration - boss.castTimer;
    const spawnAtFrame = boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboSpawnAtFrame
      : DEAD_BELL_CONFIG.spawnAtFrame;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnDeadBellPattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = boss.skillMode === "deadBellCombo"
        ? DEAD_BELL_CONFIG.recoveryFrames
        : Math.floor(DEAD_BELL_CONFIG.recoveryFrames * 0.55);
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startDeadBellCast(boss);
    return;
  }

  moveDeadBellBoss(boss);
  damagePlayerOnContact(boss);
}

function moveChasingBoss(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
  boss.actionState = "move";
  boss.vx += Math.sign(toward) * (BOSS_CONFIG.baseSteeringForce + boss.phase * BOSS_CONFIG.phaseSteeringForce);
  boss.vx *= BOSS_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(BOSS_CONFIG.baseMaxVelocity + boss.phase),
    BOSS_CONFIG.baseMaxVelocity + boss.phase,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function moveDeadBellBoss(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
  boss.actionState = "move";
  boss.vx += Math.sign(toward) * (0.045 + boss.phase * 0.012);
  boss.vx *= 0.9;
  boss.vx = clamp(boss.vx, -(3.2 + boss.phase * 0.35), 3.2 + boss.phase * 0.35);
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function startDeadBellCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = boss.phase >= 3
    ? "deadBellCombo"
    : boss.phase >= 2
      ? "deadBellDouble"
      : "deadBellSingle";
  boss.castTimer = boss.skillMode === "deadBellCombo"
    ? DEAD_BELL_CONFIG.comboCastDuration
    : DEAD_BELL_CONFIG.castDuration;
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = boss.skillMode === "deadBellCombo"
    ? DEAD_BELL_CONFIG.comboCooldown
    : Math.max(160, DEAD_BELL_CONFIG.skillCooldown - boss.phase * 18);
  boss.vx = 0;

  playTone(170, 0.16, "sawtooth", 0.055);
  playTone(410, 0.12, "triangle", 0.05);
}

function spawnDeadBellPattern(boss: LiveBoss) {
  if (boss.skillMode === "deadBellSingle") {
    spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
    return;
  }

  if (boss.skillMode === "deadBellDouble") {
    spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
    spawnDeadBellWave(boss, DEAD_BELL_CONFIG.delayedWaveFrames, DEAD_BELL_CONFIG.waveMaxRadius + 34);
    spawnDeadBellBlade(boss, playerBladeLane(), Math.floor(DEAD_BELL_CONFIG.delayedWaveFrames * 0.55));
    return;
  }

  spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.upperBladeY, DEAD_BELL_CONFIG.bladeWarningFrames);
  spawnDeadBellWave(boss, DEAD_BELL_CONFIG.delayedWaveFrames, DEAD_BELL_CONFIG.waveMaxRadius + 46);
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, DEAD_BELL_CONFIG.delayedWaveFrames + 18);
}

function spawnDeadBellWave(boss: LiveBoss, delay: number, maxRadius: number) {
  state.deadBellWaves.push({
    x: boss.x + boss.w / 2,
    y: boss.y + boss.h / 2,
    radius: DEAD_BELL_CONFIG.waveStartRadius,
    maxRadius,
    thickness: DEAD_BELL_CONFIG.waveThickness,
    warningFrames: DEAD_BELL_CONFIG.waveWarningFrames,
    expandFrames: DEAD_BELL_CONFIG.waveExpandFrames,
    delay,
    elapsed: 0,
    frame: 0,
    damage: DEAD_BELL_CONFIG.damageBase + boss.phase * DEAD_BELL_CONFIG.damagePhase,
    hitPlayer: false,
  });
  playTone(130, 0.18, "sine", 0.06);
}

function playerBladeLane() {
  return clamp(
    state.player.y + state.player.h / 2,
    DEAD_BELL_CONFIG.upperBladeY,
    GROUND_Y - DEAD_BELL_CONFIG.bladeHitH * 1.4,
  );
}

function spawnDeadBellBlade(boss: LiveBoss, centerY: number, delay: number) {
  const w = DEAD_BELL_CONFIG.bladeHitW;
  const h = DEAD_BELL_CONFIG.bladeHitH;
  state.deadBellBlades.push({
    x: boss.castFacing === 1 ? boss.x + boss.w : boss.x - w,
    y: centerY - h / 2,
    w,
    h,
    vx: boss.castFacing * DEAD_BELL_CONFIG.bladeSpeed,
    facing: boss.castFacing,
    delay,
    elapsed: 0,
    frame: 0,
    life: DEAD_BELL_CONFIG.bladeLife,
    damage: DEAD_BELL_CONFIG.damageBase + boss.phase * DEAD_BELL_CONFIG.damagePhase + 2,
  });
}

export function drawBoss() {
  const boss = state.boss;
  if (!boss) return;

  const archetype = bossArchetypeForId(boss.id);
  const centerX = boss.x + boss.w / 2;
  const feetY = boss.y + boss.h;

  if (boss.castTimer > 0) {
    const castDuration = boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboCastDuration
      : boss.id === BOSS_ARCHETYPE_IDS.deadBell
        ? DEAD_BELL_CONFIG.castDuration
        : BOSS_SKILL1_CONFIG.castDuration;
    const frameDuration = boss.id === BOSS_ARCHETYPE_IDS.deadBell
      ? DEAD_BELL_CONFIG.castFrameDuration
      : BOSS_SKILL1_CONFIG.castFrameDuration;
    const framesSinceCastStart = castDuration - boss.castTimer;
    const frame = Math.min(
      archetype.sheets.cast.count - 1,
      Math.floor(framesSinceCastStart / frameDuration),
    );
    drawSheetFrame(
      archetype.sheets.cast,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.castFacing,
    );
    drawDeadBellBeatCue(boss);
    return;
  }

  const frame = frameIndex(
    archetype.sheets.move.count,
    BOSS_CONFIG.baseAnimSpeed - boss.phase,
    state.elapsed,
    boss.animSeed,
  );
  drawSheetFrame(
    archetype.sheets.move,
    frame,
    centerX - archetype.drawW / 2,
    feetY - archetype.drawH,
    archetype.drawW,
    archetype.drawH,
    boss.facing,
  );
  drawDeadBellBeatCue(boss);
}

function drawDeadBellBeatCue(boss: LiveBoss) {
  if (!ctx || boss.id !== BOSS_ARCHETYPE_IDS.deadBell) return;

  const comboStopBeat = boss.skillMode === "deadBellCombo"
    && boss.castTimer > DEAD_BELL_CONFIG.comboCastDuration - DEAD_BELL_CONFIG.comboSpawnAtFrame;
  const counterWindow = boss.recoveryTimer > 0;
  if (!comboStopBeat && !counterWindow) return;

  const centerX = boss.x + boss.w / 2;
  const centerY = boss.y + boss.h * 0.42;
  const t = counterWindow
    ? boss.recoveryTimer / DEAD_BELL_CONFIG.recoveryFrames
    : boss.castTimer / DEAD_BELL_CONFIG.comboCastDuration;
  ctx.save();
  ctx.globalAlpha = counterWindow ? 0.35 + t * 0.18 : 0.42 + (1 - t) * 0.25;
  ctx.strokeStyle = counterWindow ? "#f0d08a" : "#c94238";
  ctx.lineWidth = counterWindow ? 2 : 3;
  ctx.setLineDash(counterWindow ? [8, 8] : [3, 10]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, counterWindow ? 56 : 72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(centerX - 46, centerY);
  ctx.lineTo(centerX + 46, centerY);
  ctx.stroke();
  ctx.restore();
}

function spawnBossSkill1Effect(boss: LiveBoss) {
  const facing = boss.castFacing;
  const archetype = bossArchetypeForId(boss.id);
  const damage = (archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase)
    * BOSS_SKILL1_CONFIG.damageMultiplier;
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
  playTone(180, 0.1, "sawtooth", 0.06);
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
      if (enemy.hp <= 0) state.enemies.splice(j, 1);
    }

    const offLeft = eff.facing === -1 && effRight < 0;
    const offRight = eff.facing === 1 && effLeft > WIDTH;
    const animDone = eff.elapsed >= animTotalFrames;
    if (offLeft || offRight || animDone) state.bossSkill1Effects.splice(i, 1);
  }
}

export function updateDeadBellEffects() {
  updateDeadBellWaves();
  updateDeadBellBlades();
}

function updateDeadBellWaves() {
  for (let i = state.deadBellWaves.length - 1; i >= 0; i -= 1) {
    const wave = state.deadBellWaves[i] as DeadBellWaveState;
    if (wave.delay > 0) {
      wave.delay -= 1;
      continue;
    }

    wave.elapsed += 1;
    if (wave.elapsed <= wave.warningFrames) {
      wave.radius = DEAD_BELL_CONFIG.waveStartRadius + Math.sin(wave.elapsed * 0.5) * 4;
      wave.frame = 0;
    } else {
      const activeElapsed = wave.elapsed - wave.warningFrames;
      const t = clamp(activeElapsed / wave.expandFrames, 0, 1);
      wave.radius = DEAD_BELL_CONFIG.waveStartRadius + (wave.maxRadius - DEAD_BELL_CONFIG.waveStartRadius) * t;
      wave.frame = Math.min(
        DEAD_BELL_WAVE_SHEET.count - 1,
        1 + Math.floor(activeElapsed / DEAD_BELL_CONFIG.waveFrameDuration),
      );
    }

    if (!wave.hitPlayer && wave.elapsed > wave.warningFrames) {
      const p = state.player;
      const px = p.x + p.w / 2;
      const py = p.y + p.h / 2;
      const playerRadius = Math.max(p.w, p.h) * 0.35;
      const dist = Math.hypot(px - wave.x, py - wave.y);
      if (Math.abs(dist - wave.radius) <= wave.thickness + playerRadius) {
        wave.hitPlayer = true;
        hurtPlayer(wave.damage, wave.x - px);
      }
    }

    if (wave.elapsed > wave.warningFrames + wave.expandFrames + 14) {
      state.deadBellWaves.splice(i, 1);
    }
  }
}

function updateDeadBellBlades() {
  for (let i = state.deadBellBlades.length - 1; i >= 0; i -= 1) {
    const blade = state.deadBellBlades[i] as DeadBellBladeState;
    if (blade.delay > 0) {
      blade.delay -= 1;
      continue;
    }

    blade.elapsed += 1;
    blade.life -= 1;
    blade.x += blade.vx;
    blade.frame = Math.min(
      DEAD_BELL_BLADE_SHEET.count - 1,
      Math.floor(blade.elapsed / DEAD_BELL_CONFIG.bladeFrameDuration),
    );

    if (hitbox(state.player, blade)) {
      hurtPlayer(blade.damage, blade.vx);
      state.deadBellBlades.splice(i, 1);
      continue;
    }

    const offLeft = blade.vx < 0 && blade.x + blade.w < -DEAD_BELL_CONFIG.bladeDrawW;
    const offRight = blade.vx > 0 && blade.x > WIDTH + DEAD_BELL_CONFIG.bladeDrawW;
    if (blade.life <= 0 || offLeft || offRight) state.deadBellBlades.splice(i, 1);
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

export function drawDeadBellEffects() {
  drawDeadBellWaves();
  drawDeadBellBlades();
}

function drawDeadBellWaves() {
  if (!ctx) return;
  for (const wave of state.deadBellWaves) {
    const warning = wave.delay > 0 || wave.elapsed <= wave.warningFrames;
    const activeElapsed = Math.max(0, wave.elapsed - wave.warningFrames);
    const fade = clamp(1 - activeElapsed / (wave.expandFrames + 18), 0.28, 1);
    const drawW = wave.radius * 2;
    const drawH = drawW * (DEAD_BELL_WAVE_SHEET.frameH / DEAD_BELL_WAVE_SHEET.frameW);
    ctx.save();
    ctx.globalAlpha = warning ? 0.52 : fade;
    drawSheetFrame(
      DEAD_BELL_WAVE_SHEET,
      warning ? 0 : wave.frame,
      wave.x - drawW / 2,
      wave.y - drawH / 2,
      drawW,
      drawH,
    );
    ctx.restore();
  }
}

function drawDeadBellBlades() {
  if (!ctx) return;
  for (const blade of state.deadBellBlades) {
    if (blade.delay > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2 + (1 - blade.delay / DEAD_BELL_CONFIG.bladeWarningFrames) * 0.35;
      ctx.strokeStyle = "#d7b66d";
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(0, blade.y + blade.h / 2);
      ctx.lineTo(WIDTH, blade.y + blade.h / 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const drawX = blade.x + blade.w / 2 - DEAD_BELL_CONFIG.bladeDrawW / 2;
    const drawY = blade.y + blade.h / 2 - DEAD_BELL_CONFIG.bladeDrawH / 2;
    drawSheetFrame(
      DEAD_BELL_BLADE_SHEET,
      blade.frame,
      drawX,
      drawY,
      DEAD_BELL_CONFIG.bladeDrawW,
      DEAD_BELL_CONFIG.bladeDrawH,
      blade.facing,
    );
  }
}
