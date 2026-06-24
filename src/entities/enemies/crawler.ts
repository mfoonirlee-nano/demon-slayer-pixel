import { state } from "../../game/state";
import { playSfx } from "../../game/audio";
import { CRAWLER_SHEET_INDEX, CRAWLER_SHEETS, ENEMY_SHEETS } from "../../constants";
import { drawSheetFrame } from "../../rendering/graphics";
import type { CrawlerPhase, EnemyState } from "../../types/game-state";
import { hitbox } from "../../game/utils";
import { hurtPlayer } from "../player";
import type { EnemyArchetype, EnemySpawnContext } from "./common";
import { drawEnemyFrame, enemyCenterX, enemyDrawScale, enemyFeetY } from "./common";

const CRAWLER_CONFIG = {
  triggerDistance: 104,
  moveBaseSpeed: 1.22,
  moveRandomSpeed: 0.58,
  moveSpeedScaleByElapsed: 0.006,
  lungeBaseSpeed: 2.65,
  lungeSpeedScaleByElapsed: 0.006,
  lungeMaxSpeed: 3.35,
  lungeDamageMultiplier: 1.45,
  lungeDamageBonus: 1,
  windupFrames: 14,
  lungeFrames: 14,
  recoverFrames: 22,
  blockedRetryFrames: 2,
  hpMultiplier: 0.65,
  maxActiveLunges: 2,
  drawScale: 1,
  collisionScaleX: 1.45,
  collisionScaleY: 1.15,
  moveAnimSpeed: 6,
} as const;

const HALF_DIVISOR = 2;
const LUNGE_BOX_WIDTH_SCALE = 1.15;
const LUNGE_BOX_HEIGHT_SCALE = 1.08;
const LUNGE_BOX_REACH = 28;
const LUNGE_BOX_FORWARD_RATIO = 0.45;
const LUNGE_BOX_BACK_RATIO = 0.55;
const LUNGE_WARNING_SFX_PITCH = 0.92;
const LUNGE_START_SFX_PITCH = 0.88;

function isCrawler(enemy: Pick<EnemyState, "sheetIndex">) {
  return enemy.sheetIndex === CRAWLER_SHEET_INDEX;
}

function playerCenterX() {
  return state.player.x + state.player.w / HALF_DIVISOR;
}

function crawlerFacing(enemy: EnemyState, toward: number) {
  if (toward === 0) return enemy.crawlerFacing ?? 1;
  return Math.sign(toward);
}

function crawlerMoveSpeed() {
  return CRAWLER_CONFIG.moveBaseSpeed
    + state.elapsed * CRAWLER_CONFIG.moveSpeedScaleByElapsed
    + Math.random() * CRAWLER_CONFIG.moveRandomSpeed;
}

function crawlerLungeSpeed() {
  return Math.min(
    CRAWLER_CONFIG.lungeMaxSpeed,
    CRAWLER_CONFIG.lungeBaseSpeed + state.elapsed * CRAWLER_CONFIG.lungeSpeedScaleByElapsed,
  );
}

function crawlerActiveLungeCount() {
  let count = 0;
  for (const enemy of state.enemies) {
    if (isCrawler(enemy) && enemy.crawlerPhase === "lunge") count += 1;
  }
  return count;
}

function crawlerSheetForPhase(phase: CrawlerPhase) {
  return CRAWLER_SHEETS[phase] || CRAWLER_SHEETS.move;
}

function crawlerPhaseDuration(phase: CrawlerPhase) {
  if (phase === "windup") return CRAWLER_CONFIG.windupFrames;
  if (phase === "lunge") return CRAWLER_CONFIG.lungeFrames;
  if (phase === "recover") return CRAWLER_CONFIG.recoverFrames;
  return 1;
}

function crawlerPhaseFrame(enemy: EnemyState, phase: CrawlerPhase) {
  const sheet = crawlerSheetForPhase(phase);
  const duration = crawlerPhaseDuration(phase);
  const elapsed = Math.max(0, duration - (enemy.crawlerTimer ?? 0));
  return Math.min(sheet.count - 1, Math.floor(elapsed * sheet.count / duration));
}

function enterCrawlerPhase(enemy: EnemyState, phase: CrawlerPhase) {
  enemy.crawlerPhase = phase;
  enemy.crawlerLungeHit = false;
  if (phase === "windup") {
    enemy.crawlerTimer = CRAWLER_CONFIG.windupFrames;
    playSfx("enemyWarning", LUNGE_WARNING_SFX_PITCH);
  } else if (phase === "lunge") {
    enemy.crawlerTimer = CRAWLER_CONFIG.lungeFrames;
    playSfx("enemyLunge", LUNGE_START_SFX_PITCH);
  } else if (phase === "recover") {
    enemy.crawlerTimer = CRAWLER_CONFIG.recoverFrames;
  } else {
    enemy.crawlerTimer = 0;
  }
}

function crawlerLungeBox(enemy: EnemyState) {
  const facing = enemy.crawlerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const w = Math.round(enemy.w * LUNGE_BOX_WIDTH_SCALE + LUNGE_BOX_REACH);
  const h = Math.round(enemy.h * LUNGE_BOX_HEIGHT_SCALE);
  return {
    x: facing === 1
      ? enemy.x + enemy.w * LUNGE_BOX_FORWARD_RATIO
      : enemy.x + enemy.w * LUNGE_BOX_BACK_RATIO - w,
    y: enemyFeetY(enemy) - h,
    w,
    h,
  };
}

function triggerCrawlerLungeHit(enemy: EnemyState) {
  const box = crawlerLungeBox(enemy);
  if (!hitbox(box, state.player)) return;
  enemy.crawlerLungeHit = true;
  const facing = enemy.crawlerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  hurtPlayer(enemy.damage * CRAWLER_CONFIG.lungeDamageMultiplier + CRAWLER_CONFIG.lungeDamageBonus, facing);
}

function initCrawler(enemy: EnemyState, context: EnemySpawnContext) {
  enemy.crawlerPhase = "move";
  enemy.crawlerTimer = 0;
  enemy.crawlerFacing = -context.side;
  enemy.crawlerBaseSpeed = Math.max(
    CRAWLER_CONFIG.moveBaseSpeed,
    context.speed - state.elapsed * CRAWLER_CONFIG.moveSpeedScaleByElapsed,
  );
  enemy.crawlerLungeHit = false;
}

function updateCrawler(enemy: EnemyState) {
  enemy.crawlerPhase ??= "move";
  enemy.crawlerTimer ??= 0;
  enemy.crawlerFacing ??= enemy.vx >= 0 ? 1 : -1;
  enemy.crawlerBaseSpeed ??= CRAWLER_CONFIG.moveBaseSpeed;
  enemy.crawlerLungeHit ??= false;

  const toward = playerCenterX() - enemyCenterX(enemy);
  const facing = crawlerFacing(enemy, toward);
  const phase = enemy.crawlerPhase;

  if (phase === "move") {
    enemy.crawlerFacing = facing;
    enemy.vx = facing * (
      (enemy.crawlerBaseSpeed ?? CRAWLER_CONFIG.moveBaseSpeed)
      + state.elapsed * CRAWLER_CONFIG.moveSpeedScaleByElapsed
    );
    if (Math.abs(toward) <= CRAWLER_CONFIG.triggerDistance) {
      enterCrawlerPhase(enemy, "windup");
      enemy.vx = 0;
    }
  } else if (phase === "windup") {
    enemy.crawlerTimer -= 1;
    enemy.vx = 0;
    if (enemy.crawlerTimer <= 0) {
      if (crawlerActiveLungeCount() >= CRAWLER_CONFIG.maxActiveLunges) {
        enemy.crawlerTimer = CRAWLER_CONFIG.blockedRetryFrames;
      } else {
        enterCrawlerPhase(enemy, "lunge");
        enemy.vx = (enemy.crawlerFacing ?? facing) * crawlerLungeSpeed();
      }
    }
  } else if (phase === "lunge") {
    enemy.crawlerTimer -= 1;
    enemy.vx = (enemy.crawlerFacing ?? facing) * crawlerLungeSpeed();
    if (!enemy.crawlerLungeHit) triggerCrawlerLungeHit(enemy);
    if (enemy.crawlerTimer <= 0) {
      enterCrawlerPhase(enemy, "recover");
      enemy.vx = 0;
    }
  } else {
    enemy.crawlerTimer -= 1;
    enemy.vx = 0;
    if (enemy.crawlerTimer <= 0) {
      enterCrawlerPhase(enemy, "move");
    }
  }

  enemy.x += enemy.vx;
}

function drawCrawler(enemy: EnemyState) {
  const phase = enemy.crawlerPhase ?? "move";
  const sheet = crawlerSheetForPhase(phase);
  const facing = enemy.crawlerFacing ?? (enemy.vx >= 0 ? 1 : -1);
  const drawScale = enemyDrawScale(CRAWLER_ARCHETYPE);

  if (phase === "move") {
    drawEnemyFrame(enemy, sheet, drawScale, CRAWLER_CONFIG.moveAnimSpeed, state.elapsed, facing);
    return;
  }

  const frame = crawlerPhaseFrame(enemy, phase);
  const drawW = Math.round(sheet.frameW * drawScale);
  const drawH = Math.round(sheet.frameH * drawScale);
  const centerX = enemyCenterX(enemy);
  const feetY = enemyFeetY(enemy);
  drawSheetFrame(sheet, frame, centerX - drawW / HALF_DIVISOR, feetY - drawH, drawW, drawH, facing);
}

export const CRAWLER_ARCHETYPE: EnemyArchetype = {
  speed: crawlerMoveSpeed,
  hpMultiplier: CRAWLER_CONFIG.hpMultiplier,
  drawScale: CRAWLER_CONFIG.drawScale,
  collisionScaleX: CRAWLER_CONFIG.collisionScaleX,
  collisionScaleY: CRAWLER_CONFIG.collisionScaleY,
  init: initCrawler,
  update: updateCrawler,
  draw: drawCrawler,
};

export function isCrawlerSheet(sheetIndex: number) {
  return sheetIndex === CRAWLER_SHEET_INDEX && Boolean(ENEMY_SHEETS[CRAWLER_SHEET_INDEX]);
}
