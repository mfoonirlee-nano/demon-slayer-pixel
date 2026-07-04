import {
  CLOSE_ARC_EFFECT_CONFIG,
  CLOSE_ARC_EFFECT_SHEET,
  GUARD_COUNTER_EFFECT_CONFIG,
  GUARD_COUNTER_EFFECT_SHEET,
  LINE_PROJECTILE_EFFECT_CONFIG,
  LINE_PROJECTILE_EFFECT_LEVEL_THREE_SHEET,
  LINE_PROJECTILE_EFFECT_LEVEL_TWO_SHEET,
  LINE_PROJECTILE_EFFECT_SHEET,
  PLAYER_SKILL_EFFECT_SHEETS,
  SKILL_IDS,
  SKILLS,
  ULTIMATE_SKILL_EFFECT_SHEET,
  ULTIMATE_SKILL_SHEET,
} from "../constants";
import type { Skill, SkillId, SpriteSheet } from "../types/assets";
import type { SkillLevel } from "../types/game-state";
import {
  GENERIC_PLAYER_SKILL_TUNING,
  isGenericPlayerSkillId,
} from "./playerSkills";

export const PLAYER_SKILL_CATALOG = SKILLS;

export type CorePlayerSkillId =
  | typeof SKILL_IDS.lineProjectile
  | typeof SKILL_IDS.closeArc
  | typeof SKILL_IDS.guardCounter;

export type CorePlayerSkillEffectConfig = {
  line_projectile: typeof LINE_PROJECTILE_EFFECT_CONFIG;
  close_arc: typeof CLOSE_ARC_EFFECT_CONFIG;
  guard_counter: typeof GUARD_COUNTER_EFFECT_CONFIG;
};

export const CORE_PLAYER_SKILL_EFFECT_SHEETS: Record<CorePlayerSkillId, SpriteSheet> = {
  [SKILL_IDS.lineProjectile]: LINE_PROJECTILE_EFFECT_SHEET,
  [SKILL_IDS.closeArc]: CLOSE_ARC_EFFECT_SHEET,
  [SKILL_IDS.guardCounter]: GUARD_COUNTER_EFFECT_SHEET,
};

export const LINE_PROJECTILE_EFFECT_SHEETS_BY_LEVEL: Record<SkillLevel, SpriteSheet> = {
  1: LINE_PROJECTILE_EFFECT_SHEET,
  2: LINE_PROJECTILE_EFFECT_LEVEL_TWO_SHEET,
  3: LINE_PROJECTILE_EFFECT_LEVEL_THREE_SHEET,
};

export const CORE_PLAYER_SKILL_EFFECT_CONFIGS: CorePlayerSkillEffectConfig = {
  [SKILL_IDS.lineProjectile]: LINE_PROJECTILE_EFFECT_CONFIG,
  [SKILL_IDS.closeArc]: CLOSE_ARC_EFFECT_CONFIG,
  [SKILL_IDS.guardCounter]: GUARD_COUNTER_EFFECT_CONFIG,
};

export const ULTIMATE_SKILL_ASSETS = {
  skill: ULTIMATE_SKILL_SHEET,
  effect: ULTIMATE_SKILL_EFFECT_SHEET,
} as const;

export function allPlayerSkills(): Skill[] {
  return PLAYER_SKILL_CATALOG;
}

export function playerSkillById(skillId: SkillId | null | undefined): Skill | null {
  if (!skillId) return null;
  return PLAYER_SKILL_CATALOG.find((skill) => skill.id === skillId) ?? null;
}

export function implementedPlayerSkills(): Skill[] {
  return PLAYER_SKILL_CATALOG.filter((skill) => (
    skill.implemented && Boolean(skill.src) && Boolean(skill.iconSrc)
  ));
}

export function implementedPlayerSkillIds(): SkillId[] {
  return implementedPlayerSkills().map((skill) => skill.id);
}

export function playerSkillName(skillId: SkillId, level?: SkillLevel) {
  const baseName = playerSkillById(skillId)?.name ?? skillId;
  return level ? `${baseName} ${romanSkillLevel(level)}` : baseName;
}

export function playerSkillDescription(skillId: SkillId, level: SkillLevel) {
  const skill = playerSkillById(skillId);
  return skill?.levelDescriptions[level] ?? skill?.description ?? "技能效果提升。";
}

export function playerSkillEffectSheet(skillId: SkillId): SpriteSheet | null {
  if (isCorePlayerSkillId(skillId)) {
    return CORE_PLAYER_SKILL_EFFECT_SHEETS[skillId];
  }
  if (isGenericPlayerSkillId(skillId)) {
    return PLAYER_SKILL_EFFECT_SHEETS[skillId] ?? null;
  }
  return null;
}

export function playerSkillEffectSheets(): SpriteSheet[] {
  return [
    ...Object.values(CORE_PLAYER_SKILL_EFFECT_SHEETS),
    LINE_PROJECTILE_EFFECT_LEVEL_TWO_SHEET,
    LINE_PROJECTILE_EFFECT_LEVEL_THREE_SHEET,
    ...Object.values(PLAYER_SKILL_EFFECT_SHEETS).filter(isSpriteSheet),
  ];
}

export function ultimateSkillSheets(): SpriteSheet[] {
  return [ULTIMATE_SKILL_ASSETS.skill, ULTIMATE_SKILL_ASSETS.effect];
}

export function genericPlayerSkillTuning(skillId: SkillId) {
  return isGenericPlayerSkillId(skillId) ? GENERIC_PLAYER_SKILL_TUNING[skillId] : null;
}

export function lineProjectileEffectSheetForLevel(level: SkillLevel | 0 | undefined): SpriteSheet {
  return LINE_PROJECTILE_EFFECT_SHEETS_BY_LEVEL[(level || 1) as SkillLevel];
}

export function playerSkillIconSrc(skillId: SkillId) {
  return playerSkillById(skillId)?.iconSrc ?? `assets/sprites/skills/${skillId}/icon.png`;
}

export function playerSkillColor(skillId: SkillId, fallback = "#d2f8ff") {
  return playerSkillById(skillId)?.color ?? fallback;
}

function isCorePlayerSkillId(skillId: SkillId): skillId is CorePlayerSkillId {
  return (
    skillId === SKILL_IDS.lineProjectile
    || skillId === SKILL_IDS.closeArc
    || skillId === SKILL_IDS.guardCounter
  );
}

function isSpriteSheet(sheet: SpriteSheet | undefined): sheet is SpriteSheet {
  return Boolean(sheet);
}

function romanSkillLevel(level: SkillLevel) {
  if (level === 1) return "I";
  if (level === 2) return "II";
  return "III";
}
