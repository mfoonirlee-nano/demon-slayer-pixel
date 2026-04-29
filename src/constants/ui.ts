export const HUD_UI = {
  meterPercentMax: 100,
  bossBarWidth: 380,

  // status_bar.png (875×231) rendered at 400px wide
  statusBarContainerW: 400,
  statusBarContainerH: 106,
  statusBarImgW: 400,

  // upper track — HP fill zone (frame masks tapered right tip)
  hpFillLeft: 124,
  hpFillTop: 46,
  hpFillW: 235,
  hpFillH: 6,

  // lower track — skill charge fill zone (frame masks tapered right tip)
  skillFillLeft: 124,
  skillFillTop: 69,
  skillFillW: 235,
  skillFillH: 5,
} as const;
