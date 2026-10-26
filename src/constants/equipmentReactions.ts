export const EQUIPMENT_REACTIONS = {
  markFrames: 480,
  controlFrames: 90,
  movementDistance: 160,
  durationMultiplier: 1.5,
  coverFrames: 30,
  coverDamageMultiplier: 0.7,
  spreadRadius: 160,
  spreadCount: 2,
  maxEffects: 8,
  maxMarks: 64,
  maxControls: 64,
  historyLimit: 32,
  sweep: {
    width: 130, height: 50, lifeFrames: 24, impactFrame: 1,
    speed: 9, damageMultiplier: 0.75, bossDamageMultiplier: 0.55,
    pullPerFrame: 0, pushDistance: 24,
  },
  eye: {
    width: 160, height: 80, lifeFrames: 30, impactFrame: 0,
    speed: 0, damageMultiplier: 0, bossDamageMultiplier: 0,
    pullPerFrame: 2, pushDistance: 0,
  },
  rupture: {
    width: 150, height: 100, lifeFrames: 50, impactFrame: 30,
    speed: 0, damageMultiplier: 1.1, bossDamageMultiplier: 0.8,
    pullPerFrame: 0, pushDistance: 0,
  },
  surge: {
    width: 180, height: 100, lifeFrames: 30, impactFrame: 10,
    speed: 0, damageMultiplier: 1.1, bossDamageMultiplier: 0.75,
    pullPerFrame: 3, pushDistance: 0,
  },
} as const;
