import { beforeEach, describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { EQUIPMENT_REACTIONS as CONFIG } from "../constants/equipmentReactions";
import { createBossEncounter } from "../entities/bosses/encounter";
import { resetState, state } from "../game/state";
import type { SkillId } from "../types/assets";
import type { EnemyState, SkillHitSource } from "../types/game-state";
import type { EquipmentReactionTarget } from "../types/game/equipmentReactions";
import {
  equipmentReactionDamageMultiplier,
  recordEquipmentReactionControl,
  recordEquipmentReactionHit,
  recordEquipmentReactionMovement,
  resetEquipmentReactions,
  tickEquipmentReactions,
} from "./equipmentReactions";

const TEST = { damage: 10, hp: 1000, x: 300, y: 200, size: 20, nextX: 350, farX: 600, casts: 80 };
let nextCastId = 0;

function enemy(x: number = TEST.x): EnemyState {
  const target: EnemyState = {
    id: "chaser", spawnSource: "debug", spawnCost: 1, aiState: "move", aiTimer: 0,
    x, y: TEST.y, w: TEST.size, h: TEST.size, vx: 0, hp: TEST.hp,
    damage: TEST.damage, hitCd: 0, animSeed: 0, sheetIndex: 0,
  };
  state.enemies.push(target);
  return target;
}

function source(skillId: SkillId): SkillHitSource {
  nextCastId += 1;
  return { skillId, castId: nextCastId, equipmentRevision: state.equipmentReactions.revision };
}

function hit(target: EquipmentReactionTarget, cast: SkillHitSource | undefined, damage: number = TEST.damage) {
  recordEquipmentReactionHit(state, target, cast, damage, state.boss === target);
}

function advance(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) tickEquipmentReactions(state);
}

beforeEach(() => {
  resetState();
  nextCastId = 0;
});

describe("equipment and skill composition", () => {
  it("creates no marks, extra attacks or movement charge without the required equipment", () => {
    const target = enemy();
    hit(target, source(SKILL_IDS.lineProjectile));
    hit(target, source(SKILL_IDS.closeArc));
    recordEquipmentReactionMovement(state, CONFIG.movementDistance);
    expect(state.equipmentReactions.marks).toHaveLength(0);
    expect(state.equipmentReactions.effects).toHaveLength(0);
    expect(state.equipmentReactions.movementDistance).toBe(0);
  });

  it("lets returning blade place a mark, then a different skill cash it out in the new facing", () => {
    state.equippedEquipment.blade = "flow_blade";
    const target = enemy();
    const blade = source(SKILL_IDS.returningBlade);
    hit(target, blade);
    advance(1);
    hit(target, blade);
    expect(state.equipmentReactions.marks[0].remaining).toBe(CONFIG.markFrames - 1);
    expect(state.equipmentReactions.effects).toHaveLength(0);
    state.player.facing = -1;
    const dash = source(SKILL_IDS.dashReposition);
    hit(target, dash);
    expect(state.equipmentReactions.effects[0]).toMatchObject({
      kind: "sweep", facing: -1, x: TEST.x + TEST.size / 2, vx: -CONFIG.sweep.speed,
    });
    hit(target, blade);
    hit(enemy(TEST.nextX), dash);
    expect(state.equipmentReactions.effects).toHaveLength(1);
    expect(state.equipmentReactions.marks).toHaveLength(0);
  });

  it("changes the same flow build into stationary crowd control when tempo talisman consumes clustered marks", () => {
    state.equippedEquipment = { blade: "flow_blade", garb: "flow_garb", talisman: "tempo_talisman" };
    const targets = [enemy(), enemy(TEST.nextX), enemy(TEST.farX)];
    const rain = source(SKILL_IDS.antiAirMulti);
    for (const target of targets) hit(target, rain);
    expect(state.equipmentReactions.marks[0].remaining).toBe(CONFIG.markFrames * CONFIG.durationMultiplier);
    const arc = source(SKILL_IDS.closeArc);
    hit(targets[0], arc);
    hit(targets[1], arc);
    expect(state.equipmentReactions.effects).toHaveLength(1);
    expect(state.equipmentReactions.effects[0]).toMatchObject({ kind: "surge", vx: 0 });
    expect(state.equipmentReactions.marks.map((mark) => mark.target)).toEqual([targets[2]]);
    expect(equipmentReactionDamageMultiplier(state)).toBe(CONFIG.coverDamageMultiplier);
    advance(CONFIG.coverFrames);
    expect(equipmentReactionDamageMultiplier(state)).toBe(1);
  });

  it("leaves marks just outside the surge footprint intact for a later reaction", () => {
    state.equippedEquipment = { blade: "flow_blade", garb: null, talisman: "tempo_talisman" };
    const origin = enemy();
    const horizontalOutside = enemy(TEST.x + CONFIG.surge.width / 2 + 1);
    const verticalOutside = enemy();
    verticalOutside.y += CONFIG.surge.height / 2 + 1;
    const rain = source(SKILL_IDS.antiAirMulti);
    for (const target of [origin, horizontalOutside, verticalOutside]) hit(target, rain);
    hit(origin, source(SKILL_IDS.closeArc));
    expect(state.equipmentReactions.marks.map((mark) => mark.target)).toEqual([horizontalOutside, verticalOutside]);
  });

  it("lets hunting transfer rain marks to new enemies for a different skill to consume", () => {
    state.equippedEquipment = { blade: "flow_blade", garb: null, talisman: "hunt_talisman" };
    const first = enemy();
    const nearest = enemy(TEST.nextX);
    const nextNearest = enemy(TEST.nextX + TEST.size);
    const third = enemy(TEST.nextX + TEST.size * 2);
    const rain = source(SKILL_IDS.antiAirMulti);
    hit(first, rain);
    advance(1);
    first.hp = 0;
    hit(first, undefined);
    expect(state.equipmentReactions.marks.map((mark) => mark.target)).toEqual([nearest, nextNearest]);
    expect(state.equipmentReactions.marks[0]).toMatchObject({
      remaining: CONFIG.markFrames - 1, castId: rain.castId, skillId: SKILL_IDS.antiAirMulti,
    });
    expect(state.equipmentReactions.effects).toHaveLength(0);
    hit(nearest, source(SKILL_IDS.verticalWave));
    expect(state.equipmentReactions.effects[0].kind).toBe("sweep");
    expect(state.equipmentReactions.marks.some((mark) => mark.target === third)).toBe(false);
  });

  it("combines movement-created eyes and later control hits with burst blade", () => {
    state.equippedEquipment = { blade: "burst_blade", garb: "shadowstep_garb", talisman: null };
    const target = enemy();
    recordEquipmentReactionMovement(state, CONFIG.movementDistance - 1);
    hit(target, source(SKILL_IDS.lineProjectile));
    expect(state.equipmentReactions.effects).toHaveLength(0);
    recordEquipmentReactionMovement(state, 1);
    const line = source(SKILL_IDS.lineProjectile);
    hit(target, line);
    expect(state.equipmentReactions.effects.map((effect) => effect.kind)).toEqual(["eye"]);
    expect(state.equipmentReactions.movementDistance).toBe(0);
    recordEquipmentReactionControl(state, target);
    hit(target, source(SKILL_IDS.returningBlade));
    expect(state.equipmentReactions.effects.map((effect) => effect.kind)).toEqual(["eye", "rupture"]);
    const rupture = state.equipmentReactions.effects[1];
    const origin = rupture.x;
    target.x += TEST.size;
    expect(rupture.x).toBe(origin);
    expect(rupture.vx).toBe(0);
  });

  it("allows a marked minion to transfer to a nearby Boss without creating a free damage loop", () => {
    state.equippedEquipment = { blade: "flow_blade", garb: null, talisman: "hunt_talisman" };
    const target = enemy();
    state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0 });
    Object.assign(state.boss, { x: TEST.nextX, y: TEST.y, w: TEST.size, h: TEST.size });
    const rain = source(SKILL_IDS.antiAirMulti);
    hit(target, rain);
    target.hp = 0;
    hit(target, rain);
    const bossMark = state.equipmentReactions.marks[0];
    expect(bossMark).toMatchObject({ target: state.boss, isBoss: true, castId: rain.castId });
    expect(state.equipmentReactions.effects).toHaveLength(0);
    hit(state.boss, undefined);
    expect(state.equipmentReactions.effects).toHaveLength(0);
    hit(state.boss, source(SKILL_IDS.armorBreak));
    expect(state.equipmentReactions.effects[0].kind).toBe("sweep");
  });

  it.each([SKILL_IDS.vortexControl, SKILL_IDS.verticalWave])("turns native %s control into rupture but never treats Boss damage as control", (skillId) => {
    state.equippedEquipment.blade = "burst_blade";
    const target = enemy();
    const cast = source(skillId);
    hit(target, cast);
    hit(enemy(TEST.nextX), cast);
    expect(state.equipmentReactions.effects).toHaveLength(1);
    expect(state.equipmentReactions.effects[0].kind).toBe("rupture");
    state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0 });
    hit(state.boss, source(skillId));
    expect(state.equipmentReactions.effects).toHaveLength(1);
    expect(state.equipmentReactions.controls.some((record) => record.isBoss)).toBe(false);
    state.boss.armorBreakTimer = CONFIG.controlFrames;
    hit(state.boss, source(SKILL_IDS.armorBreak));
    expect(state.equipmentReactions.effects).toHaveLength(2);
  });

  it("still ruptures a native control hit that kills its target without retaining dead control", () => {
    state.equippedEquipment.blade = "burst_blade";
    const target = enemy();
    target.hp = 0;
    hit(target, source(SKILL_IDS.verticalWave));
    expect(state.equipmentReactions.effects[0].kind).toBe("rupture");
    expect(state.equipmentReactions.controls).toHaveLength(0);
  });
});

describe("equipment reaction lifetime and provenance", () => {
  it("does not refresh a mark by repeating its skill or create effects from blocked damage", () => {
    state.equippedEquipment.blade = "flow_blade";
    const target = enemy();
    hit(target, source(SKILL_IDS.lineProjectile), 0);
    expect(state.equipmentReactions.marks).toHaveLength(0);
    hit(target, source(SKILL_IDS.lineProjectile));
    advance(CONFIG.markFrames - 1);
    hit(target, source(SKILL_IDS.lineProjectile));
    expect(state.equipmentReactions.marks[0].remaining).toBe(1);
    advance(1);
    expect(state.equipmentReactions.marks).toHaveLength(0);
  });

  it("prevents gear swapping from reinterpreting old skill hits and resets all combat ownership", () => {
    state.equippedEquipment.blade = "flow_blade";
    const target = enemy();
    const oldCast = source(SKILL_IDS.lineProjectile);
    hit(target, oldCast);
    const revision = state.equipmentReactions.revision;
    const effects = state.equipmentReactions.effects;
    resetEquipmentReactions(state);
    expect(state.equipmentReactions.revision).toBe(revision + 1);
    expect(state.equipmentReactions.effects).toBe(effects);
    expect(effects).toHaveLength(0);
    hit(target, oldCast);
    expect(state.equipmentReactions.marks).toHaveLength(0);
    hit(target, source(SKILL_IDS.lineProjectile));
    expect(state.equipmentReactions.marks).toHaveLength(1);
    state.player.hp = 0;
    advance(1);
    expect(state.equipmentReactions.marks).toHaveLength(0);
    expect(state.equipmentReactions.castHistory).toHaveLength(0);
  });

  it("prunes disappeared enemies and stale Boss references and expires flow-extended control", () => {
    state.equippedEquipment = { blade: "flow_blade", garb: "flow_garb", talisman: null };
    const target = enemy();
    hit(target, source(SKILL_IDS.vortexControl));
    expect(state.equipmentReactions.controls[0].remaining).toBe(CONFIG.controlFrames * CONFIG.durationMultiplier);
    advance(CONFIG.controlFrames * CONFIG.durationMultiplier);
    expect(state.equipmentReactions.controls).toHaveLength(0);
    state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0 });
    hit(state.boss, source(SKILL_IDS.lineProjectile));
    state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0 });
    state.enemies.length = 0;
    advance(1);
    expect(state.equipmentReactions.marks).toHaveLength(0);
  });

  it("charges movement in both directions, rejects nonfinite motion and caps one eye per cast", () => {
    state.equippedEquipment = { blade: "flow_blade", garb: "shadowstep_garb", talisman: null };
    const target = enemy();
    recordEquipmentReactionMovement(state, Number.POSITIVE_INFINITY);
    expect(state.equipmentReactions.movementDistance).toBe(0);
    recordEquipmentReactionMovement(state, -CONFIG.movementDistance / 2);
    recordEquipmentReactionMovement(state, CONFIG.movementDistance / 2);
    const counter = source(SKILL_IDS.guardCounter);
    hit(target, counter);
    recordEquipmentReactionMovement(state, CONFIG.movementDistance);
    hit(target, counter);
    expect(state.equipmentReactions.effects).toHaveLength(1);
    expect(state.equipmentReactions.effects[0].life).toBe(CONFIG.eye.lifeFrames);
    expect(state.equipmentReactions.marks).toHaveLength(1);
  });

  it("bounds marks, cast history and effects without reactivating a retired lingering cast", () => {
    state.equippedEquipment.blade = "flow_blade";
    const first = enemy();
    const lingering = source(SKILL_IDS.lineProjectile);
    hit(first, lingering);
    for (let index = 0; index < TEST.casts; index += 1) hit(enemy(), source(SKILL_IDS.lineProjectile));
    expect(state.equipmentReactions.marks).toHaveLength(CONFIG.maxMarks);
    expect(state.equipmentReactions.castHistory).toHaveLength(CONFIG.historyLimit);
    hit(first, lingering);
    expect(state.equipmentReactions.marks.some((mark) => mark.target === first)).toBe(false);
    state.equippedEquipment.blade = "burst_blade";
    first.armorBreakTimer = CONFIG.controlFrames;
    for (let index = 0; index < TEST.casts; index += 1) hit(first, source(SKILL_IDS.armorBreak));
    expect(state.equipmentReactions.effects).toHaveLength(CONFIG.maxEffects);
  });
});
