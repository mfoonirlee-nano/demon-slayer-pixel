import { state } from "../../game/state";
import { ctx } from "../../rendering/context";
import {
  CHEST_CONFIG,
  CHEST_VISUAL,
  CRYSTAL_CONFIG,
  CRYSTAL_TYPES_BY_KIND,
  CRYSTAL_VISUAL,
  PLAYER_LIMITS,
} from "../../constants";
import { playTone } from "../../game/audio";
import { hitbox } from "../../game/utils";
import type { CrystalType, PlatformState } from "../../types/game-state";
import { emitHitBurst } from "../particle";
import { healPlayer } from "../player";
import { rewardValuesForAct } from "../../systems/runProgression";

const FULL_CIRCLE_RADIANS = Math.PI * 2;

export function spawnCrystalOnPlatform(platform: PlatformState) {
  const type: CrystalType =
    Math.random() < CRYSTAL_CONFIG.attackTypeChance
      ? CRYSTAL_TYPES_BY_KIND.attack
      : CRYSTAL_TYPES_BY_KIND.health;
  state.crystals.push({
    platform,
    offsetX:
      CRYSTAL_CONFIG.offsetBase +
      Math.random() *
        Math.max(CRYSTAL_CONFIG.minTravelWidth, platform.w - CRYSTAL_CONFIG.offsetPadding),
    type,
    size: CRYSTAL_CONFIG.size,
    phase: Math.random() * FULL_CIRCLE_RADIANS,
  });
}

export function spawnChestOnPlatform(platform: PlatformState) {
  state.chests.push({
    platform,
    offsetX:
      CHEST_CONFIG.offsetBase +
      Math.random() * Math.max(16, platform.w - CHEST_CONFIG.offsetBase * 2),
    phase: Math.random() * FULL_CIRCLE_RADIANS,
    collected: false,
  });
}

export function updateCrystals(dt: number) {
  for (let i = state.crystals.length - 1; i >= 0; i -= 1) {
    const c = state.crystals[i];
    if (!state.platforms.includes(c.platform)) {
      state.crystals.splice(i, 1);
      continue;
    }

    c.phase += dt * CRYSTAL_CONFIG.phaseSpeed;
    const x = c.platform.x + c.offsetX;
    const y =
      c.platform.y -
      CRYSTAL_CONFIG.floatYOffset +
      Math.sin(c.phase) * CRYSTAL_CONFIG.floatAmplitude;
    const box = { x: x - c.size / 2, y: y - c.size / 2, w: c.size, h: c.size };

    if (hitbox(state.player, box)) {
      const rewards = rewardValuesForAct(state.enemyDirector.act);
      if (c.type === CRYSTAL_TYPES_BY_KIND.attack) {
        state.player.attackBonus = Math.min(
          PLAYER_LIMITS.attackBonusCap,
          state.player.attackBonus + rewards.attackCrystal,
        );
        emitHitBurst(x, y, CRYSTAL_VISUAL.pickupBurstColors.attack, CRYSTAL_CONFIG.hitBurstPower.attack);
        playTone(
          CRYSTAL_CONFIG.tones.attack.frequency,
          CRYSTAL_CONFIG.tones.attack.duration,
          "triangle",
          CRYSTAL_CONFIG.tones.attack.volume,
        );
      } else {
        healPlayer(rewards.healthCrystal);
        emitHitBurst(x, y, CRYSTAL_VISUAL.pickupBurstColors.health, CRYSTAL_CONFIG.hitBurstPower.health);
        playTone(
          CRYSTAL_CONFIG.tones.health.frequency,
          CRYSTAL_CONFIG.tones.health.duration,
          "triangle",
          CRYSTAL_CONFIG.tones.health.volume,
        );
      }
      state.crystals.splice(i, 1);
    }
  }
}

export function updateChests(dt: number) {
  if (!state.chests) return;
  for (let i = state.chests.length - 1; i >= 0; i -= 1) {
    const c = state.chests[i];
    if (c.collected || !state.platforms.includes(c.platform)) {
      state.chests.splice(i, 1);
      continue;
    }

    c.phase += dt * CHEST_CONFIG.phaseSpeed;
    const x = c.platform.x + c.offsetX;
    const y =
      c.platform.y -
      CHEST_CONFIG.floatYOffset +
      Math.sin(c.phase) * CHEST_CONFIG.floatAmplitude;
    const box = { x: x - CHEST_CONFIG.size / 2, y: y - CHEST_CONFIG.size / 2, w: CHEST_CONFIG.size, h: CHEST_CONFIG.size };

    if (hitbox(state.player, box)) {
      c.collected = true;
      const rewards = rewardValuesForAct(state.enemyDirector.act);
      // 50/50: attack or health chest
      if (Math.random() < 0.5) {
        state.player.attackBonus = Math.min(
          PLAYER_LIMITS.attackBonusCap,
          state.player.attackBonus + rewards.chestAttack,
        );
        emitHitBurst(x, y, CHEST_VISUAL.burstColor, CHEST_CONFIG.hitBurstPower);
        playTone(
          CHEST_CONFIG.tones.attack.frequency,
          CHEST_CONFIG.tones.attack.duration,
          "triangle",
          CHEST_CONFIG.tones.attack.volume,
        );
      } else {
        healPlayer(rewards.chestHeal);
        emitHitBurst(x, y, CHEST_VISUAL.burstColor, CHEST_CONFIG.hitBurstPower);
        playTone(
          CHEST_CONFIG.tones.health.frequency,
          CHEST_CONFIG.tones.health.duration,
          "triangle",
          CHEST_CONFIG.tones.health.volume,
        );
      }
      state.chests.splice(i, 1);
    }
  }
}

// --- Draw ---

export function drawCrystals() {
  if (!ctx) return;

  for (const c of state.crystals) {
    if (!state.platforms.includes(c.platform)) continue;
    const x = c.platform.x + c.offsetX;
    const y =
      c.platform.y -
      CRYSTAL_CONFIG.floatYOffset +
      Math.sin(c.phase) * CRYSTAL_CONFIG.floatAmplitude;
    const glow =
      CRYSTAL_CONFIG.glowBase +
      CRYSTAL_CONFIG.glowAmplitude * Math.sin(c.phase * CRYSTAL_CONFIG.glowPhaseMultiplier);
    if (c.type === CRYSTAL_TYPES_BY_KIND.attack) {
      ctx.fillStyle = `rgba(${CRYSTAL_VISUAL.attackGlowColorRgb},${glow})`;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.outerOffset,
        y - CRYSTAL_CONFIG.draw.outerOffset,
        CRYSTAL_CONFIG.draw.outerSize,
        CRYSTAL_CONFIG.draw.outerSize,
      );
      ctx.fillStyle = CRYSTAL_VISUAL.attackCoreColor;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.attackCoreOffset.x,
        y - CRYSTAL_CONFIG.draw.attackCoreOffset.y,
        CRYSTAL_CONFIG.draw.attackCoreSize.w,
        CRYSTAL_CONFIG.draw.attackCoreSize.h,
      );
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.attackCrossOffset.x,
        y - CRYSTAL_CONFIG.draw.attackCrossOffset.y,
        CRYSTAL_CONFIG.draw.attackCrossSize.w,
        CRYSTAL_CONFIG.draw.attackCrossSize.h,
      );
    } else {
      ctx.fillStyle = `rgba(${CRYSTAL_VISUAL.healthGlowColorRgb},${glow})`;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.outerOffset,
        y - CRYSTAL_CONFIG.draw.outerOffset,
        CRYSTAL_CONFIG.draw.outerSize,
        CRYSTAL_CONFIG.draw.outerSize,
      );
      ctx.fillStyle = CRYSTAL_VISUAL.healthCoreColor;
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.healthCoreOffset.x,
        y - CRYSTAL_CONFIG.draw.healthCoreOffset.y,
        CRYSTAL_CONFIG.draw.healthCoreSize.w,
        CRYSTAL_CONFIG.draw.healthCoreSize.h,
      );
      ctx.fillRect(
        x - CRYSTAL_CONFIG.draw.healthCrossOffset.x,
        y - CRYSTAL_CONFIG.draw.healthCrossOffset.y,
        CRYSTAL_CONFIG.draw.healthCrossSize.w,
        CRYSTAL_CONFIG.draw.healthCrossSize.h,
      );
    }
  }
}

export function drawChests() {
  if (!ctx || !state.chests) return;
  for (const c of state.chests) {
    if (c.collected || !state.platforms.includes(c.platform)) continue;
    const x = c.platform.x + c.offsetX;
    const y =
      c.platform.y -
      CHEST_CONFIG.floatYOffset +
      Math.sin(c.phase) * CHEST_CONFIG.floatAmplitude;
    const s = CHEST_CONFIG.size;
    const half = s / 2;
    const glow =
      CHEST_CONFIG.glowBase + CHEST_CONFIG.glowAmplitude * Math.sin(c.phase * 1.6);

    // Glow
    ctx.fillStyle = `rgba(${CHEST_VISUAL.glowColorRgb},${glow * 0.5})`;
    ctx.fillRect(x - half - 4, y - half - 4, s + 8, s + 8);

    // Chest body (bottom half)
    ctx.fillStyle = CHEST_VISUAL.baseColor;
    ctx.fillRect(x - half, y, s, half);

    // Chest lid (top half, slightly wider)
    ctx.fillStyle = CHEST_VISUAL.lidColor;
    ctx.fillRect(x - half - 1, y - half, s + 2, half + 1);

    // Rim line
    ctx.fillStyle = CHEST_VISUAL.rimColor;
    ctx.fillRect(x - half - 1, y - 1, s + 2, 2);

    // Lock
    ctx.fillStyle = CHEST_VISUAL.lockColor;
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
}
