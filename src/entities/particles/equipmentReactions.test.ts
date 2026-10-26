import { beforeEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y, SKILL_IDS } from "../../constants";
import { EQUIPMENT_REACTIONS as CONFIG } from "../../constants/equipmentReactions";
import { resetState, state } from "../../game/state";
import { EQUIPMENT_CHOICE_IDS } from "../../systems/equipmentCatalog";
import { recordEquipmentReactionHit } from "../../systems/equipmentReactions";
import type { EnemyId } from "../../types/game-state";
import type { EquipmentReactionEffect, EquipmentReactionEffectKind } from "../../types/game/equipmentReactions";
import { createBossEncounter } from "../bosses/encounter";
import { spawnEnemyById } from "../enemy";
import { updateEquipmentReactionEffects } from "./equipmentReactions";

vi.mock("../../game/audio", () => ({ playSfx: vi.fn() }));

const CENTER_HEIGHT = 40;
const TEST = { hp: 10000, x: 300, y: GROUND_Y - CENTER_HEIGHT, damage: 20, bossDamage: 12, gap: 50 } as const;

function effect(kind: EquipmentReactionEffectKind, overrides: Partial<EquipmentReactionEffect> = {}) {
  const config = CONFIG[kind];
  const result: EquipmentReactionEffect = {
    kind, x: TEST.x, y: TEST.y, w: config.width, h: config.height,
    facing: 1, vx: config.speed, elapsed: 0, life: config.lifeFrames, maxLife: config.lifeFrames,
    damage: TEST.damage, bossDamage: TEST.bossDamage, hitEnemies: [], hitBoss: null, ...overrides,
  };
  state.equipmentReactions.effects.push(result);
  return result;
}

function advance(frames: number): void {
  for (let frame = 0; frame < frames; frame += 1) updateEquipmentReactionEffects();
}

function enemyAt(x: number, id: EnemyId = "chaser") {
  spawnEnemyById(id, "debug");
  const enemy = state.enemies[state.enemies.length - 1];
  Object.assign(enemy, { x, y: TEST.y - enemy.h / 2, hp: TEST.hp, spawnOccluder: undefined });
  return enemy;
}

beforeEach(() => {
  resetState();
  state.platforms.length = 0;
  state.player.x = TEST.x;
  state.player.y = GROUND_Y - state.player.h;
});

describe("equipment reaction effects", () => {
  it.each([-1, 1])("sweeps through multiple targets once and pushes toward %s", (facing) => {
    const first = enemyAt(TEST.x + facing * TEST.gap);
    const second = enemyAt(TEST.x + facing * TEST.gap * 2);
    const initialX = first.x;
    effect("sweep", { facing, vx: CONFIG.sweep.speed * facing });
    advance(CONFIG.sweep.lifeFrames);
    expect(first.hp).toBe(TEST.hp - TEST.damage);
    expect(second.hp).toBe(TEST.hp - TEST.damage);
    expect(first.x).toBe(initialX + facing * CONFIG.sweep.pushDistance);
    expect(state.equipmentReactions.effects).toHaveLength(0);
  });

  it("an eye pulls without damage and makes a later skill trigger burst-blade rupture", () => {
    state.equippedEquipment.blade = "burst_blade";
    const enemy = enemyAt(TEST.x + TEST.gap);
    const initialX = enemy.x;
    effect("eye");
    advance(1);
    expect(enemy.x).toBeLessThan(initialX);
    expect(enemy.hp).toBe(TEST.hp);
    expect(state.equipmentReactions.controls[0]?.target).toBe(enemy);
    recordEquipmentReactionHit(state, enemy, {
      skillId: SKILL_IDS.lineProjectile, castId: 1,
      equipmentRevision: state.equipmentReactions.revision,
    }, 1, false);
    expect(state.equipmentReactions.effects.map((entry) => entry.kind)).toEqual(["eye", "rupture"]);
    advance(CONFIG.eye.lifeFrames - 1);
    expect(enemy.hp).toBe(TEST.hp);
  });

  it("a fixed rupture gives thirty frames to lure enemies into its point and never pulls", () => {
    const enemy = enemyAt(TEST.x);
    const blast = effect("rupture");
    const initialX = enemy.x;
    advance(CONFIG.rupture.impactFrame - 1);
    expect(enemy.hp).toBe(TEST.hp);
    expect(enemy.x).toBe(initialX);
    expect(blast.x).toBe(TEST.x);
    const lateArrival = enemyAt(TEST.x + TEST.gap);
    advance(1);
    expect(enemy.hp).toBe(TEST.hp - TEST.damage);
    expect(lateArrival.hp).toBe(TEST.hp - TEST.damage);
    advance(CONFIG.rupture.lifeFrames);
    expect(enemy.hp).toBe(TEST.hp - TEST.damage);
    expect(state.equipmentReactions.controls).toHaveLength(0);
  });

  it("a surge pulls before its single impact and excludes the ellipse corners", () => {
    const light = enemyAt(TEST.x + TEST.gap);
    const burst = effect("surge");
    const corner = enemyAt(burst.x + burst.w / 2 - 1);
    Object.assign(corner, { y: burst.y - burst.h / 2 - 1, w: 1, h: 1 });
    const initialX = light.x;
    advance(CONFIG.surge.impactFrame - 1);
    expect(light.x).toBeLessThan(initialX);
    expect(light.hp).toBe(TEST.hp);
    advance(CONFIG.surge.lifeFrames);
    expect(light.hp).toBe(TEST.hp - TEST.damage);
    expect(corner.hp).toBe(TEST.hp);
  });

  it.each(["brute", "warden", "chaser"] as const)("never displaces heavy or elite %s", (id) => {
    const enemy = enemyAt(TEST.x + TEST.gap, id);
    if (id === "chaser") enemy.elite = true;
    const initialX = enemy.x;
    effect("eye");
    effect("sweep");
    effect("surge");
    advance(CONFIG.surge.lifeFrames);
    expect(enemy.x).toBe(initialX);
    expect(state.equipmentReactions.controls).toHaveLength(0);
  });

  it("immune enemies cannot be pulled, pushed, damaged or recorded as controlled", () => {
    const enemy = enemyAt(TEST.x + TEST.gap);
    const initialX = enemy.x;
    enemy.wardenDamageImmune = true;
    effect("eye");
    effect("sweep");
    effect("surge");
    advance(CONFIG.surge.lifeFrames);
    expect(enemy.hp).toBe(TEST.hp);
    expect(enemy.x).toBe(initialX);
    expect(state.equipmentReactions.controls).toHaveLength(0);
  });

  it("Bosses take a single impact without displacement or control tagging", () => {
    state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0, animSeed: 0 });
    Object.assign(state.boss, { x: TEST.x, y: TEST.y, hp: TEST.hp, hpMax: TEST.hp });
    const boss = state.boss;
    effect("eye");
    effect("surge");
    advance(CONFIG.surge.lifeFrames);
    expect(boss.hp).toBe(TEST.hp - TEST.bossDamage);
    expect(boss.x).toBe(TEST.x);
    expect(state.equipmentReactions.controls).toHaveLength(0);
  });

  it("secondary damage cannot create flow marks or burst reactions", () => {
    const enemy = enemyAt(TEST.x);
    enemy.armorBreakTimer = 60;
    enemy.armorBreakMultiplier = 1;
    state.equippedEquipment.blade = "flow_blade";
    effect("sweep");
    advance(1);
    expect(state.equipmentReactions.marks).toHaveLength(0);
    state.equippedEquipment.blade = "burst_blade";
    effect("rupture");
    advance(CONFIG.rupture.lifeFrames);
    expect(state.equipmentReactions.effects).toHaveLength(0);
    expect(state.equipmentReactions.castHistory).toHaveLength(0);
  });

  it.each(["death", "gameOver"])("clears pending impacts immediately on %s", (terminal) => {
    const enemy = enemyAt(TEST.x);
    effect("rupture");
    if (terminal === "death") state.player.hp = 0;
    else state.gameOver = true;
    advance(CONFIG.rupture.lifeFrames);
    expect(enemy.hp).toBe(TEST.hp);
    expect(state.equipmentReactions.effects).toHaveLength(0);
  });

  it("stops safely when a final Boss defeat replaces reaction state during an impact", () => {
    state.equipmentInventory = EQUIPMENT_CHOICE_IDS.map((id) => ({ id, tier: "awakened" }));
    state.boss = createBossEncounter({ id: "blood-moon-many-faces", bossKills: 12, elapsedSeconds: 0 });
    Object.assign(state.boss, { x: TEST.x, y: TEST.y, hp: 1 });
    effect("rupture");
    effect("sweep");
    expect(() => updateEquipmentReactionEffects()).not.toThrow();
    expect(state.gameOver).toBe(true);
    expect(state.runCleared).toBe(true);
    expect(state.equipmentReactions.effects).toHaveLength(0);
  });
});
