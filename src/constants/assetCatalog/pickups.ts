import type { SpriteSheet } from "../../types/assets";

export const RESIDUAL_SPIRIT_PICKUP_SPRITE: SpriteSheet & {
  drawW: number;
  drawH: number;
  frameDurationSeconds: number;
} = {
  src: "assets/sprites/pickups/residual-spirit-idle.png",
  image: null,
  frameW: 96,
  frameH: 96,
  count: 8,
  drawW: 24,
  drawH: 24,
  frameDurationSeconds: 0.1,
};

export const MOON_TIDE_TREASURE_SPRITE: {
  src: string;
  image: HTMLImageElement | null;
  frameW: number;
  frameH: number;
  count: number;
  drawW: number;
  drawH: number;
} = {
  src: "assets/sprites/pickups/moon-tide-treasure.png",
  image: null,
  frameW: 128,
  frameH: 128,
  count: 4,
  drawW: 84,
  drawH: 84,
};
