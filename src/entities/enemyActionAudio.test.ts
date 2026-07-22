import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetState, state } from "../game/state";
import { createBossEncounter } from "./bosses/encounter";
import { damageBoss } from "./bosses/common";
import { spawnEnemyById, updateEnemies } from "./enemy";
import { applyBinderTalismanDebuffs, updateBindingZones } from "./enemies/binder";
import { damageEnemy } from "./enemies/common";

const audioMock = vi.hoisted(() => ({
  playSfx: vi.fn(),
}));

vi.mock("../game/audio", () => audioMock);

const RUNNER_TRIGGER_DISTANCE = 160;
const RUNNER_UPDATE_STEP_SECONDS = 0.016666666666666666;
const CASTER_CAST_DISTANCE = 250;
const BINDER_CAST_DISTANCE = 230;
const RUNNER_DASH_GUARD_FRAMES = 90;
const CASTER_RELEASE_GUARD_FRAMES = 80;
const BINDER_RELEASE_GUARD_FRAMES = 100;
const BINDER_CURSE_TICK_GUARD_FRAMES = 30;
const BINDER_STUN_GUARD_FRAMES = 100;
const BODY_DAMAGE = 1;
const SHIELD_DAMAGE = 2;
const LOW_SHIELD_HP = 1;
const FRONT_SOURCE_OFFSET = 8;

function spawnedEnemy(id: Parameters<typeof spawnEnemyById>[0]) {
  expect(spawnEnemyById(id, "debug", "left")).toBe(true);
  return state.enemies[state.enemies.length - 1]!;
}

function placeEnemyRightOfPlayer(enemy: ReturnType<typeof spawnedEnemy>, distance: number) {
  const playerCenterX = state.player.x + state.player.w / 2;
  enemy.x = playerCenterX + distance - enemy.w / 2;
}

function dispatchedSfxNames() {
  return audioMock.playSfx.mock.calls.map((call) => call[0]);
}

function expectSfx(sfx: string) {
  expect(dispatchedSfxNames()).toContain(sfx);
}

function expectNoSfx(sfx: string) {
  expect(dispatchedSfxNames()).not.toContain(sfx);
}

describe("enemy action audio", () => {
  beforeEach(() => {
    resetState();
    state.elapsed = 0;
    audioMock.playSfx.mockClear();
  });

  it("dispatches runner windup and dash audio from the enemy update loop", () => {
    const runner = spawnedEnemy("runner");
    placeEnemyRightOfPlayer(runner, RUNNER_TRIGGER_DISTANCE);

    updateEnemies();

    expect(runner.runnerPhase).toBe("windup");
    expectSfx("enemyWarning");

    audioMock.playSfx.mockClear();
    for (
      let frame = 0;
      runner.runnerPhase === "windup" && frame < RUNNER_DASH_GUARD_FRAMES;
      frame += 1
    ) {
      state.elapsed += RUNNER_UPDATE_STEP_SECONDS;
      updateEnemies();
    }

    expect(runner.runnerPhase).toBe("dash");
    expectSfx("enemyDash");
  });

  it("dispatches caster windup and actual projectile release audio", () => {
    const caster = spawnedEnemy("caster");
    placeEnemyRightOfPlayer(caster, CASTER_CAST_DISTANCE);
    caster.casterTimer = 0;

    updateEnemies();

    expect(caster.casterPhase).toBe("windup");
    expectSfx("enemyCastStart");

    audioMock.playSfx.mockClear();
    for (
      let frame = 0;
      state.projectiles.length === 0 && frame < CASTER_RELEASE_GUARD_FRAMES;
      frame += 1
    ) {
      updateEnemies();
    }

    expect(state.projectiles.some((projectile) => projectile.kind === "casterWisp")).toBe(true);
    expectSfx("enemyCastRelease");
  });

  it("dispatches binder windup and actual talisman release audio", () => {
    const binder = spawnedEnemy("binder");
    placeEnemyRightOfPlayer(binder, BINDER_CAST_DISTANCE);
    binder.binderTimer = 0;

    updateEnemies();

    expect(binder.binderPhase).toBe("windup");
    expectSfx("enemyTalismanCastStart");

    audioMock.playSfx.mockClear();
    for (
      let frame = 0;
      !state.projectiles.some((projectile) => projectile.kind === "binderTalisman")
        && frame < BINDER_RELEASE_GUARD_FRAMES;
      frame += 1
    ) {
      updateBindingZones();
      updateEnemies();
    }

    expect(state.projectiles.some((projectile) => projectile.kind === "binderTalisman")).toBe(true);
    expectSfx("enemyTalismanCastRelease");
  });

  it("dispatches curse audio when a damage talisman ticks", () => {
    applyBinderTalismanDebuffs(["damage"]);
    const hpBeforeTick = state.player.hp;

    for (
      let frame = 0;
      state.player.hp === hpBeforeTick && frame < BINDER_CURSE_TICK_GUARD_FRAMES;
      frame += 1
    ) {
      updateBindingZones();
    }

    expect(state.player.hp).toBeLessThan(hpBeforeTick);
    expectSfx("enemyCurseTick");
    expectNoSfx("enemyImpact");

    audioMock.playSfx.mockClear();
    state.player.binderTalismanDamageTickTimer = 1;
    updateBindingZones();

    expectNoSfx("enemyCurseTick");
  });

  it("dispatches player stun audio when a stun talisman takes effect", () => {
    applyBinderTalismanDebuffs(["stun"]);

    for (
      let frame = 0;
      state.player.binderTalismanStunTimer <= 0 && frame < BINDER_STUN_GUARD_FRAMES;
      frame += 1
    ) {
      updateBindingZones();
    }

    expect(state.player.binderTalismanStunTimer).toBeGreaterThan(0);
    expectSfx("playerStatusStun");
  });

  it("dispatches enemy hurt audio for non-fatal body damage", () => {
    const enemy = spawnedEnemy("chaser");
    const hpBefore = enemy.hp;

    damageEnemy(enemy, BODY_DAMAGE);

    expect(enemy.hp).toBeCloseTo(hpBefore - BODY_DAMAGE);
    expectSfx("enemyHurt");
  });

  it("does not dispatch enemy hurt audio when warden immunity blocks damage", () => {
    const warden = spawnedEnemy("warden");
    const hpBefore = warden.hp;
    warden.wardenDamageImmune = true;

    const appliedDamage = damageEnemy(warden, BODY_DAMAGE);

    expect(appliedDamage).toBe(0);
    expect(warden.hp).toBe(hpBefore);
    expectNoSfx("enemyHurt");
  });

  it("does not dispatch hurt audio for zero or fatal enemy damage", () => {
    const enemy = spawnedEnemy("chaser");

    damageEnemy(enemy, 0);
    expectNoSfx("enemyHurt");

    audioMock.playSfx.mockClear();
    damageEnemy(enemy, enemy.hp + BODY_DAMAGE);

    expect(enemy.hp).toBeLessThanOrEqual(0);
    expectNoSfx("enemyHurt");
  });

  it("dispatches shield guard for absorbed damage and shield break without body hurt", () => {
    const brute = spawnedEnemy("brute");
    const hpBefore = brute.hp;
    const shieldBefore = brute.bruteShieldHp ?? 0;
    brute.bruteFacing = 1;
    const frontSourceX = brute.x + brute.w + FRONT_SOURCE_OFFSET;

    damageEnemy(brute, SHIELD_DAMAGE, undefined, "normal", frontSourceX);

    expect(brute.hp).toBe(hpBefore);
    expect(brute.bruteShieldHp).toBeCloseTo(shieldBefore - SHIELD_DAMAGE);
    expectSfx("enemyShieldGuard");
    expectNoSfx("enemyHurt");

    audioMock.playSfx.mockClear();
    brute.bruteShieldHp = LOW_SHIELD_HP;

    damageEnemy(brute, SHIELD_DAMAGE, undefined, "normal", frontSourceX);

    expect(brute.hp).toBe(hpBefore);
    expect(brute.bruteShieldBroken).toBe(true);
    expectSfx("enemyShieldBreak");
    expectNoSfx("enemyHurt");
  });

  it("dispatches boss hurt audio for non-fatal damage", () => {
    const boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0 });
    const hpBefore = boss.hp;

    damageBoss(boss, BODY_DAMAGE);

    expect(boss.hp).toBeCloseTo(hpBefore - BODY_DAMAGE);
    expectSfx("bossHurt");
  });
});
