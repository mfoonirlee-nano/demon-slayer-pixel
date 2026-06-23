import { describe, expect, it, beforeEach } from "vitest";
import { WARDEN_SHEET_INDEX } from "../../constants";
import { state, resetState } from "../../game/state";
import type { BossState, EnemyState } from "../../types/game-state";
import { updateEnemies } from "../enemy";
import { createEnemyState, type EnemySpawnContext } from "./common";
import { applyWardenAuraBuffs, WARDEN_ARCHETYPE } from "./warden";

const VALID_SUPPORT_RANGE = 260;
const OTHER_WARDEN_X = 350;
const BUFFED_SUMMON_X = 361.2;
const HIT_INTERRUPTION_HOLD_FRAMES = 12;
const PLAYER_HP_AFTER_WEAK_CONTACT_DAMAGE = 92;

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
    expect(otherWarden.wardenBuffedFrames).toBe(0);
    expect(otherWarden.x).toBe(OTHER_WARDEN_X);
    expect(state.boss?.x).toBe(OTHER_WARDEN_X);
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
