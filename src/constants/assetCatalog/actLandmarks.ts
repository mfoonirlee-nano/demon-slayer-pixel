import type { BossArchetypeId } from "../../types/game-state";

export type ActLandmarkForm = "base" | "awakened" | "final";

export type ActLandmarkSprite = {
  act: number;
  bossId: BossArchetypeId;
  form: ActLandmarkForm;
  src: string;
  image: HTMLImageElement | null;
  drawH: number;
  alpha: number;
};

const BASE_DRAW_H = 136;
const AWAKENED_DRAW_H = 154;
const FINAL_DRAW_H = 184;

const BASE_ALPHA = 0.84;
const AWAKENED_ALPHA = 0.9;
const FINAL_ALPHA = 0.96;
const ACT_LANDMARK_ASSET_ROOT = "assets/sprites/scenery/boss-landmarks";

function actLandmarkSource(fileName: string) {
  return `${ACT_LANDMARK_ASSET_ROOT}/${fileName}`;
}

export const ACT_LANDMARK_SOURCE_SIZE = 256;
export const ACT_LANDMARK_BOTTOM_GUTTER = 4;

export const ACT_LANDMARK_SPRITES: ActLandmarkSprite[] = [
  {
    act: 1,
    bossId: "spider-string",
    form: "base",
    src: actLandmarkSource("act-01-spider-string.png"),
    image: null,
    drawH: BASE_DRAW_H,
    alpha: BASE_ALPHA,
  },
  {
    act: 2,
    bossId: "mist-bone",
    form: "base",
    src: actLandmarkSource("act-02-mist-bone.png"),
    image: null,
    drawH: BASE_DRAW_H,
    alpha: BASE_ALPHA,
  },
  {
    act: 3,
    bossId: "mirror-dream",
    form: "base",
    src: actLandmarkSource("act-03-mirror-dream.png"),
    image: null,
    drawH: BASE_DRAW_H,
    alpha: BASE_ALPHA,
  },
  {
    act: 4,
    bossId: "fang-gale",
    form: "base",
    src: actLandmarkSource("act-04-fang-gale.png"),
    image: null,
    drawH: BASE_DRAW_H,
    alpha: BASE_ALPHA,
  },
  {
    act: 5,
    bossId: "lantern-ember",
    form: "base",
    src: actLandmarkSource("act-05-lantern-ember.png"),
    image: null,
    drawH: BASE_DRAW_H,
    alpha: BASE_ALPHA,
  },
  {
    act: 6,
    bossId: "dead-bell",
    form: "base",
    src: actLandmarkSource("act-06-dead-bell.png"),
    image: null,
    drawH: BASE_DRAW_H,
    alpha: BASE_ALPHA,
  },
  {
    act: 7,
    bossId: "spider-string",
    form: "awakened",
    src: actLandmarkSource("act-07-spider-string-awakened.png"),
    image: null,
    drawH: AWAKENED_DRAW_H,
    alpha: AWAKENED_ALPHA,
  },
  {
    act: 8,
    bossId: "mist-bone",
    form: "awakened",
    src: actLandmarkSource("act-08-mist-bone-awakened.png"),
    image: null,
    drawH: AWAKENED_DRAW_H,
    alpha: AWAKENED_ALPHA,
  },
  {
    act: 9,
    bossId: "mirror-dream",
    form: "awakened",
    src: actLandmarkSource("act-09-mirror-dream-awakened.png"),
    image: null,
    drawH: AWAKENED_DRAW_H,
    alpha: AWAKENED_ALPHA,
  },
  {
    act: 10,
    bossId: "fang-gale",
    form: "awakened",
    src: actLandmarkSource("act-10-fang-gale-awakened.png"),
    image: null,
    drawH: AWAKENED_DRAW_H,
    alpha: AWAKENED_ALPHA,
  },
  {
    act: 11,
    bossId: "lantern-ember",
    form: "awakened",
    src: actLandmarkSource("act-11-lantern-ember-awakened.png"),
    image: null,
    drawH: AWAKENED_DRAW_H,
    alpha: AWAKENED_ALPHA,
  },
  {
    act: 12,
    bossId: "dead-bell",
    form: "awakened",
    src: actLandmarkSource("act-12-dead-bell-awakened.png"),
    image: null,
    drawH: AWAKENED_DRAW_H,
    alpha: AWAKENED_ALPHA,
  },
  {
    act: 13,
    bossId: "blood-moon-many-faces",
    form: "final",
    src: actLandmarkSource("act-13-blood-moon-many-faces.png"),
    image: null,
    drawH: FINAL_DRAW_H,
    alpha: FINAL_ALPHA,
  },
];
