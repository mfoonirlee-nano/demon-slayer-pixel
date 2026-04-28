export const HUD_UI = {
  meterPercentMax: 100,
  bossBarWidth: 380,
  // hp_bar sprite: visible content area rendered at 260px wide
  // container clips to content area only (no empty canvas margin)
  hpBarContainerW: 260,
  hpBarContainerH: 40,
  hpBarImgW: 274,     // full 1920px image scaled to this width
  hpBarImgOffX: -3,   // shift to align content area left edge
  hpBarImgOffY: -52,  // shift to align content area top edge
  // hollow fill zone: starts at bar track left edge (after icon), stays inside groove borders
  hpFillLeft: 20,
  hpFillTop: 11,
  hpFillW: 211,
  hpFillH: 15,
} as const;
