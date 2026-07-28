import { beforeEach, describe, expect, it } from "vitest";
import { getStateSnapshot, resetState, state } from "../game/state";
import type {
  EquipmentItemId,
  EquipmentTier,
  GameState,
} from "../types/game-state";
import { equipmentItem } from "./equipment";

const FULL_HEALTH = 100;
const BOSS_PAIR_EXECUTE_THRESHOLD_HP = 50;
const ASH_ZONE_DURATION = 160;
const SHORT_ASH_ZONE_REMAINING = 40;
const LONG_ASH_ZONE_REMAINING = 120;

type StatusView = {
  id: string;
  remainingFrames: number | null;
  durationFrames: number | null;
  stacks?: number;
  maxStacks?: number;
};

function statuses() {
  return getStateSnapshot().player.statuses as unknown as StatusView[];
}

function status(statusId: string) {
  return statuses().find(({ id }) => id === statusId);
}

function statusIds() {
  return statuses().map(({ id }) => id);
}

function addAndEquip(itemId: EquipmentItemId, tier: EquipmentTier = "common") {
  const item = equipmentItem(itemId, tier);
  if (!item) throw new Error(`Unknown equipment ${itemId}`);
  state.equipmentInventory.push({ id: itemId, tier });
  state.equippedEquipment[item.slot] = itemId;
}

function makeBoss(hp = FULL_HEALTH, hpMax = FULL_HEALTH): NonNullable<GameState["boss"]> {
  return {
    id: "spider-string",
    x: 420,
    y: 260,
    w: 90,
    h: 120,
    vx: 0,
    targetX: 420,
    entering: false,
    hp,
    hpMax,
    phase: 1,
    hitCd: 0,
    aiTimer: 0,
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
  };
}

function ashZone(life: number, x = playerFootX(), y = playerFootY()) {
  return {
    x,
    y,
    radius: 100,
    life,
    maxLife: ASH_ZONE_DURATION,
    elapsed: ASH_ZONE_DURATION - life,
    frame: 0,
    damage: 2,
  };
}

function playerFootX() {
  return state.player.x + state.player.w / 2;
}

function playerFootY() {
  return state.player.y + state.player.h;
}

describe("player status snapshot", () => {
  beforeEach(() => {
    resetState();
  });

  it("exposes each level-three skill passive only while it can currently trigger", () => {
    state.player.skillLevels.line_projectile = 3;
    state.player.skillLevels.close_arc = 3;
    state.player.skillLevels.armor_break = 3;
    state.player.equippedSkillIds[2] = "armor_break";
    state.player.skillIndex = 0;

    expect(status("line_projectile_knockback")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });
    expect(status("armor_break_shield_penetration")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });
    expect(status("close_arc_basic_crescent")).toBeUndefined();

    state.player.skillIndex = 1;

    expect(status("close_arc_basic_crescent")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });

    state.player.equippedSkillIds[1] = null;
    state.player.equippedSkillIds[2] = null;

    expect(status("close_arc_basic_crescent")).toBeUndefined();
    expect(status("armor_break_shield_penetration")).toBeUndefined();
  });

  it("exposes the dash reposition movement passive only while level three is equipped", () => {
    state.player.skillLevels.dash_reposition = 3;
    state.player.equippedSkillIds[2] = "dash_reposition";

    expect(status("dash_reposition_move_speed")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });

    state.player.equippedSkillIds[2] = null;

    expect(status("dash_reposition_move_speed")).toBeUndefined();
  });

  it("exposes the vortex control double jump passive only while level three is equipped", () => {
    state.player.skillLevels.vortex_control = 3;
    state.player.equippedSkillIds[2] = "vortex_control";

    expect(status("vortex_control_double_jump")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });

    state.player.equippedSkillIds[2] = null;

    expect(status("vortex_control_double_jump")).toBeUndefined();
  });

  it("projects guard duration and hit stacks through its effective barrier flash", () => {
    state.guardCounterEffect = {
      elapsed: 12,
      frame: 0,
      hitsRemaining: 2,
      maxHits: 3,
      activeFrames: 72,
      counterPadding: 0,
      damageMultiplier: 1,
      barrierFlash: 0,
    };

    expect(status("guard_counter")).toMatchObject({
      remainingFrames: 60,
      durationFrames: 72,
      stacks: 2,
      maxStacks: 3,
    });

    state.guardCounterEffect.elapsed = 71;
    state.guardCounterEffect.barrierFlash = 13;

    expect(status("guard_counter")).toMatchObject({
      remainingFrames: 13,
      durationFrames: 84,
      stacks: 2,
      maxStacks: 3,
    });

    state.guardCounterEffect.elapsed = 72;
    state.guardCounterEffect.barrierFlash = 12;

    expect(status("guard_counter")).toMatchObject({
      remainingFrames: 12,
      durationFrames: 84,
      stacks: 2,
      maxStacks: 3,
    });
  });

  it("projects flow charge stacks and both flow timing windows", () => {
    addAndEquip("flow_blade", "fine");
    addAndEquip("flow_garb", "awakened");
    state.player.flowBladeHits = 2;
    state.player.flowBladeSurgeReady = true;
    state.player.flowBladeSurgeSkillTimer = 90;
    state.player.flowGarbTimer = 270;
    state.player.flowGarbDuration = 270;

    expect(status("flow_blade_charge")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
      stacks: 2,
      maxStacks: 2,
    });
    expect(status("flow_blade_surge_hit_window")).toMatchObject({
      remainingFrames: 90,
      durationFrames: 180,
    });
    expect(status("flow_garb")).toMatchObject({
      remainingFrames: 270,
      durationFrames: 270,
    });

    state.player.flowBladeSurgeReady = false;
    expect(status("flow_blade_charge")).toMatchObject({ stacks: 1, maxStacks: 2 });
  });

  it("projects burst execute, protection readiness, and escape haste", () => {
    addAndEquip("burst_blade", "fine");
    state.boss = makeBoss(BOSS_PAIR_EXECUTE_THRESHOLD_HP);

    expect(status("burst_blade_execute_zone")).toBeUndefined();

    addAndEquip("burst_garb", "fine");
    state.player.burstBladeExecuteReady = true;
    state.player.burstGarbSpeedTimer = 75;

    expect(status("burst_blade_execute_zone")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });
    expect(status("burst_blade_execute_ready")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });
    expect(status("burst_garb_guard_ready")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });
    expect(status("burst_garb_escape_haste")).toMatchObject({
      remainingFrames: 75,
      durationFrames: 150,
    });
  });

  it("projects shadowstep charge, readiness, and independent movement windows", () => {
    addAndEquip("shadowstep_blade", "awakened");
    addAndEquip("shadowstep_garb", "awakened");
    state.player.shadowstepDistance = 70;
    state.player.shadowstepBladeQuickTimer = 90;
    state.player.shadowstepGarbMovingTimer = 4;
    state.player.shadowstepGarbHurtSpeedTimer = 75;

    expect(status("shadowstep_blade_charge")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });
    expect(status("shadowstep_blade_quick_charge")).toMatchObject({
      remainingFrames: 90,
      durationFrames: 180,
    });
    expect(status("shadowstep_garb_moving_guard")).toMatchObject({
      remainingFrames: 4,
      durationFrames: 8,
    });
    expect(status("shadowstep_garb_hurt_haste")).toMatchObject({
      remainingFrames: 75,
      durationFrames: 150,
    });

    state.player.shadowstepBladeReady = true;

    expect(status("shadowstep_blade_charge")).toBeUndefined();
    expect(status("shadowstep_blade_ready")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });
  });

  it("projects shadowstep talisman readiness and cooldown as exclusive states", () => {
    addAndEquip("shadowstep_talisman");

    expect(status("shadowstep_talisman_ready")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
    });
    expect(status("shadowstep_talisman_cooldown")).toBeUndefined();

    state.player.shadowstepTalismanCooldown = 40;

    expect(status("shadowstep_talisman_ready")).toBeUndefined();
    expect(status("shadowstep_talisman_cooldown")).toMatchObject({
      remainingFrames: 40,
      durationFrames: 80,
    });
  });

  it("deduplicates the shared hunt chain while projecting its timed rewards", () => {
    addAndEquip("hunt_blade", "awakened");
    addAndEquip("hunt_garb", "awakened");
    addAndEquip("hunt_talisman", "awakened");
    state.player.huntKillTimer = 120;
    state.player.huntKillCount = 4;
    state.player.huntBladeReady = true;
    state.player.huntBladeWaterTimer = 150;
    state.player.huntGarbTimer = 90;
    state.player.huntGarbGuardReady = true;

    expect(statuses().filter(({ id }) => id === "hunt_kill_chain")).toHaveLength(1);
    expect(status("hunt_kill_chain")).toMatchObject({
      remainingFrames: 120,
      durationFrames: 240,
      stacks: 2,
      maxStacks: 2,
    });
    expect(status("hunt_blade_ready")).toBeDefined();
    expect(status("hunt_blade_water")).toMatchObject({
      remainingFrames: 150,
      durationFrames: 300,
    });
    expect(status("hunt_garb_haste")).toMatchObject({
      remainingFrames: 90,
      durationFrames: 180,
    });
    expect(status("hunt_garb_guard_ready")).toBeDefined();
  });

  it("projects risk low-health effects and unused one-shot readiness", () => {
    addAndEquip("risk_blade", "awakened");
    addAndEquip("risk_garb", "awakened");
    addAndEquip("risk_talisman", "awakened");
    state.boss = makeBoss();
    state.player.hp = 35;
    state.player.maxHp = 100;
    state.player.riskBladeLowHpSkillReady = true;

    expect(status("risk_blade_low_hp")).toBeDefined();
    expect(status("risk_blade_skill_ready")).toBeDefined();
    expect(status("risk_garb_low_hp")).toBeDefined();
    expect(status("risk_garb_lifeline_ready")).toBeDefined();
    expect(status("risk_talisman_ready")).toBeDefined();

    state.player.hp = 36;
    state.player.riskTalismanTriggered = true;

    expect(status("risk_blade_low_hp")).toBeUndefined();
    expect(status("risk_garb_low_hp")).toBeUndefined();
    expect(status("risk_talisman_ready")).toBeUndefined();
  });

  it("projects tempo hit stacks, recovery time, and only an actionable skill-swap readiness", () => {
    addAndEquip("tempo_blade", "awakened");
    addAndEquip("tempo_garb", "fine");
    addAndEquip("tempo_talisman", "awakened");
    state.player.tempoBladeHitCount = 2;
    state.player.tempoGarbRecoveryTimer = 75;
    state.player.tempoTalismanLastSkillId = "line_projectile";
    state.player.skillIndex = 1;

    expect(status("tempo_blade_chain")).toMatchObject({
      remainingFrames: null,
      durationFrames: null,
      stacks: 2,
      maxStacks: 3,
    });
    expect(status("tempo_garb_recovery")).toMatchObject({
      remainingFrames: 75,
      durationFrames: 150,
    });
    expect(status("tempo_talisman_swap_ready")).toBeDefined();

    state.player.skillIndex = 0;

    expect(status("tempo_talisman_swap_ready")).toBeUndefined();
  });

  it("projects every active enemy debuff with its authoritative duration", () => {
    state.player.spiderSilkSlowTimer = 27;
    state.player.binderTalismanSlowTimer = 105;
    state.player.binderTalismanDamageTimer = 104;
    state.player.binderTalismanKeyScrambleTimer = 103;
    state.player.binderTalismanStunStatusTimer = 102;
    state.player.binderTalismanStunTimer = 11;
    state.lanternEmberAshZones.push(
      ashZone(SHORT_ASH_ZONE_REMAINING),
      ashZone(LONG_ASH_ZONE_REMAINING),
    );

    expect(status("spider_silk_slow")).toMatchObject({ remainingFrames: 27, durationFrames: 54 });
    expect(status("binder_talisman_slow")).toMatchObject({ remainingFrames: 105, durationFrames: 210 });
    expect(status("binder_talisman_damage")).toMatchObject({ remainingFrames: 104, durationFrames: 210 });
    expect(status("binder_talisman_key_scramble")).toMatchObject({ remainingFrames: 103, durationFrames: 210 });
    expect(status("binder_talisman_stun")).toMatchObject({ remainingFrames: 102, durationFrames: 210 });
    expect(status("binder_talisman_stunned")).toMatchObject({ remainingFrames: 11, durationFrames: 22 });
    expect(statuses().filter(({ id }) => id === "lantern_ash_zone")).toHaveLength(1);
    expect(status("lantern_ash_zone")).toMatchObject({ remainingFrames: 120, durationFrames: 160 });

    state.player.x += 300;

    expect(status("lantern_ash_zone")).toBeUndefined();
  });

  it("keeps mixed status order stable and every status id unique", () => {
    state.player.skillLevels.line_projectile = 3;
    state.player.skillLevels.close_arc = 3;
    state.player.skillIndex = 1;
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 180;
    state.player.spiderSilkSlowTimer = 27;
    state.player.binderTalismanSlowTimer = 105;
    state.lanternEmberAshZones.push(
      ashZone(SHORT_ASH_ZONE_REMAINING),
      ashZone(LONG_ASH_ZONE_REMAINING),
    );
    addAndEquip("flow_blade", "fine");
    addAndEquip("flow_garb", "fine");
    state.player.flowBladeHits = 2;
    state.player.flowGarbTimer = 90;

    const firstIds = statusIds();
    state.equipmentInventory.reverse();
    state.lanternEmberAshZones.reverse();
    const reorderedSourceIds = statusIds();

    expect(reorderedSourceIds).toEqual(firstIds);
    expect(new Set(firstIds).size).toBe(firstIds.length);
    expect([...firstIds].sort()).toEqual([
      "binder_talisman_slow",
      "close_arc_basic_crescent",
      "flow_blade_charge",
      "flow_garb",
      "lantern_ash_zone",
      "line_projectile_knockback",
      "moon_tide",
      "spider_silk_slow",
    ].sort());
  });
});
