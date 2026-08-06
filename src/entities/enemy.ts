import { state } from "../game/state";
import {
  WIDTH,
  GRAVITY,
  GROUND_Y,
  ENEMY_SHEETS,
  ENEMY_CONFIG,
  ENEMY_BACKGROUND_SPAWN,
  LANTERN_EMBER_CONFIG,
  NEAR_FOREGROUND_SCROLL_SPEED,
  PLAYER_COMBAT,
} from "../constants";
import type { ActBand, EnemyId, EnemySpawnSource, EnemyState, PlatformState, SpawnPattern } from "../types/game-state";
import { hitbox, rectsOverlap } from "../game/utils";
import { hurtPlayer } from "./player";
import {
  createEnemyState,
  drawEnemyEliteMarker,
  enemyAttackDamage,
  enemyVisualSize,
} from "./enemies/common";
import { canSpawnBrute, isBruteSheet, updateBruteGuardReflections } from "./enemies/brute";
import { canSpawnBinder, isBinderSheet } from "./enemies/binder";
import { canSpawnDuelist, isDuelistSheet } from "./enemies/duelist";
import { canSpawnGlider, isGliderSheet } from "./enemies/glider";
import { canSpawnLeaper, isLeaperSheet } from "./enemies/leaper";
import { canSpawnSplitter, isSplitterSheet } from "./enemies/splitter";
import { applyWardenAuraBuffs, canSpawnWarden, isWardenSheet } from "./enemies/warden";
import { canSpawnBurrower, isBurrowerSheet } from "./enemies/burrower";
import { enemyArchetypeForSheet } from "./enemies/registry";
import {
  activeSpawnCost,
  canSpawnByDirectorCap,
  canSpawnBossSummon,
  enemySpawnCost,
  enemyArchetypeById,
  enemyIdForSheetIndex,
  enemySpawnStats,
  maxActiveSpawnCostForAct,
  pickBossSummonEnemyId,
  pickRegularEnemyId,
} from "../systems/enemyDirector";
import { BOSS_ARCHETYPE_IDS } from "./bosses/registry";
import { actBandForAct } from "../systems/runProgression";
import {
  resolveNearForegroundOccluders,
  type NearForegroundOccluder,
} from "../rendering/nearForeground";

type SpawnEnemyOptions = {
  elite?: boolean;
  growthStage?: ActBand;
};

type EnemySpawnSize = {
  w: number;
  h: number;
};

const PLATFORM_SPAWN_MAX_DISTANCE = 260;
const PLATFORM_SPAWN_CENTER_RATIO = 0.35;
const SPAWN_BODY_PADDING = 6;
const SPAWN_PLACEMENT_ATTEMPTS = 10;
const GROUNDED_ENTRY_ENEMY_IDS: readonly EnemyId[] = [
  "chaser",
  "crawler",
  "runner",
  "duelist",
  "caster",
  "splitter",
  "brute",
  "binder",
  "warden",
];
const BACKGROUND_OCCLUDER_ENTRY_ENEMY_IDS: readonly EnemyId[] = [
  ...GROUNDED_ENTRY_ENEMY_IDS,
  "leaper",
  "burrower",
];
const PLATFORM_PHYSICS_ENEMY_IDS: readonly EnemyId[] = [
  ...GROUNDED_ENTRY_ENEMY_IDS,
  "leaper",
];
const DEBUG_BOSS_KILLS_BY_GROWTH_STAGE: Record<ActBand, number> = {
  intro: 0,
  awakened: 6,
  final: 12,
};

function sideForPattern(pattern: SpawnPattern): number {
  if (pattern === "left") return -1;
  if (pattern === "right") return 1;
  return Math.random() < ENEMY_CONFIG.spawnSideChance ? -1 : 1;
}

function isPlatformSpawnCandidate(platform: PlatformState) {
  return platform.x >= WIDTH
    && platform.x <= WIDTH + PLATFORM_SPAWN_MAX_DISTANCE
    && platform.kind !== "hover"
    && platform.reservedForTreasure !== true;
}

function platformSpawnCandidate() {
  let picked: PlatformState | null = null;

  for (const platform of state.platforms) {
    if (!isPlatformSpawnCandidate(platform)) continue;
    if (!picked || platform.x < picked.x) picked = platform;
  }

  return picked;
}

function canUsePlatformSpawn(enemyId: EnemyId, source: EnemySpawnSource) {
  return source === "regular" && enemyId !== "caster" && GROUNDED_ENTRY_ENEMY_IDS.includes(enemyId);
}

function canUseBackgroundOccluderSpawn(enemyId: EnemyId, source: EnemySpawnSource) {
  return source === "regular" && BACKGROUND_OCCLUDER_ENTRY_ENEMY_IDS.includes(enemyId);
}

export function backgroundOccluderSpawnChanceForAct(act: number) {
  const unlockedActs = act - ENEMY_BACKGROUND_SPAWN.standardStartAct + 1;
  if (unlockedActs <= 0) {
    return Math.max(0, act) * ENEMY_BACKGROUND_SPAWN.earlyChancePerAct;
  }
  return Math.min(
    ENEMY_BACKGROUND_SPAWN.maxChance,
    unlockedActs * ENEMY_BACKGROUND_SPAWN.standardChancePerAct,
  );
}

function occluderCenterX(occluder: NearForegroundOccluder) {
  return occluder.x + occluder.drawW / 2;
}

function playerCenterX() {
  return state.player.x + state.player.w / 2;
}

function isVisibleOccluder(occluder: NearForegroundOccluder) {
  return occluder.x < WIDTH && occluder.x + occluder.drawW > 0;
}

function occluderClearsPlayer(occluder: NearForegroundOccluder) {
  const playerLeft = state.player.x;
  const playerRight = state.player.x + state.player.w;
  return occluder.x + occluder.drawW <= playerLeft || occluder.x >= playerRight;
}

function occluderFitsEnemy(occluder: NearForegroundOccluder, size: EnemySpawnSize) {
  const centerX = occluderCenterX(occluder);
  return isVisibleOccluder(occluder)
    && occluder.drawW > size.w
    && occluder.drawH > size.h
    && centerX >= size.w / 2
    && centerX <= WIDTH - size.w / 2
    && occluderClearsPlayer(occluder);
}

function pickBackgroundOccluderSpawn(
  enemyId: EnemyId,
  size: EnemySpawnSize,
  source: EnemySpawnSource,
) {
  if (!canUseBackgroundOccluderSpawn(enemyId, source)) return null;

  const chance = backgroundOccluderSpawnChanceForAct(state.enemyDirector.act);
  if (chance <= 0 || Math.random() >= chance) return null;

  const candidates = resolveNearForegroundOccluders({
    elapsed: state.elapsed,
    bossPreludeElapsed: state.enemyDirector.bossPrelude?.elapsed ?? null,
    act: state.enemyDirector.act,
  }).filter((occluder) => occluder.source !== "torii" && occluderFitsEnemy(occluder, size));
  if (candidates.length === 0) return null;

  const actPropCandidates = candidates.filter((occluder) => occluder.source === "actProp");
  const spawnCandidates = actPropCandidates.length > 0 ? actPropCandidates : candidates;
  return spawnCandidates[Math.floor(Math.random() * spawnCandidates.length)];
}

function sideForBackgroundOccluder(occluder: NearForegroundOccluder) {
  return occluderCenterX(occluder) < playerCenterX() ? -1 : 1;
}

function placeEnemyBehindBackgroundOccluder(enemy: EnemyState, occluder: NearForegroundOccluder) {
  enemy.x = occluderCenterX(occluder) - enemy.w / 2;
  enemy.y = GROUND_Y - enemy.h;
  enemy.vy = 0;
  enemy.onPlatform = null;
  enemy.spawnOccluder = { ...occluder };
  enemy.spawnOccluderStartedAt = state.elapsed;
  enemy.spawnOccluderDirection = occluderCenterX(occluder) < playerCenterX() ? 1 : -1;
}

function spawnBody(enemy: EnemyState) {
  return {
    x: enemy.x - SPAWN_BODY_PADDING,
    y: enemy.y,
    w: enemy.w + SPAWN_BODY_PADDING * 2,
    h: enemy.h,
  };
}

function enemySpawnBodyIsClear(enemy: EnemyState) {
  const body = spawnBody(enemy);
  return state.enemies.every((existingEnemy) => !rectsOverlap(body, existingEnemy));
}

function placeEnemyOnGround(enemy: EnemyState, side: number) {
  const baseX = side === 1 ? WIDTH + ENEMY_CONFIG.spawnOffsetRight : ENEMY_CONFIG.spawnOffsetLeft;
  const step = enemy.w + SPAWN_BODY_PADDING;
  enemy.y = GROUND_Y - enemy.h;
  enemy.vy = 0;
  enemy.onPlatform = null;
  delete enemy.spawnOccluder;
  delete enemy.spawnOccluderStartedAt;
  delete enemy.spawnOccluderDirection;

  for (let attempt = 0; attempt < SPAWN_PLACEMENT_ATTEMPTS; attempt += 1) {
    enemy.x = baseX + side * step * attempt;
    if (enemySpawnBodyIsClear(enemy)) return true;
  }
  return false;
}

function enemyUsesPlatformPhysics(enemy: EnemyState) {
  if (enemy.id === "crawler" && enemy.crawlerPhase === "leap") return false;
  if (enemy.id === "duelist" && enemy.duelistPhase === "spin") return false;
  if (
    enemy.id === "leaper"
    && (
      enemy.leaperPhase === "leap"
      || enemy.leaperPhase === "skyRise"
      || enemy.leaperPhase === "skyWait"
      || enemy.leaperPhase === "skyFall"
    )
  ) {
    return false;
  }
  return PLATFORM_PHYSICS_ENEMY_IDS.includes(enemy.id);
}

function clampEnemyCenterToPlatform(centerX: number, enemy: EnemyState, platform: PlatformState) {
  const minCenterX = platform.x + enemy.w / 2;
  const maxCenterX = platform.x + platform.w - enemy.w / 2;
  if (minCenterX > maxCenterX) return platform.x + platform.w / 2;
  return Math.min(maxCenterX, Math.max(minCenterX, centerX));
}

function placeEnemyAtPlatformCenter(enemy: EnemyState, platform: PlatformState, centerX: number) {
  enemy.x = centerX - enemy.w / 2;
  enemy.y = platform.y - enemy.h;
  enemy.vy = 0;
  enemy.onPlatform = platform;
}

function placeEnemyOnPlatform(enemy: EnemyState, platform: PlatformState) {
  const baseCenterX = clampEnemyCenterToPlatform(
    platform.x + platform.w * PLATFORM_SPAWN_CENTER_RATIO,
    enemy,
    platform,
  );
  const step = enemy.w + SPAWN_BODY_PADDING;
  placeEnemyAtPlatformCenter(enemy, platform, baseCenterX);
  if (enemySpawnBodyIsClear(enemy)) return true;

  for (let attempt = 1; attempt < SPAWN_PLACEMENT_ATTEMPTS; attempt += 1) {
    const direction = attempt % 2 === 1 ? 1 : -1;
    const distance = Math.ceil(attempt / 2) * step;
    const centerX = clampEnemyCenterToPlatform(baseCenterX + direction * distance, enemy, platform);
    placeEnemyAtPlatformCenter(enemy, platform, centerX);
    if (enemySpawnBodyIsClear(enemy)) return true;
  }
  return false;
}

function enemyOverlapsPlatform(enemy: EnemyState, platform: PlatformState) {
  return enemy.x + enemy.w > platform.x + PLAYER_COMBAT.platformEdgePadding
    && enemy.x < platform.x + platform.w - PLAYER_COMBAT.platformEdgePadding;
}

function prepareEnemyPlatformPhysics(enemy: EnemyState) {
  const platform = enemy.onPlatform ?? null;
  if (platform && state.platforms.includes(platform) && enemyOverlapsPlatform(enemy, platform)) {
    enemy.x += platform.vx;
  } else {
    enemy.onPlatform = null;
  }

  return enemy.y + enemy.h;
}

function applyEnemyPlatformPhysics(enemy: EnemyState, prevBottom: number) {
  enemy.vy = (enemy.vy ?? 0) + GRAVITY;
  enemy.y += enemy.vy;
  enemy.onPlatform = null;

  let landed = false;
  if (enemy.vy >= 0) {
    for (const platform of state.platforms) {
      if (!enemyOverlapsPlatform(enemy, platform)) continue;
      const nowBottom = enemy.y + enemy.h;
      if (prevBottom <= platform.y + PLAYER_COMBAT.platformLandingTolerance && nowBottom >= platform.y) {
        enemy.y = platform.y - enemy.h;
        enemy.vy = 0;
        enemy.onPlatform = platform;
        landed = true;
        break;
      }
    }
  }

  if (!landed && enemy.y + enemy.h >= GROUND_Y) {
    enemy.y = GROUND_Y - enemy.h;
    enemy.vy = 0;
  }
}

function createSpawnedEnemy(
  enemyId: EnemyId,
  side: number,
  spawnSource: EnemySpawnSource,
  options: SpawnEnemyOptions = {},
): EnemyState {
  const config = enemyArchetypeById(enemyId);
  const archetype = enemyArchetypeForSheet(config.sheetIndex);
  const coverSize = enemyVisualSize(config.sheetIndex, archetype);
  const backgroundOccluder = pickBackgroundOccluderSpawn(enemyId, coverSize, spawnSource);
  const spawnSide = backgroundOccluder ? sideForBackgroundOccluder(backgroundOccluder) : side;
  const growthStage = options.growthStage ?? actBandForAct(state.enemyDirector.act);
  const statBossKills = spawnSource === "debug" && options.growthStage
    ? DEBUG_BOSS_KILLS_BY_GROWTH_STAGE[options.growthStage]
    : state.bossKills;
  const stats = enemySpawnStats(enemyId, statBossKills, state.elapsed);
  const elite = options.elite === true && spawnSource === "regular";
  const spawnContext = {
    enemyId,
    spawnSource,
    spawnCost: enemySpawnCost(enemyId, elite),
    growthStage,
    elite,
    side: spawnSide,
    sheetIndex: config.sheetIndex,
    speed: stats.speed,
    damage: stats.damage,
    baseHp: stats.hp / (archetype.hpMultiplier ?? 1),
  };
  const enemy = createEnemyState(spawnContext, archetype);
  if (backgroundOccluder) {
    placeEnemyBehindBackgroundOccluder(enemy, backgroundOccluder);
    if (!enemySpawnBodyIsClear(enemy)) placeEnemyOnGround(enemy, spawnSide);
  } else if (canUsePlatformSpawn(enemyId, spawnSource)) {
    const platform = platformSpawnCandidate();
    if (!platform || !placeEnemyOnPlatform(enemy, platform)) placeEnemyOnGround(enemy, spawnSide);
  } else {
    placeEnemyOnGround(enemy, spawnSide);
  }
  archetype.init?.(enemy, spawnContext);
  return enemy;
}

function canSpawnSheetIndex(sheetIndex: number) {
  if (!ENEMY_SHEETS[sheetIndex]) return false;
  if (isBruteSheet(sheetIndex)) return canSpawnBrute();
  if (isBinderSheet(sheetIndex)) return canSpawnBinder();
  if (isDuelistSheet(sheetIndex)) return canSpawnDuelist();
  if (isGliderSheet(sheetIndex)) return canSpawnGlider();
  if (isLeaperSheet(sheetIndex)) return canSpawnLeaper();
  if (isSplitterSheet(sheetIndex)) return canSpawnSplitter();
  if (isWardenSheet(sheetIndex)) return canSpawnWarden();
  if (isBurrowerSheet(sheetIndex)) return canSpawnBurrower();
  return true;
}

function canSpawnEnemyId(enemyId: EnemyId, source: EnemySpawnSource, options: SpawnEnemyOptions = {}) {
  const config = enemyArchetypeById(enemyId);
  const elite = options.elite === true && source === "regular";
  const spawnCost = enemySpawnCost(enemyId, elite);
  if (!ENEMY_SHEETS[config.sheetIndex]) return false;
  if (!canSpawnSheetIndex(config.sheetIndex)) return false;
  if (source === "debug") return true;
  if (!canSpawnByDirectorCap(state.enemies, enemyId)) return false;
  if (source === "boss") {
    return canSpawnBossSummon(
      state.enemies,
      spawnCost,
      state.boss?.phase ?? 1,
      state.boss?.awakened ?? false,
      state.boss?.id === BOSS_ARCHETYPE_IDS.bloodMoon,
    );
  }
  return activeSpawnCost(state.enemies) + spawnCost <= maxActiveSpawnCostForAct(
    state.enemyDirector.act,
    state.enemyDirector.elapsedInAct,
  );
}

export function spawnEnemyById(
  enemyId: EnemyId,
  source: EnemySpawnSource = "regular",
  pattern: SpawnPattern = "random_edge",
  options: SpawnEnemyOptions = {},
) {
  if (!canSpawnEnemyId(enemyId, source, options)) return false;

  state.enemies.push(createSpawnedEnemy(enemyId, sideForPattern(pattern), source, options));
  return true;
}

export function spawnEnemy(source: EnemySpawnSource = "regular") {
  const enemyId = source === "boss"
    ? pickBossSummonEnemyId(state.enemyDirector, Math.random, {
        phase: state.boss?.phase ?? 1,
        awakened: state.boss?.awakened ?? false,
        finalBoss: state.boss?.id === BOSS_ARCHETYPE_IDS.bloodMoon,
      })
    : pickRegularEnemyId(state.enemyDirector);
  return spawnEnemyById(enemyId, source);
}

export function spawnBossSummonEnemy() {
  return spawnEnemy("boss");
}

export function spawnEnemyBySheetIndex(sheetIndex: number, side = 1, options: SpawnEnemyOptions = {}) {
  if (!canSpawnSheetIndex(sheetIndex)) return;
  const enemyId = enemyIdForSheetIndex(sheetIndex);
  state.enemies.push(createSpawnedEnemy(enemyId, side, "debug", options));
}

function spawnOccluderBounds(enemy: EnemyState) {
  const occluder = enemy.spawnOccluder;
  if (!occluder) return null;
  const elapsedDelta = Math.max(
    0,
    state.elapsed - (enemy.spawnOccluderStartedAt ?? state.elapsed),
  );
  return {
    x: occluder.x - elapsedDelta * NEAR_FOREGROUND_SCROLL_SPEED,
    y: occluder.y,
    w: occluder.drawW,
    h: occluder.drawH,
  };
}

function enemySpawnVisualBounds(enemy: EnemyState) {
  const archetype = enemyArchetypeForSheet(enemy.sheetIndex);
  const visualSize = enemyVisualSize(enemy.sheetIndex, archetype);
  return {
    x: enemy.x + enemy.w / 2 - visualSize.w / 2,
    y: enemy.y + enemy.h - visualSize.h,
    w: visualSize.w,
    h: visualSize.h,
  };
}

export function isEnemyBehindSpawnOccluder(enemy: EnemyState) {
  const occluderBounds = spawnOccluderBounds(enemy);
  return occluderBounds !== null
    && rectsOverlap(enemySpawnVisualBounds(enemy), occluderBounds);
}

function clearSpawnOccluder(enemy: EnemyState) {
  delete enemy.spawnOccluder;
  delete enemy.spawnOccluderStartedAt;
  delete enemy.spawnOccluderDirection;
}

function updateSpawnOccluderEntry(enemy: EnemyState) {
  if (!enemy.spawnOccluder) return false;
  if (!isEnemyBehindSpawnOccluder(enemy)) {
    clearSpawnOccluder(enemy);
    return false;
  }

  const direction = enemy.spawnOccluderDirection ?? (enemy.vx >= 0 ? 1 : -1);
  const speed = Math.max(Math.abs(enemy.vx), ENEMY_BACKGROUND_SPAWN.emergeMinSpeed);
  enemy.vx = direction * speed;
  enemy.x += enemy.vx;
  if (!isEnemyBehindSpawnOccluder(enemy)) clearSpawnOccluder(enemy);
  return true;
}

export function updateEnemies() {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const lanternBuffed = (enemy.lanternBuffTimer ?? 0) > 0;
    enemy.hitCd -= 1;
    if ((enemy.armorBreakTimer ?? 0) > 0) {
      enemy.armorBreakTimer = Math.max(0, (enemy.armorBreakTimer ?? 0) - 1);
    }

    const archetype = enemyArchetypeForSheet(enemy.sheetIndex);
    if (updateSpawnOccluderEntry(enemy)) continue;
    const usesPlatformPhysics = enemyUsesPlatformPhysics(enemy);
    const prevBottom = usesPlatformPhysics ? prepareEnemyPlatformPhysics(enemy) : 0;
    archetype.update(enemy);
    if (archetype.shouldRemove?.(enemy)) {
      state.enemies.splice(i, 1);
      continue;
    }

    if (lanternBuffed) {
      enemy.x += enemy.vx * LANTERN_EMBER_CONFIG.buffSpeedExtraScale;
      enemy.lanternBuffTimer = Math.max(0, (enemy.lanternBuffTimer ?? 0) - 1);
    }

    if (usesPlatformPhysics) applyEnemyPlatformPhysics(enemy, prevBottom);
  }

  applyWardenAuraBuffs();
  updateBruteGuardReflections();

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const lanternBuffed = (enemy.lanternBuffTimer ?? 0) > 0;
    const archetype = enemyArchetypeForSheet(enemy.sheetIndex);
    if (
      !isEnemyBehindSpawnOccluder(enemy)
      && !archetype.contactDamageDisabled?.(enemy)
      && hitbox(state.player, enemy)
    ) {
      const damage = lanternBuffed
        ? enemyAttackDamage(enemy, enemy.damage * LANTERN_EMBER_CONFIG.buffDamageScale)
        : enemyAttackDamage(enemy, enemy.damage);
      hurtPlayer(damage, enemy.vx);
    }

    if (enemy.x < -ENEMY_CONFIG.despawnMargin || enemy.x > WIDTH + ENEMY_CONFIG.despawnMargin) {
      state.enemies.splice(i, 1);
    }
  }
}

export function drawEnemy(enemy: EnemyState) {
  const archetype = enemyArchetypeForSheet(enemy.sheetIndex);
  archetype.draw(enemy);
  drawEnemyEliteMarker(enemy, archetype);
}
