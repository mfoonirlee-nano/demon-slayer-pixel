import { BOSS_CONFIG, BOSS_SKILL1_CONFIG } from "../../constants";
import { canAutoSpawnEntities } from "../../game/debug";
import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { spawnBossSummonEnemy } from "../enemy";
import { spawnBossSkill1Effect } from "./spiderStringEffects";
import { damagePlayerOnContact, moveChasingBoss } from "./shared";
import type { LiveBoss } from "./types";

const CAST_SFX_PITCH = 0.92;
const PROJECTILE_SFX_PITCH_STEP = 0.04;
const SUMMON_SFX_PITCH = 0.92;

export function updateSpiderStringBoss(boss: LiveBoss) {
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
    playSfx("bossCast", CAST_SFX_PITCH);
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
      playSfx("bossProjectile", 1 + boss.phase * PROJECTILE_SFX_PITCH_STEP);
    } else if (canAutoSpawnEntities()) {
      spawnBossSummonEnemy();
      if (boss.phase >= BOSS_CONFIG.summonExtraEnemyPhase) spawnBossSummonEnemy();
      playSfx("bossSummon", SUMMON_SFX_PITCH);
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
