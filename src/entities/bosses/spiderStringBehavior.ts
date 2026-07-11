import { BOSS_CONFIG, BOSS_SKILL1_CONFIG, SPIDER_STRING_CAGE_CONFIG, WIDTH } from "../../constants";
import { canAutoSpawnEntities } from "../../game/debug";
import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { clamp } from "../../game/utils";
import { spawnBossSummonEnemy } from "../enemy";
import { spawnSpiderStringCageEffect } from "./spiderStringCageEffects";
import { spawnBossSkill1Effect } from "./spiderStringEffects";
import { damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const CAST_SFX_PITCH = 0.92;
const SUMMON_SFX_PITCH = 0.92;

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

    const framesSinceCastStart = BOSS_SKILL1_CONFIG.castDuration - boss.castTimer;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= BOSS_SKILL1_CONFIG.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnBossSkill1Effect(boss);
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (updateSpiderRushCycleIfActive(boss)) {
    damagePlayerOnContact(boss);
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
    facePlayer(boss);
    boss.castFacing = boss.facing;
    boss.castTimer = BOSS_SKILL1_CONFIG.castDuration;
    boss.skillEffectSpawned = false;
    boss.skillMode = "spiderString";
    boss.actionState = "cast";
    boss.actionTimer = 0;
    boss.skillCd = BOSS_SKILL1_CONFIG.cooldown;
    boss.vx = 0;
    playSfx("bossCast", CAST_SFX_PITCH);
    return;
  }

  startSpiderRushWindup(boss);

  if (boss.aiTimer <= 0) {
    if (canAutoSpawnEntities()) {
      spawnBossSummonEnemy();
      if (boss.phase >= BOSS_CONFIG.summonExtraEnemyPhase) spawnBossSummonEnemy();
      playSfx("bossSummon", SUMMON_SFX_PITCH);
    }
    boss.aiTimer = BOSS_CONFIG.aiBaseCooldown - boss.phase * BOSS_CONFIG.aiPhaseReduction;
  }

  damagePlayerOnContact(boss);
}

function updateSpiderRushCycleIfActive(boss: LiveBoss) {
  if (boss.actionState === "windup") {
    boss.vx = 0;
    facePlayer(boss);
    if (boss.actionTimer >= BOSS_CONFIG.rushWindupFrames) startSpiderDash(boss);
    return true;
  }

  if (boss.actionState === "dash") {
    const nextX = clamp(boss.x + boss.vx, 0, WIDTH - boss.w);
    boss.x = nextX;
    const reachedEdge = nextX === 0 || nextX === WIDTH - boss.w;
    if (boss.actionTimer >= BOSS_CONFIG.rushFrames || reachedEdge) startSpiderRetreat(boss);
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
}

function startSpiderDash(boss: LiveBoss) {
  boss.actionState = "dash";
  boss.actionTimer = 0;
  boss.vx = boss.facing * (BOSS_CONFIG.rushVelocityBase + boss.phase);
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
