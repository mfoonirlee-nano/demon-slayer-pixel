import type { SpriteSheet } from "../../types/assets";

export const MIST_BONE_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_move.png",
  frameW: 350,
  frameH: 419,
  count: 4,
  image: null,
};

export const MIST_BONE_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const MIST_BONE_ATTACK_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_attack.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const MIST_BONE_LINE_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_line_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const MIST_BONE_CAGE_CAST_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_cage_cast.png",
  frameW: 400,
  frameH: 400,
  count: 6,
  image: null,
};

export const MIST_BONE_DART_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_dart.png",
  frameW: 160,
  frameH: 96,
  count: 4,
  image: null,
};

export const MIST_BONE_SPIKES_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_spikes.png",
  frameW: 400,
  frameH: 350,
  count: 6,
  image: null,
};

export const MIST_BONE_FOG_VEIL_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_fog_veil.png",
  frameW: 256,
  frameH: 160,
  count: 6,
  image: null,
};

export const MIST_BONE_FOG_ROLL_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_fog_roll.png",
  frameW: 256,
  frameH: 160,
  count: 6,
  image: null,
};

export const MIST_BONE_FOG_WISP_SHEET: SpriteSheet = {
  src: "assets/sprites/boss/mist-bone/mist_bone_fog_wisp.png",
  frameW: 256,
  frameH: 160,
  count: 6,
  image: null,
};

export const MIST_BONE_FOG_SHEETS = [
  MIST_BONE_FOG_VEIL_SHEET,
  MIST_BONE_FOG_ROLL_SHEET,
  MIST_BONE_FOG_WISP_SHEET,
] as const;
