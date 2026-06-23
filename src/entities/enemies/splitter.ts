import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import {
  ENEMY_CONFIG,
  ENEMY_DRAW_SCALE,
  SPLITTER_SHEET_INDEX,
  SPLITTER_SHEETS,
} from "../../constants";
import type { EnemyState, SplitterPhase } from "../../types/game-state";
import { frameIndex, hitbox } from "../../game/utils";
import type { EnemyArchetype, EnemyDefeatContext, EnemySpawnContext } from "./common";
import { enemyBaseHp, enemyCenterX, enemyFeetY } from "./common";

const SPLITTER_CONFIG = {
  parentBaseSpeed: 0.48,
  parentRandomSpeed: 0.24,
  parentSpeedScaleByElapsed: 0.004,
  parentHpMultiplier: 1.75,
  maxActiveParents: 2,
  parentDrawScale: 1.04,
  parentCollisionScaleX: 1.08,
  parentCollisionScaleY: 1.02,
  moveAnimSpeed: 8,
  attackFrames: 18,
  hitFrames: 12,
  hitMoveScale: 0.35,
  splitFrames: 32,
  childBaseSpeed: 1.28,
  childRandomSpeed: 0.26,
  childSpeedScaleByElapsed: 0.006,
  childHpMultiplier: 0.4,
  childDamageScale: 0.65,
  childDrawScale: 0.9,
  childW: 38,
  childH: 48,
  childSpawnOffset: 28,
  childSpawnVelocityScale: 0.55,
  childBirthFrames: 8,
  childMoveAnimSpeed: 5,
  birthAlphaBase: 0.46,
} as const;

function isSplitter(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === SPLITTER_SHEET_INDEX;
}

function isSplitterParent(enemy: Pick<EnemyState, "sheetIndex" | "splitterVariant">) {
  return isSplitter(enemy) && enemy.splitterVariant !== "child";
}

function playerCenterX() {
  return state.player.x + state.player.w / 2;
}

function splitterFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.splitterFacing ?? 1;
  return Math.sign(toward);
}

function splitterParentSpeed() {
  return SPLITTER_CONFIG.parentBaseSpeed
    + state.elapsed * SPLITTER_CONFIG.parentSpeedScaleByElapsed
    + Math.random() * SPLITTER_CONFIG.parentRandomSpeed;
}

function splitlingSpeed() {
  return SPLITTER_CONFIG.childBaseSpeed
    + state.elapsed * SPLITTER_CONFIG.childSpeedScaleByElapsed
    + Math.random() * SPLITTER_CONFIG.childRandomSpeed;
}

export function splitterParentActiveCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isSplitterParent(enemy)) count += 1;
  }
  return count;
}

export function canSpawnSplitter() {
  return splitterParentActiveCount() < SPLITTER_CONFIG.maxActiveParents;
}

export function isSplitterSheet(sheetIndex: number) {
  return sheetIndex === SPLITTER_SHEET_INDEX;
}

function initSplitter(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.splitterVariant = "parent";
  enemy.splitterPhase = "move";
  enemy.splitterTimer = 0;
  enemy.splitterFacing = -context.side;
  enemy.splitterBaseSpeed = context.speed;
  enemy.splitterHasSplit = false;
}

function enterSplitterSplit(enemy: EnemyState) {
  enemy.hp = 0;
  enemy.vx = 0;
  enemy.hitCd = Math.max(enemy.hitCd, SPLITTER_CONFIG.splitFrames);
  enemy.splitterPhase = "split";
  enemy.splitterTimer = SPLITTER_CONFIG.splitFrames;
  enemy.splitterHasSplit = false;
  playSfx("enemySplit");
}

function createSplitling(parent: EnemyState, offset: number): EnemyState {
  const speed = splitlingSpeed();
  const facing = offset < 0 ? -1 : 1;
  const feetY = enemyFeetY(parent);
  return {
    id: "splitter",
    spawnSource: parent.spawnSource,
    spawnCost: 0.5,
    aiState: "spawn",
    aiTimer: 0,
    x: enemyCenterX(parent) + offset - SPLITTER_CONFIG.childW / 2,
    y: feetY - SPLITTER_CONFIG.childH,
    w: SPLITTER_CONFIG.childW,
    h: SPLITTER_CONFIG.childH,
    vx: facing * speed * SPLITTER_CONFIG.childSpawnVelocityScale,
    hp: enemyBaseHp(state.elapsed) * SPLITTER_CONFIG.childHpMultiplier,
    damage: parent.damage * SPLITTER_CONFIG.childDamageScale,
    hitCd: 0,
    animSeed: Math.floor(Math.random() * ENEMY_CONFIG.animSeedMax),
    sheetIndex: SPLITTER_SHEET_INDEX,
    splitterPhase: "birth",
    splitterTimer: SPLITTER_CONFIG.childBirthFrames,
    splitterFacing: parent.splitterFacing ?? facing,
    splitterBaseSpeed: speed,
    splitterVariant: "child",
    splitterHasSplit: true,
  };
}

function spawnSplitlings(parent: EnemyState) {
  state.enemies.push(createSplitling(parent, -SPLITTER_CONFIG.childSpawnOffset));
  state.enemies.push(createSplitling(parent, SPLITTER_CONFIG.childSpawnOffset));
  playSfx("enemyBirth");
}

function updateSplitterParentMove(enemy: EnemyState) {
  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = splitterFacing(enemy, toward);
  enemy.splitterFacing = facing;
  enemy.vx = facing * (enemy.splitterBaseSpeed ?? SPLITTER_CONFIG.parentBaseSpeed);
  enemy.x += enemy.vx;
  if (hitbox(state.player, enemy)) {
    enemy.vx = 0;
    enemy.splitterPhase = "attack";
    enemy.splitterTimer = SPLITTER_CONFIG.attackFrames;
  }
}

function updateSplitterAttack(enemy: EnemyState) {
  enemy.splitterTimer = (enemy.splitterTimer ?? 0) - 1;
  enemy.vx = 0;
  if (enemy.splitterTimer <= 0) {
    enemy.splitterPhase = "move";
  }
}

function updateSplitterHit(enemy: EnemyState) {
  enemy.splitterTimer = (enemy.splitterTimer ?? 0) - 1;
  enemy.x += enemy.vx * SPLITTER_CONFIG.hitMoveScale;
  if (enemy.splitterTimer <= 0) {
    enemy.splitterPhase = "move";
  }
}

function updateSplitterSplit(enemy: EnemyState) {
  if (enemy.splitterHasSplit) {
    enemy.splitterTimer = (enemy.splitterTimer ?? 0) - 1;
    return;
  }

  enemy.vx = 0;
  enemy.splitterTimer = (enemy.splitterTimer ?? 0) - 1;
  if (enemy.splitterTimer <= 0) {
    spawnSplitlings(enemy);
    enemy.splitterHasSplit = true;
    enemy.splitterTimer = 1;
  }
}

function updateSplitling(enemy: EnemyState) {
  enemy.splitterPhase ??= "birth";
  enemy.splitterTimer ??= SPLITTER_CONFIG.childBirthFrames;
  enemy.splitterBaseSpeed ??= splitlingSpeed();

  if (enemy.splitterPhase === "birth") {
    enemy.vx *= 0.85;
    enemy.x += enemy.vx;
    enemy.splitterTimer -= 1;
    if (enemy.splitterTimer < 0) {
      enemy.splitterPhase = "move";
    }
    return;
  }

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = splitterFacing(enemy, toward);
  enemy.splitterFacing = facing;
  enemy.vx = facing * (enemy.splitterBaseSpeed ?? SPLITTER_CONFIG.childBaseSpeed);
  enemy.x += enemy.vx;
}

function updateSplitter(enemy: EnemyState) {
  enemy.splitterVariant ??= "parent";
  enemy.splitterPhase ??= "move";
  enemy.splitterTimer ??= 0;
  enemy.splitterFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.splitterBaseSpeed ??= SPLITTER_CONFIG.parentBaseSpeed;
  enemy.splitterHasSplit ??= false;

  if (enemy.splitterVariant === "child") {
    updateSplitling(enemy);
    return;
  }

  if (enemy.splitterPhase === "split") {
    updateSplitterSplit(enemy);
    return;
  }

  if (enemy.splitterPhase === "hit") {
    updateSplitterHit(enemy);
    return;
  }

  if (enemy.hitCd > 0) {
    enemy.splitterPhase = "hit";
    enemy.splitterTimer = SPLITTER_CONFIG.hitFrames;
    updateSplitterHit(enemy);
    return;
  }

  if (enemy.splitterPhase === "attack") {
    updateSplitterAttack(enemy);
    return;
  }

  updateSplitterParentMove(enemy);
}

function phaseFrame(sheetCount: number, total: number, remaining: number) {
  const elapsed = Math.max(0, total - remaining);
  return Math.min(sheetCount - 1, Math.floor(elapsed * sheetCount / Math.max(1, total)));
}

function splitterSheetFor(enemy: EnemyState) {
  if (enemy.splitterVariant === "child") {
    return enemy.splitterPhase === "birth"
      ? SPLITTER_SHEETS.birth
      : SPLITTER_SHEETS.splitlingMove;
  }

  const phase = (enemy.splitterPhase ?? "move") as SplitterPhase;
  return SPLITTER_SHEETS[phase] || SPLITTER_SHEETS.move;
}

function splitterFrame(enemy: EnemyState) {
  const phase = enemy.splitterPhase ?? "move";
  const sheet = splitterSheetFor(enemy);
  if (phase === "hit") {
    return phaseFrame(sheet.count, SPLITTER_CONFIG.hitFrames, enemy.splitterTimer ?? 0);
  }
  if (phase === "attack") {
    return phaseFrame(sheet.count, SPLITTER_CONFIG.attackFrames, enemy.splitterTimer ?? 0);
  }
  if (phase === "split") {
    return phaseFrame(sheet.count, SPLITTER_CONFIG.splitFrames, enemy.splitterTimer ?? 0);
  }
  if (phase === "birth") {
    return phaseFrame(sheet.count, SPLITTER_CONFIG.childBirthFrames, enemy.splitterTimer ?? 0);
  }
  return frameIndex(
    sheet.count,
    enemy.splitterVariant === "child"
      ? SPLITTER_CONFIG.childMoveAnimSpeed
      : SPLITTER_CONFIG.moveAnimSpeed,
    state.elapsed,
    enemy.animSeed,
  );
}

function splitterAlpha(enemy: EnemyState) {
  if (enemy.splitterPhase !== "birth") return 1;
  const remaining = Math.max(0, enemy.splitterTimer ?? 0);
  const elapsed = SPLITTER_CONFIG.childBirthFrames - remaining;
  return Math.min(
    1,
    SPLITTER_CONFIG.birthAlphaBase
      + (elapsed / SPLITTER_CONFIG.childBirthFrames) * (1 - SPLITTER_CONFIG.birthAlphaBase),
  );
}

function drawSplitter(enemy: EnemyState) {
  const sheet = splitterSheetFor(enemy);
  const drawScale = ENEMY_DRAW_SCALE * (
    enemy.splitterVariant === "child"
      ? SPLITTER_CONFIG.childDrawScale
      : SPLITTER_CONFIG.parentDrawScale
  );
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const drawX = enemyCenterX(enemy) - drawW / 2;
  const drawY = enemyFeetY(enemy) - drawH;
  const alpha = splitterAlpha(enemy);

  if (ctx && alpha < 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    drawSheetFrame(sheet, splitterFrame(enemy), drawX, drawY, drawW, drawH, enemy.splitterFacing ?? 1);
    ctx.restore();
    return;
  }

  drawSheetFrame(sheet, splitterFrame(enemy), drawX, drawY, drawW, drawH, enemy.splitterFacing ?? 1);
}

function handleSplitterDefeated(enemy: EnemyState, context: EnemyDefeatContext) {
  if (!isSplitterParent(enemy)) return false;
  if (enemy.splitterPhase === "split") return true;

  context.applyReward();
  enterSplitterSplit(enemy);
  return true;
}

function splitterContactDamageDisabled(enemy: EnemyState) {
  return enemy.splitterPhase === "split" || enemy.splitterPhase === "birth";
}

function shouldRemoveSplitter(enemy: EnemyState) {
  return isSplitterParent(enemy)
    && enemy.splitterPhase === "split"
    && enemy.splitterHasSplit === true
    && (enemy.splitterTimer ?? 0) <= 0;
}

export const SPLITTER_ARCHETYPE: EnemyArchetype = {
  speed: splitterParentSpeed,
  hpMultiplier: SPLITTER_CONFIG.parentHpMultiplier,
  drawScale: SPLITTER_CONFIG.parentDrawScale,
  collisionScaleX: SPLITTER_CONFIG.parentCollisionScaleX,
  collisionScaleY: SPLITTER_CONFIG.parentCollisionScaleY,
  init: initSplitter,
  update: updateSplitter,
  draw: drawSplitter,
  onDefeated: handleSplitterDefeated,
  contactDamageDisabled: splitterContactDamageDisabled,
  shouldRemove: shouldRemoveSplitter,
};
