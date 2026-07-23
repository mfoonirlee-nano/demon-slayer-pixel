import { GROUND_Y, LANTERN_EMBER_CONFIG, WIDTH } from "../../constants";
import { canAutoSpawnEntities } from "../../game/debug";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { spawnBossSummonEnemy } from "../enemy";
import { bossAttackDamage, damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

const CAST_SFX_PITCH = 0.96;
const AWAKENED_GRID_PHASE = 4;
const AWAKENED_GRID_CHANCE = 0.26;
const BUFF_PHASE = 3;
const BUFF_CHANCE = 0.56;
const FIRELINE_PHASE = 2;
const FIRELINE_CHANCE = 0.76;
const MIN_SUMMON_COOLDOWN = 150;
const SUMMON_COOLDOWN_PHASE_REDUCTION = 10;
const LURE_FORWARD_OFFSET = 36;
const SUMMON_SFX_PITCH = 0.95;
const GRID_SFX_PITCH = 0.84;
const ASH_ZONE_FORWARD_OFFSET = 42;

export function updateLanternEmberBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= LANTERN_EMBER_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const castDuration = lanternCastDuration(boss);
    const framesSinceCastStart = castDuration - boss.castTimer;
    const spawnAtFrame = boss.skillMode === "lanternAwakenedGrid"
      ? LANTERN_EMBER_CONFIG.awakenedSpawnAtFrame
      : LANTERN_EMBER_CONFIG.spawnAtFrame;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnLanternEmberPattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = LANTERN_EMBER_CONFIG.recoveryFrames;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startLanternEmberCast(boss);
    return;
  }

  moveLanternEmberBoss(boss);
  damagePlayerOnContact(boss);
}

export function lanternCastDuration(boss: LiveBoss) {
  return boss.skillMode === "lanternAwakenedGrid"
    ? LANTERN_EMBER_CONFIG.awakenedCastDuration
    : LANTERN_EMBER_CONFIG.castDuration;
}

function startLanternEmberCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextLanternEmberSkill(boss);
  boss.castTimer = lanternCastDuration(boss);
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = lanternSkillCooldown(boss);
  boss.vx = 0;

  playSfx("bossCast", CAST_SFX_PITCH);
}

function nextLanternEmberSkill(boss: LiveBoss) {
  const roll = Math.random();
  if (boss.awakened && (boss.phase >= AWAKENED_GRID_PHASE || roll < AWAKENED_GRID_CHANCE)) return "lanternAwakenedGrid";
  if (boss.phase >= BUFF_PHASE && state.enemies.length > 0 && roll < BUFF_CHANCE) return "lanternBuff";
  if (boss.phase >= FIRELINE_PHASE && roll < FIRELINE_CHANCE) return "lanternFireline";
  return "lanternLure";
}

function lanternSkillCooldown(boss: LiveBoss) {
  if (boss.skillMode === "lanternAwakenedGrid") return LANTERN_EMBER_CONFIG.awakenedCooldown;
  if (boss.skillMode === "lanternBuff") return LANTERN_EMBER_CONFIG.buffCooldown;
  if (boss.skillMode === "lanternFireline") return LANTERN_EMBER_CONFIG.firelineCooldown;
  return Math.max(MIN_SUMMON_COOLDOWN, LANTERN_EMBER_CONFIG.summonCooldown - boss.phase * SUMMON_COOLDOWN_PHASE_REDUCTION);
}

function moveLanternEmberBoss(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
  boss.actionState = "move";
  boss.vx += Math.sign(toward) * (
    LANTERN_EMBER_CONFIG.moveSteeringForce
    + boss.phase * LANTERN_EMBER_CONFIG.phaseSteeringForce
  );
  boss.vx *= LANTERN_EMBER_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(LANTERN_EMBER_CONFIG.maxVelocityBase + boss.phase * LANTERN_EMBER_CONFIG.maxVelocityPhase),
    LANTERN_EMBER_CONFIG.maxVelocityBase + boss.phase * LANTERN_EMBER_CONFIG.maxVelocityPhase,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function spawnLanternEmberPattern(boss: LiveBoss) {
  if (boss.skillMode === "lanternFireline") {
    spawnLanternFireline(boss);
  } else if (boss.skillMode === "lanternBuff") {
    spawnLanternBuff(boss);
  } else if (boss.skillMode === "lanternAwakenedGrid") {
    spawnLanternAwakenedGrid(boss);
  } else {
    spawnLanternSummon(boss);
  }
}

function spawnLanternSummon(boss: LiveBoss) {
  const count = boss.phase >= LANTERN_EMBER_CONFIG.summonExtraEnemyPhase
    ? LANTERN_EMBER_CONFIG.summonMaxEnemies
    : 1;
  if (canAutoSpawnEntities()) {
    for (let i = 0; i < count; i += 1) spawnBossSummonEnemy();
  }
  state.lanternEmberLures.push({
    x: boss.x + boss.w / 2 + boss.castFacing * LURE_FORWARD_OFFSET,
    y: boss.y + LANTERN_EMBER_CONFIG.lureYOffset,
    vx: boss.castFacing * LANTERN_EMBER_CONFIG.lureSpeed,
    facing: boss.castFacing,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.lureLife,
  });
  playSfx("bossSummon", SUMMON_SFX_PITCH);
}

export function spawnLanternFireline(boss: LiveBoss) {
  const w = LANTERN_EMBER_CONFIG.firelineHitW
    + Math.max(0, boss.phase - 1) * LANTERN_EMBER_CONFIG.firelinePhaseW;
  const playerCenter = state.player.x + state.player.w / 2;
  const x = clamp(playerCenter - w / 2, 0, WIDTH - w);
  state.lanternEmberFirelines.push({
    x,
    y: state.player.onPlatform?.y ?? GROUND_Y,
    w,
    h: LANTERN_EMBER_CONFIG.firelineHitH,
    warningFrames: LANTERN_EMBER_CONFIG.firelineWarningFrames,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.firelineLife,
    damage: bossAttackDamage(
      LANTERN_EMBER_CONFIG.firelineDamageBase
        + boss.phase * LANTERN_EMBER_CONFIG.firelineDamagePhase,
    ),
    hitPlayer: false,
  });
  playSfx("bossFire");
}

function spawnLanternBuff(boss: LiveBoss) {
  const targets = nearestLanternBuffTargets(boss);
  for (const enemy of targets) {
    enemy.lanternBuffTimer = Math.max(enemy.lanternBuffTimer ?? 0, LANTERN_EMBER_CONFIG.buffFrames);
    state.lanternEmberBuffTethers.push({
      fromX: boss.x + boss.w / 2,
      fromY: boss.y + LANTERN_EMBER_CONFIG.lureYOffset,
      toX: enemy.x + enemy.w / 2,
      toY: enemy.y + enemy.h / 2,
      facing: boss.castFacing,
      elapsed: 0,
      frame: 0,
      life: LANTERN_EMBER_CONFIG.buffTetherLife,
    });
  }
  if (targets.length === 0) spawnLanternSummon(boss);
  playSfx("bossBuff");
}

function nearestLanternBuffTargets(boss: LiveBoss) {
  const bossCenterX = boss.x + boss.w / 2;
  const bossCenterY = boss.y + boss.h / 2;
  return state.enemies
    .map((enemy) => ({
      enemy,
      dist: Math.hypot(enemy.x + enemy.w / 2 - bossCenterX, enemy.y + enemy.h / 2 - bossCenterY),
    }))
    .filter(({ dist }) => dist <= LANTERN_EMBER_CONFIG.buffRadius)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, LANTERN_EMBER_CONFIG.buffMaxTargets)
    .map(({ enemy }) => enemy);
}

function spawnLanternAwakenedGrid(boss: LiveBoss) {
  const direction = boss.castFacing || 1;
  state.lanternEmberAwakenedGrids.push({
    x: direction > 0 ? -LANTERN_EMBER_CONFIG.awakenedGridPeriod : 0,
    y: GROUND_Y,
    w: WIDTH + LANTERN_EMBER_CONFIG.awakenedGridPeriod * 2,
    h: LANTERN_EMBER_CONFIG.awakenedGridHitH,
    vx: direction * LANTERN_EMBER_CONFIG.awakenedGridSpeed,
    warningFrames: LANTERN_EMBER_CONFIG.awakenedGridWarningFrames,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.awakenedGridLife,
    damage: bossAttackDamage(
      LANTERN_EMBER_CONFIG.awakenedGridDamageBase
        + boss.phase * LANTERN_EMBER_CONFIG.awakenedGridDamagePhase,
    ),
    hitPlayerCd: 0,
  });
  spawnLanternAshZone(boss);
  playSfx("bossUltimate", GRID_SFX_PITCH);
}

export function spawnLanternAshZone(boss: LiveBoss) {
  const x = clamp(
    state.player.x + state.player.w / 2 + boss.castFacing * ASH_ZONE_FORWARD_OFFSET,
    LANTERN_EMBER_CONFIG.ashZoneRadius,
    WIDTH - LANTERN_EMBER_CONFIG.ashZoneRadius,
  );
  state.lanternEmberAshZones.push({
    x,
    y: state.player.onPlatform?.y ?? GROUND_Y,
    radius: LANTERN_EMBER_CONFIG.ashZoneRadius,
    life: LANTERN_EMBER_CONFIG.ashZoneLife,
    maxLife: LANTERN_EMBER_CONFIG.ashZoneLife,
    elapsed: 0,
    frame: 0,
    damage: bossAttackDamage(
      LANTERN_EMBER_CONFIG.ashZoneDamageBase
        + boss.phase * LANTERN_EMBER_CONFIG.ashZoneDamagePhase,
    ),
  });
}
