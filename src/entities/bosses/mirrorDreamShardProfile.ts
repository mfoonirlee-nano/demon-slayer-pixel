import {
  MIRROR_DREAM_CONFIG,
  MIRROR_NIGHTMARE_SHEET,
  MIRROR_SHARD_SHEET,
} from "../../constants";
import { clamp } from "../../game/utils";
import { playerSkillById } from "../../systems/skillCatalog";
import type { SpriteSheet } from "../../types/assets";
import type { MirrorShardIdentity } from "../../types/game-state";

export type MirrorShardProfile = {
  sheet: SpriteSheet;
  frameDuration: number;
  drawW: number;
  drawH: number;
  hitW: number;
  hitH: number;
  life: number;
  speedScale: number;
  damageScale: number;
  canBounce: boolean;
  glowColor: string | null;
};

export function mirrorShardProfile(identity: MirrorShardIdentity): MirrorShardProfile {
  if (identity.kind === "shard") {
    return {
      sheet: MIRROR_SHARD_SHEET,
      frameDuration: MIRROR_DREAM_CONFIG.shardFrameDuration,
      drawW: MIRROR_DREAM_CONFIG.shardDrawW,
      drawH: MIRROR_DREAM_CONFIG.shardDrawH,
      hitW: MIRROR_DREAM_CONFIG.shardHitW,
      hitH: MIRROR_DREAM_CONFIG.shardHitH,
      life: MIRROR_DREAM_CONFIG.shardLife,
      speedScale: 1,
      damageScale: 1,
      canBounce: true,
      glowColor: null,
    };
  }

  if (identity.kind === "nightmare") return nightmareShardProfile();

  const skill = playerSkillById(identity.reflectedSkillId);
  if (!skill) throw new Error(`Missing reflected player skill ${identity.reflectedSkillId}`);
  // Preserve each skill's relative footprint and strength, but cap extremes so every countershot
  // remains dodgeable; larger reflections travel more slowly to keep their danger readable.
  const sizeScale = clamp(
    skill.radius / MIRROR_DREAM_CONFIG.playerSkillReflectionRadiusBaseline,
    MIRROR_DREAM_CONFIG.playerSkillReflectionMinSizeScale,
    MIRROR_DREAM_CONFIG.playerSkillReflectionMaxSizeScale,
  );
  const speedScale = clamp(
    1 / sizeScale,
    MIRROR_DREAM_CONFIG.playerSkillReflectionMinSpeedScale,
    MIRROR_DREAM_CONFIG.playerSkillReflectionMaxSpeedScale,
  );
  const damageScale = clamp(
    skill.bossBase / MIRROR_DREAM_CONFIG.playerSkillReflectionDamageBaseline,
    MIRROR_DREAM_CONFIG.playerSkillReflectionMinDamageScale,
    MIRROR_DREAM_CONFIG.playerSkillReflectionMaxDamageScale,
  );

  return {
    ...nightmareShardProfile(),
    drawW: MIRROR_DREAM_CONFIG.nightmareDrawW * sizeScale,
    drawH: MIRROR_DREAM_CONFIG.nightmareDrawH * sizeScale,
    hitW: MIRROR_DREAM_CONFIG.nightmareHitW * sizeScale,
    hitH: MIRROR_DREAM_CONFIG.nightmareHitH * sizeScale,
    speedScale,
    damageScale,
    glowColor: skill.color,
  };
}

function nightmareShardProfile(): MirrorShardProfile {
  return {
    sheet: MIRROR_NIGHTMARE_SHEET,
    frameDuration: MIRROR_DREAM_CONFIG.nightmareFrameDuration,
    drawW: MIRROR_DREAM_CONFIG.nightmareDrawW,
    drawH: MIRROR_DREAM_CONFIG.nightmareDrawH,
    hitW: MIRROR_DREAM_CONFIG.nightmareHitW,
    hitH: MIRROR_DREAM_CONFIG.nightmareHitH,
    life: MIRROR_DREAM_CONFIG.nightmareLife,
    speedScale: 1,
    damageScale: 1,
    canBounce: false,
    glowColor: null,
  };
}
