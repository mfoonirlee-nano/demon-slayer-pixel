import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y, PLAYER_CONTROL_KEYS, RETURNING_BLADE_CONFIG, SKILL_IDS } from "../constants";
import { keys } from "../game/input";
import { resetState, state } from "../game/state";
import { equipEquipment } from "../systems/equipment";
import { playerSkillById } from "../systems/skillCatalog";
import type { SkillId } from "../types/assets";
import type { SkillLevel } from "../types/game-state";
import { createBossEncounter } from "./bosses/encounter";
import { spawnEnemyById } from "./enemy";
import { resolveEnemyDefeat } from "./enemies/defeat";
import { blockProjectileWithGuardCounter, updatePlayer } from "./player";
import { updateCloseArcEffects, updateLineProjectileEffects } from "./particles/coreSkillEffects";
import { updateGuardCounterEffect } from "./particles/guardCounter";
import { updatePlayerSkillEffects } from "./particles/playerSkillRuntime";
import { activeReturningBlade } from "./particles/returningBlade";
import { castSelectedSkill, playerSkillReleaseFrame, updateSkillCastRelease } from "./players/skillCasting";

vi.mock("../game/audio", () => ({ playSfx: vi.fn() }));

const TEST = {
  playerX: 300,
  targetHp: 10000,
  targetWidth: 30,
  targetHeight: 90,
  targetOffset: 80,
  effectSettleFrames: 30,
  maxAdvanceFrames: 180,
  projectileSize: 8,
  maxSkillLevel: 3,
} as const;

function finishCast() {
  while (state.player.skillTimer > 0) updateSkillCastRelease();
}

function releaseSkill(skillId: SkillId, level: SkillLevel = 1) {
  finishCast();
  const skill = playerSkillById(skillId);
  if (!skill) throw new Error(`Missing skill ${skillId}`);
  state.player.equippedSkillIds = [skillId, null, null];
  state.player.skillIndex = 0;
  state.player.skillLevels[skillId] = level;
  state.player.skillEnergy = state.player.skillEnergyMax;
  castSelectedSkill();
  const source = state.player.activeSkillCast;
  if (!source) throw new Error(`Failed to cast ${skillId}`);
  for (let frame = 0; frame < playerSkillReleaseFrame(skill); frame += 1) {
    updateSkillCastRelease();
  }
  expect(state.player.skillEffectSpawned).toBe(true);
  return { ...source };
}

function targetAt(x: number, y: number) {
  expect(spawnEnemyById("chaser", "debug", "right")).toBe(true);
  const enemy = state.enemies[state.enemies.length - 1];
  Object.assign(enemy, {
    x, y, hp: TEST.targetHp, w: TEST.targetWidth, h: TEST.targetHeight,
    spawnOccluder: undefined,
  });
  return enemy;
}

function targetForReleasedSkill(skillId: SkillId) {
  if (skillId === SKILL_IDS.lineProjectile) {
    const effect = state.lineProjectileEffects[state.lineProjectileEffects.length - 1];
    return targetAt(effect.x, effect.y + 1);
  }
  if (skillId === SKILL_IDS.closeArc) {
    const effect = state.closeArcEffects[state.closeArcEffects.length - 1];
    return targetAt(effect.x, effect.y + 1);
  }
  const effect = state.playerSkillEffects.find((candidate) => candidate.skillId === skillId);
  if (!effect) throw new Error(`Missing released effect for ${skillId}`);
  return targetAt(
    effect.x - TEST.targetWidth / 2,
    effect.y - (effect.kind === "vortex" ? TEST.targetHeight : TEST.targetHeight / 2),
  );
}

function updateEffects(frames = 1) {
  for (let frame = 0; frame < frames; frame += 1) {
    updateLineProjectileEffects();
    updateCloseArcEffects();
    updatePlayerSkillEffects();
    updateGuardCounterEffect();
  }
}

beforeEach(() => {
  resetState();
  keys.clear();
  state.player.x = TEST.playerX;
  state.player.y = GROUND_Y - state.player.h;
  state.player.facing = 1;
  state.equipmentInventory = [{ id: "flow_blade", tier: "common" }];
  equipEquipment(state, "blade", "flow_blade");
});

afterEach(() => vi.restoreAllMocks());

describe("equipment combinations through released skill collisions", () => {
  it.each(Object.values(SKILL_IDS))("keeps %s identity and equipment generation after the animation", (skillId) => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const source = releaseSkill(skillId, TEST.maxSkillLevel);
    const effects = [...state.lineProjectileEffects, ...state.closeArcEffects, ...state.playerSkillEffects,
      ...(state.guardCounterEffect ? [state.guardCounterEffect] : []),
      ...(state.player.dashReposition ? [state.player.dashReposition] : [])];
    expect(effects.length).toBeGreaterThan(0);
    finishCast();
    expect(state.player.activeSkillCast).toBeNull();
    expect(source.equipmentRevision).toBe(state.equipmentReactions.revision);
    for (const effect of effects) expect(effect.skillSource).toEqual(source);
  });

  it.each([SKILL_IDS.lineProjectile, SKILL_IDS.closeArc, SKILL_IDS.vortexControl,
    SKILL_IDS.armorBreak, SKILL_IDS.antiAirMulti, SKILL_IDS.returningBlade, SKILL_IDS.verticalWave])(
    "%s applies a target-local tide mark through real damage", (skillId) => {
      releaseSkill(skillId);
      const target = targetForReleasedSkill(skillId);
      updateEffects();
      expect(target.hp).toBeLessThan(TEST.targetHp);
      expect(state.equipmentReactions.marks.some((mark) => mark.target === target)).toBe(true);
      expect(state.equipmentReactions.effects).toHaveLength(0);
    },
  );

  it("requires another skill to strike the SAME marked enemy to produce a sweep", () => {
    releaseSkill(SKILL_IDS.lineProjectile);
    const marked = targetForReleasedSkill(SKILL_IDS.lineProjectile);
    updateEffects();
    state.lineProjectileEffects.length = 0;
    releaseSkill(SKILL_IDS.closeArc);
    const arc = state.closeArcEffects[0];
    Object.assign(marked, { x: arc.x, y: arc.y + 1, hitCd: 0 });
    updateCloseArcEffects();
    expect(state.equipmentReactions.effects.map((effect) => effect.kind)).toEqual(["sweep"]);
    expect(state.equipmentReactions.marks.some((mark) => mark.target === marked)).toBe(false);
  });

  it("does not produce any reaction when the same two skills hit different targets", () => {
    releaseSkill(SKILL_IDS.lineProjectile);
    const first = targetForReleasedSkill(SKILL_IDS.lineProjectile);
    updateEffects();
    state.lineProjectileEffects.length = 0;
    first.x = 0;
    releaseSkill(SKILL_IDS.closeArc);
    const second = targetForReleasedSkill(SKILL_IDS.closeArc);
    updateEffects();
    expect(state.equipmentReactions.marks.map((mark) => mark.target)).toEqual([first, second]);
    expect(state.equipmentReactions.effects).toHaveLength(0);
  });

  it("naked skills have no mark or universal finisher", () => {
    equipEquipment(state, "blade", null);
    for (const skillId of [SKILL_IDS.lineProjectile, SKILL_IDS.closeArc]) {
      releaseSkill(skillId);
      targetForReleasedSkill(skillId);
      updateEffects();
    }
    expect(state.equipmentReactions.marks).toHaveLength(0);
    expect(state.equipmentReactions.effects).toHaveLength(0);
  });

  it("Chainbead transfers an existing mark even when a hostile hazard delivers the final blow", () => {
    state.equipmentInventory.push({ id: "hunt_talisman", tier: "common" });
    equipEquipment(state, "talisman", "hunt_talisman");
    releaseSkill(SKILL_IDS.lineProjectile);
    const marked = targetForReleasedSkill(SKILL_IDS.lineProjectile);
    updateEffects();
    const survivor = targetAt(marked.x + TEST.targetOffset, marked.y);
    marked.hp = 0;
    resolveEnemyDefeat(marked, state.enemies.indexOf(marked), "none");
    expect(state.enemies).not.toContain(marked);
    expect(state.equipmentReactions.marks.map((mark) => mark.target)).toEqual([survivor]);
    expect(state.equipmentReactions.effects).toHaveLength(0);
  });

  it("old projectiles cannot acquire a newly equipped item rule", () => {
    equipEquipment(state, "blade", null);
    releaseSkill(SKILL_IDS.lineProjectile);
    const target = targetForReleasedSkill(SKILL_IDS.lineProjectile);
    equipEquipment(state, "blade", "flow_blade");
    updateEffects();
    expect(target.hp).toBeLessThan(TEST.targetHp);
    expect(state.equipmentReactions.marks).toHaveLength(0);
  });

  it("changing the talisman changes real skill conversion from a travelling sweep to a pulling surge", () => {
    state.equipmentInventory.push({ id: "tempo_talisman", tier: "common" });
    equipEquipment(state, "talisman", "tempo_talisman");
    releaseSkill(SKILL_IDS.lineProjectile);
    const marked = targetForReleasedSkill(SKILL_IDS.lineProjectile);
    updateEffects();
    state.lineProjectileEffects.length = 0;
    releaseSkill(SKILL_IDS.closeArc);
    const arc = state.closeArcEffects[0];
    Object.assign(marked, { x: arc.x, y: arc.y + 1, hitCd: 0 });
    updateCloseArcEffects();
    expect(state.equipmentReactions.effects.map((effect) => effect.kind)).toEqual(["surge"]);
    expect(state.equipmentReactions.effects[0].vx).toBe(0);
  });

  it("armor break applies its status before Moonbreak Blade reacts to the same real hit", () => {
    state.equipmentInventory.push({ id: "burst_blade", tier: "common" });
    equipEquipment(state, "blade", "burst_blade");
    releaseSkill(SKILL_IDS.armorBreak);
    const target = targetForReleasedSkill(SKILL_IDS.armorBreak);
    expect(target.armorBreakTimer ?? 0).toBe(0);
    updateEffects();
    expect(target.hp).toBeLessThan(TEST.targetHp);
    expect(target.armorBreakTimer).toBeGreaterThan(0);
    expect(state.equipmentReactions.effects.map((effect) => effect.kind)).toEqual(["rupture"]);
  });

  it("empty casts never create marks or reactions", () => {
    for (const skillId of Object.values(SKILL_IDS)) {
      releaseSkill(skillId);
      for (let frame = 0; frame < TEST.maxAdvanceFrames; frame += 1) { updatePlayer(); updateEffects(); }
      expect(state.equipmentReactions.marks).toHaveLength(0);
      expect(state.equipmentReactions.effects).toHaveLength(0);
    }
  });

  it("Shadowstep primes from deliberate movement, not a platform carrying an idle player", () => {
    state.equipmentInventory.push({ id: "shadowstep_garb", tier: "common" });
    equipEquipment(state, "garb", "shadowstep_garb");
    const platform = {
      x: state.player.x - TEST.targetOffset, y: GROUND_Y - TEST.targetHeight,
      baseY: GROUND_Y - TEST.targetHeight, w: TEST.targetOffset * 2, h: TEST.projectileSize,
      vx: 2, phase: 0, style: "stone", kind: "normal", spriteIndex: 0, spriteAct: null,
      trim: 0, notch: 0, hoverAmplitude: 0,
    } as const;
    state.platforms.push(platform);
    state.player.onPlatform = platform;
    state.player.y = platform.y - state.player.h;
    const x = state.player.x;
    updatePlayer();
    expect(state.player.x).toBe(x + platform.vx);
    expect(state.equipmentReactions.movementDistance).toBe(0);
    keys.add(PLAYER_CONTROL_KEYS.moveRight);
    updatePlayer();
    expect(state.equipmentReactions.movementDistance).toBeGreaterThan(0);
    expect(state.equipmentReactions.movementDistance).toBe(state.player.x - x - platform.vx * 2);
    keys.clear();
  });

  it("rain marks multiple actual targets without consuming its own marks", () => {
    releaseSkill(SKILL_IDS.antiAirMulti);
    const targets = state.playerSkillEffects.map((effect) => targetAt(
      effect.x - TEST.targetWidth / 2, effect.y - TEST.targetHeight / 2,
    ));
    updateEffects();
    expect(targets.filter((target) => target.hp < TEST.targetHp).length).toBeGreaterThan(1);
    expect(state.equipmentReactions.marks.length).toBeGreaterThan(1);
    expect(state.equipmentReactions.effects).toHaveLength(0);
  });

  it("guard counter must damage a target; a distant block or immune hit never marks", () => {
    releaseSkill(SKILL_IDS.guardCounter);
    updateGuardCounterEffect();
    const projectile = { x: state.player.x, y: state.player.y, w: TEST.projectileSize, h: TEST.projectileSize };
    expect(blockProjectileWithGuardCounter(projectile)).toBe(true);
    expect(state.equipmentReactions.marks).toHaveLength(0);
    const target = targetAt(state.player.x, state.player.y);
    target.wardenDamageImmune = true;
    blockProjectileWithGuardCounter(projectile);
    expect(target.hp).toBe(TEST.targetHp);
    expect(state.equipmentReactions.marks).toHaveLength(0);
    target.wardenDamageImmune = false;
    blockProjectileWithGuardCounter(projectile);
    expect(target.hp).toBeLessThan(TEST.targetHp);
    expect(state.equipmentReactions.marks[0]?.target).toBe(target);
  });

  it("dash travel and finishing slash both carry the original gear generation", () => {
    const source = releaseSkill(SKILL_IDS.dashReposition);
    finishCast();
    const target = targetAt(state.player.x + state.player.w, state.player.y);
    for (let frame = 0; state.player.dashReposition && frame < TEST.maxAdvanceFrames; frame += 1) updatePlayer();
    expect(target.hp).toBeLessThan(TEST.targetHp);
    const finish = state.playerSkillEffects.find((effect) => effect.skillId === SKILL_IDS.dashReposition && !effect.visualOnly);
    if (!finish) throw new Error("Expected finishing slash");
    expect(finish.skillSource).toEqual(source);
    const finishTarget = targetAt(finish.x, finish.y - TEST.targetHeight / 2);
    updatePlayerSkillEffects();
    expect(finishTarget.hp).toBeLessThan(TEST.targetHp);
    expect(state.equipmentReactions.marks.some((mark) => mark.target === finishTarget)).toBe(true);
    expect(state.equipmentReactions.effects).toHaveLength(0);
  });

  it("return blade's outgoing and returning damage cannot consume each other's marks", () => {
    const source = releaseSkill(SKILL_IDS.returningBlade, RETURNING_BLADE_CONFIG.requiredLevel);
    const blade = activeReturningBlade();
    if (!blade) throw new Error("Expected blade");
    const target = targetAt(state.player.x + TEST.targetOffset, state.player.y);
    updateEffects(TEST.effectSettleFrames);
    finishCast();
    expect(target.hp).toBeLessThan(TEST.targetHp);
    const hp = target.hp;
    castSelectedSkill();
    expect(blade.phase).toBe("recall");
    expect(blade.skillSource).toEqual(source);
    updateEffects(TEST.effectSettleFrames);
    expect(blade.returnHitEnemies).toContain(target);
    expect(target.hp).toBeLessThan(hp);
    expect(state.equipmentReactions.effects).toHaveLength(0);
  });

  it("marks and consumes through the real Boss damage path", () => {
    state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0, animSeed: 0 });
    const boss = state.boss;
    Object.assign(boss, { hp: TEST.targetHp, hpMax: TEST.targetHp });
    releaseSkill(SKILL_IDS.lineProjectile);
    const line = state.lineProjectileEffects[0];
    Object.assign(boss, { x: line.x, y: line.y + 1, hitCd: 0 });
    updateLineProjectileEffects();
    expect(boss.hp).toBeLessThan(TEST.targetHp);
    expect(state.equipmentReactions.marks[0]?.target).toBe(boss);
    releaseSkill(SKILL_IDS.closeArc);
    const arc = state.closeArcEffects[0];
    Object.assign(boss, { x: arc.x, y: arc.y + 1, hitCd: 0 });
    updateCloseArcEffects();
    expect(state.equipmentReactions.effects.map((effect) => effect.kind)).toEqual(["sweep"]);
  });
});
