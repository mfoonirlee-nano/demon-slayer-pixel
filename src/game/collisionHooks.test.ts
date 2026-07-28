import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BASIC_ATTACK,
  CHEST_CONFIG,
  CLOSE_ARC_BASIC_CRESCENT_CONFIG,
  CRYSTAL_CONFIG,
  CRYSTAL_TYPES_BY_KIND,
  FALL_ATTACK,
  GROUND_Y,
  LINE_PROJECTILE_EFFECT_CONFIG,
  SKILL_IDS,
} from "../constants";
import {
  CORE_PLAYER_SKILL_EFFECT_CONFIGS,
  CORE_PLAYER_SKILL_EFFECT_SHEETS,
  lineProjectileEffectSheetForLevel,
} from "../systems/skillCatalog";
import type { PlatformState } from "../types/game-state";
import {
  updateCloseArcBasicCrescentEffects,
  updateCloseArcEffects,
  updateLineProjectileEffects,
} from "../entities/particles/coreSkillEffects";
import {
  armorBreakTravelBox,
  effectBox,
  makeGenericEffect,
  vortexContainment,
} from "../entities/particles/playerSkillShared";
import {
  damageDashRepositionTravel,
} from "../entities/particles/playerSkillSpawn";
import { updatePlayerSkillEffects } from "../entities/particles/playerSkillRuntime";
import { updateChests, updateCrystals } from "../entities/platforms/collectibles";
import { attackBox, triggerAttack, updatePlayer } from "../entities/player";
import { keys } from "./input";
import { resetState, state } from "./state";
import { hitbox, rectsOverlap } from "./utils";

const collisionDebugMock = vi.hoisted(() => ({
  recordCollisionDebugEllipse: vi.fn(),
  recordCollisionDebugRect: vi.fn(),
}));

vi.mock("./collisionDebug", () => collisionDebugMock);

const COUNTER_PADDING = 8;
const GENERIC_EFFECT_X = 120;
const GENERIC_EFFECT_Y = 210;
const GENERIC_EFFECT_PREVIOUS_X = 100;
const GENERIC_EFFECT_PREVIOUS_Y = 200;
const LINE_EFFECT_START_X = 200;
const CLOSE_ARC_EFFECT_START_X = 300;
const CRYSTAL_OFFSET_X = 40;
const CHEST_OFFSET_X = 100;
const DASH_TRAVEL_X = 24;
const DASH_TRAVEL_Y = 6;

function playerAttackRects() {
  return collisionDebugMock.recordCollisionDebugRect.mock.calls
    .filter(([, role]) => role === "playerAttack")
    .map(([rect]) => rect);
}

function pickupRects() {
  return collisionDebugMock.recordCollisionDebugRect.mock.calls
    .filter(([, role]) => role === "pickup")
    .map(([rect]) => rect);
}

describe("collision debug hooks", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
    collisionDebugMock.recordCollisionDebugEllipse.mockClear();
    collisionDebugMock.recordCollisionDebugRect.mockClear();
  });

  it("records both rectangles evaluated by the shared AABB check", () => {
    const first = { x: 10, y: 20, w: 30, h: 40 };
    const second = { x: 25, y: 35, w: 15, h: 10 };

    expect(hitbox(first, second)).toBe(true);
    expect(collisionDebugMock.recordCollisionDebugRect.mock.calls).toEqual([
      [first, "other"],
      [second, "other"],
    ]);
  });

  it("keeps non-gameplay rectangle overlap queries out of the collision overlay", () => {
    const first = { x: 10, y: 20, w: 30, h: 40 };
    const second = { x: 25, y: 35, w: 15, h: 10 };

    expect(rectsOverlap(first, second)).toBe(true);
    expect(collisionDebugMock.recordCollisionDebugRect).not.toHaveBeenCalled();
  });

  it("records basic, fall, and active counter attack rectangles", () => {
    const basicBox = attackBox();
    expect(playerAttackRects()).toContainEqual(basicBox);

    collisionDebugMock.recordCollisionDebugRect.mockClear();
    state.player.x = 240;
    state.player.y = GROUND_Y - state.player.h - 1;
    keys.add("s");
    triggerAttack();
    updatePlayer();
    expect(playerAttackRects()).toContainEqual({
      x: state.player.x + state.player.w / 2 - FALL_ATTACK.radius,
      y: state.player.y + state.player.h - FALL_ATTACK.height,
      w: FALL_ATTACK.radius * 2,
      h: FALL_ATTACK.height,
      damage: (state.player.baseAttack + state.player.attackBonus) * FALL_ATTACK.damageMultiplier,
      color: FALL_ATTACK.color,
    });

    collisionDebugMock.recordCollisionDebugRect.mockClear();
    keys.clear();
    state.guardCounterEffect = {
      elapsed: 0,
      frame: 0,
      hitsRemaining: 1,
      maxHits: 1,
      activeFrames: 30,
      counterPadding: COUNTER_PADDING,
      damageMultiplier: 1,
      barrierFlash: 0,
    };
    updatePlayer();
    expect(playerAttackRects()).toContainEqual({
      x: state.player.x - COUNTER_PADDING,
      y: state.player.y - COUNTER_PADDING,
      w: state.player.w + COUNTER_PADDING * 2,
      h: state.player.h + COUNTER_PADDING * 2,
    });

    expect(basicBox).toMatchObject({
      h: BASIC_ATTACK.height,
      w: BASIC_ATTACK.reach,
    });
  });

  it("records generic effect and swept armor-break geometry", () => {
    const effect = makeGenericEffect(SKILL_IDS.armorBreak, 1, 1, GENERIC_EFFECT_X, GENERIC_EFFECT_Y, {
      w: 80,
      h: 40,
    });

    expect(effectBox(effect)).toEqual({ x: 80, y: 190, w: 80, h: 40 });
    expect(playerAttackRects()).toContainEqual({ x: 80, y: 190, w: 80, h: 40 });

    collisionDebugMock.recordCollisionDebugRect.mockClear();
    expect(armorBreakTravelBox(
      effect,
      GENERIC_EFFECT_PREVIOUS_X,
      GENERIC_EFFECT_PREVIOUS_Y,
    )).toEqual({
      x: 60,
      y: 180,
      w: 100,
      h: 50,
    });
    expect(playerAttackRects()).toEqual([{ x: 60, y: 180, w: 100, h: 50 }]);

    collisionDebugMock.recordCollisionDebugEllipse.mockClear();
    vortexContainment(effect, effect.x, effect.y);
    expect(collisionDebugMock.recordCollisionDebugEllipse).not.toHaveBeenCalled();
  });

  it("does not record generic effects marked as visual-only", () => {
    const effect = makeGenericEffect(SKILL_IDS.armorBreak, 1, 1, GENERIC_EFFECT_X, GENERIC_EFFECT_Y, {
      visualOnly: true,
    });

    effectBox(effect);
    armorBreakTravelBox(
      effect,
      GENERIC_EFFECT_PREVIOUS_X,
      GENERIC_EFFECT_PREVIOUS_Y,
    );
    vortexContainment(effect, effect.x, effect.y);

    expect(collisionDebugMock.recordCollisionDebugRect).not.toHaveBeenCalled();
    expect(collisionDebugMock.recordCollisionDebugEllipse).not.toHaveBeenCalled();
  });

  it("records a vortex ellipse even when there are no collision targets", () => {
    const effect = makeGenericEffect(
      SKILL_IDS.vortexControl,
      1,
      1,
      GENERIC_EFFECT_X,
      GENERIC_EFFECT_Y,
    );
    state.playerSkillEffects.push(effect);

    updatePlayerSkillEffects();

    expect(collisionDebugMock.recordCollisionDebugEllipse).toHaveBeenCalledWith(
      effect.x,
      effect.y,
      effect.w / 2,
      effect.h / 2,
      "playerAttack",
    );
  });

  it("records the swept dash attack even when there are no collision targets", () => {
    const previousX = state.player.x;
    const previousY = state.player.y;
    const nextX = previousX + DASH_TRAVEL_X;
    const nextY = previousY + DASH_TRAVEL_Y;
    state.player.dashReposition = {
      startX: previousX,
      targetX: nextX,
      elapsed: 0,
      duration: 10,
      level: 1,
      damageMultiplier: 1,
      refundGroupId: 1,
      facing: 1,
      hitEnemies: [],
      bossHit: false,
    };

    damageDashRepositionTravel(previousX, previousY, nextX, nextY);

    expect(playerAttackRects()).toEqual([{
      x: previousX,
      y: previousY,
      w: nextX - previousX + state.player.w,
      h: nextY - previousY + state.player.h,
    }]);
  });

  it("records the same core-skill rectangles used for hit checks", () => {
    const lineSheet = lineProjectileEffectSheetForLevel(1);
    const closeArcSheet = CORE_PLAYER_SKILL_EFFECT_SHEETS[SKILL_IDS.closeArc];
    const closeArcConfig = CORE_PLAYER_SKILL_EFFECT_CONFIGS[SKILL_IDS.closeArc];
    state.lineProjectileEffects.push({
      x: LINE_EFFECT_START_X,
      y: 220,
      vx: LINE_PROJECTILE_EFFECT_CONFIG.speed,
      facing: 1,
      frame: 0,
      elapsed: 0,
      drawScale: LINE_PROJECTILE_EFFECT_CONFIG.drawScale,
      effectLevel: 1,
      damageMultiplier: 1,
    });
    state.closeArcEffects.push({
      x: CLOSE_ARC_EFFECT_START_X,
      y: 250,
      vx: closeArcConfig.speed,
      facing: 1,
      frame: 0,
      elapsed: 0,
      traveled: 0,
      drawScale: closeArcConfig.drawScale,
      maxTravel: closeArcConfig.maxTravel,
      damageMultiplier: 1,
    });
    state.closeArcBasicCrescents.push({
      x: 400,
      y: 280,
      w: 90,
      h: 44,
      facing: 1,
      frame: 0,
      elapsed: 0,
      life: 5,
      maxLife: 5,
      drawScale: CLOSE_ARC_BASIC_CRESCENT_CONFIG.drawScale,
      damage: 10,
      hitEnemies: [],
      bossHit: false,
    });

    updateLineProjectileEffects();
    updateCloseArcEffects();
    updateCloseArcBasicCrescentEffects();

    expect(playerAttackRects()).toEqual([
      {
        x: LINE_EFFECT_START_X + LINE_PROJECTILE_EFFECT_CONFIG.speed
          - lineSheet.frameW * LINE_PROJECTILE_EFFECT_CONFIG.drawScale / 2,
        y: 220,
        w: lineSheet.frameW * LINE_PROJECTILE_EFFECT_CONFIG.drawScale,
        h: lineSheet.frameH * LINE_PROJECTILE_EFFECT_CONFIG.drawScale,
      },
      {
        x: CLOSE_ARC_EFFECT_START_X + closeArcConfig.speed
          - closeArcSheet.frameW * closeArcConfig.drawScale / 2,
        y: 250,
        w: closeArcSheet.frameW * closeArcConfig.drawScale,
        h: closeArcSheet.frameH * closeArcConfig.drawScale,
      },
      { x: 355, y: 258, w: 90, h: 44 },
    ]);
  });

  it("records crystal and chest pickup rectangles", () => {
    const platform = {
      x: 300,
      y: 400,
      baseY: 400,
      w: 180,
      h: 20,
      vx: 0,
      phase: 0,
      style: "stone",
      kind: "normal",
      spriteIndex: 0,
      spriteAct: null,
      trim: 0,
      notch: 0,
      hoverAmplitude: 0,
    } satisfies PlatformState;
    state.platforms.push(platform);
    state.crystals.push({
      platform,
      offsetX: CRYSTAL_OFFSET_X,
      type: CRYSTAL_TYPES_BY_KIND.attack,
      size: CRYSTAL_CONFIG.size,
      phase: 0,
    });
    state.chests.push({
      platform,
      offsetX: CHEST_OFFSET_X,
      phase: 0,
      collected: false,
    });

    updateCrystals(0);
    updateChests(0);

    expect(pickupRects()).toEqual([
      {
        x: platform.x + CRYSTAL_OFFSET_X - CRYSTAL_CONFIG.size / 2,
        y: platform.y - CRYSTAL_CONFIG.floatYOffset - CRYSTAL_CONFIG.size / 2,
        w: CRYSTAL_CONFIG.size,
        h: CRYSTAL_CONFIG.size,
      },
      {
        x: platform.x + CHEST_OFFSET_X - CHEST_CONFIG.size / 2,
        y: platform.y - CHEST_CONFIG.floatYOffset - CHEST_CONFIG.size / 2,
        w: CHEST_CONFIG.size,
        h: CHEST_CONFIG.size,
      },
    ]);
  });
});
