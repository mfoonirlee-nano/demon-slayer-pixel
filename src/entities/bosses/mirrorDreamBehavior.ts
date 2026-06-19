import { MIRROR_DREAM_CONFIG, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";
import type { MirrorAfterimageState, MirrorShardState } from "../../types/game-state";

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
    boss.vx -= Math.sign(toPlayer) * (MIRROR_DREAM_CONFIG.retreatForce + boss.phase * 0.006);
  } else if (distance > MIRROR_DREAM_CONFIG.preferredDistance) {
    boss.vx += Math.sign(toPlayer) * (MIRROR_DREAM_CONFIG.steeringForce + boss.phase * 0.005);
  } else {
    boss.vx *= 0.84;
  }

  boss.vx *= MIRROR_DREAM_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(MIRROR_DREAM_CONFIG.maxVelocity + boss.phase * 0.2),
    MIRROR_DREAM_CONFIG.maxVelocity + boss.phase * 0.2,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function startMirrorDreamCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextMirrorDreamSkill(boss);
  boss.castTimer = MIRROR_DREAM_CONFIG.castDuration;
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = Math.max(150, MIRROR_DREAM_CONFIG.skillCooldown - boss.phase * 18);
  boss.vx = 0;

  playSfx("bossCast", 1.12);
}

function nextMirrorDreamSkill(boss: LiveBoss) {
  const roll = Math.random();
  if (boss.phase >= 3 && roll < 0.42) return "mirrorNightmare";
  if (boss.phase >= 2 && roll < 0.32) return "mirrorNightmare";
  return roll < 0.66 ? "mirrorAfterimage" : "mirrorShard";
}

function spawnMirrorDreamPattern(boss: LiveBoss) {
  if (boss.skillMode === "mirrorAfterimage") {
    spawnMirrorAfterimage(boss, undefined);
    teleportMirrorDreamBoss(boss);
    playSfx("bossMirror", 1.12);
    return;
  }

  if (boss.skillMode === "mirrorNightmare") {
    spawnMirrorNightmareImages(boss);
    playSfx("bossMirror", 0.82);
    return;
  }

  spawnMirrorShardFromBoss(boss);
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
    damage: MIRROR_DREAM_CONFIG.damageBase + boss.phase * MIRROR_DREAM_CONFIG.damagePhase,
  });
}

function teleportMirrorDreamBoss(boss: LiveBoss) {
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

  boss.x = clamp(targetCenter - boss.w / 2, 0, WIDTH - boss.w);
  boss.vx = 0;
  const toPlayer = playerCenter - (boss.x + boss.w / 2);
  boss.facing = toPlayer >= 0 ? 1 : -1;
  boss.castFacing = boss.facing;
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
  const startX = boss.x + boss.w / 2 + boss.castFacing * 34;
  const startY = boss.y + boss.h * 0.36;
  const targetX = state.player.x + state.player.w / 2;
  const targetY = state.player.y + state.player.h / 2;
  const dir = Math.sign(targetX - startX) || boss.castFacing;
  const travelFrames = Math.max(28, Math.abs(targetX - startX) / MIRROR_DREAM_CONFIG.shardSpeed);
  const vy = clamp((targetY - startY) / travelFrames, -2.4, 2.4);
  spawnMirrorShard({
    kind: "shard",
    centerX: startX,
    centerY: startY,
    vx: dir * (MIRROR_DREAM_CONFIG.shardSpeed + boss.phase * 0.25),
    vy,
    damage: MIRROR_DREAM_CONFIG.damageBase + boss.phase * MIRROR_DREAM_CONFIG.damagePhase,
    bouncesRemaining: 1,
  });
  playSfx("bossMirror", 1.04);
}

export function spawnMirrorNightmareShard(afterimage: MirrorAfterimageState) {
  const centerX = afterimage.x + afterimage.w / 2;
  const centerY = afterimage.y + afterimage.h * 0.38;
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
  playSfx("bossMirror", 1.22);
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
