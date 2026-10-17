import {
  HEIGHT,
  HIGH_PLATFORM_TREASURE_CONFIG,
  MOON_TIDE_TREASURE_SPRITE,
  WIDTH,
} from "../constants";
import { state } from "../game/state";
import { ctx } from "../rendering/context";
import { drawTreasureGlow } from "../rendering/treasureGlow";
import { TREASURE_GLOW } from "../constants/treasureVisual";

const HALF = 0.5;
const FULL_CIRCLE = Math.PI * 2;
const GLOW_PULSE_BASE = 0.58;
const GLOW_PULSE_SPEED = 4;
const GLOW_PULSE_AMPLITUDE = 0.2;
const ASSUMED_FRAMES_PER_SECOND = 60;
const WARNING_PULSE_BASE = 0.45;
const WARNING_PULSE_SPEED = 11;
const WARNING_PULSE_AMPLITUDE = 0.5;
const PLATFORM_GLOW_INSET = 5;
const PLATFORM_AURA_INSET = 10;
const PLATFORM_AURA_ALPHA = 0.28;
const OPEN_FRAME = 3;
const UNLOCK_LIT_PROGRESS = 0.55;
const SPRITE_BASELINE_INSET = 5;
const CLAIM_RING_Y_OFFSET = 35;
const CLAIM_RING_RADIUS = 27;
const FLASH_PEAK_PROGRESS = 0.45;
const FLASH_ALPHA = 0.08;
const REVEAL_PHASE_SPEED = 12;
const ARRIVAL_GLOW_CENTER_OUTSET = 12;
const ARRIVAL_GLOW_PEAK_PROGRESS = 0.22;
const ARRIVAL_GLOW_MOTE_STRENGTH = 0.62;
const ARRIVAL_GLOW_MOTE_PHASE_SPEED = 2.8;

function activeTreasurePosition() {
  const treasure = state.highPlatformTreasure;
  if (!treasure) return null;
  return {
    x: treasure.host.x + treasure.host.w * HALF,
    y: treasure.host.y,
    phase: treasure.phase,
    alpha: treasure.dismissElapsed === null
      ? 1
      : Math.max(
        0,
        1 - treasure.dismissElapsed / HIGH_PLATFORM_TREASURE_CONFIG.dismiss.durationSeconds,
      ),
  };
}

function drawPlatformGlow() {
  if (!ctx || !state.highPlatformTreasure) return;
  const treasure = state.highPlatformTreasure;
  if (treasure.dismissElapsed !== null) return;
  const host = treasure.host;
  if (host.x > WIDTH || host.x + host.w < 0) return;
  const pulse = GLOW_PULSE_BASE
    + Math.sin(treasure.phase * GLOW_PULSE_SPEED) * GLOW_PULSE_AMPLITUDE;
  const warningDistance = Math.abs(host.vx)
    * HIGH_PLATFORM_TREASURE_CONFIG.host.edgeWarningSeconds
    * ASSUMED_FRAMES_PER_SECOND;
  const leavingSoon = host.x + host.w <= warningDistance;
  const warningPulse = leavingSoon
    ? WARNING_PULSE_BASE
      + Math.abs(Math.sin(treasure.phase * WARNING_PULSE_SPEED)) * WARNING_PULSE_AMPLITUDE
    : 0;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = Math.max(pulse, warningPulse);
  ctx.fillStyle = leavingSoon ? "#ffd36a" : "#65dcff";
  ctx.fillRect(
    host.x + PLATFORM_GLOW_INSET,
    host.y - 2,
    Math.max(0, host.w - PLATFORM_GLOW_INSET * 2),
    2,
  );
  ctx.globalAlpha *= PLATFORM_AURA_ALPHA;
  ctx.fillRect(
    host.x + PLATFORM_AURA_INSET,
    host.y - PLATFORM_GLOW_INSET,
    Math.max(0, host.w - PLATFORM_AURA_INSET * 2),
    PLATFORM_GLOW_INSET + 1,
  );
  ctx.restore();
}

function arrivalGlowStrength(progress: number) {
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < ARRIVAL_GLOW_PEAK_PROGRESS) {
    return progress / ARRIVAL_GLOW_PEAK_PROGRESS;
  }
  const fade = 1
    - (progress - ARRIVAL_GLOW_PEAK_PROGRESS) / (1 - ARRIVAL_GLOW_PEAK_PROGRESS);
  return fade * fade;
}

function drawTreasureArrivalGlow() {
  if (!ctx || !state.highPlatformTreasure) return;
  const treasure = state.highPlatformTreasure;
  if (treasure.dismissElapsed !== null || treasure.arrivalGlowElapsed === null) return;
  const duration = HIGH_PLATFORM_TREASURE_CONFIG.telegraph.arrivalGlowDurationSeconds;
  const progress = treasure.arrivalGlowElapsed / duration;
  const strength = arrivalGlowStrength(progress);
  if (strength <= 0) return;

  const x = WIDTH + ARRIVAL_GLOW_CENTER_OUTSET;
  drawTreasureGlow(ctx, {
    x,
    y: treasure.host.y,
    phase: progress * ARRIVAL_GLOW_MOTE_PHASE_SPEED,
    strength: strength * ARRIVAL_GLOW_MOTE_STRENGTH,
  });
}

export function drawTreasureTelegraph() {
  if (!ctx) return;
  const position = activeTreasurePosition();
  const treasure = state.highPlatformTreasure;
  if (!position || !treasure) return;
  drawTreasureArrivalGlow();
  if (position.x > WIDTH + treasure.host.w) return;

  // Use the treasure's gameplay clock so breathing freezes with pauses and rewards.
  const hold = Math.min(1, treasure.claimHoldElapsed / HIGH_PLATFORM_TREASURE_CONFIG.host.claimHoldSeconds);
  const unlocked = treasure.unlockElapsed >= HIGH_PLATFORM_TREASURE_CONFIG.host.unlockDelaySeconds;
  drawTreasureGlow(ctx, {
    x: position.x, y: position.y, phase: position.phase, hold,
    strength: ((unlocked ? TREASURE_GLOW.readyStrength : TREASURE_GLOW.dormantStrength)
      + hold * TREASURE_GLOW.holdStrength) * position.alpha,
  });
  drawPlatformGlow();
}

function treasureFrame() {
  if (state.treasureReveal) {
    const progress = state.treasureReveal.elapsed / state.treasureReveal.duration;
    return progress < TREASURE_GLOW.reveal.openProgress ? 2 : OPEN_FRAME;
  }
  const treasure = state.highPlatformTreasure;
  if (!treasure) return 0;
  if (treasure.claimHoldElapsed > 0) return 2;
  const unlockProgress = treasure.unlockElapsed
    / HIGH_PLATFORM_TREASURE_CONFIG.host.unlockDelaySeconds;
  return unlockProgress >= UNLOCK_LIT_PROGRESS ? 1 : 0;
}

function drawTreasureSprite(x: number, y: number, frame: number, alpha = 1) {
  if (!ctx) return;
  const sprite = MOON_TIDE_TREASURE_SPRITE;
  const drawX = Math.round(x - sprite.drawW * HALF);
  const drawY = Math.round(y - sprite.drawH + SPRITE_BASELINE_INSET);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  if (sprite.image) {
    ctx.drawImage(
      sprite.image,
      frame * sprite.frameW,
      0,
      sprite.frameW,
      sprite.frameH,
      drawX,
      drawY,
      sprite.drawW,
      sprite.drawH,
    );
  }
}

function drawClaimHoldRing(x: number, y: number) {
  if (!ctx || !state.highPlatformTreasure) return;
  if (state.highPlatformTreasure.dismissElapsed !== null) return;
  const hold = state.highPlatformTreasure.claimHoldElapsed;
  if (hold <= 0) return;
  const progress = Math.min(
    1,
    hold / HIGH_PLATFORM_TREASURE_CONFIG.host.claimHoldSeconds,
  );
  ctx.strokeStyle = "#ffe39a";
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.arc(
    x,
    y - CLAIM_RING_Y_OFFSET,
    CLAIM_RING_RADIUS,
    -Math.PI * HALF,
    -Math.PI * HALF + FULL_CIRCLE * progress,
  );
  ctx.stroke();
}

function drawRevealFlash() {
  if (!ctx || !state.treasureReveal) return;
  const reveal = state.treasureReveal;
  const progress = reveal.elapsed / reveal.duration;
  const flash = Math.max(
    0,
    1 - Math.abs(progress - FLASH_PEAK_PROGRESS) / FLASH_PEAK_PROGRESS,
  );
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "#9ceeff";
  ctx.globalAlpha = flash * FLASH_ALPHA;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawTreasureGlow(ctx, {
    x: reveal.x, y: reveal.y, phase: reveal.elapsed * REVEAL_PHASE_SPEED,
    strength: TREASURE_GLOW.readyStrength + flash * TREASURE_GLOW.holdStrength,
    reveal: progress,
  });
  ctx.restore();
}

export function drawHighPlatformTreasure() {
  if (!ctx) return;
  const active = activeTreasurePosition();
  const reveal = state.treasureReveal;
  if (!active && !reveal) return;
  const x = reveal?.x ?? active?.x ?? 0;
  const y = reveal?.y ?? active?.y ?? 0;

  ctx.save();
  drawRevealFlash();
  const alpha = reveal ? 1 : active?.alpha ?? 1;
  drawTreasureSprite(x, y, treasureFrame(), alpha);
  drawClaimHoldRing(x, y);
  ctx.restore();
}
