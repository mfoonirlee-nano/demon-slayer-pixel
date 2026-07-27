export type ActOccluderKind = "themed" | "generic";

export type ActOccluderSprite = {
  id: string;
  acts: readonly number[];
  kind: ActOccluderKind;
  src: string;
  image: HTMLImageElement | null;
  sourceW: number;
  sourceH: number;
  drawH: number;
  alpha: number;
};

enum IntroAct {
  SpiderString = 1,
  MistBone,
  MirrorDream,
  FangGale,
  LanternEmber,
  DeadBell,
}

const AWAKENED_ACT_OFFSET = 6;
const FINAL_ACT = 13;
const ALL_ACTS = Array.from({ length: FINAL_ACT }, (_, index) => index + 1);
const ACT_OCCLUDER_ASSET_ROOT = "assets/sprites/scenery/act-occluders";

function bossActs(introAct: IntroAct) {
  return [introAct, introAct + AWAKENED_ACT_OFFSET];
}

function actOccluderSource(fileName: string) {
  return `${ACT_OCCLUDER_ASSET_ROOT}/${fileName}`;
}

export const ACT_OCCLUDER_BOTTOM_GUTTER = 8;

export const ACT_OCCLUDER_SPRITES: ActOccluderSprite[] = [
  {
    id: "spider-string-webbed-cedar",
    acts: bossActs(IntroAct.SpiderString),
    kind: "themed",
    src: actOccluderSource("spider-string-webbed-cedar.png"),
    image: null,
    sourceW: 512,
    sourceH: 505,
    drawH: 190,
    alpha: 1,
  },
  {
    id: "mist-bone-bamboo-thicket",
    acts: bossActs(IntroAct.MistBone),
    kind: "themed",
    src: actOccluderSource("mist-bone-bamboo-thicket.png"),
    image: null,
    sourceW: 512,
    sourceH: 343,
    drawH: 182,
    alpha: 1,
  },
  {
    id: "mirror-dream-shard-outcrop",
    acts: bossActs(IntroAct.MirrorDream),
    kind: "themed",
    src: actOccluderSource("mirror-dream-shard-outcrop.png"),
    image: null,
    sourceW: 512,
    sourceH: 232,
    drawH: 185,
    alpha: 1,
  },
  {
    id: "fang-gale-windbent-pine",
    acts: bossActs(IntroAct.FangGale),
    kind: "themed",
    src: actOccluderSource("fang-gale-windbent-pine.png"),
    image: null,
    sourceW: 512,
    sourceH: 349,
    drawH: 270,
    alpha: 1,
  },
  {
    id: "lantern-ember-charred-cedar",
    acts: bossActs(IntroAct.LanternEmber),
    kind: "themed",
    src: actOccluderSource("lantern-ember-charred-cedar.png"),
    image: null,
    sourceW: 512,
    sourceH: 342,
    drawH: 184,
    alpha: 1,
  },
  {
    id: "dead-bell-weeping-tree",
    acts: bossActs(IntroAct.DeadBell),
    kind: "themed",
    src: actOccluderSource("dead-bell-weeping-tree.png"),
    image: null,
    sourceW: 512,
    sourceH: 364,
    drawH: 188,
    alpha: 1,
  },
  {
    id: "blood-moon-mask-banyan",
    acts: [FINAL_ACT],
    kind: "themed",
    src: actOccluderSource("blood-moon-mask-banyan.png"),
    image: null,
    sourceW: 512,
    sourceH: 338,
    drawH: 208,
    alpha: 1,
  },
  {
    id: "moon-bamboo-rock-cluster",
    acts: ALL_ACTS,
    kind: "generic",
    src: actOccluderSource("moon-bamboo-rock-cluster.png"),
    image: null,
    sourceW: 512,
    sourceH: 256,
    drawH: 185,
    alpha: 1,
  },
];
