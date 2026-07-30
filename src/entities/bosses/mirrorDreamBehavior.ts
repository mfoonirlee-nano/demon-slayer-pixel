import { MIRROR_DREAM_CONFIG, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { bossAttackDamage, damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";
import type { BossSkillMode, MirrorAfterimageState, MirrorShardState } from "../../types/game-state";

const RETREAT_PHASE_FORCE = 0.006;
const STEERING_PHASE_FORCE = 0.005;
const MOVE_COAST_DRAG = 0.84;
const MAX_VELOCITY_PHASE_BONUS = 0.2;
const MIN_SKILL_COOLDOWN = 132;
const SKILL_COOLDOWN_PHASE_REDUCTION = 18;
const SKILL_COOLDOWN_LOW_HP_REDUCTION = 30;
const CAST_SFX_PITCH = 1.12;
const NIGHTMARE_HIGH_PHASE = 3;
const NIGHTMARE_MID_PHASE = 2;
const NIGHTMARE_HIGH_PHASE_CHANCE = 0.42;
const NIGHTMARE_MID_PHASE_CHANCE = 0.32;
const AFTERIMAGE_CHANCE = 0.66;
const AFTERIMAGE_SFX_PITCH = 1.12;
const NIGHTMARE_SFX_PITCH = 0.82;
const SHARD_FORWARD_OFFSET = 34;
const SHARD_START_Y_SCALE = 0.36;
const MIN_SHARD_TRAVEL_FRAMES = 28;
const SHARD_MAX_VERTICAL_SPEED = 2.4;
const SHARD_PHASE_SPEED_BONUS = 0.25;
const SHARD_SFX_PITCH = 1.04;
const NIGHTMARE_SHARD_START_Y_SCALE = 0.38;
const NIGHTMARE_SHARD_SFX_PITCH = 1.22;
const TRUE_IMAGE_SHIFT_PHASE = 4;
const TRUE_IMAGE_SHIFT_RANDOM_CHANCE = 0.28;
const TRUE_IMAGE_SHIFT_COOLDOWN_BONUS = 36;
const TRUE_IMAGE_SHIFT_FIRST_BREAK_FRAME = 16;
const TRUE_IMAGE_SHIFT_BREAK_DELAY = 10;
const TRUE_IMAGE_SHIFT_SPACING_SCALE = 0.82;
const TRUE_IMAGE_SHIFT_SFX_PITCH = 0.74;

export function updateMirrorDreamBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= MIRROR_DREAM_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const framesSinceCastStart = MIRROR_DREAM_CONFIG.castDuration - boss.castTimer;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= MIRROR_DREAM_CONFIG.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnMirrorDreamPattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = MIRROR_DREAM_CONFIG.recoveryFrames;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (shouldStartTrueImageShift(boss)) {
    startMirrorDreamCast(boss, "mirrorTrueImageShift");
    boss.mirrorTrueImageShiftPhase = boss.phase;
    return;
  }

  if (boss.skillCd <= 0) {
    startMirrorDreamCast(boss);
    return;
  }

  moveMirrorDreamBoss(boss);
  damagePlayerOnContact(boss);
}

function moveMirrorDreamBoss(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const bossCenter = boss.x + boss.w / 2;
  const toPlayer = playerCenter - bossCenter;
  boss.facing = toPlayer >= 0 ? 1 : -1;
  boss.actionState = "move";

  const distance = Math.abs(toPlayer);
  if (distance < MIRROR_DREAM_CONFIG.closeDistance) {
    boss.vx -= Math.sign(toPlayer) * (MIRROR_DREAM_CONFIG.retreatForce + boss.phase * RETREAT_PHASE_FORCE);
  } else if (distance > MIRROR_DREAM_CONFIG.preferredDistance) {
    boss.vx += Math.sign(toPlayer) * (MIRROR_DREAM_CONFIG.steeringForce + boss.phase * STEERING_PHASE_FORCE);
  } else {
    boss.vx *= MOVE_COAST_DRAG;
  }

  boss.vx *= MIRROR_DREAM_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(MIRROR_DREAM_CONFIG.maxVelocity + boss.phase * MAX_VELOCITY_PHASE_BONUS),
    MIRROR_DREAM_CONFIG.maxVelocity + boss.phase * MAX_VELOCITY_PHASE_BONUS,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function startMirrorDreamCast(boss: LiveBoss, forcedSkillMode?: BossSkillMode) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = forcedSkillMode ?? nextMirrorDreamSkill(boss);
  boss.mirrorTeleportTargetX = mirrorSkillTeleports(boss.skillMode)
    ? mirrorTeleportTargetX(boss)
    : undefined;
  boss.castTimer = MIRROR_DREAM_CONFIG.castDuration;
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = mirrorDreamSkillCooldown(boss);
  boss.vx = 0;

  playSfx("bossCast", CAST_SFX_PITCH);
}

function shouldStartTrueImageShift(boss: LiveBoss) {
  return boss.awakened
    && boss.phase >= 2
    && boss.mirrorTrueImageShiftPhase !== boss.phase;
}

function mirrorDreamSkillCooldown(boss: LiveBoss) {
  const hpRatio = boss.hpMax > 0 ? clamp(boss.hp / boss.hpMax, 0, 1) : 1;
  const lowHpReduction = Math.round((1 - hpRatio) * SKILL_COOLDOWN_LOW_HP_REDUCTION);
  const baseCooldown = Math.max(
    MIN_SKILL_COOLDOWN,
    MIRROR_DREAM_CONFIG.skillCooldown - boss.phase * SKILL_COOLDOWN_PHASE_REDUCTION - lowHpReduction,
  );
  return boss.skillMode === "mirrorTrueImageShift"
    ? baseCooldown + TRUE_IMAGE_SHIFT_COOLDOWN_BONUS
    : baseCooldown;
}

function nextMirrorDreamSkill(boss: LiveBoss): BossSkillMode {
  const roll = Math.random();
  if (boss.awakened && (boss.phase >= TRUE_IMAGE_SHIFT_PHASE || roll < TRUE_IMAGE_SHIFT_RANDOM_CHANCE)) {
    return "mirrorTrueImageShift";
  }
  if (boss.phase >= NIGHTMARE_HIGH_PHASE && roll < NIGHTMARE_HIGH_PHASE_CHANCE) return "mirrorNightmare";
  if (boss.phase >= NIGHTMARE_MID_PHASE && roll < NIGHTMARE_MID_PHASE_CHANCE) return "mirrorNightmare";
  return roll < AFTERIMAGE_CHANCE ? "mirrorAfterimage" : "mirrorShard";
}

function spawnMirrorDreamPattern(boss: LiveBoss) {
  if (boss.skillMode === "mirrorTrueImageShift") {
    spawnMirrorTrueImageShift(boss);
    playSfx("bossMirror", TRUE_IMAGE_SHIFT_SFX_PITCH);
    return;
  }

  if (boss.skillMode === "mirrorAfterimage") {
    spawnMirrorAfterimage(boss, undefined);
    teleportMirrorDreamBoss(boss);
    playSfx("bossMirror", AFTERIMAGE_SFX_PITCH);
    return;
  }

  if (boss.skillMode === "mirrorNightmare") {
    spawnMirrorNightmareImages(boss);
    playSfx("bossMirror", NIGHTMARE_SFX_PITCH);
    return;
  }

  spawnMirrorShardFromBoss(boss);
}

function spawnMirrorTrueImageShift(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const centers = trueImageShiftCenters(boss);
  const originalFacing = boss.facing;

  for (let i = 0; i < centers.length; i += 1) {
    const centerX = centers[i];
    boss.facing = centerX < playerCenter ? 1 : -1;
    spawnMirrorAfterimage(
      boss,
      TRUE_IMAGE_SHIFT_FIRST_BREAK_FRAME + i * TRUE_IMAGE_SHIFT_BREAK_DELAY,
      centerX,
    );
  }

  boss.facing = originalFacing;
  teleportMirrorDreamBoss(boss);
  spawnMirrorAfterimage(boss, TRUE_IMAGE_SHIFT_FIRST_BREAK_FRAME, boss.x + boss.w / 2);
}

function trueImageShiftCenters(boss: LiveBoss) {
  const count = Math.min(
    MIRROR_DREAM_CONFIG.nightmareMaxImages,
    MIRROR_DREAM_CONFIG.nightmareBaseImages + boss.phase,
  );
  const playerCenter = state.player.x + state.player.w / 2;
  const spacing = MIRROR_DREAM_CONFIG.nightmareSpacing * TRUE_IMAGE_SHIFT_SPACING_SCALE;
  const half = (count - 1) / 2;

  return Array.from({ length: count }, (_, index) => (
    clamp(playerCenter + (index - half) * spacing, boss.w / 2, WIDTH - boss.w / 2)
  ));
}

function spawnMirrorAfterimage(boss: LiveBoss, spawnAt: number | undefined, centerX = boss.x + boss.w / 2) {
  const life = spawnAt === undefined
    ? MIRROR_DREAM_CONFIG.afterimageLife
    : spawnAt + MIRROR_DREAM_CONFIG.nightmareBreakFadeFrames;
  state.mirrorAfterimages.push({
    x: centerX - boss.w / 2,
    y: boss.y,
    w: boss.w,
    h: boss.h,
    facing: boss.facing,
    elapsed: 0,
    frame: 0,
    life,
    maxLife: life,
    spawnAt,
    spawned: false,
    damage: bossAttackDamage(
      MIRROR_DREAM_CONFIG.damageBase + boss.phase * MIRROR_DREAM_CONFIG.damagePhase,
    ),
  });
}

function teleportMirrorDreamBoss(boss: LiveBoss) {
  boss.x = boss.mirrorTeleportTargetX ?? mirrorTeleportTargetX(boss);
  boss.mirrorTeleportTargetX = undefined;
  boss.vx = 0;
  const playerCenter = state.player.x + state.player.w / 2;
  const toPlayer = playerCenter - (boss.x + boss.w / 2);
  boss.facing = toPlayer >= 0 ? 1 : -1;
  boss.castFacing = boss.facing;
}

function mirrorTeleportTargetX(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const bossCenter = boss.x + boss.w / 2;
  const side = bossCenter < playerCenter ? 1 : -1;
  const preferredCenter = playerCenter + side * MIRROR_DREAM_CONFIG.teleportPlayerOffset;
  const fallbackCenter = playerCenter - side * MIRROR_DREAM_CONFIG.teleportAwayOffset;
  const minCenter = boss.w / 2;
  const maxCenter = WIDTH - boss.w / 2;
  const targetCenter = preferredCenter >= minCenter && preferredCenter <= maxCenter
    ? preferredCenter
    : fallbackCenter;
  return clamp(targetCenter - boss.w / 2, 0, WIDTH - boss.w);
}

function mirrorSkillTeleports(skillMode: BossSkillMode) {
  return skillMode === "mirrorAfterimage" || skillMode === "mirrorTrueImageShift";
}

function spawnMirrorNightmareImages(boss: LiveBoss) {
  const count = Math.min(
    MIRROR_DREAM_CONFIG.nightmareMaxImages,
    MIRROR_DREAM_CONFIG.nightmareBaseImages + boss.phase,
  );
  const playerCenter = state.player.x + state.player.w / 2;
  const half = (count - 1) / 2;

  for (let i = 0; i < count; i += 1) {
    const offset = (i - half) * MIRROR_DREAM_CONFIG.nightmareSpacing;
    const centerX = clamp(playerCenter + offset, boss.w / 2, WIDTH - boss.w / 2);
    const spawnAt = MIRROR_DREAM_CONFIG.nightmareFirstBreakFrame + i * MIRROR_DREAM_CONFIG.nightmareBreakDelay;
    boss.facing = centerX < playerCenter ? 1 : -1;
    spawnMirrorAfterimage(boss, spawnAt, centerX);
  }
  boss.facing = boss.castFacing;
}

function spawnMirrorShardFromBoss(boss: LiveBoss) {
  const startX = boss.x + boss.w / 2 + boss.castFacing * SHARD_FORWARD_OFFSET;
  const startY = boss.y + boss.h * SHARD_START_Y_SCALE;
  const targetX = state.player.x + state.player.w / 2;
  const targetY = state.player.y + state.player.h / 2;
  const dir = boss.castFacing;
  const travelFrames = Math.max(MIN_SHARD_TRAVEL_FRAMES, Math.abs(targetX - startX) / MIRROR_DREAM_CONFIG.shardSpeed);
  const vy = clamp((targetY - startY) / travelFrames, -SHARD_MAX_VERTICAL_SPEED, SHARD_MAX_VERTICAL_SPEED);
  spawnMirrorShard({
    kind: "shard",
    centerX: startX,
    centerY: startY,
    vx: dir * (MIRROR_DREAM_CONFIG.shardSpeed + boss.phase * SHARD_PHASE_SPEED_BONUS),
    vy,
    damage: bossAttackDamage(
      MIRROR_DREAM_CONFIG.damageBase + boss.phase * MIRROR_DREAM_CONFIG.damagePhase,
    ),
    bouncesRemaining: 1,
  });
  playSfx("bossMirror", SHARD_SFX_PITCH);
}

export function spawnMirrorNightmareShard(afterimage: MirrorAfterimageState) {
  const centerX = afterimage.x + afterimage.w / 2;
  const centerY = afterimage.y + afterimage.h * NIGHTMARE_SHARD_START_Y_SCALE;
  const targetX = state.player.x + state.player.w / 2;
  const targetY = state.player.y + state.player.h / 2;
  const dx = targetX - centerX;
  const dy = targetY - centerY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const speed = MIRROR_DREAM_CONFIG.nightmareSpeed;
  spawnMirrorShard({
    kind: "nightmare",
    centerX,
    centerY,
    vx: dx / distance * speed,
    vy: dy / distance * speed,
    damage: afterimage.damage,
    bouncesRemaining: 0,
  });
  playSfx("bossMirror", NIGHTMARE_SHARD_SFX_PITCH);
}

function spawnMirrorShard(params: {
  kind: MirrorShardState["kind"];
  centerX: number;
  centerY: number;
  vx: number;
  vy: number;
  damage: number;
  bouncesRemaining: number;
}) {
  const hitW = params.kind === "nightmare"
    ? MIRROR_DREAM_CONFIG.nightmareHitW
    : MIRROR_DREAM_CONFIG.shardHitW;
  const hitH = params.kind === "nightmare"
    ? MIRROR_DREAM_CONFIG.nightmareHitH
    : MIRROR_DREAM_CONFIG.shardHitH;
  state.mirrorShards.push({
    kind: params.kind,
    x: params.centerX - hitW / 2,
    y: params.centerY - hitH / 2,
    w: hitW,
    h: hitH,
    vx: params.vx,
    vy: params.vy,
    facing: params.vx >= 0 ? 1 : -1,
    frame: 0,
    elapsed: 0,
    life: params.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareLife
      : MIRROR_DREAM_CONFIG.shardLife,
    damage: params.damage,
    bouncesRemaining: params.bouncesRemaining,
  });
}
