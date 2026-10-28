import { PLAYER_ANIMATION_STATES } from "../ids";
import type {
  PlayerAnimationState,
  PlayerSheet,
  SpriteSheet,
} from "../../types/assets";

type PlayerAttachedEffectSheet = SpriteSheet & {
  drawW: number;
  drawH: number;
  anchorX: number;
  anchorY: number;
  channelFrameCount: number;
};

export const RESIDUAL_SPIRIT_HEAL_EFFECT_SHEET: PlayerAttachedEffectSheet = {
  src: "assets/sprites/player/residual_spirit_heal_effect.png",
  frameW: 240,
  frameH: 240,
  count: 8,
  image: null,
  drawW: 154,
  drawH: 154,
  anchorX: 0.5,
  anchorY: 0.942,
  channelFrameCount: 5,
};

const BASIC_ATTACK_SHEET_LAYOUT = {
  frameW: 768,
  frameH: 480,
  count: 8,
  drawW: 227,
  drawH: 142,
  animSpeed: 3,
  anchorY: 0.979,
} as const;
const PLAYER_BODY_LAYOUT = {
  frameW: 768,
  frameH: 512,
  sourceDensity: 3.2,
  feetX: 320,
  feetY: 450,
  // Preserve the shared visible sole position, 3.75 canvas pixels above refY.
  baselineInsetY: 12,
  bodyX: 192,
  bodyY: 110,
  bodyW: 256,
  bodyH: 340,
} as const;
const FALL_ATTACK_LAYOUT = { frameH: 640, feetY: 510 } as const;

function playerBodyLayout(
  frameH: number = PLAYER_BODY_LAYOUT.frameH,
  feetY: number = PLAYER_BODY_LAYOUT.feetY,
) {
  const layout = PLAYER_BODY_LAYOUT;
  return {
    frameW: layout.frameW,
    frameH,
    drawW: layout.frameW / layout.sourceDensity,
    drawH: frameH / layout.sourceDensity,
    anchorX: layout.feetX / layout.frameW,
    anchorY: (feetY + layout.baselineInsetY) / frameH,
    // The plunge canvas extends below the boots; effects attach to the body.
    attachmentBounds: {
      x: layout.bodyX, y: layout.bodyY + feetY - layout.feetY,
      w: layout.bodyW, h: layout.bodyH,
    },
  };
}

export const PLAYER_SHEETS: Record<PlayerAnimationState, PlayerSheet> = {
  [PLAYER_ANIMATION_STATES.idle]: {
    ...playerBodyLayout(),
    src: "assets/sprites/player/player_idle.png",
    count: 8,
    image: null,
    animSpeed: 8,
  },
  [PLAYER_ANIMATION_STATES.run]: {
    ...playerBodyLayout(),
    src: "assets/sprites/player/player_run.png",
    count: 8,
    image: null,
    animSpeed: 4,
  },
  [PLAYER_ANIMATION_STATES.jump]: {
    ...playerBodyLayout(),
    src: "assets/sprites/player/player_jump.png",
    count: 6,
    image: null,
    animSpeed: 7,
  },
  [PLAYER_ANIMATION_STATES.attack]: {
    ...playerBodyLayout(),
    src: "assets/sprites/player/player_attack.png",
    image: null,
    count: 16,
    animSpeed: 3,
  },
  [PLAYER_ANIMATION_STATES.movingAttack]: {
    ...playerBodyLayout(),
    src: "assets/sprites/player/player_moving_attack.png",
    image: null,
    count: 12,
    animSpeed: 3,
  },
  [PLAYER_ANIMATION_STATES.fallAttack]: {
    ...playerBodyLayout(FALL_ATTACK_LAYOUT.frameH, FALL_ATTACK_LAYOUT.feetY),
    src: "assets/sprites/player/player_fall_attack.png",
    count: 8,
    image: null,
    animSpeed: 4,
  },
};

// Moon Tide bitmaps have independent slicing and anchors; normal art may expand.
const MOON_TIDE_SOURCE_LAYOUTS = {
  idle: { frameW: 384, frameH: 480, count: 8, animSpeed: 8, anchorY: 0.979 },
  run: { frameW: 448, frameH: 420, count: 8, animSpeed: 4, anchorY: 0.976 },
  jump: { frameW: 448, frameH: 420, count: 6, animSpeed: 7, anchorY: 0.971 },
  attack: BASIC_ATTACK_SHEET_LAYOUT,
  movingAttack: BASIC_ATTACK_SHEET_LAYOUT,
  fallAttack: { frameW: 640, frameH: 560, count: 8, animSpeed: 4, anchorY: 0.982 },
} as const;

function moonTideSheet(
  state: PlayerAnimationState,
  src: string,
): PlayerSheet {
  return {
    ...MOON_TIDE_SOURCE_LAYOUTS[state],
    src,
    image: null,
    ...MOON_TIDE_DRAW_SIZES[state],
  };
}

const MOON_TIDE_DRAW_SIZES: Record<
  PlayerAnimationState,
  Pick<PlayerSheet, "drawW" | "drawH">
> = {
  [PLAYER_ANIMATION_STATES.idle]: { drawW: 128, drawH: 160 },
  [PLAYER_ANIMATION_STATES.run]: { drawW: 169, drawH: 158 },
  [PLAYER_ANIMATION_STATES.jump]: { drawW: 192, drawH: 180 },
  [PLAYER_ANIMATION_STATES.attack]: { drawW: 261, drawH: 163 },
  [PLAYER_ANIMATION_STATES.movingAttack]: { drawW: 261, drawH: 163 },
  [PLAYER_ANIMATION_STATES.fallAttack]: { drawW: 203, drawH: 178 },
};

export const MOON_TIDE_PLAYER_SHEETS: Record<PlayerAnimationState, PlayerSheet> = {
  [PLAYER_ANIMATION_STATES.idle]: moonTideSheet(
    PLAYER_ANIMATION_STATES.idle,
    "assets/sprites/player/moon_tide/player_moon_tide_idle.png",
  ),
  [PLAYER_ANIMATION_STATES.run]: moonTideSheet(
    PLAYER_ANIMATION_STATES.run,
    "assets/sprites/player/moon_tide/player_moon_tide_run.png",
  ),
  [PLAYER_ANIMATION_STATES.jump]: moonTideSheet(
    PLAYER_ANIMATION_STATES.jump,
    "assets/sprites/player/moon_tide/player_moon_tide_jump.png",
  ),
  [PLAYER_ANIMATION_STATES.attack]: moonTideSheet(
    PLAYER_ANIMATION_STATES.attack,
    "assets/sprites/player/moon_tide/player_moon_tide_attack.png",
  ),
  [PLAYER_ANIMATION_STATES.movingAttack]: moonTideSheet(
    PLAYER_ANIMATION_STATES.movingAttack,
    "assets/sprites/player/moon_tide/player_moon_tide_moving_attack.png",
  ),
  [PLAYER_ANIMATION_STATES.fallAttack]: moonTideSheet(
    PLAYER_ANIMATION_STATES.fallAttack,
    "assets/sprites/player/moon_tide/player_moon_tide_fall_attack.png",
  ),
};
