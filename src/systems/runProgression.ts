import { PLAYER_COMBAT, RUNTIME_CONFIG } from "../constants";
import type { BossArchetype } from "../entities/bosses/registry";
import { BOSS_ARCHETYPE_IDS } from "../entities/bosses/registry";
import type { BossArchetypeId } from "../types/game-state";

export function actForBossKills(bossKills: number) {
  return bossKills + 1;
}

export function enemySpawnInterval(elapsedSeconds: number) {
  return Math.max(
    RUNTIME_CONFIG.enemySpawnMinInterval,
    RUNTIME_CONFIG.enemySpawnBaseInterval - elapsedSeconds * RUNTIME_CONFIG.enemySpawnDecay,
  );
}

export function bossHpForEncounter(
  archetype: BossArchetype,
  bossKills: number,
  elapsedSeconds: number,
) {
  return archetype.hpBase
    + bossKills * archetype.hpPerKill
    + elapsedSeconds * archetype.hpScaleByElapsed;
}

export function isAwakenedBossEncounter(archetype: BossArchetype, act: number) {
  return archetype.id === BOSS_ARCHETYPE_IDS.lanternEmber
    && act >= archetype.awakenedUnlockAct;
}

export function bossRespawnTimerAfterDefeat(defeatedBossId: BossArchetypeId) {
  return defeatedBossId === BOSS_ARCHETYPE_IDS.bloodMoon
    ? RUNTIME_CONFIG.disableBossSpawnTimer
    : PLAYER_COMBAT.skillChargeResetDelay;
}
