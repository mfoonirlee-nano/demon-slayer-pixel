import {
  HEIGHT,
  HIGH_PLATFORM_TREASURE_CONFIG,
  MOON_TIDE_TREASURE_SPRITE,
  WIDTH,
} from "../constants";
import { state } from "../game/state";
import { ctx } from "../rendering/context";

const HALF = 0.5;
const FULL_CIRCLE = Math.PI * 2;
const BEAM_WIDTH = 54;
const EDGE_MARKER_INSET = 26;
const EDGE_MARKER_X = WIDTH - EDGE_MARKER_INSET;
const EDGE_MARKER_SIZE = 12;
const MOTES = 8;
const MOTE_ORBIT_SPEED = 0.8;
const MOTE_ORBIT_SPEED_STEP = 0.04;
const MOTE_PHASE_STEP = 2.4;
const MOTE_RADIUS = 18;
const MOTE_RADIUS_STEP = 8;
const MOTE_VARIANTS = 3;
const MOTE_Y_OFFSET = 35;
const MOTE_Y_SPEED = 1.3;
const MOTE_Y_AMPLITUDE = 22;
const LARGE_MOTE_SIZE = 3;
const MOTE_ALPHA = 0.35;
const MOTE_ALPHA_VARIANT = 0.25;
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
const TELEGRAPH_PULSE_BASE = 0.45;
const TELEGRAPH_PULSE_SPEED = 3.2;
const TELEGRAPH_PULSE_AMPLITUDE = 0.12;
const BEAM_OUTER_ALPHA = 0.12;
const BEAM_INNER_ALPHA = 0.16;
const BEAM_INNER_HALF_WIDTH = 14;
const BEAM_INNER_TOP_INSET = 8;
const RING_ALPHA = 0.42;
const RING_Y_OFFSET = 4;
const RING_RADIUS_X = 31;
const RING_RADIUS_Y = 9;
const REVEAL_OPEN_PROGRESS = 0.38;
const OPEN_FRAME = 3;
const UNLOCK_LIT_PROGRESS = 0.55;
const SPRITE_BASELINE_INSET = 5;
const CLAIM_RING_Y_OFFSET = 35;
const CLAIM_RING_RADIUS = 27;
const FLASH_PEAK_PROGRESS = 0.45;
const FLASH_ALPHA = 0.08;
const CORE_FLASH_ALPHA = 0.34;
const CORE_FLASH_RADIUS = 24;
const CORE_FLASH_GROWTH = 72;
const CORE_FLASH_Y_OFFSET = 55;
const REVEAL_PHASE_SPEED = 12;
const ACTIVE_MOTE_STRENGTH = 0.72;
const MARKER_MIN_Y = 62;
const MARKER_BOTTOM_INSET = 74;
const MARKER_Y_OFFSET = 34;
const MARKER_PULSE_BASE = 0.72;
const MARKER_PULSE_SPEED = 6;
const MARKER_PULSE_AMPLITUDE = 0.22;
const MARKER_GLOW_ALPHA = 0.35;
const MARKER_GLOW_HALF_SIZE = 17;
const MARKER_GLOW_SIZE = 34;
const MARKER_CORE_ALPHA = 0.85;
const MARKER_TAIL_OFFSET = 18;
const MARKER_TAIL_WIDTH = 10;
const MARKER_TAIL_HEIGHT = 4;

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

function drawPixelMotes(x: number, y: number, phase: number, strength: number) {
  if (!ctx) return;
  for (let index = 0; index < MOTES; index += 1) {
    const orbit = phase * (MOTE_ORBIT_SPEED + index * MOTE_ORBIT_SPEED_STEP)
      + index * MOTE_PHASE_STEP;
    const radius = MOTE_RADIUS + index % MOTE_VARIANTS * MOTE_RADIUS_STEP;
    const moteX = Math.round(x + Math.cos(orbit) * radius);
    const moteY = Math.round(
      y - MOTE_Y_OFFSET + Math.sin(orbit * MOTE_Y_SPEED) * MOTE_Y_AMPLITUDE,
    );
    const size = index % MOTE_VARIANTS === 0 ? LARGE_MOTE_SIZE : 2;
    ctx.globalAlpha = strength * (MOTE_ALPHA + index % 2 * MOTE_ALPHA_VARIANT);
    ctx.fillStyle = index % MOTE_VARIANTS === 0 ? "#ffd978" : "#8deaff";
    ctx.fillRect(moteX, moteY, size, size);
  }
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

export function drawTreasureTelegraph() {
  if (!ctx) return;
  const position = activeTreasurePosition();
  const treasure = state.highPlatformTreasure;
  if (
    !position
    || !treasure
    || treasure.dismissElapsed !== null
    || position.x > WIDTH + treasure.host.w
  ) return;

  const beamTop = position.y - HIGH_PLATFORM_TREASURE_CONFIG.host.beamHeight;
  const pulse = TELEGRAPH_PULSE_BASE
    + Math.sin(position.phase * TELEGRAPH_PULSE_SPEED) * TELEGRAPH_PULSE_AMPLITUDE;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "#5bdcff";
  ctx.globalAlpha = pulse * BEAM_OUTER_ALPHA;
  ctx.fillRect(position.x - BEAM_WIDTH * HALF, beamTop, BEAM_WIDTH, position.y - beamTop);
  ctx.globalAlpha = pulse * BEAM_INNER_ALPHA;
  ctx.fillRect(
    position.x - BEAM_INNER_HALF_WIDTH,
    beamTop + BEAM_INNER_TOP_INSET,
    BEAM_INNER_HALF_WIDTH * 2,
    position.y - beamTop - BEAM_INNER_TOP_INSET,
  );
  ctx.globalAlpha = pulse * RING_ALPHA;
  ctx.strokeStyle = "#9af1ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(
    position.x,
    position.y - RING_Y_OFFSET,
    RING_RADIUS_X,
    RING_RADIUS_Y,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.stroke();
  drawPixelMotes(position.x, position.y, position.phase, pulse);
  ctx.restore();
  drawPlatformGlow();
}

function treasureFrame() {
  if (state.treasureReveal) {
    const progress = state.treasureReveal.elapsed / state.treasureReveal.duration;
    return progress < REVEAL_OPEN_PROGRESS ? 2 : OPEN_FRAME;
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
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "#9ceeff";
  ctx.globalAlpha = flash * FLASH_ALPHA;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#ffe19a";
  ctx.globalAlpha = flash * CORE_FLASH_ALPHA;
  const radius = CORE_FLASH_RADIUS + progress * CORE_FLASH_GROWTH;
  ctx.fillRect(
    reveal.x - radius,
    reveal.y - CORE_FLASH_Y_OFFSET - radius,
    radius * 2,
    radius * 2,
  );
}

export function drawHighPlatformTreasure() {
  if (!ctx) return;
  const active = activeTreasurePosition();
  const reveal = state.treasureReveal;
  if (!active && !reveal) return;
  const x = reveal?.x ?? active?.x ?? 0;
  const y = reveal?.y ?? active?.y ?? 0;
  const phase = reveal ? reveal.elapsed * REVEAL_PHASE_SPEED : active?.phase ?? 0;

  ctx.save();
  drawRevealFlash();
  const alpha = reveal ? 1 : active?.alpha ?? 1;
  drawPixelMotes(x, y, phase, (reveal ? 1 : ACTIVE_MOTE_STRENGTH) * alpha);
  drawTreasureSprite(x, y, treasureFrame(), alpha);
  drawClaimHoldRing(x, y);
  ctx.restore();
}

export function drawTreasureDirectionMarker() {
  if (!ctx || !state.highPlatformTreasure) return;
  const treasure = state.highPlatformTreasure;
  if (treasure.dismissElapsed !== null) return;
  if (treasure.host.x <= WIDTH) return;
  const markerY = Math.max(
    MARKER_MIN_Y,
    Math.min(HEIGHT - MARKER_BOTTOM_INSET, treasure.host.y - MARKER_Y_OFFSET),
  );
  const pulse = MARKER_PULSE_BASE
    + Math.sin(treasure.phase * MARKER_PULSE_SPEED) * MARKER_PULSE_AMPLITUDE;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = pulse * MARKER_GLOW_ALPHA;
  ctx.fillStyle = "#ffd36a";
  ctx.fillRect(
    EDGE_MARKER_X - MARKER_GLOW_HALF_SIZE,
    markerY - MARKER_GLOW_HALF_SIZE,
    MARKER_GLOW_SIZE,
    MARKER_GLOW_SIZE,
  );
  ctx.globalAlpha = pulse;
  ctx.beginPath();
  ctx.moveTo(EDGE_MARKER_X + EDGE_MARKER_SIZE, markerY);
  ctx.lineTo(EDGE_MARKER_X - EDGE_MARKER_SIZE, markerY - EDGE_MARKER_SIZE);
  ctx.lineTo(EDGE_MARKER_X - EDGE_MARKER_SIZE, markerY + EDGE_MARKER_SIZE);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#bff5ff";
  ctx.globalAlpha = pulse * MARKER_CORE_ALPHA;
  ctx.fillRect(
    EDGE_MARKER_X - MARKER_TAIL_OFFSET,
    markerY - 2,
    MARKER_TAIL_WIDTH,
    MARKER_TAIL_HEIGHT,
  );
  ctx.restore();
}
