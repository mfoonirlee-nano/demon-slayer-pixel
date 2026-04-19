import { state } from "../state";
import { ctx } from "../context";
import {
  WIDTH,
  GROUND_Y,
  PLATFORM_CONFIG,
  PLATFORM_STYLE_LIST,
  PLATFORM_VISUAL,
  CRYSTAL_CONFIG,
  CRYSTAL_TYPES_BY_KIND,
  CRYSTAL_VISUAL,
  PLAYER_LIMITS,
  PLATFORM_LAYERS,
  PLATFORM_WIDTH,
  LAYER_TRANSITIONS,
  CHAIN_CONFIG,
  HOVER_CONFIG,
  PILLAR_CONFIG,
  CHEST_CONFIG,
  CHEST_VISUAL,
} from "../constants";
import type {
  CrystalType,
  PlatformState,
  PlatformStyle,
  PlatformLayer,
  PillarState,
  ChestState,
} from "../types/game-state";
import { hitbox } from "../utils";
import { playTone } from "../audio";
import { emitHitBurst } from "./particle";
import { healPlayer } from "./player";

const FULL_CIRCLE_RADIANS = Math.PI * 2;

// --- Map generator state (reset on game restart) ---
let lastLayer: PlatformLayer = "mid";
let chestCountdown = CHEST_CONFIG.spawnEvery;

export function resetMapGenerator() {
  lastLayer = "mid";
  chestCountdown = CHEST_CONFIG.spawnEvery;
}

// --- Layer helpers ---

function layerY(layer: PlatformLayer): number {
  const range = PLATFORM_LAYERS[layer];
  return range.yMin + Math.random() * (range.yMax - range.yMin);
}

function yToLayer(y: number): PlatformLayer {
  if (y <= PLATFORM_LAYERS.high.yMax) return "high";
  if (y <= PLATFORM_LAYERS.mid.yMax) return "mid";
  return "low";
}

function pickNextLayer(current: PlatformLayer): PlatformLayer {
  const weights = LAYER_TRANSITIONS[current];
  const roll = Math.random();
  if (roll < weights[0]) return "low";
  if (roll < weights[0] + weights[1]) return "mid";
  return "high";
}

function platformVx(): number {
  return -(
    PLATFORM_CONFIG.baseSpeed +
    Math.random() * PLATFORM_CONFIG.randomSpeed +
    state.elapsed * PLATFORM_CONFIG.speedScaleByElapsed
  );
}

function randomStyle(): PlatformStyle {
  return PLATFORM_STYLE_LIST[
    Math.floor(Math.random() * PLATFORM_STYLE_LIST.length)
  ] as PlatformStyle;
}

// --- Platform spawn helpers ---

function makePlatform(
  x: number,
  y: number,
  w: number,
  vx: number,
  isHover: boolean,
  isChain: boolean,
): PlatformState {
  return {
    x,
    y,
    baseY: y,
    w,
    h: PLATFORM_CONFIG.height,
    vx,
    phase: Math.random() * FULL_CIRCLE_RADIANS,
    style: randomStyle(),
    kind: isChain ? "chain" : isHover ? "hover" : "normal",
    hoverAmplitude: isHover ? HOVER_CONFIG.amplitude : 0,
    trim: PLATFORM_CONFIG.trimBase + Math.floor(Math.random() * PLATFORM_CONFIG.trimVariants),
    notch: Math.random() < PLATFORM_CONFIG.notchChance
      ? 0
      : PLATFORM_CONFIG.notchBase + Math.floor(Math.random() * PLATFORM_CONFIG.notchVariants),
  };
}

function trySpawnCrystal(platform: PlatformState) {
  if (Math.random() < PLATFORM_CONFIG.crystalSpawnChance) {
    spawnCrystalOnPlatform(platform);
  }
}

function consumeChestSlot(platform: PlatformState): boolean {
  chestCountdown -= 1;
  if (chestCountdown <= 0) {
    spawnChestOnPlatform(platform);
    chestCountdown =
      CHEST_CONFIG.spawnEvery +
      Math.floor((Math.random() * 2 - 1) * CHEST_CONFIG.spawnVariance);
    return true;
  }
  return false;
}

// --- Pillar spawn ---

function spawnPillar() {
  const h = PILLAR_CONFIG.heightMin + Math.random() * (PILLAR_CONFIG.heightMax - PILLAR_CONFIG.heightMin);
  const w = PILLAR_CONFIG.widthMin + Math.random() * (PILLAR_CONFIG.widthMax - PILLAR_CONFIG.widthMin);
  const pillar: PillarState = {
    x: WIDTH + PLATFORM_CONFIG.spawnOffsetX + Math.random() * 80,
    y: GROUND_Y - h,
    w,
    h,
    vx: platformVx(),
  };
  state.pillars.push(pillar);
}

// --- Crystal ---

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

// --- Chest ---

function spawnChestOnPlatform(platform: PlatformState) {
  state.chests.push({
    platform,
    offsetX:
      CHEST_CONFIG.offsetBase +
      Math.random() * Math.max(16, platform.w - CHEST_CONFIG.offsetBase * 2),
    phase: Math.random() * FULL_CIRCLE_RADIANS,
    collected: false,
  });
}

// --- Main spawn entry points ---

function spawnNormalPlatform() {
  const nextLayer = pickNextLayer(lastLayer);
  const y = layerY(nextLayer);
  const w = PLATFORM_WIDTH.normal.base + Math.random() * PLATFORM_WIDTH.normal.variance;
  const isHover = nextLayer !== "low" && Math.random() < HOVER_CONFIG.chance;
  const vx = platformVx();
  const platform = makePlatform(WIDTH + PLATFORM_CONFIG.spawnOffsetX, y, w, vx, isHover, false);
  state.platforms.push(platform);
  lastLayer = yToLayer(y);

  if (!consumeChestSlot(platform)) {
    trySpawnCrystal(platform);
  }

  if (Math.random() < PILLAR_CONFIG.spawnChance) {
    spawnPillar();
  }
}

function spawnChainCluster() {
  const count = CHAIN_CONFIG.minCount + Math.floor(Math.random() * (CHAIN_CONFIG.maxCount - CHAIN_CONFIG.minCount + 1));
  const vx = platformVx();

  // Chain starts at a mid-ish Y so all steps stay reachable
  let y = layerY("mid");
  let x = WIDTH + PLATFORM_CONFIG.spawnOffsetX;

  for (let i = 0; i < count; i += 1) {
    const w = PLATFORM_WIDTH.chain.base + Math.random() * PLATFORM_WIDTH.chain.variance;
    const platform = makePlatform(x, y, w, vx, false, true);
    state.platforms.push(platform);

    if (i === 0 && !consumeChestSlot(platform)) {
      trySpawnCrystal(platform);
    }

    // Advance x: platform width + horizontal gap between platforms
    const gap = CHAIN_CONFIG.gapMin + Math.random() * (CHAIN_CONFIG.gapMax - CHAIN_CONFIG.gapMin);
    x += w + gap;

    // Next platform y: random step within reachable range
    const dy = (Math.random() * 2 - 0.8) * CHAIN_CONFIG.maxDyAbs;
    y = Math.max(PLATFORM_LAYERS.high.yMin, Math.min(PLATFORM_LAYERS.low.yMax, y + dy));
  }

  lastLayer = yToLayer(y);
}

// Public API called by runtime.ts instead of spawnPlatform()
export function spawnNextMapSegment() {
  if (Math.random() < CHAIN_CONFIG.triggerChance) {
    spawnChainCluster();
  } else {
    spawnNormalPlatform();
  }
}

// --- Update ---

export function updatePlatforms(dt: number) {
  for (let i = state.platforms.length - 1; i >= 0; i -= 1) {
    const p = state.platforms[i];
    p.x += p.vx;
    p.phase += dt * PLATFORM_CONFIG.phaseSpeed;
    if (p.hoverAmplitude > 0) {
      p.y = p.baseY + Math.sin(p.phase * (HOVER_CONFIG.phaseSpeed / PLATFORM_CONFIG.phaseSpeed)) * p.hoverAmplitude;
    }
    if (p.x + p.w < -PLATFORM_CONFIG.despawnMargin) state.platforms.splice(i, 1);
  }
}

export function updatePillars() {
  if (!state.pillars) return;
  for (let i = state.pillars.length - 1; i >= 0; i -= 1) {
    const p = state.pillars[i];
    p.x += p.vx;
    if (p.x + p.w < -PLATFORM_CONFIG.despawnMargin) state.pillars.splice(i, 1);
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
    const y =
      c.platform.y -
      CRYSTAL_CONFIG.floatYOffset +
      Math.sin(c.phase) * CRYSTAL_CONFIG.floatAmplitude;
    const box = { x: x - c.size / 2, y: y - c.size / 2, w: c.size, h: c.size };

    if (hitbox(state.player, box)) {
      if (c.type === CRYSTAL_TYPES_BY_KIND.attack) {
        state.player.attackBonus = Math.min(
          PLAYER_LIMITS.attackBonusCap,
          state.player.attackBonus + CRYSTAL_CONFIG.attackBonusGain,
        );
        emitHitBurst(x, y, CRYSTAL_VISUAL.pickupBurstColors.attack, CRYSTAL_CONFIG.hitBurstPower.attack);
        playTone(
          CRYSTAL_CONFIG.tones.attack.frequency,
          CRYSTAL_CONFIG.tones.attack.duration,
          "triangle",
          CRYSTAL_CONFIG.tones.attack.volume,
        );
      } else {
        healPlayer(CRYSTAL_CONFIG.healAmount);
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
      // 50/50: attack or health chest
      if (Math.random() < 0.5) {
        state.player.attackBonus = Math.min(
          PLAYER_LIMITS.attackBonusCap,
          state.player.attackBonus + CHEST_CONFIG.attackBonusGain,
        );
        emitHitBurst(x, y, CHEST_VISUAL.burstColor, CHEST_CONFIG.hitBurstPower);
        playTone(
          CHEST_CONFIG.tones.attack.frequency,
          CHEST_CONFIG.tones.attack.duration,
          "triangle",
          CHEST_CONFIG.tones.attack.volume,
        );
      } else {
        healPlayer(CHEST_CONFIG.healAmount);
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

function drawPlatformBase(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

export function drawPlatforms() {
  if (!ctx) return;

  for (const p of state.platforms) {
    // Chain platforms use stone style always (smaller, clean look)
    const styleKey = p.kind === "chain" ? "stone" : p.style;

    if (styleKey === PLATFORM_STYLE_LIST[2]) {
      drawPlatformBase(ctx, p.x, p.y, p.w, p.h, PLATFORM_VISUAL.shrine.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.shrine.topColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.shrine.topInsetX,
        p.y + PLATFORM_VISUAL.shrine.topInsetY,
        p.w - PLATFORM_VISUAL.shrine.topInsetWidth,
        PLATFORM_VISUAL.shrine.topHeight,
      );
      for (
        let i = PLATFORM_VISUAL.shrine.pillarStartX;
        i < p.w - PLATFORM_VISUAL.shrine.undersideInset;
        i += PLATFORM_VISUAL.shrine.pillarStep
      ) {
        ctx.fillStyle = PLATFORM_VISUAL.shrine.pillarColor;
        ctx.fillRect(
          p.x + i,
          p.y + PLATFORM_VISUAL.shrine.topInsetY,
          PLATFORM_VISUAL.shrine.pillarWidth,
          p.h - PLATFORM_VISUAL.shrine.topInsetY,
        );
      }
      ctx.fillStyle = PLATFORM_VISUAL.shrine.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.shrine.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.shrine.undersideInset * 2,
        PLATFORM_VISUAL.shrine.undersideHeight,
      );
    } else if (styleKey === PLATFORM_STYLE_LIST[3]) {
      drawPlatformBase(ctx, p.x, p.y, p.w, p.h, PLATFORM_VISUAL.ruin.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.ruin.topColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.ruin.topInset,
        p.y + PLATFORM_VISUAL.ruin.topInset,
        p.w - PLATFORM_VISUAL.ruin.topInset * 2,
        PLATFORM_VISUAL.ruin.topHeight,
      );
      for (let i = 0; i < p.notch; i += 1) {
        const notchX =
          p.x + p.w * (PLATFORM_VISUAL.ruin.notchStartRatio + i * PLATFORM_VISUAL.ruin.notchStepRatio);
        ctx.clearRect(notchX, p.y, PLATFORM_VISUAL.ruin.notchWidth, PLATFORM_VISUAL.ruin.notchHeight);
      }
      ctx.fillStyle = PLATFORM_VISUAL.ruin.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.ruin.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.ruin.undersideInset * 2,
        PLATFORM_VISUAL.ruin.undersideHeight,
      );
    } else if (styleKey === PLATFORM_STYLE_LIST[1]) {
      drawPlatformBase(ctx, p.x, p.y, p.w, p.h, PLATFORM_VISUAL.moss.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.moss.topColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.moss.topInsetX,
        p.y + PLATFORM_VISUAL.moss.topInsetY,
        p.w - PLATFORM_VISUAL.moss.topInsetWidth,
        PLATFORM_VISUAL.moss.topHeight,
      );
      ctx.fillStyle = PLATFORM_VISUAL.moss.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.moss.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.moss.undersideInset * 2,
        PLATFORM_VISUAL.moss.undersideHeight,
      );
      for (let i = 0; i < p.w; i += PLATFORM_VISUAL.moss.grassStep) {
        const sway =
          Math.sin(p.phase + i * PLATFORM_VISUAL.moss.grassPhaseScale) *
          PLATFORM_VISUAL.moss.grassSwayAmplitude;
        ctx.fillStyle = PLATFORM_VISUAL.moss.grassColor;
        ctx.fillRect(
          p.x + i + PLATFORM_VISUAL.moss.grassOffsetX,
          p.y - PLATFORM_VISUAL.moss.grassOffsetY + sway,
          PLATFORM_VISUAL.moss.grassWidth,
          PLATFORM_VISUAL.moss.grassHeight,
        );
      }
    } else {
      // stone (default, also used for chain)
      drawPlatformBase(ctx, p.x, p.y, p.w, p.h, PLATFORM_VISUAL.stone.baseColor);
      ctx.fillStyle = PLATFORM_VISUAL.stone.topColor;
      ctx.fillRect(
        p.x + p.trim,
        p.y + PLATFORM_VISUAL.stone.topInsetY,
        p.w - p.trim * 2,
        PLATFORM_VISUAL.stone.topHeight,
      );
      ctx.fillStyle = PLATFORM_VISUAL.stone.undersideColor;
      ctx.fillRect(
        p.x + PLATFORM_VISUAL.stone.undersideInset,
        p.y + p.h,
        p.w - PLATFORM_VISUAL.stone.undersideInset * 2,
        PLATFORM_VISUAL.stone.undersideHeight,
      );
      for (let i = PLATFORM_VISUAL.stone.detailStartX; i < p.w - 4; i += PLATFORM_VISUAL.stone.detailStep) {
        ctx.fillStyle = PLATFORM_VISUAL.stone.detailColor;
        ctx.fillRect(
          p.x + i,
          p.y + PLATFORM_VISUAL.stone.detailOffsetY,
          PLATFORM_VISUAL.stone.detailWidth,
          PLATFORM_VISUAL.stone.detailHeight,
        );
      }
    }

    // Hover indicator: faint glow strip on top edge
    if (p.kind === "hover") {
      ctx.fillStyle = "rgba(140,210,255,0.18)";
      ctx.fillRect(p.x + 2, p.y, p.w - 4, 2);
    }
  }
}

export function drawPillars() {
  if (!ctx || !state.pillars) return;
  for (const p of state.pillars) {
    // Base body
    ctx.fillStyle = PILLAR_CONFIG.baseColor;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Top cap
    ctx.fillStyle = PILLAR_CONFIG.topColor;
    ctx.fillRect(p.x - 2, p.y, p.w + 4, 5);
    // Crack detail
    ctx.fillStyle = PILLAR_CONFIG.cracksColor;
    ctx.fillRect(p.x + Math.floor(p.w * 0.4), p.y + 8, 1, Math.floor(p.h * 0.35));
  }
}

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
