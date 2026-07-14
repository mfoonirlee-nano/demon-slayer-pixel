import { PLAYER_COMBAT, PLAYER_DEFAULTS, PLAYER_STAT_GROWTH } from "../constants";

export function baseAttackForLevel(level: number) {
  return Math.floor(
    PLAYER_DEFAULTS.baseAttack
    + PLAYER_STAT_GROWTH.attackLinear * (level - 1)
    + PLAYER_STAT_GROWTH.attackCurve * Math.sqrt(level - 1),
  );
}

export function maxHpForLevel(level: number) {
  return Math.floor(
    PLAYER_DEFAULTS.maxHp
    + PLAYER_STAT_GROWTH.hpLinear * (level - 1)
    + PLAYER_STAT_GROWTH.hpCurve * Math.sqrt(level - 1),
  );
}

export function maxSkillEnergyForLevel(level: number) {
  return PLAYER_DEFAULTS.maxSkillEnergy + PLAYER_STAT_GROWTH.skillEnergyLinear * (level - 1);
}

export function maxSkillChargesForEnergy(skillEnergyMax: number) {
  return Math.max(0, Math.floor(skillEnergyMax / PLAYER_COMBAT.skillCastEnergyCost));
}
