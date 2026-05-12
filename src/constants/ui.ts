export const HUD_UI = {
  meterPercentMax: 100,

  // status_bar.png (875×231) rendered at 400px wide
  statusBarContainerW: 400,
  statusBarContainerH: 106,
  statusBarImgW: 400,

  // upper track — HP fill zone (frame masks tapered right tip)
  hpFillLeft: 124,
  hpFillTop: 46,
  hpFillW: 210,
  hpFillH: 6,

  // lower track — skill charge fill zone (frame masks tapered right tip)
  skillFillLeft: 124,
  skillFillTop: 69,
  skillFillW: 210,
  skillFillH: 5,

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
