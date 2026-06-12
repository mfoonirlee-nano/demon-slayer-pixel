export const UI_SPRITE_SHEET = {
  src: "assets/sprites/ui/ui_system_v1.png",
  w: 2048,
  h: 2048,
} as const;

export const UI_SPRITES = {
  hudStatusFrame: { x: 28, y: 47, w: 1066, h: 316 },
  ultimateFrame: { x: 1205, y: 78, w: 268, h: 278 },

  skillSlotNormal: { x: 54, y: 382, w: 286, h: 286 },
  skillSlotActive: { x: 395, y: 382, w: 286, h: 286 },
  skillSlotEmpty: { x: 735, y: 382, w: 263, h: 283 },
  skillSlotDisabled: { x: 1060, y: 389, w: 284, h: 276 },

  pausePanel: { x: 41, y: 681, w: 1184, h: 514 },
  pauseColumnFrame: { x: 1295, y: 692, w: 484, h: 779 },

  slotFrameNormal: { x: 39, y: 1231, w: 376, h: 120 },
  slotFrameActive: { x: 451, y: 1233, w: 374, h: 113 },
  slotFrameDisabled: { x: 861, y: 1233, w: 367, h: 118 },
  buttonNormal: { x: 196, y: 1370, w: 433, h: 146 },
  buttonActive: { x: 647, y: 1369, w: 405, h: 147 },

  upgradeRewardPanel: { x: 28, y: 1558, w: 516, h: 415 },
  upgradeChoiceCard: { x: 567, y: 1579, w: 196, h: 389 },
  upgradeChoiceCardActive: { x: 777, y: 1579, w: 198, h: 389 },

  bossRewardPanel: { x: 1004, y: 1558, w: 544, h: 423 },
  bossChoiceCard: { x: 1566, y: 1573, w: 213, h: 398 },
  bossChoiceCardActive: { x: 1798, y: 1573, w: 217, h: 398 },
} as const;

export type UiSpriteId = keyof typeof UI_SPRITES;
