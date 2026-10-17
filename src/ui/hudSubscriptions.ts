import { atom } from "jotai";
import { selectAtom } from "jotai/utils";
import { gameSnapshotAtom, type PlayerSnapshot } from "../game/gameStore";

function sameFields(left: Record<string, unknown> | null, right: Record<string, unknown> | null) {
  if (left === right) return true;
  if (!left || !right) return false;
  return Object.keys(left).length === Object.keys(right).length
    && Object.entries(left).every(([key, value]) => (
      Object.prototype.hasOwnProperty.call(right, key) && Object.is(value, right[key])
    ));
}

type PlayerResourceSnapshot = Pick<PlayerSnapshot,
  "hp" | "maxHp" | "skillEnergy" | "skillEnergyMax" | "runLevel" | "runXp" | "xpToNext"
  | "skillIndex" | "equippedSkillIds" | "skillLevels" | "returningBladePhase"
  | "residualSpirit" | "residualSpiritMax" | "residualSpiritHealTimer" | "residualSpiritHealDuration"
>;

function samePlayer(left: PlayerResourceSnapshot, right: PlayerResourceSnapshot) {
  const { equippedSkillIds: leftSlots, skillLevels: leftLevels, ...leftValues } = left;
  const { equippedSkillIds: rightSlots, skillLevels: rightLevels, ...rightValues } = right;
  return sameFields(leftValues, rightValues)
    && leftSlots.every((id, index) => id === rightSlots[index])
    && sameFields(leftLevels, rightLevels);
}

// Runtime snapshots are fresh immutable projections each frame. Compare the
// displayed values, not their object identities; real combat changes stay immediate.
export const playerHudAtom = selectAtom(gameSnapshotAtom, (snapshot) => ({
  player: {
    hp: snapshot.player.hp,
    maxHp: snapshot.player.maxHp,
    skillEnergy: snapshot.player.skillEnergy,
    skillEnergyMax: snapshot.player.skillEnergyMax,
    runLevel: snapshot.player.runLevel,
    runXp: snapshot.player.runXp,
    xpToNext: snapshot.player.xpToNext,
    skillIndex: snapshot.player.skillIndex,
    equippedSkillIds: snapshot.player.equippedSkillIds,
    skillLevels: snapshot.player.skillLevels,
    returningBladePhase: snapshot.player.returningBladePhase,
    residualSpirit: snapshot.player.residualSpirit,
    residualSpiritMax: snapshot.player.residualSpiritMax,
    residualSpiritHealTimer: snapshot.player.residualSpiritHealTimer,
    residualSpiritHealDuration: snapshot.player.residualSpiritHealDuration,
  } satisfies PlayerResourceSnapshot,
  talismanId: snapshot.equipment.equipped.talisman?.id,
  talismanTier: snapshot.equipment.equipped.talisman?.tier,
}), (left, right) => left.talismanId === right.talismanId
  && left.talismanTier === right.talismanTier && samePlayer(left.player, right.player));

export const bossHudAtom = selectAtom(gameSnapshotAtom, (snapshot) => snapshot.boss, sameFields);
export const spritesReadyAtom = atom((get) => get(gameSnapshotAtom).spritesReady);
export const gameOverlayAtom = atom((get) => {
  const snapshot = get(gameSnapshotAtom);
  return snapshot.activeOverlay === "none" ? null : snapshot;
});

export const touchSkillAtom = selectAtom(gameSnapshotAtom, ({ player }) => ({
  skillId: player.equippedSkillIds[player.skillIndex],
  phase: player.returningBladePhase,
}), sameFields);

export const ultimateHudAtom = selectAtom(gameSnapshotAtom, ({ player }) => ({
  value: player.ultimateEnergy,
  max: player.ultimateEnergyMax,
  ready: player.ultimateReady,
  activePercent: player.ultimateTimer > 0
    ? player.ultimateTimer / Math.max(1, player.ultimateDuration)
    : player.ultimateCastTimer > 0 ? 1 : 0,
}), sameFields);

export const playerStatusesAtom = selectAtom(gameSnapshotAtom, ({ player }) => player.statuses,
  (left, right) => left.length === right.length
    && left.every((status, index) => sameFields(status, right[index])));
