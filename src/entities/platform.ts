import { state } from "../state";
import { ctx } from "../context";
import {
  WIDTH,
  GROUND_Y,
  PLATFORM_CONFIG,
  PLATFORM_STYLE_LIST,
  CRYSTAL_CONFIG,
  CRYSTAL_TYPES_BY_KIND,
  PLAYER_LIMITS,
} from "../constants";
import type { CrystalType, PlatformState, PlatformStyle } from "../types/game-state";
import { hitbox } from "../utils";
import { playTone } from "../audio";
import { emitHitBurst } from "./particle";

export function spawnCrystalOnPlatform(platform: PlatformState) {
  const type: CrystalType = Math.random() < CRYSTAL_CONFIG.attackTypeChance ? CRYSTAL_TYPES_BY_KIND.attack : CRYSTAL_TYPES_BY_KIND.health;
  state.crystals.push({
    platform,
    offsetX:
      CRYSTAL_CONFIG.offsetBase +
      Math.random() * Math.max(CRYSTAL_CONFIG.minTravelWidth, platform.w - CRYSTAL_CONFIG.offsetPadding),
    type,
    size: CRYSTAL_CONFIG.size,
    phase: Math.random() * Math.PI * 2,
  });
}

export function spawnPlatform() {
  const width = PLATFORM_CONFIG.widthBase + Math.random() * PLATFORM_CONFIG.widthVariance;
  const y = GROUND_Y - (PLATFORM_CONFIG.minYOffset + Math.random() * PLATFORM_CONFIG.yVariance);
  const style = PLATFORM_STYLE_LIST[Math.floor(Math.random() * PLATFORM_STYLE_LIST.length)] as PlatformStyle;
  const platform: PlatformState = {
    x: WIDTH + PLATFORM_CONFIG.spawnOffsetX,
    y,
    w: width,
    h: PLATFORM_CONFIG.height,
    vx: -(PLATFORM_CONFIG.baseSpeed + Math.random() * PLATFORM_CONFIG.randomSpeed + state.elapsed * PLATFORM_CONFIG.speedScaleByElapsed),
    phase: Math.random() * Math.PI * 2,
    style,
    trim: PLATFORM_CONFIG.trimBase + Math.floor(Math.random() * PLATFORM_CONFIG.trimVariants),
    notch: Math.random() < PLATFORM_CONFIG.notchChance ? 0 : PLATFORM_CONFIG.notchBase + Math.floor(Math.random() * PLATFORM_CONFIG.notchVariants),
  };
  state.platforms.push(platform);
  if (y <= GROUND_Y - PLATFORM_CONFIG.crystalEligibleHeight && Math.random() < PLATFORM_CONFIG.crystalSpawnChance) {
    spawnCrystalOnPlatform(platform);
  }
}

export function updatePlatforms(dt: number) {
  for (let i = state.platforms.length - 1; i >= 0; i -= 1) {
    const p = state.platforms[i];
    p.x += p.vx;
    p.phase += dt * PLATFORM_CONFIG.phaseSpeed;
    if (p.x + p.w < -PLATFORM_CONFIG.despawnMargin) state.platforms.splice(i, 1);
  }
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
    const y = c.platform.y - CRYSTAL_CONFIG.floatYOffset + Math.sin(c.phase) * CRYSTAL_CONFIG.floatAmplitude;
    const box = { x: x - c.size / 2, y: y - c.size / 2, w: c.size, h: c.size };

    if (hitbox(state.player, box)) {
      if (c.type === CRYSTAL_TYPES_BY_KIND.attack) {
        state.player.attackBonus = Math.min(PLAYER_LIMITS.attackBonusCap, state.player.attackBonus + CRYSTAL_CONFIG.attackBonusGain);
        emitHitBurst(x, y, "#82d6ff", 1.6);
        playTone(560, 0.08, "triangle", 0.045);
      } else {
        state.player.hp = Math.min(PLAYER_LIMITS.maxHp, state.player.hp + CRYSTAL_CONFIG.healAmount);
        emitHitBurst(x, y, "#6ff3b6", 1.4);
        playTone(440, 0.08, "triangle", 0.045);
      }
      state.crystals.splice(i, 1);
    }
  }
}

export function drawCrystals() {
  if (!ctx) return;

  for (const c of state.crystals) {
    if (!state.platforms.includes(c.platform)) continue;
    const x = c.platform.x + c.offsetX;
    const y = c.platform.y - CRYSTAL_CONFIG.floatYOffset + Math.sin(c.phase) * CRYSTAL_CONFIG.floatAmplitude;
    const glow = 0.45 + 0.2 * Math.sin(c.phase * 1.7);
    if (c.type === CRYSTAL_TYPES_BY_KIND.attack) {
      ctx.fillStyle = `rgba(118,200,255,${glow})`;
      ctx.fillRect(x - 7, y - 7, 14, 14);
      ctx.fillStyle = "#d9f4ff";
      ctx.fillRect(x - 3, y - 5, 6, 10);
      ctx.fillRect(x - 5, y - 3, 10, 6);
    } else {
      ctx.fillStyle = `rgba(108,245,180,${glow})`;
      ctx.fillRect(x - 7, y - 7, 14, 14);
      ctx.fillStyle = "#dcffe9";
      ctx.fillRect(x - 2, y - 5, 4, 10);
      ctx.fillRect(x - 5, y - 2, 10, 4);
    }
  }
}

export function drawPlatforms() {
  if (!ctx) return;

  for (const p of state.platforms) {
    if (p.style === PLATFORM_STYLE_LIST[2]) {
      ctx.fillStyle = "#4c2830";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#9a3947";
      ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, 4);
      for (let i = 10; i < p.w - 6; i += 16) {
        ctx.fillStyle = "#2c1b20";
        ctx.fillRect(p.x + i, p.y + 2, 2, p.h - 2);
      }
      ctx.fillStyle = "#2a151b";
      ctx.fillRect(p.x + 6, p.y + p.h, p.w - 12, 3);
    } else if (p.style === PLATFORM_STYLE_LIST[3]) {
      ctx.fillStyle = "#3a4554";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#5d6e84";
      ctx.fillRect(p.x + 1, p.y + 1, p.w - 2, 3);
      for (let i = 0; i < p.notch; i += 1) {
        const nx = p.x + p.w * (0.18 + i * 0.28);
        ctx.clearRect(nx, p.y, 4, 2);
      }
      ctx.fillStyle = "#1e2938";
      ctx.fillRect(p.x + 5, p.y + p.h, p.w - 10, 3);
    } else if (p.style === PLATFORM_STYLE_LIST[1]) {
      ctx.fillStyle = "#2e4667";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#3f5f88";
      ctx.fillRect(p.x + 3, p.y + 2, p.w - 6, 4);
      ctx.fillStyle = "#132238";
      ctx.fillRect(p.x + 7, p.y + p.h, p.w - 14, 3);
      for (let i = 0; i < p.w; i += 16) {
        const sway = Math.sin(p.phase + i * 0.1) * 1.5;
        ctx.fillStyle = "#4dd193";
        ctx.fillRect(p.x + i + 3, p.y - 4 + sway, 3, 4);
      }
    } else {
      ctx.fillStyle = "#435368";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#607894";
      ctx.fillRect(p.x + p.trim, p.y + 2, p.w - p.trim * 2, 3);
      ctx.fillStyle = "#1a2638";
      ctx.fillRect(p.x + 6, p.y + p.h, p.w - 12, 3);
      for (let i = 8; i < p.w - 4; i += 22) {
        ctx.fillStyle = "#2a3a4f";
        ctx.fillRect(p.x + i, p.y + 3, 5, 5);
      }
    }
  }
}
