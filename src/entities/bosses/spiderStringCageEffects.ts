import {
  GROUND_Y,
  SPIDER_STRING_CAGE_CONFIG,
  SPIDER_STRING_ULTIMATE_WEB_SHEET,
  WIDTH,
} from "../../constants";
import {
  recordCollisionDebugPoint,
  recordCollisionDebugRect,
} from "../../game/collisionDebug";
import { state } from "../../game/state";
import { clamp } from "../../game/utils";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";
import type { SpiderStringCageSegmentKind, SpiderStringCageState } from "../../types/game-state";
import { hurtPlayer } from "../player";
import { bossArchetypeForId } from "./registry";
import { bossAttackDamage } from "./shared";
import type { LiveBoss } from "./types";

const SEGMENT_KINDS: readonly SpiderStringCageSegmentKind[] = ["ground", "air", "mixed"];
const WARNING_ALPHA_BASE_RATIO = 0.45;
const WARNING_ALPHA_GROWTH_RATIO = 0.55;
const WEB_WARNING_FRAME_COUNT = 2;
const WEB_FADE_FRAME = SPIDER_STRING_ULTIMATE_WEB_SHEET.count - 1;
const WEB_HIT_FRAME_COUNT = WEB_FADE_FRAME - WEB_WARNING_FRAME_COUNT;
const WEB_SPAN_EDGE_COUNT = 2;

export function spawnSpiderStringCageEffect(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  const damage = bossAttackDamage(
    (archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase)
      * SPIDER_STRING_CAGE_CONFIG.damageMultiplier,
  );

  state.spiderStringCages.length = 0;
  state.spiderStringCages.push(createCageSegment(0, null, damage));
}

export function updateSpiderStringCageEffects() {
  for (let i = state.spiderStringCages.length - 1; i >= 0; i -= 1) {
    const cage = state.spiderStringCages[i];
    cage.frame = cageWebFrame(cage);

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
    if (cage.kind === "ground" || cage.kind === "mixed") {
      drawCageBand(
        cage,
        GROUND_Y
          - SPIDER_STRING_CAGE_CONFIG.webDrawH
          + SPIDER_STRING_CAGE_CONFIG.groundDrawYOffset,
      );
    }
    if (cage.kind === "air" || cage.kind === "mixed") {
      drawCageBand(
        cage,
        GROUND_Y
          - SPIDER_STRING_CAGE_CONFIG.webDrawH
          - SPIDER_STRING_CAGE_CONFIG.airDrawYOffset,
      );
    }
    ctx.restore();
  }
}

export function isPlayerInSpiderStringCageDanger(cage: SpiderStringCageState) {
  const footX = state.player.x + state.player.w / 2;
  const footY = state.player.y + state.player.h;
  const bounds = cageDangerBounds(cage);
  const groundBand = {
    y: GROUND_Y - SPIDER_STRING_CAGE_CONFIG.groundBandTopOffset,
    h: SPIDER_STRING_CAGE_CONFIG.groundBandTopOffset
      + SPIDER_STRING_CAGE_CONFIG.groundBandBottomOffset,
  };
  const airBand = {
    y: GROUND_Y - SPIDER_STRING_CAGE_CONFIG.airBandTopOffset,
    h: SPIDER_STRING_CAGE_CONFIG.airBandTopOffset
      - SPIDER_STRING_CAGE_CONFIG.airBandBottomOffset,
  };
  recordCageDanger(cage, bounds, groundBand, airBand);
  recordCollisionDebugPoint(footX, footY, "enemyAttack");
  if (!isDangerColumn(bounds, footX)) return false;

  const inGroundBand = footY >= groundBand.y
    && footY <= groundBand.y + groundBand.h;
  const inAirBand = footY >= airBand.y
    && footY <= airBand.y + airBand.h;

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

function cageDangerBounds(cage: SpiderStringCageState) {
  const columnW = WIDTH / cage.columns;
  const safeLeft = cage.safeColumn * columnW + SPIDER_STRING_CAGE_CONFIG.safePaddingX;
  const safeRight = (cage.safeColumn + 1) * columnW - SPIDER_STRING_CAGE_CONFIG.safePaddingX;
  return { safeLeft, safeRight };
}

function isDangerColumn(
  { safeLeft, safeRight }: ReturnType<typeof cageDangerBounds>,
  footX: number,
) {
  return footX < safeLeft || footX > safeRight;
}

function recordCageDanger(
  cage: SpiderStringCageState,
  { safeLeft, safeRight }: ReturnType<typeof cageDangerBounds>,
  groundBand: { y: number; h: number },
  airBand: { y: number; h: number },
) {
  const bands = cage.kind === "ground"
    ? [groundBand]
    : cage.kind === "air"
      ? [airBand]
      : [groundBand, airBand];
  for (const band of bands) {
    recordCollisionDebugRect(
      { x: 0, y: band.y, w: safeLeft, h: band.h },
      "enemyAttack",
    );
    recordCollisionDebugRect(
      { x: safeRight, y: band.y, w: WIDTH - safeRight, h: band.h },
      "enemyAttack",
    );
  }
}

function isCageHitWindow(cage: SpiderStringCageState) {
  return cage.elapsed >= cage.warningFrames
    && cage.elapsed < cage.warningFrames + cage.hitFrames;
}

function cageWebFrame(cage: SpiderStringCageState) {
  if (cage.elapsed < cage.warningFrames) {
    return Math.floor(cage.elapsed / SPIDER_STRING_CAGE_CONFIG.webFrameDuration)
      % WEB_WARNING_FRAME_COUNT;
  }

  const hitElapsed = cage.elapsed - cage.warningFrames;
  if (hitElapsed >= cage.hitFrames) return WEB_FADE_FRAME;
  return WEB_WARNING_FRAME_COUNT + Math.min(
    WEB_HIT_FRAME_COUNT - 1,
    Math.floor(hitElapsed * WEB_HIT_FRAME_COUNT / cage.hitFrames),
  );
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

function drawCageBand(cage: SpiderStringCageState, y: number) {
  const columnW = WIDTH / cage.columns;
  const { safeLeft, safeRight } = cageDangerBounds(cage);

  drawCageSpan(cage, 0, safeLeft, columnW, y, 1);
  drawCageSpan(cage, safeRight, WIDTH, columnW, y, -1);
}

function drawCageSpan(
  cage: SpiderStringCageState,
  startX: number,
  endX: number,
  columnW: number,
  y: number,
  facing: number,
) {
  if (!ctx) return;
  const spanW = endX - startX;
  const visualSpanW = spanW
    + SPIDER_STRING_CAGE_CONFIG.safePaddingX * WEB_SPAN_EDGE_COUNT;
  const drawW = SPIDER_STRING_CAGE_CONFIG.webDrawW * visualSpanW / columnW;
  const centerX = (startX + endX) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(startX, y, spanW, SPIDER_STRING_CAGE_CONFIG.webDrawH);
  ctx.clip();
  drawSheetFrame(
    SPIDER_STRING_ULTIMATE_WEB_SHEET,
    cage.frame,
    centerX - drawW / 2,
    y,
    drawW,
    SPIDER_STRING_CAGE_CONFIG.webDrawH,
    facing,
  );
  ctx.restore();
}
