export const HUD_UI = {
  meterPercentMax: 100,

  playerBarBaseW: 190,
  playerBarMaxW: 310,
  playerBarGrowthPerLevel: 8,

  // boss_hp_bar.png (1916×821) rendered at 380px wide and cropped vertically.
  bossBarContainerW: 380,
  bossBarContainerH: 83,
  bossBarImgW: 380,
  bossBarImgTop: -38,

  // transparent health slot inside boss_hp_bar.png.
  bossFillLeft: 53,
  bossFillTop: 39,
  bossFillW: 274,
  bossFillH: 10,
} as const;
