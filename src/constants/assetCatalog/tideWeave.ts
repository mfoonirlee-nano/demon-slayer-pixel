import type { SpriteSheet } from "../../types/assets";

export const TIDE_WEAVE_SWEEP_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/tide_weave/sweep.png",
  frameW: 256,
  frameH: 256,
  count: 6,
  image: null,
};

export const TIDE_WEAVE_SURGE_SHEET: SpriteSheet = {
  src: "assets/sprites/skills/tide_weave/surge.png",
  frameW: 256,
  frameH: 256,
  count: 6,
  image: null,
};

export const TIDE_WEAVE_VISUAL = {
  anchorX: 0.5,
  anchorY: 0.875,
  fadeStart: 0.7,
} as const;
