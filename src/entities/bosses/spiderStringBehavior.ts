import { BOSS_CONFIG, BOSS_SKILL1_CONFIG, SPIDER_STRING_CAGE_CONFIG, WIDTH } from "../../constants";
import {
  SPIDER_STRING_ATTACK_CONFIG,
  SPIDER_STRING_PILLAR_CONFIG,
} from "../../constants/assets";
import { playSfx } from "../../game/audio";
import { recordCollisionDebugRect } from "../../game/collisionDebug";
import { state } from "../../game/state";
import { clamp, rectsOverlap } from "../../game/utils";
import { hurtPlayer } from "../player";
import { spawnSpiderStringCageEffect } from "./spiderStringCageEffects";
import { spawnBossSkill1Effect } from "./spiderStringEffects";
import { spawnSpiderStringPillars } from "./spiderStringPillarEffects";
import { spiderRushWindupFrames } from "./attackTiming";
import { bossAttackDamage, damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const CAST_SFX_PITCH = 0.92;
const RUSH_WARNING_SFX_PITCH = 1.12;

export function updateSpiderStringBoss(boss: LiveBoss) {
  if ((boss.spiderStringCageCd ?? 0) > 0) {
    boss.spiderStringCageCd = Math.max(0, (boss.spiderStringCageCd ?? 0) - 1);
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    boss.castTimer -= 1;
    if (boss.skillMode === "spiderStringCage") {
      if (boss.castTimer <= 0) {
        boss.aiTimer = SPIDER_STRING_CAGE_CONFIG.postAiTimer;
        boss.actionState = "move";
      }
      return;
    }

    const castConfig = boss.skillMode === "spiderStringPillars"
      ? SPIDER_STRING_PILLAR_CONFIG
      : BOSS_SKILL1_CONFIG;
    const framesSinceCastStart = castConfig.castDuration - boss.castTimer;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= castConfig.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      if (boss.skillMode === "spiderStringPillars") {
        spawnSpiderStringPillars(boss);
      } else {
        spawnBossSkill1Effect(boss);
      }
    }
    damagePlayerOnContact(boss);
    return;
  }

  // Cage keeps its skill mode during the post-cast pause, so ordinary spider states stay unaffected.
  if (boss.skillMode === "spiderStringCage" && boss.aiTimer > 0) {
    boss.vx = 0;
    return;
  }

  if (updateSpiderRushCycleIfActive(boss)) {
    return;
  }

  if (shouldCastSpiderStringCage(boss)) {
    facePlayer(boss);
    boss.castFacing = boss.facing;
    boss.castTimer = SPIDER_STRING_CAGE_CONFIG.castDuration;
    boss.skillEffectSpawned = true;
    boss.skillHitDone = false;
    boss.skillMode = "spiderStringCage";
    boss.actionState = "cast";
    boss.actionTimer = 0;
    boss.skillCd = Math.max(boss.skillCd, BOSS_SKILL1_CONFIG.cooldown);
    boss.spiderStringCageUsed = true;
    boss.spiderStringCageCd = SPIDER_STRING_CAGE_CONFIG.cooldown;
    boss.vx = 0;
    spawnSpiderStringCageEffect(boss);
    playSfx("bossCast", CAST_SFX_PITCH);
    return;
  }

  if (boss.skillCd <= 0 && boss.phase >= BOSS_SKILL1_CONFIG.minPhase) {
    const skillMode = nextSpiderStringSkill(boss);
    const castConfig = skillMode === "spiderStringPillars"
      ? SPIDER_STRING_PILLAR_CONFIG
      : BOSS_SKILL1_CONFIG;
    facePlayer(boss);
    boss.castFacing = boss.facing;
    boss.castTimer = castConfig.castDuration;
    boss.skillEffectSpawned = false;
    boss.skillMode = skillMode;
    boss.actionState = "cast";
    boss.actionTimer = 0;
    boss.skillCd = castConfig.cooldown;
    boss.vx = 0;
    playSfx("bossCast", CAST_SFX_PITCH);
    return;
  }

  startSpiderRushWindup(boss);
}

function updateSpiderRushCycleIfActive(boss: LiveBoss) {
  if (boss.actionState === "windup") {
    boss.vx = 0;
    boss.facing = boss.castFacing;
    if (boss.actionTimer >= spiderRushWindupFrames(boss.phase)) startSpiderDash(boss);
    return true;
  }

  if (boss.actionState === "dash") {
    const nextX = clamp(boss.x + boss.vx, 0, WIDTH - boss.w);
    boss.x = nextX;
    const reachedEdge = nextX === 0 || nextX === WIDTH - boss.w;
    if (boss.actionTimer >= BOSS_CONFIG.rushFrames || reachedEdge) startSpiderAttack(boss);
    return true;
  }

  if (boss.actionState === "attack") {
    updateSpiderAttack(boss);
    return true;
  }

  if (boss.actionState !== "recover") return false;

  // One countdown guarantees both phases: retreat first, then a stationary breather.
  if (boss.recoveryTimer > BOSS_CONFIG.breathingFrames) {
    facePlayer(boss);
    boss.vx = -boss.facing * BOSS_CONFIG.retreatVelocity;
    boss.x = clamp(boss.x + boss.vx, 0, WIDTH - boss.w);
  } else {
    boss.vx = 0;
  }
  boss.recoveryTimer -= 1;
  if (boss.recoveryTimer === BOSS_CONFIG.breathingFrames) boss.vx = 0;
  if (boss.recoveryTimer <= 0) {
    boss.actionState = "move";
    boss.actionTimer = 0;
    boss.vx = 0;
  }
  return true;
}

function startSpiderRushWindup(boss: LiveBoss) {
  boss.actionState = "windup";
  boss.actionTimer = 0;
  boss.vx = 0;
  facePlayer(boss);
  // Keep the warning corridor truthful if the player crosses behind the boss.
  boss.castFacing = boss.facing;
  playSfx("bossCast", RUSH_WARNING_SFX_PITCH);
}

function startSpiderDash(boss: LiveBoss) {
  boss.actionState = "dash";
  boss.actionTimer = 0;
  boss.facing = boss.castFacing;
  boss.vx = boss.castFacing * (BOSS_CONFIG.rushVelocityBase + boss.phase);
}

function startSpiderAttack(boss: LiveBoss) {
  boss.actionState = "attack";
  boss.actionTimer = 0;
  boss.facing = boss.castFacing;
  boss.skillHitDone = false;
  boss.vx = 0;
}

function updateSpiderAttack(boss: LiveBoss) {
  boss.vx = 0;
  boss.facing = boss.castFacing;

  const isHitWindow = boss.actionTimer >= SPIDER_STRING_ATTACK_CONFIG.hitStartFrame
    && boss.actionTimer <= SPIDER_STRING_ATTACK_CONFIG.hitEndFrame;
  if (isHitWindow) {
    const hitbox = spiderAttackHitbox(boss);
    recordCollisionDebugRect(hitbox, "enemyAttack");
    if (!boss.skillHitDone && rectsOverlap(hitbox, state.player)) {
      boss.skillHitDone = true;
      hurtPlayer(
        bossAttackDamage(
          (BOSS_CONFIG.touchDamageBase + boss.phase * BOSS_CONFIG.touchDamagePhase)
            * SPIDER_STRING_ATTACK_CONFIG.damageMultiplier,
        ),
        boss.castFacing,
      );
    }
  }

  if (boss.actionTimer >= SPIDER_STRING_ATTACK_CONFIG.duration) {
    startSpiderRetreat(boss);
  }
}

function spiderAttackHitbox(boss: LiveBoss) {
  const x = boss.castFacing > 0
    ? boss.x + boss.w - SPIDER_STRING_ATTACK_CONFIG.forwardOffset
    : boss.x - SPIDER_STRING_ATTACK_CONFIG.hitboxWidth
      + SPIDER_STRING_ATTACK_CONFIG.forwardOffset;
  return {
    x,
    y: boss.y + SPIDER_STRING_ATTACK_CONFIG.hitboxTopOffset,
    w: SPIDER_STRING_ATTACK_CONFIG.hitboxWidth,
    h: SPIDER_STRING_ATTACK_CONFIG.hitboxHeight,
  };
}

function startSpiderRetreat(boss: LiveBoss) {
  boss.actionState = "recover";
  boss.actionTimer = 0;
  boss.recoveryTimer = BOSS_CONFIG.retreatFrames + BOSS_CONFIG.breathingFrames;
  facePlayer(boss);
  boss.vx = -boss.facing * BOSS_CONFIG.retreatVelocity;
}

function facePlayer(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
}

function shouldCastSpiderStringCage(boss: LiveBoss) {
  if (!boss.awakened || boss.phase < SPIDER_STRING_CAGE_CONFIG.minPhase) return false;
  return !boss.spiderStringCageUsed || (boss.spiderStringCageCd ?? 0) <= 0;
}

function nextSpiderStringSkill(boss: LiveBoss) {
  if (boss.phase < SPIDER_STRING_PILLAR_CONFIG.minPhase) return "spiderString";
  return boss.skillMode === "spiderStringPillars"
    ? "spiderString"
    : "spiderStringPillars";
}
