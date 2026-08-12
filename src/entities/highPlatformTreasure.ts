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
const ARRIVAL_GLOW_CENTER_INSET = 12;
const ARRIVAL_GLOW_Y_OFFSET = 30;
const ARRIVAL_GLOW_RADIUS = 96;
const ARRIVAL_GLOW_PEAK_PROGRESS = 0.22;
const ARRIVAL_GLOW_SILVER_STOP = 0.13;
const ARRIVAL_GLOW_TIDE_STOP = 0.42;
const ARRIVAL_GLOW_RING_ALPHA = 0.28;
const ARRIVAL_GLOW_RING_RADIUS_X = 58;
const ARRIVAL_GLOW_RING_RADIUS_Y = 43;
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

  const x = WIDTH + ARRIVAL_GLOW_CENTER_INSET;
  const y = treasure.host.y - ARRIVAL_GLOW_Y_OFFSET;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, ARRIVAL_GLOW_RADIUS);
  gradient.addColorStop(0, "rgba(255, 220, 132, 0.56)");
  gradient.addColorStop(ARRIVAL_GLOW_SILVER_STOP, "rgba(226, 248, 255, 0.50)");
  gradient.addColorStop(ARRIVAL_GLOW_TIDE_STOP, "rgba(86, 216, 255, 0.32)");
  gradient.addColorStop(1, "rgba(64, 155, 255, 0)");

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = strength;
  ctx.fillStyle = gradient;
  ctx.fillRect(
    x - ARRIVAL_GLOW_RADIUS,
    y - ARRIVAL_GLOW_RADIUS,
    ARRIVAL_GLOW_RADIUS * 2,
    ARRIVAL_GLOW_RADIUS * 2,
  );
  ctx.globalAlpha = strength * ARRIVAL_GLOW_RING_ALPHA;
  ctx.strokeStyle = "#bff5ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    ARRIVAL_GLOW_RING_RADIUS_X,
    ARRIVAL_GLOW_RING_RADIUS_Y,
    0,
    0,
    FULL_CIRCLE,
  );
  ctx.stroke();
  drawPixelMotes(
    x,
    y + MOTE_Y_OFFSET,
    progress * ARRIVAL_GLOW_MOTE_PHASE_SPEED,
    strength * ARRIVAL_GLOW_MOTE_STRENGTH,
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
  ) return;
  drawTreasureArrivalGlow();
  if (position.x > WIDTH + treasure.host.w) return;

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
