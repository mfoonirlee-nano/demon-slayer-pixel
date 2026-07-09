import { describe, expect, it, beforeEach } from "vitest";
import { WARDEN_BLOOD_MOON_BUFF_SHEET, WARDEN_SHEET_INDEX } from "../../constants";
import { state, resetState } from "../../game/state";
import type { BossState, EnemyState } from "../../types/game-state";
import { updateEnemies } from "../enemy";
import { createEnemyState, damageEnemy, type EnemySpawnContext } from "./common";
import { applyWardenAuraBuffs, WARDEN_ARCHETYPE } from "./warden";

const VALID_SUPPORT_RANGE = 260;
const OTHER_WARDEN_X = 350;
const BUFFED_SUMMON_X = 361.5;
const NORMAL_AURA_EDGE_DISTANCE = 295;
const AWAKENED_AURA_EDGE_DISTANCE = 590;
const FINAL_AURA_DISTANCE = 900;
const NORMAL_AURA_ATTACK_SCALE = 1.15;
const AWAKENED_AURA_ATTACK_SCALE = 1.3;
const FINAL_AURA_ATTACK_SCALE = 1.5;
const HIT_INTERRUPTION_HOLD_FRAMES = 12;
const PLAYER_HP_AFTER_WEAK_CONTACT_DAMAGE = 92;
const PLAYER_HP_AFTER_BUFFED_CONTACT_DAMAGE = 95.4;
const SUPPORT_POSITION_PADDING = 20;
const BUFFED_CONTACT_DAMAGE = 4;
const FINAL_IMMUNITY_TEST_DAMAGE = 20;
const FINAL_IMMUNITY_TEST_HIT_COOLDOWN = 3;
const FINAL_IMMUNITY_TEST_HP = 10;
const FINAL_AURA_SPEED_EXTRA_X = 4;
const BLOOD_MOON_BUFF_SRC = "assets/sprites/enemies/warden/warden_blood_moon_buff.png";
const BLOOD_MOON_BUFF_FRAME_SIZE = 72;
const BLOOD_MOON_BUFF_FRAME_COUNT = 6;

function spawnContext(overrides: Partial<EnemySpawnContext> = {}): EnemySpawnContext {
  return {
    enemyId: "warden",
    spawnSource: "regular",
    spawnCost: 5,
    side: -1,
    sheetIndex: WARDEN_SHEET_INDEX,
    speed: 1,
    damage: 10,
    baseHp: 30,
    ...overrides,
  };
}

function enemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: "chaser",
    spawnSource: "regular",
    spawnCost: 1,
    aiState: "move",
    aiTimer: 0,
    x: 340,
    y: 420,
    w: 40,
    h: 60,
    vx: 0,
    hp: 10,
    damage: 4,
    hitCd: 0,
    animSeed: 0,
    sheetIndex: 0,
    ...overrides,
  };
}

function warden(overrides: Partial<EnemyState> = {}) {
  const next = createEnemyState(spawnContext(), WARDEN_ARCHETYPE);
  WARDEN_ARCHETYPE.init?.(next, spawnContext());
  Object.assign(next, {
    x: 300,
    y: 400,
    w: 40,
    h: 80,
    animSeed: 0,
    ...overrides,
  });
  return next;
}

function setPlayerAtRangeFrom(enemyState: EnemyState, range: number) {
  state.player.w = 30;
  state.player.x = enemyState.x + enemyState.w / 2 + range - state.player.w / 2;
}

function tickWarden(enemyState: EnemyState) {
  enemyState.hitCd -= 1;
  WARDEN_ARCHETYPE.update(enemyState);
}

describe("warden support attack loop", () => {
  beforeEach(() => {
    resetState();
    state.elapsed = 0;
    state.player.hp = 100;
    state.player.maxHp = 100;
    state.player.invincible = 0;
  });

  it("exposes the blood moon buff effect sheet for preloading", () => {
    expect(WARDEN_BLOOD_MOON_BUFF_SHEET.src).toBe(BLOOD_MOON_BUFF_SRC);
    expect(WARDEN_BLOOD_MOON_BUFF_SHEET.frameW).toBe(BLOOD_MOON_BUFF_FRAME_SIZE);
    expect(WARDEN_BLOOD_MOON_BUFF_SHEET.frameH).toBe(BLOOD_MOON_BUFF_FRAME_SIZE);
    expect(WARDEN_BLOOD_MOON_BUFF_SHEET.count).toBe(BLOOD_MOON_BUFF_FRAME_COUNT);
  });

  it("enters aura when in support range with a non-warden target nearby", () => {
    const wardenEnemy = warden({ wardenPhase: "move", wardenTimer: 0 });
    setPlayerAtRangeFrom(wardenEnemy, VALID_SUPPORT_RANGE);
    state.enemies.push(wardenEnemy, enemy({ x: 360, y: 410 }));

    WARDEN_ARCHETYPE.update(wardenEnemy);

    expect(wardenEnemy.wardenPhase).toBe("aura");
    expect(wardenEnemy.vx).toBe(0);
  });

  it("exits aura when there are no support targets", () => {
    const wardenEnemy = warden({ wardenPhase: "aura", wardenTimer: 40 });
    setPlayerAtRangeFrom(wardenEnemy, VALID_SUPPORT_RANGE);
    state.enemies.push(wardenEnemy);

    WARDEN_ARCHETYPE.update(wardenEnemy);

    expect(wardenEnemy.wardenPhase).toBe("move");
  });

  it("buffs boss-summoned enemies but not wardens or the boss", () => {
    const wardenEnemy = warden({ wardenPhase: "aura" });
    const summonedEnemy = enemy({ spawnSource: "boss", x: 360, y: 410, vx: 10 });
    const otherWarden = warden({ x: OTHER_WARDEN_X, y: 410, wardenPhase: "move", vx: 10 });
    state.boss = {
      x: OTHER_WARDEN_X,
      y: 410,
      w: 60,
      h: 100,
      vx: 10,
    } as BossState;
    state.enemies.push(wardenEnemy, summonedEnemy, otherWarden);

    applyWardenAuraBuffs();

    expect(summonedEnemy.wardenBuffedFrames).toBe(2);
    expect(summonedEnemy.x).toBeCloseTo(BUFFED_SUMMON_X);
    expect(summonedEnemy.wardenAttackDamageScale).toBe(NORMAL_AURA_ATTACK_SCALE);
    expect(summonedEnemy.wardenDamageImmune).toBe(false);
    expect(otherWarden.wardenBuffedFrames).toBe(0);
    expect(otherWarden.x).toBe(OTHER_WARDEN_X);
    expect(state.boss?.x).toBe(OTHER_WARDEN_X);
  });

  it("uses a 300px normal aura range and a 600px awakened aura range", () => {
    const introWarden = warden({ wardenPhase: "aura" });
    const introAlly = enemy({ x: introWarden.x + NORMAL_AURA_EDGE_DISTANCE, y: 400, vx: 0 });
    state.enemies.push(introWarden, introAlly);

    applyWardenAuraBuffs();

    expect(introAlly.wardenBuffedFrames).toBe(2);
    expect(introAlly.wardenAttackDamageScale).toBe(NORMAL_AURA_ATTACK_SCALE);

    resetState();

    const awakenedWarden = warden({ growthStage: "awakened", wardenPhase: "aura" });
    const awakenedAlly = enemy({ x: awakenedWarden.x + AWAKENED_AURA_EDGE_DISTANCE, y: 400, vx: 0 });
    state.enemies.push(awakenedWarden, awakenedAlly);

    applyWardenAuraBuffs();

    expect(awakenedAlly.wardenBuffedFrames).toBe(2);
    expect(awakenedAlly.wardenAttackDamageScale).toBe(AWAKENED_AURA_ATTACK_SCALE);
  });

  it("buffs enemy contact damage without permanently changing base damage", () => {
    const wardenEnemy = warden({
      x: state.player.x + state.player.w / 2 - VALID_SUPPORT_RANGE - SUPPORT_POSITION_PADDING,
      wardenPhase: "aura",
    });
    const buffedEnemy = enemy({
      x: state.player.x,
      y: state.player.y,
      w: state.player.w,
      h: state.player.h,
      vx: 0,
      damage: BUFFED_CONTACT_DAMAGE,
    });
    state.enemies.push(wardenEnemy, buffedEnemy);

    updateEnemies();

    expect(state.player.hp).toBeCloseTo(PLAYER_HP_AFTER_BUFFED_CONTACT_DAMAGE);
    expect(buffedEnemy.damage).toBe(BUFFED_CONTACT_DAMAGE);
  });

  it("makes final aura global and prevents affected enemies from taking damage", () => {
    const finalWarden = warden({ growthStage: "final", wardenPhase: "aura" });
    const distantEnemy = enemy({ x: finalWarden.x + FINAL_AURA_DISTANCE, y: 400, vx: 8, hp: FINAL_IMMUNITY_TEST_HP });
    state.enemies.push(finalWarden, distantEnemy);

    applyWardenAuraBuffs();
    const appliedDamage = damageEnemy(
      distantEnemy,
      FINAL_IMMUNITY_TEST_DAMAGE,
      FINAL_IMMUNITY_TEST_HIT_COOLDOWN,
      "armorBreak",
    );

    expect(distantEnemy.wardenBuffedFrames).toBe(2);
    expect(distantEnemy.x).toBe(finalWarden.x + FINAL_AURA_DISTANCE + FINAL_AURA_SPEED_EXTRA_X);
    expect(distantEnemy.wardenAttackDamageScale).toBe(FINAL_AURA_ATTACK_SCALE);
    expect(distantEnemy.wardenDamageImmune).toBe(true);
    expect(appliedDamage).toBe(0);
    expect(distantEnemy.hp).toBe(FINAL_IMMUNITY_TEST_HP);
  });

  it("pauses aura for a 14-frame hit interruption window", () => {
    const wardenEnemy = warden({ wardenPhase: "aura", wardenTimer: 80, hitCd: 2 });
    state.enemies.push(wardenEnemy, enemy({ x: 360, y: 410 }));

    tickWarden(wardenEnemy);

    expect(wardenEnemy.wardenPhase).toBe("hit");
    for (let frame = 0; frame < HIT_INTERRUPTION_HOLD_FRAMES; frame += 1) {
      tickWarden(wardenEnemy);
      expect(wardenEnemy.wardenPhase).toBe("hit");
    }

    tickWarden(wardenEnemy);

    expect(wardenEnemy.wardenPhase).toBe("move");
  });

  it("keeps weak contact damage as Warden's only direct damage", () => {
    const wardenEnemy = warden({ x: state.player.x, y: state.player.y, wardenPhase: "aura" });
    state.enemies.push(wardenEnemy);

    updateEnemies();

    expect(state.player.hp).toBe(PLAYER_HP_AFTER_WEAK_CONTACT_DAMAGE);
  });
});
