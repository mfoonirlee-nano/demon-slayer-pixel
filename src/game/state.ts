import { BASIC_ATTACK, GROUND_Y, PLAYER_COMBAT, PLAYER_DEFAULTS } from "../constants";
import { bossArchetypeForId } from "../entities/bosses/registry";
import type { GameSnapshot } from "./gameStore";
import { createInitialMoonState } from "../moon";
import type { GameState, PlayerState } from "../types/game-state";
import { equipmentItem } from "../systems/equipment";
import { createEnemyDirectorState } from "../systems/enemyDirector";
import {
  actBandForAct,
  actForBossKills,
  threatScalarForRun,
} from "../systems/runProgression";
import {
  INITIAL_EQUIPPED_SKILL_IDS,
  INITIAL_SKILL_LEVELS,
  hasLearnedUltimate,
  maxSkillChargesForEnergy,
  maxSkillEnergyForLevel,
  moonTideUltimateConfig,
  xpToNextLevel,
} from "../systems/progression";

export type * from "../types/game-state";

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
    flowBladeSurgeSkillTimer: 0,
    flowGarbTimer: 0,
    burstGarbProtectionUsed: false,
    burstGarbSpeedTimer: 0,
    burstBladeExecuteReady: false,
    burstBladeExecuteUsed: false,
    burstBladeAwakenedSlashUsed: false,
    burstTalismanCooldown: 0,
    shadowstepDistance: 0,
    shadowstepBladeQuickTimer: 0,
    shadowstepBladeReady: false,
    shadowstepBladeStrike: false,
    shadowstepGarbMovingTimer: 0,
    shadowstepGarbHurtSpeedTimer: 0,
    shadowstepTalismanCooldown: 0,
    huntKillTimer: 0,
    huntKillCount: 0,
    huntBladeReady: false,
    huntBladeStrike: false,
    huntBladeWaterTimer: 0,
    huntGarbTimer: 0,
    huntGarbGuardReady: false,
    huntTalismanCooldown: 0,
    riskBladeLowHpSkillReady: false,
    riskBladeLowHpSkillUsed: false,
    riskGarbBossLowHpProtectionUsed: false,
    riskTalismanTriggered: false,
    tempoBladeHitCount: 0,
    tempoBladeNoPenaltyReady: false,
    tempoGarbRecoveryTimer: 0,
    tempoGarbRecoverySkillGranted: false,
    tempoTalismanLastSkillId: null,
    spiderSilkSlowTimer: 0,
    binderTalismanSlowTimer: 0,
    binderTalismanDamageTimer: 0,
    binderTalismanDamageTickTimer: 0,
    binderTalismanKeyScrambleTimer: 0,
    binderTalismanStunStatusTimer: 0,
    binderTalismanStunTimer: 0,
    binderTalismanStunCooldown: 0,
    runStepDistance: 0,
    onPlatform: null,
    skillFlash: 0,
    isPlayer: true,
  };
}

export function createInitialState(): GameState {
  return {
    elapsed: 0,
    last: 0,
    bossKills: 0,
    enemyDirector: createEnemyDirectorState(),
    pendingUpgradeChoices: [],
    pendingEquipmentChoices: [],
    equipmentInventory: [],
    equippedEquipment: {
      blade: null,
      garb: null,
      talisman: null,
    },
    pendingVictoryAfterEquipment: false,
    platformSpawnTimer: 0,
    gameOver: false,
    runCleared: false,
    boss: null,
    moon: createInitialMoonState(),
    spritesReady: false,
    player: createInitialPlayerState(),
    enemies: [],
    particles: [],
    projectiles: [],
    bruteFireballs: [],
    bruteGuardReflections: [],
    bindingZones: [],
    platforms: [],
    chests: [],
    skillBursts: [],
    hitBursts: [],
    lineProjectileEffects: [],
    closeArcEffects: [],
    closeArcBasicCrescents: [],
    guardCounterEffect: null,
    playerSkillEffects: [],
    ultimateEffects: [],
    ultimateTrails: [],
    ultimateAfterimageSlashes: [],
    ultimatePlayerGhosts: [],
    bossSkill1Effects: [],
    spiderStringCages: [],
    deadBellWaves: [],
    deadBellBlades: [],
    mistBoneSpikes: [],
    mirrorShards: [],
    mirrorAfterimages: [],
    fangGaleWaves: [],
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
  resetCollection(state.lineProjectileEffects, next.lineProjectileEffects);
  resetCollection(state.closeArcEffects, next.closeArcEffects);
  resetCollection(state.closeArcBasicCrescents, next.closeArcBasicCrescents);
  resetCollection(state.playerSkillEffects, next.playerSkillEffects);
  resetCollection(state.ultimateEffects, next.ultimateEffects);
  resetCollection(state.ultimateTrails, next.ultimateTrails);
  resetCollection(state.ultimateAfterimageSlashes, next.ultimateAfterimageSlashes);
  resetCollection(state.ultimatePlayerGhosts, next.ultimatePlayerGhosts);
  resetCollection(state.bossSkill1Effects, next.bossSkill1Effects);
  resetCollection(state.spiderStringCages, next.spiderStringCages);
  resetCollection(state.deadBellWaves, next.deadBellWaves);
  resetCollection(state.deadBellBlades, next.deadBellBlades);
  resetCollection(state.mistBoneSpikes, next.mistBoneSpikes);
  resetCollection(state.mirrorShards, next.mirrorShards);
  resetCollection(state.mirrorAfterimages, next.mirrorAfterimages);
  resetCollection(state.fangGaleWaves, next.fangGaleWaves);
  resetCollection(state.lanternEmberLures, next.lanternEmberLures);
  resetCollection(state.lanternEmberFirelines, next.lanternEmberFirelines);
  resetCollection(state.lanternEmberBuffTethers, next.lanternEmberBuffTethers);
  resetCollection(state.lanternEmberAwakenedGrids, next.lanternEmberAwakenedGrids);
  resetCollection(state.lanternEmberAshZones, next.lanternEmberAshZones);
  resetCollection(state.bloodMoonEffects, next.bloodMoonEffects);
  state.guardCounterEffect = next.guardCounterEffect;
  resetCollection(state.projectiles, next.projectiles);
  resetCollection(state.bruteFireballs, next.bruteFireballs);
  resetCollection(state.bruteGuardReflections, next.bruteGuardReflections);
  resetCollection(state.bindingZones, next.bindingZones);
  state.elapsed = next.elapsed;
  state.bossKills = next.bossKills;
  state.enemyDirector = next.enemyDirector;
  resetCollection(state.pendingUpgradeChoices, next.pendingUpgradeChoices);
  resetCollection(state.pendingEquipmentChoices, next.pendingEquipmentChoices);
  resetCollection(state.equipmentInventory, next.equipmentInventory);
  state.equippedEquipment = next.equippedEquipment;
  state.pendingVictoryAfterEquipment = next.pendingVictoryAfterEquipment;
  state.platformSpawnTimer = next.platformSpawnTimer;
  state.boss = next.boss;
  state.gameOver = next.gameOver;
  state.runCleared = next.runCleared;
  state.moon = next.moon;
  state.last = next.last;
  // spritesReady is not reset — loaded assets persist across game resets
}

export function getStateSnapshot(manualPaused = false, paused = manualPaused): GameSnapshot {
  const bossArchetype = state.boss ? bossArchetypeForId(state.boss.id) : null;
  const ultimateConfig = moonTideUltimateConfig(state.player.ultimateLevel);
  const act = actForBossKills(state.bossKills);
  const activeOverlay = state.gameOver
    ? state.runCleared ? "victory" : "death"
    : state.pendingEquipmentChoices.length > 0
      ? "bossEquipment"
      : state.pendingUpgradeChoices.length > 0
        ? "upgrade"
        : manualPaused
          ? "pause"
          : "none";
  return {
    elapsed: state.elapsed,
    act,
    actBand: actBandForAct(act),
    bossKills: state.bossKills,
    threatScalar: threatScalarForRun(state.bossKills, state.elapsed),
    gameOver: state.gameOver,
    runCleared: state.runCleared,
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
          awakened: state.boss.awakened,
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
      ultimateReady: hasLearnedUltimate(state)
        && state.player.ultimateEnergy >= state.player.ultimateEnergyMax
        && state.player.ultimateTimer <= 0
        && state.player.ultimateCastTimer <= 0,
    },
    equipment: {
      inventory: state.equipmentInventory.map((entry) => equipmentItem(entry.id, entry.tier)).filter((item) => item !== null),
      equipped: {
        blade: equipmentItem(
          state.equippedEquipment.blade,
          state.equipmentInventory.find((entry) => entry.id === state.equippedEquipment.blade)?.tier,
        ),
        garb: equipmentItem(
          state.equippedEquipment.garb,
          state.equipmentInventory.find((entry) => entry.id === state.equippedEquipment.garb)?.tier,
        ),
        talisman: equipmentItem(
          state.equippedEquipment.talisman,
          state.equipmentInventory.find((entry) => entry.id === state.equippedEquipment.talisman)?.tier,
        ),
      },
    },
    pendingUpgradeChoices: [...state.pendingUpgradeChoices],
    pendingEquipmentChoices: [...state.pendingEquipmentChoices],
  };
}
