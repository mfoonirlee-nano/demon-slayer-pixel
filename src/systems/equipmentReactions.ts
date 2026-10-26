import { SKILL_IDS } from "../constants";
import { EQUIPMENT_REACTIONS as CONFIG } from "../constants/equipmentReactions";
import type { GameState, SkillHitSource } from "../types/game-state";
import type {
  EquipmentReactionCastRecord,
  EquipmentReactionEffectKind,
  EquipmentReactionState,
  EquipmentReactionTarget,
  EquipmentTideMark,
} from "../types/game/equipmentReactions";
import { resolveEquipmentSkillRules, type EquipmentSkillRuleId } from "./equipmentSkillRules";

function hasRule(state: GameState, rule: EquipmentSkillRuleId): boolean {
  return resolveEquipmentSkillRules(state.equippedEquipment).includes(rule);
}

export function createEquipmentReactionState(revision = 0): EquipmentReactionState {
  return {
    revision, marks: [], controls: [], effects: [], movementDistance: 0,
    coverFrames: 0, castHistory: [], retiredCastId: 0,
  };
}

export function resetEquipmentReactions(state: GameState): void {
  const runtime = state.equipmentReactions;
  runtime.revision += 1;
  runtime.marks.length = 0;
  runtime.controls.length = 0;
  runtime.effects.length = 0;
  runtime.castHistory.length = 0;
  runtime.movementDistance = 0;
  runtime.coverFrames = 0;
  runtime.retiredCastId = 0;
}

function canReact(state: GameState): boolean {
  return !state.gameOver && state.player.hp > 0;
}

function targetPresent(state: GameState, target: EquipmentReactionTarget, isBoss: boolean): boolean {
  return isBoss ? state.boss === target : state.enemies.some((enemy) => enemy === target);
}

function duration(state: GameState, frames: number): number {
  return hasRule(state, "lingering")
    ? Math.round(frames * CONFIG.durationMultiplier) : frames;
}

function targetDistance(first: EquipmentReactionTarget, second: EquipmentReactionTarget): number {
  return Math.hypot(
    first.x + first.w / 2 - second.x - second.w / 2,
    first.y + first.h / 2 - second.y - second.h / 2,
  );
}

function insideSurge(origin: EquipmentReactionTarget, target: EquipmentReactionTarget): boolean {
  const x = (target.x + target.w / 2 - origin.x - origin.w / 2) / (CONFIG.surge.width / 2);
  const y = (target.y + target.h / 2 - origin.y - origin.h / 2) / (CONFIG.surge.height / 2);
  return x * x + y * y <= 1;
}

export function recordEquipmentReactionControl(
  state: GameState,
  target: EquipmentReactionTarget,
  isBoss = false,
): void {
  if (!canReact(state) || isBoss || target.hp <= 0 || !targetPresent(state, target, isBoss)) return;
  const records = state.equipmentReactions.controls;
  const existing = records.find((record) => record.target === target);
  if (existing) {
    existing.remaining = duration(state, CONFIG.controlFrames);
    return;
  }
  if (records.length >= CONFIG.maxControls) records.shift();
  records.push({ target, isBoss, remaining: duration(state, CONFIG.controlFrames) });
}

function castRecord(state: GameState, source: SkillHitSource): EquipmentReactionCastRecord | null {
  const runtime = state.equipmentReactions;
  if (source.castId <= runtime.retiredCastId) return null;
  const existing = runtime.castHistory.find((record) => record.castId === source.castId);
  if (existing) return existing.skillId === source.skillId ? existing : null;
  const record = {
    castId: source.castId, skillId: source.skillId, hitTargets: [],
    reactionTriggered: false, eyeTriggered: false,
  };
  runtime.castHistory.push(record);
  runtime.castHistory.sort((first, second) => first.castId - second.castId);
  if (runtime.castHistory.length > CONFIG.historyLimit) {
    const retired = runtime.castHistory.shift();
    // Arrival can be out of order; retire the oldest paid cast, never its lingering projectile.
    if (retired) runtime.retiredCastId = Math.max(runtime.retiredCastId, retired.castId);
    if (retired === record) return null;
  }
  return record;
}

function spawnReaction(
  state: GameState,
  kind: EquipmentReactionEffectKind,
  target: EquipmentReactionTarget,
): void {
  const shape = CONFIG[kind];
  const attack = state.player.baseAttack + state.player.attackBonus;
  const life = kind === "eye" ? duration(state, shape.lifeFrames) : shape.lifeFrames;
  const effects = state.equipmentReactions.effects;
  if (effects.length >= CONFIG.maxEffects) effects.shift();
  effects.push({
    kind, x: target.x + target.w / 2, y: target.y + target.h / 2,
    w: shape.width, h: shape.height, facing: state.player.facing,
    vx: shape.speed * state.player.facing, elapsed: 0, life, maxLife: life,
    damage: attack * shape.damageMultiplier, bossDamage: attack * shape.bossDamageMultiplier,
    hitEnemies: [], hitBoss: null,
  });
  if (kind !== "eye" && hasRule(state, "lingering")) {
    state.equipmentReactions.coverFrames = CONFIG.coverFrames;
  }
}

function addMark(state: GameState, mark: EquipmentTideMark): void {
  const marks = state.equipmentReactions.marks;
  if (marks.length >= CONFIG.maxMarks) marks.shift();
  marks.push(mark);
}

export function recordEquipmentReactionDefeat(state: GameState, target: EquipmentReactionTarget): void {
  if (!canReact(state) || target.hp > 0 || !targetPresent(state, target, state.boss === target)) return;
  const runtime = state.equipmentReactions;
  const mark = runtime.marks.find((entry) => entry.target === target);
  runtime.marks = runtime.marks.filter((entry) => entry.target !== target);
  if (!mark || mark.remaining <= 0 || !hasRule(state, "spread")) return;
  const actors: EquipmentReactionTarget[] = state.boss ? [...state.enemies, state.boss] : state.enemies;
  const candidates = actors.filter((actor) => (
    actor !== target && actor.hp > 0
    && !runtime.marks.some((entry) => entry.target === actor)
    && targetDistance(actor, target) <= CONFIG.spreadRadius
  )).sort((first, second) => targetDistance(first, target) - targetDistance(second, target));
  for (const actor of candidates.slice(0, CONFIG.spreadCount)) {
    addMark(state, { ...mark, target: actor, isBoss: actor === state.boss });
  }
}

function applyFlowMark(
  state: GameState,
  target: EquipmentReactionTarget,
  isBoss: boolean,
  source: SkillHitSource,
  cast: EquipmentReactionCastRecord,
): void {
  if (!hasRule(state, "mark") || cast.reactionTriggered) return;
  const runtime = state.equipmentReactions;
  const mark = runtime.marks.find((entry) => entry.target === target && entry.remaining > 0);
  if (!mark) {
    addMark(state, {
      target, isBoss, remaining: duration(state, CONFIG.markFrames),
      skillId: source.skillId, castId: source.castId,
    });
    return;
  }
  if (mark.skillId === source.skillId || mark.castId === source.castId) return;
  const isSurge = hasRule(state, "gather");
  if (!isSurge && !hasRule(state, "sweep")) return;
  runtime.marks = runtime.marks.filter((entry) => entry !== mark && !(
    isSurge && insideSurge(target, entry.target)
  ));
  cast.reactionTriggered = true;
  spawnReaction(state, isSurge ? "surge" : "sweep", target);
}

export function recordEquipmentReactionHit(
  state: GameState,
  target: EquipmentReactionTarget,
  source: SkillHitSource | undefined,
  appliedDamage: number,
  isBoss: boolean,
): void {
  if (!canReact(state) || appliedDamage <= 0 || !targetPresent(state, target, isBoss)) return;
  const runtime = state.equipmentReactions;
  if (source && source.castId > 0 && (source.equipmentRevision ?? 0) === runtime.revision) {
    const cast = castRecord(state, source);
    if (cast) {
      const appliedNativeControl = !isBoss
        && (source.skillId === SKILL_IDS.vortexControl || source.skillId === SKILL_IDS.verticalWave);
      if (appliedNativeControl) {
        recordEquipmentReactionControl(state, target, isBoss);
      }
      if (hasRule(state, "tideEye")
        && runtime.movementDistance >= CONFIG.movementDistance && !cast.eyeTriggered) {
        runtime.movementDistance = 0;
        cast.eyeTriggered = true;
        spawnReaction(state, "eye", target);
      }
      if (!cast.hitTargets.includes(target) && cast.hitTargets.length < CONFIG.maxMarks) {
        cast.hitTargets.push(target);
        applyFlowMark(state, target, isBoss, source, cast);
      }
      if (hasRule(state, "rupture") && !cast.reactionTriggered
        && (appliedNativeControl || (target.armorBreakTimer ?? 0) > 0
          || runtime.controls.some((record) => record.target === target && record.remaining > 0))) {
        cast.reactionTriggered = true;
        spawnReaction(state, "rupture", target);
      }
    }
  }
  // Secondary damage can transfer an existing mark on death, but never generates new damage.
  recordEquipmentReactionDefeat(state, target);
}

export function recordEquipmentReactionMovement(state: GameState, distance: number): void {
  if (!canReact(state) || !hasRule(state, "tideEye")) return;
  if (!Number.isFinite(distance) || distance === 0) return;
  state.equipmentReactions.movementDistance = Math.min(
    CONFIG.movementDistance, state.equipmentReactions.movementDistance + Math.abs(distance),
  );
}

export function equipmentReactionDamageMultiplier(state: GameState): number {
  return hasRule(state, "lingering") && state.equipmentReactions.coverFrames > 0
    ? CONFIG.coverDamageMultiplier : 1;
}

export function tickEquipmentReactions(state: GameState): void {
  const runtime = state.equipmentReactions;
  if (!canReact(state)) {
    if (runtime.marks.length || runtime.controls.length || runtime.effects.length
      || runtime.castHistory.length || runtime.coverFrames || runtime.movementDistance) {
      resetEquipmentReactions(state);
    }
    return;
  }
  runtime.coverFrames = Math.max(0, runtime.coverFrames - 1);
  runtime.marks = runtime.marks.filter((record) => {
    record.remaining -= 1;
    return record.remaining > 0 && record.target.hp > 0 && targetPresent(state, record.target, record.isBoss);
  });
  runtime.controls = runtime.controls.filter((record) => {
    record.remaining -= 1;
    return record.remaining > 0 && record.target.hp > 0 && targetPresent(state, record.target, record.isBoss);
  });
}
