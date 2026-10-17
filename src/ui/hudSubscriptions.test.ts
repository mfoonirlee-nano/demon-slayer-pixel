import { createStore } from "jotai/vanilla";
import { expect, it, vi } from "vitest";
import { SKILL_IDS } from "../constants";
import { gameSnapshotAtom, type PlayerSnapshot } from "../game/gameStore";
import { getStateSnapshot } from "../game/state";
import { bossHudAtom, gameOverlayAtom, playerHudAtom, playerStatusesAtom, touchSkillAtom, ultimateHudAtom } from "./hudSubscriptions";

const DAMAGE = 10;
const BOSS_HEALTH = 100;
const STATUS_DURATION = 60;
const PLAYER_CHANGES: Partial<PlayerSnapshot>[] = [
  { hp: 1 },
  { skillEnergy: 1 },
  { residualSpirit: 1 },
  { residualSpiritHealTimer: 1 },
  { runLevel: 2 },
  { runXp: 1 },
  { skillIndex: 1 },
  { equippedSkillIds: [SKILL_IDS.returningBlade, null, null] },
  { skillLevels: { [SKILL_IDS.returningBlade]: 2 } },
  { returningBladePhase: "hover" },
];

it.each(PLAYER_CHANGES)("publishes changed player values immediately: %j", (change) => {
  const store = createStore();
  const initial = getStateSnapshot();
  store.set(gameSnapshotAtom, initial);
  const changed = vi.fn();
  const unsubscribe = store.sub(playerHudAtom, changed);
  const next = { ...initial, player: { ...initial.player, ...change } };
  store.set(gameSnapshotAtom, next);
  expect(changed).toHaveBeenCalledOnce();
  expect(store.get(playerHudAtom).player).toMatchObject(change);
  unsubscribe();
});

it("keeps status timers and removal live even when the rest of the player is identical", () => {
  const store = createStore();
  const initial = getStateSnapshot();
  for (const remainingFrames of [STATUS_DURATION, STATUS_DURATION - 1, 0]) {
    const statuses: PlayerSnapshot["statuses"] = remainingFrames > 0
      ? [{ id: "moon_tide", remainingFrames, durationFrames: STATUS_DURATION }]
      : [];
    store.set(gameSnapshotAtom, { ...initial, player: { ...initial.player, statuses } });
    expect(store.get(playerStatusesAtom)).toEqual(statuses);
  }
});

it("updates ultimate energy and countdown without notifying unrelated resource subscribers", () => {
  const store = createStore();
  const initial = getStateSnapshot();
  store.set(gameSnapshotAtom, initial);
  const changed = vi.fn();
  const unsubscribe = store.sub(playerHudAtom, changed);
  store.set(gameSnapshotAtom, { ...initial, player: { ...initial.player, ultimateEnergy: 1 } });
  expect(store.get(ultimateHudAtom).value).toBe(1);
  store.set(gameSnapshotAtom, {
    ...initial, player: { ...initial.player, ultimateTimer: 1, ultimateDuration: 2 },
  });
  expect(store.get(ultimateHudAtom).activePercent).toBe(0.5);
  store.set(gameSnapshotAtom, { ...initial, player: { ...initial.player, ultimateCastTimer: 1 } });
  expect(store.get(ultimateHudAtom).activePercent).toBe(1);
  store.set(gameSnapshotAtom, initial);
  expect(store.get(ultimateHudAtom).activePercent).toBe(0);
  expect(changed).not.toHaveBeenCalled();
  unsubscribe();
});

it("updates boss health without notifying player or touch subscribers", () => {
  const store = createStore();
  const initial = getStateSnapshot();
  store.set(gameSnapshotAtom, initial);
  const playerChanged = vi.fn();
  const touchChanged = vi.fn();
  const subscriptions = [store.sub(playerHudAtom, playerChanged), store.sub(touchSkillAtom, touchChanged)];
  store.set(gameSnapshotAtom, {
    ...getStateSnapshot(),
    boss: {
      id: "mirror-dream", displayName: "镜魇", phaseTitle: "Phase 1", awakened: false,
      hp: BOSS_HEALTH - DAMAGE, hpMax: BOSS_HEALTH, phase: 1,
    },
  });
  expect(store.get(bossHudAtom)?.hp).toBe(BOSS_HEALTH - DAMAGE);
  expect(playerChanged).not.toHaveBeenCalled();
  expect(touchChanged).not.toHaveBeenCalled();
  subscriptions.forEach((unsubscribe) => unsubscribe());
});

it("delivers overlays synchronously with the full current snapshot", () => {
  const store = createStore();
  const initial = getStateSnapshot();
  store.set(gameSnapshotAtom, initial);
  expect(store.get(gameOverlayAtom)).toBeNull();
  for (const activeOverlay of ["pause", "upgrade", "bossEquipment", "treasure", "death", "victory"] as const) {
    const snapshot = { ...initial, activeOverlay };
    store.set(gameSnapshotAtom, snapshot);
    expect(store.get(gameOverlayAtom)).toBe(snapshot);
  }
  store.set(gameSnapshotAtom, initial);
  expect(store.get(gameOverlayAtom)).toBeNull();
});
