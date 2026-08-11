export const FALLING_LEAF_KINDS = [
  "pine",
  "willow",
  "broadleaf",
  "bamboo",
] as const;

export type FallingLeafKind = typeof FALLING_LEAF_KINDS[number];

export type TreeFoliageProfile = {
  kind: FallingLeafKind;
  anchors: ReadonlyArray<{ x: number; y: number }>;
};

export const REGULAR_TREE_FOLIAGE: ReadonlyArray<TreeFoliageProfile | null> = [
  {
    kind: "pine",
    anchors: [
      { x: 0.4654, y: 0.2552 }, { x: 0.8295, y: 0.2533 },
      { x: 0.1756, y: 0.3558 }, { x: 0.5679, y: 0.0389 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.5566, y: 0.249 }, { x: 0.2756, y: 0.3904 },
      { x: 0.8312, y: 0.3002 }, { x: 0.5959, y: 0.0441 },
    ],
  },
  {
    kind: "broadleaf",
    anchors: [
      { x: 0.5248, y: 0.2085 }, { x: 0.2039, y: 0.2745 },
      { x: 0.823, y: 0.233 }, { x: 0.3592, y: 0.184 },
    ],
  },
  null,
  {
    kind: "willow",
    anchors: [
      { x: 0.4097, y: 0.2251 }, { x: 0.8729, y: 0.2296 },
      { x: 0.1247, y: 0.3812 }, { x: 0.6734, y: 0.0713 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.5221, y: 0.1036 }, { x: 0.243, y: 0.3921 },
      { x: 0.8407, y: 0.3579 }, { x: 0.7686, y: 0.0972 },
    ],
  },
  {
    kind: "broadleaf",
    anchors: [
      { x: 0.5217, y: 0.1497 }, { x: 0.9024, y: 0.2771 },
      { x: 0.1602, y: 0.2856 }, { x: 0.6976, y: 0.2537 },
    ],
  },
  null,
  {
    kind: "pine",
    anchors: [
      { x: 0.4449, y: 0.1899 }, { x: 0.8434, y: 0.3384 },
      { x: 0.2794, y: 0.4021 }, { x: 0.6729, y: 0.145 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.3925, y: 0.145 }, { x: 0.2319, y: 0.1009 },
      { x: 0.336, y: 0.0545 }, { x: 0.3066, y: 0.1357 },
    ],
  },
  null,
  {
    kind: "broadleaf",
    anchors: [
      { x: 0.4446, y: 0.3229 }, { x: 0.8156, y: 0.4046 },
      { x: 0.1461, y: 0.3992 }, { x: 0.4979, y: 0.0613 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.4891, y: 0.2276 }, { x: 0.7888, y: 0.3235 },
      { x: 0.3065, y: 0.4235 }, { x: 0.2684, y: 0.1561 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.3643, y: 0.0865 }, { x: 0.1011, y: 0.2531 },
      { x: 0.259, y: 0.2115 }, { x: 0.4972, y: 0.0469 },
    ],
  },
  null,
  {
    kind: "pine",
    anchors: [
      { x: 0.4347, y: 0.1919 }, { x: 0.7348, y: 0.4151 },
      { x: 0.2605, y: 0.4081 }, { x: 0.5373, y: 0.0523 },
    ],
  },
  {
    kind: "bamboo",
    anchors: [
      { x: 0.4724, y: 0.4162 }, { x: 0.7461, y: 0.5226 },
      { x: 0.1408, y: 0.2194 }, { x: 0.675, y: 0.1503 },
    ],
  },
  {
    kind: "broadleaf",
    anchors: [
      { x: 0.4265, y: 0.35 }, { x: 0.75, y: 0.5466 },
      { x: 0.655, y: 0.1259 }, { x: 0.0939, y: 0.4155 },
    ],
  },
  {
    kind: "willow",
    anchors: [
      { x: 0.4131, y: 0.2521 }, { x: 0.8697, y: 0.3444 },
      { x: 0.1036, y: 0.3616 }, { x: 0.667, y: 0.0869 },
    ],
  },
  null,
  {
    kind: "pine",
    anchors: [
      { x: 0.5043, y: 0.1398 }, { x: 0.2818, y: 0.3011 },
      { x: 0.6951, y: 0.3398 }, { x: 0.2645, y: 0.0852 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.3879, y: 0.2072 }, { x: 0.7668, y: 0.2483 },
      { x: 0.1405, y: 0.399 }, { x: 0.5709, y: 0.3134 },
    ],
  },
  {
    kind: "broadleaf",
    anchors: [
      { x: 0.4326, y: 0.4906 }, { x: 0.6753, y: 0.1748 },
      { x: 0.3787, y: 0.1598 }, { x: 0.7494, y: 0.5244 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.5155, y: 0.0914 }, { x: 0.2986, y: 0.2588 },
      { x: 0.689, y: 0.286 }, { x: 0.501, y: 0.3171 },
    ],
  },
];

export const TALL_TREE_FOLIAGE: ReadonlyArray<TreeFoliageProfile> = [
  {
    kind: "pine",
    anchors: [
      { x: 0.4447, y: 0.2983 }, { x: 0.5592, y: 0.5415 },
      { x: 0.4863, y: 0.064 }, { x: 0.3301, y: 0.4995 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.515, y: 0.3579 }, { x: 0.2077, y: 0.4751 },
      { x: 0.5983, y: 0.0835 }, { x: 0.8353, y: 0.4097 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.4368, y: 0.2856 }, { x: 0.7493, y: 0.4849 },
      { x: 0.4993, y: 0.061 }, { x: 0.3392, y: 0.5054 },
    ],
  },
  {
    kind: "pine",
    anchors: [
      { x: 0.6738, y: 0.436 }, { x: 0.748, y: 0.4634 },
      { x: 0.7129, y: 0.4448 },
    ],
  },
];
