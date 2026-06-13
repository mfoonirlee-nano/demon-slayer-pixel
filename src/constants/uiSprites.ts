export const UI_SPRITES = {
  hudStatusFrame: { src: "assets/sprites/ui/system/hud/hud-status-frame.png", w: 876, h: 216, displayW: 292, displayH: 72 },
  ultimateFrame: { src: "assets/sprites/ui/system/hud/ultimate-frame.png", w: 216, h: 216, displayW: 72, displayH: 72 },
  currentSkillFrame: { src: "assets/sprites/ui/system/hud/current-skill-frame.png", w: 108, h: 108, displayW: 36, displayH: 36 },
  hudHpBarLeft: { src: "assets/sprites/ui/system/hud/hud-hp-bar-left.png", w: 78, h: 60, displayW: 26, displayH: 20 },
  hudHpBarMid: { src: "assets/sprites/ui/system/hud/hud-hp-bar-mid.png", w: 72, h: 60, displayW: 24, displayH: 20 },
  hudHpBarRight: { src: "assets/sprites/ui/system/hud/hud-hp-bar-right.png", w: 78, h: 60, displayW: 26, displayH: 20 },
  hudSkillBarLeft: { src: "assets/sprites/ui/system/hud/hud-skill-bar-left.png", w: 78, h: 54, displayW: 26, displayH: 18 },
  hudSkillBarMid: { src: "assets/sprites/ui/system/hud/hud-skill-bar-mid.png", w: 72, h: 54, displayW: 24, displayH: 18 },
  hudSkillBarRight: { src: "assets/sprites/ui/system/hud/hud-skill-bar-right.png", w: 78, h: 54, displayW: 26, displayH: 18 },

  skillSlotNormal: { src: "assets/sprites/ui/system/slots/skill-slot-normal.png", w: 286, h: 286 },
  skillSlotActive: { src: "assets/sprites/ui/system/slots/skill-slot-active.png", w: 286, h: 286 },
  skillSlotEmpty: { src: "assets/sprites/ui/system/slots/skill-slot-empty.png", w: 263, h: 283 },
  skillSlotDisabled: { src: "assets/sprites/ui/system/slots/skill-slot-disabled.png", w: 284, h: 276 },

  pausePanel: { src: "assets/sprites/ui/system/pause/pause-panel.png", w: 1184, h: 514 },
  pausePanelCompact: { src: "assets/sprites/ui/system/pause/pause-panel-compact.png", w: 600, h: 340 },
  pauseColumnFrame: { src: "assets/sprites/ui/system/pause/pause-column-frame.png", w: 484, h: 779 },
  pauseTabNormal: { src: "assets/sprites/ui/system/pause/pause-tab-normal.png", w: 126, h: 42 },
  pauseTabActive: { src: "assets/sprites/ui/system/pause/pause-tab-active.png", w: 126, h: 42 },
  pauseOptionNormal: { src: "assets/sprites/ui/system/pause/pause-option-normal.png", w: 360, h: 54 },
  pauseOptionActive: { src: "assets/sprites/ui/system/pause/pause-option-active.png", w: 360, h: 54 },
  pauseOptionDisabled: { src: "assets/sprites/ui/system/pause/pause-option-disabled.png", w: 360, h: 54 },
  pauseSlotNormal: { src: "assets/sprites/ui/system/pause/pause-slot-normal.png", w: 176, h: 42 },
  pauseSlotActive: { src: "assets/sprites/ui/system/pause/pause-slot-active.png", w: 176, h: 42 },
  pauseSlotDisabled: { src: "assets/sprites/ui/system/pause/pause-slot-disabled.png", w: 176, h: 42 },
  pauseSliderTrack: { src: "assets/sprites/ui/system/pause/pause-slider-track.png", w: 420, h: 18 },
  pauseSliderFill: { src: "assets/sprites/ui/system/pause/pause-slider-fill.png", w: 420, h: 18 },
  pauseSliderThumb: { src: "assets/sprites/ui/system/pause/pause-slider-thumb.png", w: 22, h: 24 },

  slotFrameNormal: { src: "assets/sprites/ui/system/slots/slot-frame-normal.png", w: 376, h: 120 },
  slotFrameActive: { src: "assets/sprites/ui/system/slots/slot-frame-active.png", w: 374, h: 113 },
  slotFrameDisabled: { src: "assets/sprites/ui/system/slots/slot-frame-disabled.png", w: 367, h: 118 },
  buttonNormal: { src: "assets/sprites/ui/system/controls/button-normal.png", w: 433, h: 146 },
  buttonActive: { src: "assets/sprites/ui/system/controls/button-active.png", w: 405, h: 147 },

  upgradeRewardPanel: { src: "assets/sprites/ui/system/rewards/upgrade-reward-panel.png", w: 516, h: 415 },
  upgradeChoiceCard: { src: "assets/sprites/ui/system/rewards/upgrade-choice-card.png", w: 196, h: 389 },
  upgradeChoiceCardActive: { src: "assets/sprites/ui/system/rewards/upgrade-choice-card-active.png", w: 198, h: 389 },

  bossRewardPanel: { src: "assets/sprites/ui/system/rewards/boss-reward-panel.png", w: 544, h: 423 },
  bossChoiceCard: { src: "assets/sprites/ui/system/rewards/boss-choice-card.png", w: 213, h: 398 },
  bossChoiceCardActive: { src: "assets/sprites/ui/system/rewards/boss-choice-card-active.png", w: 217, h: 398 },
} as const;

export type UiSpriteId = keyof typeof UI_SPRITES;
