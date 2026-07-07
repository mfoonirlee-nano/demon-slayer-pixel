import { ctx } from "../../rendering/context";
import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { hasDebugInfiniteHealth } from "../../game/debug";
import {
  BINDER_SHEET_INDEX,
  BINDER_MAGIC_CIRCLE_SHEET,
  BINDER_SHEETS,
  ENEMY_SHEETS,
} from "../../constants";
import { drawSheetFrame } from "../../rendering/graphics";
import type { BinderAiPhase, BinderPhase, BinderTalismanDebuff, EnemyState } from "../../types/game-state";
import { frameIndex } from "../../game/utils";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import {
  drawEnemyFrame,
  drawEnemySheetFrame,
  enemyCenterX,
  enemyDrawScale,
  enemyFeetY,
  hasAwakenedGrowth,
  isEliteEnemy,
} from "./common";
import { endRun } from "../../systems/runLifecycle";

export const BINDER_UNLOCK_SECONDS = 90;

const BINDER_CONFIG = {
  minRange: 185,
  maxRange: 275,
  preferredRange: 230,
  rangeSlack: 16,
  seekBaseSpeed: 0.42,
  seekRandomSpeed: 0.22,
  seekSpeedScale: 0.025,
  seekSpeedMaxBonus: 0.18,
  repositionScale: 0.4,
  retreatScale: 1.2,
  windupFrames: 48,
  castFrames: 24,
  recoverFrames: 42,
  castSpawnFrame: 10,
  seekCooldownMinFrames: 68,
  seekCooldownJitterFrames: 34,
  blockedRetryFrames: 18,
  maxActiveBinders: 1,
  maxActiveZones: 1,
  maxActiveTalismans: 2,
  zoneLifeFrames: 72,
  awakenedZoneLifeBonusFrames: 10,
  eliteZoneLifeBonusFrames: 18,
  zoneRadius: 76,
  awakenedZoneRadiusBonus: 8,
  eliteZoneRadiusBonus: 16,
  zoneForwardOffset: 92,
  zoneTalismanReleaseFrame: 14,
  talismanStartYOffset: 42,
  talismanCollisionW: 20,
  talismanCollisionH: 28,
  talismanLifeFrames: 160,
  talismanSpeed: 4.15,
  talismanTrackingFrames: 54,
  talismanTurnRate: 0.058,
  talismanSlowMoveScale: 0.45,
  talismanDebuffFrames: 210,
  talismanDamageFirstFrame: 24,
  talismanDamageIntervalFrames: 36,
  zoneDamageInvincibleFrames: 10,
  zoneDamageBase: 2,
  zoneDamagePerMinute: 1.25,
  zoneDamageMax: 7,
  zoneFrameDuration: 10,
  zoneLoopStartFrame: 1,
  zoneFadeFrames: 16,
  zoneAlpha: 0.88,
  zoneDrawWidthScale: 2.52,
  stunActiveFrames: 22,
  stunCooldownMinFrames: 34,
  stunCooldownJitterFrames: 48,
  drawScale: 1,
  hpMultiplier: 1.5,
  collisionScaleX: 0.92,
  moveAnimSpeed: 9,
  windupFrameDuration: 12,
  castFrameDuration: 6,
  recoverFrameDuration: 14,
} as const;

const SECONDS_PER_MINUTE = 60;
const HALF_DIVISOR = 2;
const ZONE_DAMAGE_SFX_PITCH = 0.82;
const PLAYER_HURT_SFX_PITCH = 0.9;
const CAST_START_SFX_PITCH = 0.86;
const CAST_RELEASE_SFX_PITCH = 0.82;
const FINAL_BINDER_DEBUFFS: BinderTalismanDebuff[] = ["slow", "damage", "keyScramble", "stun"];

function difficultyK() {
  return state.elapsed / SECONDS_PER_MINUTE;
}

function randomFrameCount(min: number, jitter: number) {
  return min + Math.floor(Math.random() * jitter);
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function playerCenterY() {
  return state.player.y + state.player.h / HALF_DIVISOR;
}

function binderFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.binderFacing ?? 1;
  return Math.sign(toward);
}

function binderSeekSpeed() {
  return BINDER_CONFIG.seekBaseSpeed
    + Math.min(BINDER_CONFIG.seekSpeedMaxBonus, difficultyK() * BINDER_CONFIG.seekSpeedScale)
    + Math.random() * BINDER_CONFIG.seekRandomSpeed;
}

function isBinder(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === BINDER_SHEET_INDEX;
}

function bindingZoneCount() {
  return state.bindingZones.length;
}

function bindingZoneDamage() {
  return Math.min(
    BINDER_CONFIG.zoneDamageMax,
    BINDER_CONFIG.zoneDamageBase + difficultyK() * BINDER_CONFIG.zoneDamagePerMinute,
  );
}

function bindingZoneLife(enemy: EnemyState) {
  if (isEliteEnemy(enemy)) return BINDER_CONFIG.zoneLifeFrames + BINDER_CONFIG.eliteZoneLifeBonusFrames;
  if (hasAwakenedGrowth(enemy)) return BINDER_CONFIG.zoneLifeFrames + BINDER_CONFIG.awakenedZoneLifeBonusFrames;
  return BINDER_CONFIG.zoneLifeFrames;
}

function bindingZoneRadius(enemy: EnemyState) {
  if (isEliteEnemy(enemy)) return BINDER_CONFIG.zoneRadius + BINDER_CONFIG.eliteZoneRadiusBonus;
  if (hasAwakenedGrowth(enemy)) return BINDER_CONFIG.zoneRadius + BINDER_CONFIG.awakenedZoneRadiusBonus;
  return BINDER_CONFIG.zoneRadius;
}

function bindingTalismanMoveScale() {
  return state.player.binderTalismanSlowTimer > 0
    ? BINDER_CONFIG.talismanSlowMoveScale
    : 1;
}

function randomStunCooldown() {
  return randomFrameCount(
    BINDER_CONFIG.stunCooldownMinFrames,
    BINDER_CONFIG.stunCooldownJitterFrames,
  );
}

function applyBinderTalismanDamage() {
  if (hasDebugInfiniteHealth()) return;

  const player = state.player;
  if (player.invincible > 0) return;

  player.hp = Math.max(0, player.hp - bindingZoneDamage());
  player.invincible = BINDER_CONFIG.zoneDamageInvincibleFrames;
  playSfx("enemyImpact", ZONE_DAMAGE_SFX_PITCH);
  if (player.hp <= 0) {
    playSfx("playerDeath");
    endRun(state);
  } else {
    playSfx("playerHurt", PLAYER_HURT_SFX_PITCH);
  }
}

function enterBinderPhase(enemy: EnemyState, phase: BinderAiPhase) {
  enemy.binderPhase = phase;
  enemy.binderCastSpawned = false;
  if (phase === "windup") {
    enemy.binderTimer = BINDER_CONFIG.windupFrames;
    playSfx("enemyCastStart", CAST_START_SFX_PITCH);
  } else if (phase === "cast") {
    enemy.binderTimer = BINDER_CONFIG.castFrames;
  } else if (phase === "recover") {
    enemy.binderTimer = BINDER_CONFIG.recoverFrames;
  } else {
    enemy.binderTimer = randomFrameCount(
      BINDER_CONFIG.seekCooldownMinFrames,
      BINDER_CONFIG.seekCooldownJitterFrames,
    );
  }
}

function initBinder(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.binderPhase = "seekRange";
  enemy.binderTimer = randomFrameCount(
    BINDER_CONFIG.seekCooldownMinFrames,
    BINDER_CONFIG.seekCooldownJitterFrames,
  );
  enemy.binderFacing = -context.side;
  enemy.binderBaseSpeed = context.speed;
  enemy.binderCastSpawned = false;
}

function randomFinalDebuffs() {
  const pool = [...FINAL_BINDER_DEBUFFS];
  const firstIndex = Math.floor(Math.random() * pool.length);
  const first = pool.splice(firstIndex, 1)[0]!;
  const secondIndex = Math.floor(Math.random() * pool.length);
  return [first, pool[secondIndex]!];
}

function binderTalismanDebuffs(enemy: EnemyState): BinderTalismanDebuff[] {
  if (enemy.growthStage === "final") return randomFinalDebuffs();
  if (hasAwakenedGrowth(enemy)) return ["keyScramble", "stun"];
  return ["slow", "damage"];
}

function binderTalismanCount() {
  let count = 0;
  for (const projectile of state.projectiles) {
    if (projectile.kind === "binderTalisman") count += 1;
  }
  return count;
}

function spawnBindingZone(enemy: EnemyState) {
  if (bindingZoneCount() >= BINDER_CONFIG.maxActiveZones) return;
  if (binderTalismanCount() >= BINDER_CONFIG.maxActiveTalismans) return;
  const life = bindingZoneLife(enemy);
  const facing = enemy.binderFacing ?? (enemy.vx >= 0 ? 1 : -1);
  state.bindingZones.push({
    x: enemyCenterX(enemy) + facing * BINDER_CONFIG.zoneForwardOffset,
    y: enemyFeetY(enemy),
    radius: bindingZoneRadius(enemy),
    elite: isEliteEnemy(enemy),
    facing,
    debuffs: binderTalismanDebuffs(enemy),
    talismanReleased: false,
    life,
    maxLife: life,
    elapsed: 0,
    frame: 0,
  });
}

function spawnBinderTalisman(zone: { x: number; y: number; facing: number; debuffs: BinderTalismanDebuff[] }) {
  if (binderTalismanCount() >= BINDER_CONFIG.maxActiveTalismans) return;

  const startX = zone.x - BINDER_CONFIG.talismanCollisionW / HALF_DIVISOR;
  const startY = zone.y - BINDER_CONFIG.talismanStartYOffset - BINDER_CONFIG.talismanCollisionH / HALF_DIVISOR;
  const targetX = playerCenterX();
  const targetY = playerCenterY();
  const angle = Math.atan2(
    targetY - (startY + BINDER_CONFIG.talismanCollisionH / HALF_DIVISOR),
    targetX - (startX + BINDER_CONFIG.talismanCollisionW / HALF_DIVISOR),
  );
  state.projectiles.push({
    kind: "binderTalisman",
    x: startX,
    y: startY,
    w: BINDER_CONFIG.talismanCollisionW,
    h: BINDER_CONFIG.talismanCollisionH,
    vx: Math.cos(angle) * BINDER_CONFIG.talismanSpeed,
    vy: Math.sin(angle) * BINDER_CONFIG.talismanSpeed,
    life: BINDER_CONFIG.talismanLifeFrames,
    damage: 0,
    frame: 0,
    elapsed: 0,
    speed: BINDER_CONFIG.talismanSpeed,
    trackingFrames: BINDER_CONFIG.talismanTrackingFrames,
    turnRate: BINDER_CONFIG.talismanTurnRate,
    debuffs: [...zone.debuffs],
  });
  playSfx("enemyCastRelease", CAST_RELEASE_SFX_PITCH);
}

function updateBinderSeek(enemy: EnemyState, facing: number, distance: number) {
  enemy.binderTimer = (enemy.binderTimer ?? 0) - 1;
  const speed = enemy.binderBaseSpeed ?? BINDER_CONFIG.seekBaseSpeed;
  if (distance < BINDER_CONFIG.minRange) {
    enemy.vx = -facing * speed * BINDER_CONFIG.retreatScale;
  } else if (distance > BINDER_CONFIG.maxRange) {
    enemy.vx = facing * speed;
  } else {
    const rangeOffset = distance - BINDER_CONFIG.preferredRange;
    enemy.vx = Math.abs(rangeOffset) > BINDER_CONFIG.rangeSlack
      ? Math.sign(rangeOffset) * facing * speed * BINDER_CONFIG.repositionScale
      : 0;
  }

  if (
    distance >= BINDER_CONFIG.minRange
    && distance <= BINDER_CONFIG.maxRange
    && enemy.binderTimer <= 0
  ) {
    if (
      bindingZoneCount() < BINDER_CONFIG.maxActiveZones
      && binderTalismanCount() < BINDER_CONFIG.maxActiveTalismans
    ) {
      enterBinderPhase(enemy, "windup");
      enemy.vx = 0;
    } else {
      enemy.binderTimer = BINDER_CONFIG.blockedRetryFrames;
    }
  }
}

function updateBinder(enemy: EnemyState) {
  enemy.binderPhase ??= "seekRange";
  enemy.binderTimer ??= 0;
  enemy.binderFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.binderBaseSpeed ??= binderSeekSpeed();
  enemy.binderCastSpawned ??= false;

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = binderFacing(enemy, toward);
  enemy.binderFacing = facing;

  if (enemy.binderPhase === "seekRange") {
    updateBinderSeek(enemy, facing, Math.abs(toward));
  } else if (enemy.binderPhase === "windup") {
    enemy.vx = 0;
    enemy.binderTimer -= 1;
    if (enemy.binderTimer <= 0) enterBinderPhase(enemy, "cast");
  } else if (enemy.binderPhase === "cast") {
    enemy.vx = 0;
    const framesSinceCastStart = BINDER_CONFIG.castFrames - enemy.binderTimer;
    if (!enemy.binderCastSpawned && framesSinceCastStart >= BINDER_CONFIG.castSpawnFrame) {
      enemy.binderCastSpawned = true;
      spawnBindingZone(enemy);
    }
    enemy.binderTimer -= 1;
    if (enemy.binderTimer <= 0) enterBinderPhase(enemy, "recover");
  } else {
    enemy.vx = 0;
    enemy.binderTimer -= 1;
    if (enemy.binderTimer <= 0) enterBinderPhase(enemy, "seekRange");
  }

  enemy.x += enemy.vx;
}

function binderSheetPhase(phase: BinderAiPhase): BinderPhase {
  if (phase === "seekRange") return "move";
  return phase;
}

function binderPhaseFrame(enemy: EnemyState, phase: BinderAiPhase) {
  if (phase === "seekRange") {
    return frameIndex(BINDER_SHEETS.move.count, BINDER_CONFIG.moveAnimSpeed, state.elapsed, enemy.animSeed);
  }

  const sheet = BINDER_SHEETS[binderSheetPhase(phase)];
  const frameDuration = phase === "windup"
    ? BINDER_CONFIG.windupFrameDuration
    : phase === "cast"
      ? BINDER_CONFIG.castFrameDuration
      : BINDER_CONFIG.recoverFrameDuration;
  const phaseDuration = phase === "windup"
    ? BINDER_CONFIG.windupFrames
    : phase === "cast"
      ? BINDER_CONFIG.castFrames
      : BINDER_CONFIG.recoverFrames;
  const elapsed = Math.max(0, phaseDuration - (enemy.binderTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed / frameDuration));
}

function drawBinder(enemy: EnemyState) {
  const phase = enemy.binderPhase ?? "seekRange";
  const sheetPhase = binderSheetPhase(phase);
  const sheet = BINDER_SHEETS[sheetPhase] || BINDER_SHEETS.move;
  const facing = enemy.binderFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(BINDER_ARCHETYPE);

  if (phase === "seekRange") {
    drawEnemyFrame(enemy, sheet, drawScale, BINDER_CONFIG.moveAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = binderPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawEnemySheetFrame(enemy, sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export const BINDER_ARCHETYPE: EnemyArchetype = {
  speed: binderSeekSpeed,
  hpMultiplier: BINDER_CONFIG.hpMultiplier,
  drawScale: BINDER_CONFIG.drawScale,
  collisionScaleX: BINDER_CONFIG.collisionScaleX,
  init: initBinder,
  update: updateBinder,
  draw: drawBinder,
};

export function isBinderSheet(sheetIndex: number) {
  return sheetIndex === BINDER_SHEET_INDEX && Boolean(ENEMY_SHEETS[BINDER_SHEET_INDEX]);
}

export function binderActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isBinder(enemy)) count += 1;
  }
  return count;
}

export function canSpawnBinder() {
  return binderActiveCount() < BINDER_CONFIG.maxActiveBinders;
}

export function isBinderTalismanStunned() {
  return state.player.binderTalismanStunTimer > 0;
}

export function isBinderTalismanKeyScrambled() {
  return state.player.binderTalismanKeyScrambleTimer > 0;
}

export function binderTalismanAttachedTimer() {
  const player = state.player;
  return Math.max(
    player.binderTalismanSlowTimer,
    player.binderTalismanDamageTimer,
    player.binderTalismanKeyScrambleTimer,
    player.binderTalismanStunStatusTimer,
    player.binderTalismanStunTimer,
  );
}

export function activeBinderTalismanDebuffs() {
  const player = state.player;
  const debuffs: BinderTalismanDebuff[] = [];
  if (player.binderTalismanSlowTimer > 0) debuffs.push("slow");
  if (player.binderTalismanDamageTimer > 0) debuffs.push("damage");
  if (player.binderTalismanKeyScrambleTimer > 0) debuffs.push("keyScramble");
  if (player.binderTalismanStunStatusTimer > 0 || player.binderTalismanStunTimer > 0) {
    debuffs.push("stun");
  }
  return debuffs;
}

export function applyBinderTalismanDebuffs(debuffs: readonly BinderTalismanDebuff[]) {
  const player = state.player;
  if (debuffs.includes("slow")) {
    player.binderTalismanSlowTimer = Math.max(
      player.binderTalismanSlowTimer,
      BINDER_CONFIG.talismanDebuffFrames,
    );
  }
  if (debuffs.includes("damage")) {
    player.binderTalismanDamageTimer = Math.max(
      player.binderTalismanDamageTimer,
      BINDER_CONFIG.talismanDebuffFrames,
    );
    if (player.binderTalismanDamageTickTimer <= 0) {
      player.binderTalismanDamageTickTimer = BINDER_CONFIG.talismanDamageFirstFrame;
    }
  }
  if (debuffs.includes("keyScramble")) {
    player.binderTalismanKeyScrambleTimer = Math.max(
      player.binderTalismanKeyScrambleTimer,
      BINDER_CONFIG.talismanDebuffFrames,
    );
  }
  if (debuffs.includes("stun")) {
    player.binderTalismanStunStatusTimer = Math.max(
      player.binderTalismanStunStatusTimer,
      BINDER_CONFIG.talismanDebuffFrames,
    );
    if (player.binderTalismanStunTimer <= 0 && player.binderTalismanStunCooldown <= 0) {
      player.binderTalismanStunCooldown = randomStunCooldown();
    }
  }
}

function updateBinderTalismanDebuffs() {
  const player = state.player;
  if (player.binderTalismanSlowTimer > 0) player.binderTalismanSlowTimer -= 1;
  if (player.binderTalismanKeyScrambleTimer > 0) player.binderTalismanKeyScrambleTimer -= 1;

  if (player.binderTalismanDamageTimer > 0) {
    player.binderTalismanDamageTimer -= 1;
    player.binderTalismanDamageTickTimer -= 1;
    if (player.binderTalismanDamageTickTimer <= 0) {
      applyBinderTalismanDamage();
      player.binderTalismanDamageTickTimer = BINDER_CONFIG.talismanDamageIntervalFrames;
    }
  } else {
    player.binderTalismanDamageTickTimer = 0;
  }

  if (player.binderTalismanStunTimer > 0) player.binderTalismanStunTimer -= 1;
  if (player.binderTalismanStunStatusTimer > 0) {
    player.binderTalismanStunStatusTimer -= 1;
    if (player.binderTalismanStunTimer <= 0) {
      player.binderTalismanStunCooldown -= 1;
      if (player.binderTalismanStunCooldown <= 0) {
        player.binderTalismanStunTimer = BINDER_CONFIG.stunActiveFrames;
        player.binderTalismanStunCooldown = randomStunCooldown();
      }
    }
  } else {
    player.binderTalismanStunCooldown = 0;
  }
}

export function updateBindingZones() {
  updateBinderTalismanDebuffs();

  for (let index = state.bindingZones.length - 1; index >= 0; index -= 1) {
    const zone = state.bindingZones[index];
    zone.life -= 1;
    zone.elapsed += 1;
    if (
      !zone.talismanReleased
      && zone.elapsed >= BINDER_CONFIG.zoneTalismanReleaseFrame
    ) {
      zone.talismanReleased = true;
      spawnBinderTalisman(zone);
    }
    const rawFrame = Math.floor(zone.elapsed / BINDER_CONFIG.zoneFrameDuration);
    if (rawFrame < BINDER_CONFIG.zoneLoopStartFrame) {
      zone.frame = rawFrame;
    } else {
      const loopCount = BINDER_MAGIC_CIRCLE_SHEET.count - BINDER_CONFIG.zoneLoopStartFrame;
      zone.frame = BINDER_CONFIG.zoneLoopStartFrame
        + (rawFrame - BINDER_CONFIG.zoneLoopStartFrame) % loopCount;
    }
    if (zone.life <= 0) state.bindingZones.splice(index, 1);
  }
}

export function bindingZonePlayerMoveScale() {
  return bindingTalismanMoveScale();
}

function drawBindingZoneLayer(sheet: typeof BINDER_MAGIC_CIRCLE_SHEET, alphaScale = 1) {
  if (!ctx) return;
  for (const zone of state.bindingZones) {
    const drawW = Math.round(zone.radius * BINDER_CONFIG.zoneDrawWidthScale);
    const drawH = Math.round(drawW * sheet.frameH / sheet.frameW);
    const fade = Math.min(
      1,
      zone.elapsed / BINDER_CONFIG.zoneFadeFrames,
      zone.life / BINDER_CONFIG.zoneFadeFrames,
    );
    ctx.save();
    ctx.globalAlpha = BINDER_CONFIG.zoneAlpha * alphaScale * fade;
    drawSheetFrame(
      sheet,
      zone.frame,
      zone.x - drawW / HALF_DIVISOR,
      zone.y - drawH / HALF_DIVISOR,
      drawW,
      drawH,
      zone.facing,
    );
    ctx.restore();
  }
}

export function drawBindingZonesBack() {
  drawBindingZoneLayer(BINDER_MAGIC_CIRCLE_SHEET);
}

export function drawBindingZonesFront() {
  // Magic-circle v2 is a single-layer effect; keep the front hook for runtime draw order.
}

export function drawBindingZones() {
  drawBindingZoneLayer(BINDER_MAGIC_CIRCLE_SHEET);
}
