import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { createInitialState } from "../game/state";
import { endRun } from "./runLifecycle";
import type {
  EnemyState,
  EquipmentFamily,
  EquipmentItemId,
  EquipmentSlot,
  EquipmentTier,
  GameState,
} from "../types/game-state";
import {
  EQUIPMENT_CHOICE_IDS,
  EQUIPMENT_ITEMS,
  applyFatalDamageEquipmentProtection,
  applyLowHealthEquipmentTriggers,
  applySkillCastEquipmentEffects,
  applySkillHitEquipmentRefund,
  beginBasicAttackEquipmentEffects,
  chooseBossEquipment,
  consumeSkillCastEquipmentDamageMultiplier,
  createBossEquipmentChoices,
  equipEquipment,
  equipmentBasicAttackDamageMultiplier,
  equipmentBasicAttackFrameMultiplier,
  equipmentBasicAttackReachBonus,
  equipmentBossDamageMultiplier,
  equipmentIncomingDamageMultiplier,
  equipmentItem,
  equipmentKnockbackMultiplier,
  equipmentMoveSpeedMultiplier,
  equipmentSkillEnergyCost,
  equipmentTierForState,
  grantUltimateEnergy,
  queueBossEquipmentChoices,
  recordBasicAttackHit,
  recordBossDamageEquipmentEffects,
  recordBossDefeatEquipmentEffects,
  recordEnemyDefeatEquipmentEffects,
  recordEquipmentHurt,
  recordEquipmentMovement,
  tickEquipmentEffects,
} from "./equipment";

const FAMILIES: EquipmentFamily[] = ["flow", "burst", "shadowstep", "hunt", "risk", "tempo"];
const SLOTS: EquipmentSlot[] = ["blade", "garb", "talisman"];
const TIERS: EquipmentTier[] = ["common", "fine", "awakened"];
const EXPECTED_EQUIPMENT_CHOICE_COUNT = 18;
const BOSS_REWARD_CHOICE_COUNT = 3;
const ULTIMATE_TEST_GAIN = 40;
const AWAKENED_ACT_BOSS_KILLS = 6;
const FINAL_ACT_BOSS_KILLS = 12;
const SELECTED_PENDING_CHOICE_INDEX = 2;
const FINE_TEMPO_TALISMAN_SKILL_COST = 25;
const NO_CANDIDATE_START_HP = 50;
const NO_CANDIDATE_HEALED_HP = 70;
const BOSS_DAMAGE_EVENT_AMOUNT = 10;
const BOSS_NEAR_PLAYER_OFFSET_X = 20;
const MOVEMENT_REWARD_DISTANCE = 12;
const RISK_BLADE_AWAKENED_MIN_MULTIPLIER = 1.3;
const COMMON_TEMPO_BLADE_FRAME_MULTIPLIER = 0.82;
const TEMPO_GARB_RECOVERY_TEST_FRAMES = 150;
const AWAKENED_TEMPO_TALISMAN_SKILL_COST = 24;
const PAIR_FLOW_RESONANCE_HIT_COUNT = 3;
const HUNT_RESONANCE_KILL_COUNT = 2;

function choice(
  itemId: EquipmentItemId,
  tier: EquipmentTier = "common",
  previousTier: EquipmentTier | null = null,
) {
  const item = equipmentItem(itemId, tier);
  if (!item) throw new Error(`Unknown equipment ${itemId}`);
  return {
    ...item,
    previousTier,
    reason: previousTier ? "tierUpgrade" as const : "new" as const,
  };
}

function addAndEquip(state: GameState, itemId: EquipmentItemId, tier: EquipmentTier) {
  const item = equipmentItem(itemId, tier);
  if (!item) throw new Error(`Unknown equipment ${itemId}`);
  state.equipmentInventory.push({ id: itemId, tier });
  state.equippedEquipment[item.slot] = itemId;
}

function makeBoss(overrides: Partial<NonNullable<GameState["boss"]>> = {}): NonNullable<GameState["boss"]> {
  return {
    id: "spider-string",
    x: 420,
    y: 260,
    w: 90,
    h: 120,
    vx: 0,
    targetX: 420,
    entering: false,
    hpMax: 100,
    hp: 100,
    phase: 1,
    hitCd: 0,
    aiTimer: 0,
    jumpCd: 0,
    animSeed: 0,
    actionState: "move",
    actionTimer: 0,
    facing: -1,
    skillCd: 0,
    castTimer: 0,
    skillEffectSpawned: false,
    castFacing: -1,
    skillHitDone: false,
    skillMode: "spiderString",
    recoveryTimer: 0,
    awakened: false,
    spawnedAt: 0,
    ...overrides,
  };
}

function makeEnemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: "crawler",
    spawnSource: "regular",
    spawnCost: 1,
    aiState: "move",
    aiTimer: 0,
    x: 430,
    y: 280,
    w: 40,
    h: 40,
    vx: 0,
    hp: 10,
    damage: 10,
    hitCd: 0,
    animSeed: 0,
    sheetIndex: 0,
    ...overrides,
  };
}

describe("equipment system", () => {
  it("defines all six families with one item in each slot and all tiers", () => {
    expect(EQUIPMENT_CHOICE_IDS).toHaveLength(EXPECTED_EQUIPMENT_CHOICE_COUNT);
    expect(new Set(EQUIPMENT_CHOICE_IDS).size).toBe(EXPECTED_EQUIPMENT_CHOICE_COUNT);

    for (const family of FAMILIES) {
      const items = EQUIPMENT_CHOICE_IDS.map((id) => EQUIPMENT_ITEMS[id]).filter((item) => item.family === family);
      expect(items.map((item) => item.slot).sort()).toEqual([...SLOTS].sort());
    }

    for (const itemId of EQUIPMENT_CHOICE_IDS) {
      for (const tier of TIERS) {
        const item = equipmentItem(itemId, tier);
        expect(item?.summary.length).toBeGreaterThan(0);
        expect(item?.uiTags.length).toBeGreaterThan(0);
        expect(item?.tier).toBe(tier);
      }
    }
  });

  it("creates a three-card boss reward across different slots", () => {
    const state = createInitialState();
    const choices = createBossEquipmentChoices(state);

    expect(choices).toHaveLength(BOSS_REWARD_CHOICE_COUNT);
    expect(new Set(choices.map((item) => item.id)).size).toBe(BOSS_REWARD_CHOICE_COUNT);
    expect(new Set(choices.map((item) => item.slot)).size).toBe(BOSS_REWARD_CHOICE_COUNT);
    expect(choices.every((item) => item.tier === "common")).toBe(true);
  });

  it("uses the current act band as the fixed candidate tier", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    state.bossKills = AWAKENED_ACT_BOSS_KILLS;

    expect(equipmentTierForState(state)).toBe("fine");
    expect(createBossEquipmentChoices(state).every((item) => item.tier === "fine")).toBe(true);

    state.bossKills = FINAL_ACT_BOSS_KILLS;
    expect(equipmentTierForState(state)).toBe("awakened");
    expect(createBossEquipmentChoices(state).every((item) => item.tier === "awakened")).toBe(true);
  });

  it("filters current-tier ultimate-dependent choices before the ultimate is learned", () => {
    const state = createInitialState();
    state.bossKills = FINAL_ACT_BOSS_KILLS;

    const choices = createBossEquipmentChoices(state);

    expect(choices.length).toBeGreaterThan(0);
    expect(choices.every((item) => item.requiresUltimate !== true)).toBe(true);
  });

  it("prioritizes one equipped same-id tier upgrade", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    state.bossKills = AWAKENED_ACT_BOSS_KILLS;
    addAndEquip(state, "flow_blade", "common");

    const choices = createBossEquipmentChoices(state);

    expect(choices[0]).toMatchObject({
      id: "flow_blade",
      tier: "fine",
      previousTier: "common",
      reason: "tierUpgrade",
    });
  });

  it("equips the selected boss reward into its slot with its tier", () => {
    const state = createInitialState();
    state.pendingEquipmentChoices = [
      choice("hunt_blade", "fine"),
      choice("risk_garb", "fine"),
      choice("tempo_talisman", "fine"),
    ];

    expect(chooseBossEquipment(state, SELECTED_PENDING_CHOICE_INDEX)).toBe(true);

    expect(state.equipmentInventory).toContainEqual({ id: "tempo_talisman", tier: "fine" });
    expect(state.equippedEquipment.talisman).toBe("tempo_talisman");
    expect(state.pendingEquipmentChoices).toEqual([]);
    expect(equipmentSkillEnergyCost(state)).toBe(FINE_TEMPO_TALISMAN_SKILL_COST);
  });

  it("overwrites lower owned tiers and resets same-slot runtime state", () => {
    const state = createInitialState();
    addAndEquip(state, "flow_blade", "common");
    state.player.flowBladeHits = 4;
    state.player.flowBladeSurgeReady = true;
    state.pendingEquipmentChoices = [choice("flow_blade", "fine", "common")];

    expect(chooseBossEquipment(state, 0)).toBe(true);

    expect(state.equipmentInventory).toEqual([{ id: "flow_blade", tier: "fine" }]);
    expect(state.equippedEquipment.blade).toBe("flow_blade");
    expect(state.player.flowBladeHits).toBe(0);
    expect(state.player.flowBladeSurgeReady).toBe(false);
  });

  it("heals instead of opening an overlay when no equipment candidates exist", () => {
    const state = createInitialState();
    state.bossKills = FINAL_ACT_BOSS_KILLS;
    state.player.hp = NO_CANDIDATE_START_HP;
    state.equipmentInventory = EQUIPMENT_CHOICE_IDS.map((id) => ({ id, tier: "awakened" }));

    expect(queueBossEquipmentChoices(state)).toBe(false);

    expect(state.pendingEquipmentChoices).toEqual([]);
    expect(state.player.hp).toBe(NO_CANDIDATE_HEALED_HP);
  });

  it("only grants ultimate energy after the ultimate is learned", () => {
    const state = createInitialState();

    grantUltimateEnergy(state, ULTIMATE_TEST_GAIN);
    expect(state.player.ultimateEnergy).toBe(0);

    state.player.ultimateLevel = 1;
    grantUltimateEnergy(state, ULTIMATE_TEST_GAIN);
    expect(state.player.ultimateEnergy).toBe(ULTIMATE_TEST_GAIN);
  });

  it("equips only owned items from the pause flow", () => {
    const state = createInitialState();
    state.equipmentInventory.push({ id: "flow_blade", tier: "common" }, { id: "tempo_blade", tier: "common" });
    expect(equipEquipment(state, "blade", "flow_blade")).toBe(true);
    state.player.flowBladeHits = 4;
    state.player.flowBladeSurgeReady = true;

    expect(equipEquipment(state, "blade", "tempo_blade")).toBe(true);

    expect(state.equippedEquipment.blade).toBe("tempo_blade");
    expect(state.player.flowBladeHits).toBe(0);
    expect(state.player.flowBladeSurgeReady).toBe(false);
  });

  it("clears run equipment on death", () => {
    const state = createInitialState();
    addAndEquip(state, "flow_blade", "fine");

    endRun(state);

    expect(state.equipmentInventory).toEqual([]);
    expect(state.equippedEquipment).toEqual({ blade: null, garb: null, talisman: null });
  });

  it("applies flow blade fine surge refund after three basic hits", () => {
    const state = createInitialState();
    addAndEquip(state, "flow_blade", "fine");

    recordBasicAttackHit(state, "enemy");
    recordBasicAttackHit(state, "enemy");
    recordBasicAttackHit(state, "enemy");
    expect(state.player.flowBladeSurgeReady).toBe(true);
    expect(consumeSkillCastEquipmentDamageMultiplier(state)).toBeGreaterThan(1);
    expect(applySkillHitEquipmentRefund(state, 1, false)).toBe(true);

    expect(state.player.skillEnergy).toBeGreaterThan(0);
  });

  it("applies two-piece flow resonance by lowering the flow blade hit count", () => {
    const state = createInitialState();
    addAndEquip(state, "flow_blade", "common");
    addAndEquip(state, "flow_garb", "common");

    for (let i = 0; i < PAIR_FLOW_RESONANCE_HIT_COUNT; i += 1) {
      recordBasicAttackHit(state, "enemy");
    }

    expect(state.player.flowBladeSurgeReady).toBe(true);
  });

  it("applies flow garb fine damage reduction during its skill-cast window", () => {
    const state = createInitialState();
    addAndEquip(state, "flow_garb", "fine");

    applySkillCastEquipmentEffects(state, SKILL_IDS.lineProjectile);

    expect(equipmentMoveSpeedMultiplier(state)).toBeGreaterThan(1);
    expect(equipmentIncomingDamageMultiplier(state)).toBeLessThan(1);
  });

  it("applies flow talisman awakened boss refund and ultimate gain", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "flow_talisman", "awakened");

    expect(applySkillHitEquipmentRefund(state, 0, true)).toBe(true);

    expect(state.player.skillEnergy).toBeGreaterThan(0);
    expect(state.player.ultimateEnergy).toBeGreaterThan(0);
  });

  it("applies burst blade fine execute follow-up after a low-health boss hit", () => {
    const state = createInitialState();
    addAndEquip(state, "burst_blade", "fine");
    const boss = { hp: 30, hpMax: 100 };

    expect(equipmentBossDamageMultiplier(state, boss)).toBeGreaterThan(1);

    expect(state.player.burstBladeExecuteReady).toBe(true);
    expect(equipmentBasicAttackDamageMultiplier(state)).toBeGreaterThan(1);
  });

  it("applies burst garb awakened fatal protection with skill energy", () => {
    const state = createInitialState();
    addAndEquip(state, "burst_garb", "awakened");
    state.boss = makeBoss();

    expect(applyFatalDamageEquipmentProtection(state)).toBe(true);

    expect(state.player.hp).toBe(1);
    expect(state.player.skillEnergy).toBeGreaterThan(0);
  });

  it("applies burst talisman fine skill boss ultimate gain", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "burst_talisman", "fine");

    recordBossDamageEquipmentEffects(state, BOSS_DAMAGE_EVENT_AMOUNT);
    const afterDamageGain = state.player.ultimateEnergy;
    expect(applySkillHitEquipmentRefund(state, 0, true)).toBe(true);

    expect(afterDamageGain).toBeGreaterThan(0);
    expect(state.player.ultimateEnergy).toBeGreaterThan(afterDamageGain);
  });

  it("applies shadowstep blade awakened quick rebuild and boss ultimate gain", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "shadowstep_blade", "awakened");
    state.player.shadowstepBladeReady = true;

    beginBasicAttackEquipmentEffects(state);
    recordBasicAttackHit(state, "boss");

    expect(state.player.shadowstepBladeQuickTimer).toBeGreaterThan(0);
    expect(state.player.ultimateEnergy).toBeGreaterThan(0);
  });

  it("applies shadowstep garb awakened hurt speed after moving", () => {
    const state = createInitialState();
    addAndEquip(state, "shadowstep_garb", "awakened");
    state.player.shadowstepGarbMovingTimer = 1;

    recordEquipmentHurt(state);

    expect(equipmentIncomingDamageMultiplier(state)).toBeLessThan(1);
    expect(equipmentKnockbackMultiplier(state)).toBeLessThan(1);
    expect(equipmentMoveSpeedMultiplier(state)).toBeGreaterThan(1);
  });

  it("applies shadowstep talisman awakened boss-near movement rewards", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "shadowstep_talisman", "awakened");
    state.boss = makeBoss({ x: state.player.x + BOSS_NEAR_PLAYER_OFFSET_X, y: state.player.y });

    recordEquipmentMovement(state, MOVEMENT_REWARD_DISTANCE);

    expect(state.player.skillEnergy).toBeGreaterThan(0);
    expect(state.player.ultimateEnergy).toBeGreaterThan(0);
  });

  it("applies hunt blade awakened water window after a kill chain", () => {
    const state = createInitialState();
    addAndEquip(state, "hunt_blade", "awakened");

    recordEnemyDefeatEquipmentEffects(state);
    recordEnemyDefeatEquipmentEffects(state);
    beginBasicAttackEquipmentEffects(state);

    expect(state.player.huntBladeWaterTimer).toBeGreaterThan(0);
    expect(state.player.huntBladeStrike).toBe(true);
    expect(equipmentBasicAttackReachBonus(state)).toBeGreaterThan(0);
  });

  it("applies hunt garb awakened next-hit guard after a kill chain", () => {
    const state = createInitialState();
    addAndEquip(state, "hunt_garb", "awakened");

    recordEnemyDefeatEquipmentEffects(state);
    recordEnemyDefeatEquipmentEffects(state);

    expect(state.player.huntGarbGuardReady).toBe(true);
    expect(equipmentIncomingDamageMultiplier(state)).toBeLessThan(1);
    expect(state.player.huntGarbGuardReady).toBe(false);
  });

  it("applies hunt talisman fine ultimate gain on three kills", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "hunt_talisman", "fine");

    recordEnemyDefeatEquipmentEffects(state);
    recordEnemyDefeatEquipmentEffects(state);
    recordEnemyDefeatEquipmentEffects(state);

    expect(state.player.skillEnergy).toBeGreaterThan(0);
    expect(state.player.ultimateEnergy).toBeGreaterThan(0);
  });

  it("applies hunt resonance by triggering talisman energy after a shorter chain", () => {
    const state = createInitialState();
    addAndEquip(state, "hunt_blade", "common");
    addAndEquip(state, "hunt_garb", "common");
    addAndEquip(state, "hunt_talisman", "common");

    for (let i = 0; i < HUNT_RESONANCE_KILL_COUNT; i += 1) {
      recordEnemyDefeatEquipmentEffects(state);
    }

    expect(state.player.skillEnergy).toBeGreaterThan(0);
  });

  it("applies risk blade awakened low-health skill burst", () => {
    const state = createInitialState();
    addAndEquip(state, "risk_blade", "awakened");
    state.player.hp = 20;

    applyLowHealthEquipmentTriggers(state);

    expect(state.player.riskBladeLowHpSkillReady).toBe(true);
    expect(consumeSkillCastEquipmentDamageMultiplier(state)).toBeGreaterThan(RISK_BLADE_AWAKENED_MIN_MULTIPLIER);
  });

  it("applies risk garb awakened boss low-health protection", () => {
    const state = createInitialState();
    addAndEquip(state, "risk_garb", "awakened");
    state.boss = makeBoss();
    state.player.hp = 20;

    applyLowHealthEquipmentTriggers(state);

    expect(state.player.invincible).toBeGreaterThan(0);
    expect(state.player.riskGarbBossLowHpProtectionUsed).toBe(true);
  });

  it("applies risk talisman awakened one-charge floor and ultimate gain", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "risk_talisman", "awakened");
    state.player.hp = 20;

    applyLowHealthEquipmentTriggers(state);

    expect(state.player.skillEnergy).toBeGreaterThanOrEqual(equipmentSkillEnergyCost(state));
    expect(state.player.ultimateEnergy).toBeGreaterThan(0);
  });

  it("applies tempo blade fine faster attacks and awakened no-penalty hit", () => {
    const state = createInitialState();
    addAndEquip(state, "tempo_blade", "awakened");

    recordBasicAttackHit(state, "enemy");
    recordBasicAttackHit(state, "enemy");
    recordBasicAttackHit(state, "enemy");

    expect(equipmentBasicAttackFrameMultiplier(state)).toBeLessThan(COMMON_TEMPO_BLADE_FRAME_MULTIPLIER);
    expect(state.player.tempoBladeNoPenaltyReady).toBe(true);
    expect(equipmentBasicAttackDamageMultiplier(state)).toBe(1);
  });

  it("applies tempo garb awakened delayed skill recovery", () => {
    const state = createInitialState();
    addAndEquip(state, "tempo_garb", "awakened");

    recordEquipmentHurt(state);
    for (let i = 0; i < TEMPO_GARB_RECOVERY_TEST_FRAMES; i += 1) tickEquipmentEffects(state);

    expect(state.player.skillEnergy).toBeGreaterThan(0);
  });

  it("applies tempo talisman awakened minimum cost and different-skill refund", () => {
    const state = createInitialState();
    addAndEquip(state, "tempo_talisman", "awakened");

    applySkillCastEquipmentEffects(state, SKILL_IDS.lineProjectile);
    applySkillCastEquipmentEffects(state, SKILL_IDS.closeArc);

    expect(equipmentSkillEnergyCost(state)).toBe(AWAKENED_TEMPO_TALISMAN_SKILL_COST);
    expect(state.player.skillEnergy).toBeGreaterThan(0);
  });

  it("keeps awakened burst talisman ultimate energy after boss defeat", () => {
    const state = createInitialState();
    state.player.ultimateLevel = 1;
    addAndEquip(state, "burst_talisman", "awakened");

    recordBossDefeatEquipmentEffects(state);

    expect(state.player.ultimateEnergy).toBeGreaterThan(0);
  });

  it("does not create movement resources without nearby risk", () => {
    const state = createInitialState();
    addAndEquip(state, "shadowstep_talisman", "fine");
    state.enemies = [makeEnemy({ x: 0, y: 0 })];

    recordEquipmentMovement(state, MOVEMENT_REWARD_DISTANCE);

    expect(state.player.skillEnergy).toBe(0);
  });
});
