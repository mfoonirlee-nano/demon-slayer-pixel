import { FANG_GALE_CONFIG, WIDTH } from "../../constants";
import { playSfx } from "../../game/audio";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import type { BossSkillMode } from "../../types/game-state";
import { hurtPlayer } from "../player";
import { damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

export function updateFangGaleBoss(boss: LiveBoss) {
  if (boss.actionState === "dash") {
    updateFangDash(boss);
    return;
  }

  if (boss.actionState === "windup") {
    updateFangStormWindup(boss);
    return;
  }

  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= FANG_GALE_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    const castDuration = fangCastDuration(boss);
    const framesSinceCastStart = castDuration - boss.castTimer;
    boss.vx = 0;
    boss.castTimer -= 1;

    if (!boss.skillEffectSpawned && framesSinceCastStart >= FANG_GALE_CONFIG.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnFangWavePattern(boss);
    }
    if (boss.castTimer <= 0) startFangDash(boss);
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startFangCast(boss);
    return;
  }

  moveFangGaleBoss(boss);
  damagePlayerOnContact(boss);
}

export function fangCastDuration(boss: LiveBoss) {
  if (boss.actionState === "windup") return FANG_GALE_CONFIG.chainWindupFrames;
  return boss.skillMode === "fangGaleStorm"
    ? FANG_GALE_CONFIG.stormCastDuration
    : FANG_GALE_CONFIG.castDuration;
}

function moveFangGaleBoss(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
  boss.actionState = "move";
  boss.vx += Math.sign(toward) * (FANG_GALE_CONFIG.steeringForce + boss.phase * 0.01);
  boss.vx *= FANG_GALE_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(FANG_GALE_CONFIG.maxVelocity + boss.phase * 0.24),
    FANG_GALE_CONFIG.maxVelocity + boss.phase * 0.24,
  );
  boss.x = clamp(boss.x + boss.vx, 0, WIDTH - boss.w);
}

function startFangCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextFangSkill(boss);
  boss.castTimer = fangCastDuration(boss);
  boss.skillEffectSpawned = false;
  boss.skillHitDone = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = fangSkillCooldown(boss.skillMode, boss.phase);
  boss.vx = 0;

  playSfx("bossCast", 1.08);
}

function nextFangSkill(boss: LiveBoss): BossSkillMode {
  const roll = Math.random();
  if (boss.awakened && (boss.phase >= 4 || roll < 0.24)) return "fangGaleStorm";
  if (boss.phase >= 2 && roll < 0.66) return "fangGaleWave";
  return "fangGaleDash";
}

function fangSkillCooldown(skillMode: BossSkillMode, phase: number) {
  if (skillMode === "fangGaleStorm") return Math.max(210, FANG_GALE_CONFIG.stormCooldown - phase * 10);
  if (skillMode === "fangGaleWave") return Math.max(164, FANG_GALE_CONFIG.waveCooldown - phase * 12);
  return Math.max(144, FANG_GALE_CONFIG.dashCooldown - phase * 12);
}

function spawnFangWavePattern(boss: LiveBoss) {
  if (boss.skillMode === "fangGaleDash") return;
  spawnFangWave(boss, boss.castFacing);
  if (boss.skillMode === "fangGaleStorm") spawnFangWave(boss, -boss.castFacing);
  playSfx("bossBlade", boss.skillMode === "fangGaleStorm" ? 1.12 : 1);
}

function startFangDash(boss: LiveBoss) {
  boss.comboStep = boss.skillMode === "fangGaleStorm" ? 1 : 0;
  startFangDashSegment(boss);
}

function startFangDashSegment(boss: LiveBoss) {
  const storm = boss.skillMode === "fangGaleStorm";
  const speed = storm ? FANG_GALE_CONFIG.stormDashSpeed : FANG_GALE_CONFIG.dashSpeed;
  boss.actionState = "dash";
  boss.actionTimer = 0;
  boss.aiTimer = storm ? FANG_GALE_CONFIG.stormDashFrames : FANG_GALE_CONFIG.dashFrames;
  boss.skillHitDone = false;
  boss.vx = boss.castFacing * (speed + boss.phase * 0.28);
  playSfx("bossBlade", storm ? 1.16 : 1);
}

function updateFangStormWindup(boss: LiveBoss) {
  const framesSinceWindupStart = FANG_GALE_CONFIG.chainWindupFrames - boss.castTimer;
  boss.vx = 0;
  boss.castTimer -= 1;

  if (!boss.skillEffectSpawned && framesSinceWindupStart >= FANG_GALE_CONFIG.chainSpawnAtFrame) {
    boss.skillEffectSpawned = true;
    spawnFangWave(boss, boss.castFacing);
    playSfx("bossBlade", 1.06);
  }
  if (boss.castTimer <= 0) startFangDashSegment(boss);
  damagePlayerOnContact(boss);
}

function updateFangDash(boss: LiveBoss) {
  boss.x += boss.vx;
  const clampedX = clamp(boss.x, 0, WIDTH - boss.w);
  if (clampedX !== boss.x) {
    boss.x = clampedX;
    boss.aiTimer = 0;
  }

  if (!boss.skillHitDone && hitbox(state.player, boss)) {
    boss.skillHitDone = true;
    hurtPlayer(
      FANG_GALE_CONFIG.dashDamageBase + boss.phase * FANG_GALE_CONFIG.dashDamagePhase,
      boss.vx,
    );
  }

  if (boss.aiTimer <= 0) {
    if (boss.skillMode === "fangGaleStorm" && (boss.comboStep ?? 1) < 3) {
      startFangStormChainWindup(boss);
      return;
    }
    boss.actionState = "recover";
    boss.actionTimer = 0;
    boss.recoveryTimer = boss.skillMode === "fangGaleStorm"
      ? FANG_GALE_CONFIG.stormRecoveryFrames
      : FANG_GALE_CONFIG.recoveryFrames;
    boss.vx = 0;
    boss.comboStep = undefined;
  }
}

function startFangStormChainWindup(boss: LiveBoss) {
  boss.comboStep = (boss.comboStep ?? 1) + 1;
  boss.castFacing *= -1;
  boss.facing = boss.castFacing;
  boss.castTimer = FANG_GALE_CONFIG.chainWindupFrames;
  boss.skillEffectSpawned = false;
  boss.skillHitDone = false;
  boss.actionState = "windup";
  boss.actionTimer = 0;
  boss.vx = 0;
}

function spawnFangWave(boss: LiveBoss, facing: number) {
  const w = FANG_GALE_CONFIG.waveHitW;
  const h = FANG_GALE_CONFIG.waveHitH;
  const centerX = boss.x + boss.w / 2 + facing * 42;
  const centerY = boss.y + boss.h * 0.56;
  const storm = boss.skillMode === "fangGaleStorm";
  state.fangGaleWaves.push({
    x: centerX - w / 2,
    y: centerY - h / 2,
    w,
    h,
    vx: facing * (storm ? FANG_GALE_CONFIG.stormWaveSpeed : FANG_GALE_CONFIG.waveSpeed),
    facing,
    warningFrames: FANG_GALE_CONFIG.waveWarningFrames,
    elapsed: 0,
    frame: 0,
    life: FANG_GALE_CONFIG.waveLife,
    damage: FANG_GALE_CONFIG.waveDamageBase + boss.phase * FANG_GALE_CONFIG.waveDamagePhase,
  });
}
