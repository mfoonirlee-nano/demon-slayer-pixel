import type { SpriteFrameEffect } from "../../rendering/graphics";
import type { BinderTalismanDebuff } from "../../types/game-state";

const BINDER_TALISMAN_SINGLE_EFFECTS: Record<BinderTalismanDebuff, SpriteFrameEffect> = {
  slow: {
    filter: "brightness(0.95) saturate(1.38) hue-rotate(176deg) contrast(1.08)",
    tint: {
      color: "rgb(52, 176, 210)",
      alpha: 0.36,
    },
  },
  damage: {
    filter: "brightness(0.94) saturate(1.45) hue-rotate(336deg) contrast(1.14)",
    tint: {
      color: "rgb(196, 38, 42)",
      alpha: 0.42,
    },
  },
  keyScramble: {
    filter: "brightness(0.9) saturate(1.65) hue-rotate(250deg) contrast(1.18)",
    tint: {
      color: "rgb(132, 48, 206)",
      alpha: 0.45,
    },
  },
  stun: {
    filter: "brightness(1.14) saturate(1.32) sepia(0.42) contrast(1.1)",
    tint: {
      color: "rgb(236, 194, 60)",
      alpha: 0.44,
    },
  },
};

const BINDER_TALISMAN_COMMON_PAIR_EFFECTS = {
  slowDamage: {
    filter: "brightness(0.9) saturate(1.55) hue-rotate(326deg) contrast(1.14)",
    tint: {
      color: "rgb(186, 54, 74)",
      alpha: 0.45,
    },
  },
  scrambleStun: {
    filter: "brightness(1.04) saturate(1.64) hue-rotate(272deg) contrast(1.16)",
    tint: {
      color: "rgb(204, 90, 222)",
      alpha: 0.46,
    },
  },
} satisfies Record<string, SpriteFrameEffect>;

export function binderTalismanFrameEffect(
  debuffs: readonly BinderTalismanDebuff[] | undefined,
): SpriteFrameEffect | undefined {
  if (!debuffs || debuffs.length === 0) return undefined;
  const hasSlow = debuffs.includes("slow");
  const hasDamage = debuffs.includes("damage");
  const hasKeyScramble = debuffs.includes("keyScramble");
  const hasStun = debuffs.includes("stun");

  if (hasKeyScramble && hasStun) return BINDER_TALISMAN_COMMON_PAIR_EFFECTS.scrambleStun;
  if (hasSlow && hasDamage) return BINDER_TALISMAN_COMMON_PAIR_EFFECTS.slowDamage;
  if (hasStun) return BINDER_TALISMAN_SINGLE_EFFECTS.stun;
  if (hasKeyScramble) return BINDER_TALISMAN_SINGLE_EFFECTS.keyScramble;
  if (hasDamage) return BINDER_TALISMAN_SINGLE_EFFECTS.damage;
  if (hasSlow) return BINDER_TALISMAN_SINGLE_EFFECTS.slow;
  return undefined;
}
