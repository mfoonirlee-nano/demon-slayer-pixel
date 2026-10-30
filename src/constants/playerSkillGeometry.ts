// Logical combat dimensions are independent of sprite padding and resolution.
// Existing per-cast scale still applies, preserving every level's reach.
export const LINE_PROJECTILE_COLLISION_SIZES = {
  1: { width: 480, height: 160 },
  2: { width: 720, height: 160 },
  3: { width: 840, height: 160 },
} as const;

export const CLOSE_ARC_COLLISION_SIZE = { width: 540, height: 420 } as const;
