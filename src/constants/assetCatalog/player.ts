import { PLAYER_ANIMATION_STATES } from "../ids";
import type { PlayerAnimationState, PlayerSheet } from "../../types/assets";

export const PLAYER_SHEETS: Record<PlayerAnimationState, PlayerSheet> = {
  [PLAYER_ANIMATION_STATES.idle]: {
    src: "assets/sprites/player/player_idle.png",
    frameW: 384,
    frameH: 480,
    count: 8,
    image: null,
    drawW: 96,
    drawH: 120,
    animSpeed: 8,
    anchorY: 0.979,
  },
  [PLAYER_ANIMATION_STATES.run]: {
    src: "assets/sprites/player/player_run.png",
    frameW: 448,
    frameH: 420,
    count: 8,
    image: null,
    drawW: 120,
    drawH: 112,
    animSpeed: 4,
    anchorY: 0.976,
  },
  [PLAYER_ANIMATION_STATES.jump]: {
    src: "assets/sprites/player/player_jump.png",
    frameW: 448,
    frameH: 420,
    count: 6,
    image: null,
    drawW: 124,
    drawH: 116,
    animSpeed: 7,
    anchorY: 0.971,
  },
  [PLAYER_ANIMATION_STATES.attack]: {
    src: "assets/sprites/player/player_attack.png",
    frameW: 768,
    frameH: 480,
    count: 8,
    image: null,
    drawW: 227,
    drawH: 142,
    animSpeed: 3,
    anchorY: 0.979,
  },
  [PLAYER_ANIMATION_STATES.movingAttack]: {
    src: "assets/sprites/player/player_moving_attack.png",
    frameW: 768,
    frameH: 480,
    count: 8,
    image: null,
    drawW: 227,
    drawH: 142,
    animSpeed: 3,
    anchorY: 0.979,
  },
  [PLAYER_ANIMATION_STATES.fallAttack]: {
    src: "assets/sprites/player/player_fall_attack.png",
    frameW: 640,
    frameH: 560,
    count: 8,
    image: null,
    drawW: 178,
    drawH: 156,
    animSpeed: 4,
    anchorY: 0.982,
  },
};

function moonTideSheet(
  state: PlayerAnimationState,
  src: string,
): PlayerSheet {
  return {
    ...PLAYER_SHEETS[state],
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
