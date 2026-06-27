import {
  GROUND_Y,
  SPIDER_STRING_CAGE_CONFIG,
  SPIDER_STRING_ULTIMATE_WEB_SHEET,
  WIDTH,
} from "../../constants";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type { SpiderStringCageSegmentKind, SpiderStringCageState } from "../../types/game-state";
import { hurtPlayer } from "../player";
import { bossArchetypeForId } from "./registry";
import type { LiveBoss } from "./types";

const SEGMENT_KINDS: readonly SpiderStringCageSegmentKind[] = ["ground", "air", "mixed"];
const WARNING_ALPHA_BASE_RATIO = 0.45;
const WARNING_ALPHA_GROWTH_RATIO = 0.55;

export function spawnSpiderStringCageEffect(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  const damage = (archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase)
    * SPIDER_STRING_CAGE_CONFIG.damageMultiplier;

  state.spiderStringCages.length = 0;
  state.spiderStringCages.push(createCageSegment(0, null, damage));
}

export function updateSpiderStringCageEffects() {
  for (let i = state.spiderStringCages.length - 1; i >= 0; i -= 1) {
    const cage = state.spiderStringCages[i];
    cage.frame = Math.min(
      SPIDER_STRING_ULTIMATE_WEB_SHEET.count - 1,
      Math.floor(cage.elapsed / SPIDER_STRING_CAGE_CONFIG.webFrameDuration),
    );

    if (isCageHitWindow(cage) && !cage.hitPlayer && isPlayerInSpiderStringCageDanger(cage)) {
      cage.hitPlayer = true;
      const hpBefore = state.player.hp;
      const playerFootX = state.player.x + state.player.w / 2;
      const sourceVx = playerFootX < WIDTH / 2 ? -1 : 1;
      hurtPlayer(cage.damage, sourceVx);
      if (state.player.hp < hpBefore) {
        state.player.spiderSilkSlowTimer = Math.max(
          state.player.spiderSilkSlowTimer,
          SPIDER_STRING_CAGE_CONFIG.slowFrames,
        );
      }
    }

    cage.elapsed += 1;
    const segmentFrames = cage.warningFrames + cage.hitFrames + cage.afterFrames;
    if (cage.elapsed < segmentFrames) continue;

    if (cage.segmentIndex + 1 >= SPIDER_STRING_CAGE_CONFIG.segmentCount) {
      state.spiderStringCages.splice(i, 1);
      continue;
    }

    const next = createCageSegment(cage.segmentIndex + 1, cage.safeColumn, cage.damage);
    state.spiderStringCages[i] = next;
  }
}

export function drawSpiderStringCageEffects() {
  if (!ctx || !SPIDER_STRING_ULTIMATE_WEB_SHEET.image) return;

  for (const cage of state.spiderStringCages) {
    const alpha = cageAlpha(cage);
    if (alpha <= 0) continue;

    ctx.save();
    ctx.globalAlpha = alpha;
    for (let column = 0; column < cage.columns; column += 1) {
      if (column === cage.safeColumn) continue;
      drawCageColumn(cage, column);
    }
    ctx.restore();
  }
}

export function isPlayerInSpiderStringCageDanger(cage: SpiderStringCageState) {
  const footX = state.player.x + state.player.w / 2;
  const footY = state.player.y + state.player.h;
  if (!isDangerColumn(cage, footX)) return false;

  const inGroundBand = footY >= GROUND_Y - SPIDER_STRING_CAGE_CONFIG.groundBandTopOffset
    && footY <= GROUND_Y + SPIDER_STRING_CAGE_CONFIG.groundBandBottomOffset;
  const inAirBand = footY >= GROUND_Y - SPIDER_STRING_CAGE_CONFIG.airBandTopOffset
    && footY <= GROUND_Y - SPIDER_STRING_CAGE_CONFIG.airBandBottomOffset;

  if (cage.kind === "ground") return inGroundBand;
  if (cage.kind === "air") return inAirBand;
  return inGroundBand || inAirBand;
}

function createCageSegment(
  segmentIndex: number,
  previousSafeColumn: number | null,
  damage: number,
): SpiderStringCageState {
  const warningFrames = segmentIndex === 0
    ? SPIDER_STRING_CAGE_CONFIG.firstWarningFrames
    : SPIDER_STRING_CAGE_CONFIG.warningFrames;
  const afterFrames = segmentIndex + 1 >= SPIDER_STRING_CAGE_CONFIG.segmentCount
    ? SPIDER_STRING_CAGE_CONFIG.recoveryFrames
    : SPIDER_STRING_CAGE_CONFIG.gapFrames;

  return {
    segmentIndex,
    safeColumn: chooseSafeColumn(previousSafeColumn),
    previousSafeColumn,
    columns: SPIDER_STRING_CAGE_CONFIG.columns,
    elapsed: 0,
    warningFrames,
    hitFrames: SPIDER_STRING_CAGE_CONFIG.hitFrames,
    afterFrames,
    frame: 0,
    damage,
    hitPlayer: false,
    kind: SEGMENT_KINDS[segmentIndex] ?? "mixed",
  };
}

function chooseSafeColumn(previousSafeColumn: number | null) {
  const playerColumn = playerColumnIndex();
  if (previousSafeColumn === null || playerColumn !== previousSafeColumn) return playerColumn;

  const right = playerColumn + 1;
  if (right < SPIDER_STRING_CAGE_CONFIG.columns) return right;
  return playerColumn - 1;
}

function playerColumnIndex() {
  const footX = state.player.x + state.player.w / 2;
  const columnW = WIDTH / SPIDER_STRING_CAGE_CONFIG.columns;
  return clamp(Math.floor(footX / columnW), 0, SPIDER_STRING_CAGE_CONFIG.columns - 1);
}

function isDangerColumn(cage: SpiderStringCageState, footX: number) {
  const columnW = WIDTH / cage.columns;
  const safeLeft = cage.safeColumn * columnW + SPIDER_STRING_CAGE_CONFIG.safePaddingX;
  const safeRight = (cage.safeColumn + 1) * columnW - SPIDER_STRING_CAGE_CONFIG.safePaddingX;
  return footX < safeLeft || footX > safeRight;
}

function isCageHitWindow(cage: SpiderStringCageState) {
  return cage.elapsed >= cage.warningFrames
    && cage.elapsed < cage.warningFrames + cage.hitFrames;
}

function cageAlpha(cage: SpiderStringCageState) {
  if (cage.elapsed < cage.warningFrames) {
    const t = cage.elapsed / cage.warningFrames;
    return SPIDER_STRING_CAGE_CONFIG.warningAlpha
      * (WARNING_ALPHA_BASE_RATIO + t * WARNING_ALPHA_GROWTH_RATIO);
  }
  if (isCageHitWindow(cage)) return SPIDER_STRING_CAGE_CONFIG.activeAlpha;

  const elapsedAfterHit = cage.elapsed - cage.warningFrames - cage.hitFrames;
  const fadeT = cage.afterFrames <= 0 ? 1 : elapsedAfterHit / cage.afterFrames;
  return SPIDER_STRING_CAGE_CONFIG.fadeAlpha * (1 - clamp(fadeT, 0, 1));
}

function drawCageColumn(cage: SpiderStringCageState, column: number) {
  const columnW = WIDTH / cage.columns;
  const x = column * columnW + columnW / 2 - SPIDER_STRING_CAGE_CONFIG.webDrawW / 2;

  if (cage.kind === "ground" || cage.kind === "mixed") {
    drawSheetFrame(
      SPIDER_STRING_ULTIMATE_WEB_SHEET,
      cage.frame,
      x,
      GROUND_Y - SPIDER_STRING_CAGE_CONFIG.webDrawH + SPIDER_STRING_CAGE_CONFIG.groundDrawYOffset,
      SPIDER_STRING_CAGE_CONFIG.webDrawW,
      SPIDER_STRING_CAGE_CONFIG.webDrawH,
    );
  }

  if (cage.kind === "air" || cage.kind === "mixed") {
    drawSheetFrame(
      SPIDER_STRING_ULTIMATE_WEB_SHEET,
      cage.frame,
      x,
      GROUND_Y - SPIDER_STRING_CAGE_CONFIG.webDrawH - SPIDER_STRING_CAGE_CONFIG.airDrawYOffset,
      SPIDER_STRING_CAGE_CONFIG.webDrawW,
      SPIDER_STRING_CAGE_CONFIG.webDrawH,
    );
  }
}
