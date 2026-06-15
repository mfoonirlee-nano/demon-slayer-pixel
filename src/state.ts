import { BASIC_ATTACK, GROUND_Y, PLAYER_COMBAT, PLAYER_DEFAULTS, RUNTIME_CONFIG } from "./constants";
import { bossArchetypeForId } from "./entities/bosses/registry";
import type { GameSnapshot } from "./gameStore";
import { createInitialMoonState } from "./moon";
import type { GameState, PlayerState } from "./types/game-state";
import { equipmentItem } from "./systems/equipment";
import {
  INITIAL_EQUIPPED_SKILL_IDS,
  INITIAL_SKILL_LEVELS,
  maxSkillChargesForEnergy,
  maxSkillEnergyForLevel,
  moonTideUltimateConfig,
  xpToNextLevel,
} from "./systems/progression";

export type * from "./types/game-state";

export function createInitialPlayerState(): PlayerState {
  const skillEnergyMax = maxSkillEnergyForLevel(1);

  return {
    x: PLAYER_DEFAULTS.x,
    y: GROUND_Y - PLAYER_DEFAULTS.yOffsetFromGround,
    w: PLAYER_DEFAULTS.w,
    h: PLAYER_DEFAULTS.h,
    vx: 0,
    vy: 0,
    speed: PLAYER_DEFAULTS.speed,
    jump: PLAYER_DEFAULTS.jump,
    facing: PLAYER_DEFAULTS.facing,
    hp: PLAYER_DEFAULTS.maxHp,
    maxHp: PLAYER_DEFAULTS.maxHp,
    invincible: 0,
    attackTimer: 0,
    attackDuration: BASIC_ATTACK.frames,
    fallAttackTimer: 0,
    fallAttackRecoveryTimer: 0,
    score: 0,
    runLevel: 1,
    runXp: 0,
    baseAttack: PLAYER_DEFAULTS.baseAttack,
    attackBonus: 0,
    skillEnergy: 0,
    skillEnergyMax,
    skillCharges: 0,
    maxSkillCharges: maxSkillChargesForEnergy(skillEnergyMax),
    skillIndex: 0,
    equippedSkillIds: [...INITIAL_EQUIPPED_SKILL_IDS],
    skillLevels: { ...INITIAL_SKILL_LEVELS },
    skillTimer: 0,
    skillEffectSpawned: false,
    skillCastDamageMultiplier: 1,
    dashReposition: null,
    ultimateEnergy: 0,
    ultimateEnergyMax: PLAYER_DEFAULTS.maxUltimateEnergy,
    ultimateLevel: 0,
    ultimateTimer: 0,
    ultimateCastTimer: 0,
    ultimateEffectSpawned: false,
    flowBladeHits: 0,
    flowBladeSurgeReady: false,
    flowGarbTimer: 0,
    onPlatform: null,
    skillFlash: 0,
    isPlayer: true,
  };
}

export function createInitialState(): GameState {
  return {
    elapsed: 0,
    last: 0,
    spawnTimer: 0,
    bossSpawnTimer: RUNTIME_CONFIG.initialBossSpawnTimer,
    bossKills: 0,
    pendingUpgradeChoices: [],
    pendingEquipmentChoices: [],
    equipmentInventory: [],
    equippedEquipment: {
      blade: null,
      garb: null,
      talisman: null,
    },
    platformSpawnTimer: 0,
    gameOver: false,
    boss: null,
    moon: createInitialMoonState(),
    spritesReady: false,
    player: createInitialPlayerState(),
    enemies: [],
    particles: [],
    projectiles: [],
    bindingZones: [],
    platforms: [],
    chests: [],
    skillBursts: [],
    hitBursts: [],
    skill1Effects: [],
    skill2Effects: [],
    skill3Effect: null,
    playerSkillEffects: [],
    ultimateEffects: [],
    ultimateTrails: [],
    ultimateAfterimageSlashes: [],
    bossSkill1Effects: [],
    deadBellWaves: [],
    deadBellBlades: [],
    mirrorShards: [],
    mirrorAfterimages: [],
    lanternEmberLures: [],
    lanternEmberFirelines: [],
    lanternEmberBuffTethers: [],
    lanternEmberAwakenedGrids: [],
    lanternEmberAshZones: [],
    bloodMoonEffects: [],
    crystals: [],
  };
}

export const state: GameState = createInitialState();

function resetCollection<T>(collection: T[], nextItems: T[] = []) {
  collection.length = 0;
  collection.push(...nextItems);
}

export function resetState() {
  const next = createInitialState();
  state.player = next.player;
  resetCollection(state.enemies, next.enemies);
  resetCollection(state.platforms, next.platforms);
  resetCollection(state.chests, next.chests);
  resetCollection(state.crystals, next.crystals);
  resetCollection(state.particles, next.particles);
  resetCollection(state.skillBursts, next.skillBursts);
  resetCollection(state.hitBursts, next.hitBursts);
  resetCollection(state.skill1Effects, next.skill1Effects);
  resetCollection(state.skill2Effects, next.skill2Effects);
  resetCollection(state.playerSkillEffects, next.playerSkillEffects);
  resetCollection(state.ultimateEffects, next.ultimateEffects);
  resetCollection(state.ultimateTrails, next.ultimateTrails);
  resetCollection(state.ultimateAfterimageSlashes, next.ultimateAfterimageSlashes);
  resetCollection(state.bossSkill1Effects, next.bossSkill1Effects);
  resetCollection(state.deadBellWaves, next.deadBellWaves);
  resetCollection(state.deadBellBlades, next.deadBellBlades);
  resetCollection(state.mirrorShards, next.mirrorShards);
  resetCollection(state.mirrorAfterimages, next.mirrorAfterimages);
  resetCollection(state.lanternEmberLures, next.lanternEmberLures);
  resetCollection(state.lanternEmberFirelines, next.lanternEmberFirelines);
  resetCollection(state.lanternEmberBuffTethers, next.lanternEmberBuffTethers);
  resetCollection(state.lanternEmberAwakenedGrids, next.lanternEmberAwakenedGrids);
  resetCollection(state.lanternEmberAshZones, next.lanternEmberAshZones);
  resetCollection(state.bloodMoonEffects, next.bloodMoonEffects);
  state.skill3Effect = next.skill3Effect;
  resetCollection(state.projectiles, next.projectiles);
  resetCollection(state.bindingZones, next.bindingZones);
  state.elapsed = next.elapsed;
  state.spawnTimer = next.spawnTimer;
  state.bossSpawnTimer = next.bossSpawnTimer;
  state.bossKills = next.bossKills;
  resetCollection(state.pendingUpgradeChoices, next.pendingUpgradeChoices);
  resetCollection(state.pendingEquipmentChoices, next.pendingEquipmentChoices);
  resetCollection(state.equipmentInventory, next.equipmentInventory);
  state.equippedEquipment = next.equippedEquipment;
  state.platformSpawnTimer = next.platformSpawnTimer;
  state.boss = next.boss;
  state.gameOver = next.gameOver;
  state.moon = next.moon;
  state.last = next.last;
  // spritesReady is not reset — loaded assets persist across game resets
}

export function getStateSnapshot(manualPaused = false, paused = manualPaused): GameSnapshot {
  const bossArchetype = state.boss ? bossArchetypeForId(state.boss.id) : null;
  const ultimateConfig = moonTideUltimateConfig(state.player.ultimateLevel);
  const activeOverlay = state.gameOver
    ? "death"
    : state.pendingEquipmentChoices.length > 0
      ? "bossEquipment"
      : state.pendingUpgradeChoices.length > 0
        ? "upgrade"
        : manualPaused
          ? "pause"
          : "none";
  return {
    elapsed: state.elapsed,
    gameOver: state.gameOver,
    paused,
    manualPaused,
    activeOverlay,
    spritesReady: state.spritesReady,
    enemiesCount: state.enemies.length,
    boss: state.boss && bossArchetype
      ? {
          id: state.boss.id,
          displayName: bossArchetype.displayName,
          phaseTitle: state.boss.awakened && bossArchetype.awakenedPhaseTitle
            ? bossArchetype.awakenedPhaseTitle(state.boss.phase)
            : bossArchetype.phaseTitle(state.boss.phase),
          hp: state.boss.hp,
          hpMax: state.boss.hpMax,
          phase: state.boss.phase,
        }
      : null,
    player: {
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      score: state.player.score,
      runLevel: state.player.runLevel,
      runXp: state.player.runXp,
      xpToNext: xpToNextLevel(state.player.runLevel),
      baseAttack: state.player.baseAttack,
      attackBonus: state.player.attackBonus,
      totalAttack: state.player.baseAttack + state.player.attackBonus,
      skillEnergy: state.player.skillEnergy,
      skillEnergyMax: state.player.skillEnergyMax,
      skillCharges: state.player.skillCharges,
      maxSkillCharges: state.player.maxSkillCharges,
      skillIndex: state.player.skillIndex,
      equippedSkillIds: [...state.player.equippedSkillIds],
      skillLevels: { ...state.player.skillLevels },
      ultimateEnergy: state.player.ultimateEnergy,
      ultimateEnergyMax: state.player.ultimateEnergyMax,
      ultimateLevel: state.player.ultimateLevel,
      ultimateTimer: state.player.ultimateTimer,
      ultimateDuration: ultimateConfig.durationFrames,
      ultimateCastTimer: state.player.ultimateCastTimer,
      ultimateCastDuration: PLAYER_COMBAT.ultimateCastFrames,
      ultimateReady: state.player.ultimateEnergy >= state.player.ultimateEnergyMax
        && state.player.ultimateTimer <= 0
        && state.player.ultimateCastTimer <= 0,
    },
    equipment: {
      inventory: state.equipmentInventory.map((itemId) => equipmentItem(itemId)).filter((item) => item !== null),
      equipped: {
        blade: equipmentItem(state.equippedEquipment.blade),
        garb: equipmentItem(state.equippedEquipment.garb),
        talisman: equipmentItem(state.equippedEquipment.talisman),
      },
    },
    pendingUpgradeChoices: [...state.pendingUpgradeChoices],
    pendingEquipmentChoices: [...state.pendingEquipmentChoices],
  };
}
