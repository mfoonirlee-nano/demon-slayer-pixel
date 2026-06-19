import { GROUND_Y, LANTERN_EMBER_CONFIG, WIDTH } from "../../constants";
import { canAutoSpawnEntities } from "../../game/debug";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { playSfx } from "../../game/audio";
import { spawnEnemy } from "../enemy";
import { damagePlayerOnContact } from "./shared";
import type { LiveBoss } from "./types";

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

  playSfx("bossCast", 0.96);
}

function nextLanternEmberSkill(boss: LiveBoss) {
  const roll = Math.random();
  if (boss.awakened && (boss.phase >= 4 || roll < 0.26)) return "lanternAwakenedGrid";
  if (boss.phase >= 3 && state.enemies.length > 0 && roll < 0.56) return "lanternBuff";
  if (boss.phase >= 2 && roll < 0.76) return "lanternFireline";
  return "lanternLure";
}

function lanternSkillCooldown(boss: LiveBoss) {
  if (boss.skillMode === "lanternAwakenedGrid") return LANTERN_EMBER_CONFIG.awakenedCooldown;
  if (boss.skillMode === "lanternBuff") return LANTERN_EMBER_CONFIG.buffCooldown;
  if (boss.skillMode === "lanternFireline") return LANTERN_EMBER_CONFIG.firelineCooldown;
  return Math.max(150, LANTERN_EMBER_CONFIG.summonCooldown - boss.phase * 10);
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
    for (let i = 0; i < count; i += 1) spawnEnemy();
  }
  state.lanternEmberLures.push({
    x: boss.x + boss.w / 2 + boss.castFacing * 36,
    y: boss.y + LANTERN_EMBER_CONFIG.lureYOffset,
    vx: boss.castFacing * LANTERN_EMBER_CONFIG.lureSpeed,
    facing: boss.castFacing,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.lureLife,
  });
  playSfx("bossSummon", 0.95);
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
    damage: LANTERN_EMBER_CONFIG.firelineDamageBase + boss.phase * LANTERN_EMBER_CONFIG.firelineDamagePhase,
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
    damage: LANTERN_EMBER_CONFIG.awakenedGridDamageBase + boss.phase * LANTERN_EMBER_CONFIG.awakenedGridDamagePhase,
    hitPlayerCd: 0,
  });
  spawnLanternAshZone(boss);
  playSfx("bossUltimate", 0.84);
}

export function spawnLanternAshZone(boss: LiveBoss) {
  const x = clamp(
    state.player.x + state.player.w / 2 + boss.castFacing * 42,
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
    damage: LANTERN_EMBER_CONFIG.ashZoneDamageBase + boss.phase * LANTERN_EMBER_CONFIG.ashZoneDamagePhase,
  });
}
