import { ctx } from "./context";
import { CLOUD_SPRITES, WIDTH } from "./constants";
import type { MoonState } from "./moon";

type CloudKind = "big" | "small";

type CloudLayer = {
  kind: CloudKind;
  frame: number;
  x: number;
  y: number;
  scale: number;
  speed: number;
  alpha: number;
};

const CLOUDS: CloudLayer[] = [
  { kind: "big", frame: 0, x: 40, y: 34, scale: 0.38, speed: 4.2, alpha: 0.6 },
  { kind: "big", frame: 7, x: 360, y: 92, scale: 0.32, speed: 5.4, alpha: 0.52 },
  { kind: "big", frame: 18, x: 740, y: 22, scale: 0.35, speed: 4.8, alpha: 0.55 },
  { kind: "big", frame: 24, x: 980, y: 124, scale: 0.28, speed: 6.2, alpha: 0.46 },
  { kind: "small", frame: 1, x: 120, y: 150, scale: 0.72, speed: 15, alpha: 0.58 },
  { kind: "small", frame: 6, x: 390, y: 68, scale: 0.58, speed: 19, alpha: 0.46 },
  { kind: "small", frame: 12, x: 690, y: 132, scale: 0.66, speed: 17, alpha: 0.5 },
  { kind: "small", frame: 20, x: 930, y: 180, scale: 0.5, speed: 22, alpha: 0.42 },
];

const SPRITE_LAYOUT: Record<CloudKind, { cols: number; rows: number }> = {
  big: { cols: 5, rows: 5 },
  small: { cols: 7, rows: 3 },
};

const NIGHT_TINT = { r: 92, g: 96, b: 108, a: 0.42 };
const BLOOD_TINT = { r: 142, g: 32, b: 42, alphaBoost: 0.28 };

const scratch = document.createElement("canvas");
const scratchCtx = scratch.getContext("2d");

function cloudImage(kind: CloudKind): HTMLImageElement | null {
  return kind === "big" ? CLOUD_SPRITES.big.image : CLOUD_SPRITES.small.image;
}

function cloudFrame(kind: CloudKind, frame: number, image: HTMLImageElement) {
  const layout = SPRITE_LAYOUT[kind];
  const frameW = image.width / layout.cols;
  const frameH = image.height / layout.rows;
  const frameCount = layout.cols * layout.rows;
  const safeFrame = ((frame % frameCount) + frameCount) % frameCount;
  return {
    sx: (safeFrame % layout.cols) * frameW,
    sy: Math.floor(safeFrame / layout.cols) * frameH,
    sw: frameW,
    sh: frameH,
  };
}

function tintColor(bloodLerp: number): string {
  if (bloodLerp <= 0) return `rgba(${NIGHT_TINT.r}, ${NIGHT_TINT.g}, ${NIGHT_TINT.b}, ${NIGHT_TINT.a})`;
  const r = Math.round(NIGHT_TINT.r + (BLOOD_TINT.r - NIGHT_TINT.r) * bloodLerp);
  const g = Math.round(NIGHT_TINT.g + (BLOOD_TINT.g - NIGHT_TINT.g) * bloodLerp);
  const b = Math.round(NIGHT_TINT.b + (BLOOD_TINT.b - NIGHT_TINT.b) * bloodLerp);
  const a = NIGHT_TINT.a + bloodLerp * BLOOD_TINT.alphaBoost;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function drawTintedCloud(
  image: HTMLImageElement,
  source: { sx: number; sy: number; sw: number; sh: number },
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
  bloodLerp: number,
) {
  if (!ctx || !scratchCtx) return;

  scratch.width = Math.max(1, Math.ceil(width));
  scratch.height = Math.max(1, Math.ceil(height));
  scratchCtx.clearRect(0, 0, scratch.width, scratch.height);
  scratchCtx.save();
  scratchCtx.globalAlpha = alpha;
  scratchCtx.filter = bloodLerp > 0
    ? "grayscale(0.65) brightness(0.58) contrast(1.08)"
    : "grayscale(1) brightness(0.54) contrast(0.95)";
  scratchCtx.drawImage(
    image,
    source.sx,
    source.sy,
    source.sw,
    source.sh,
    0,
    0,
    scratch.width,
    scratch.height,
  );
  scratchCtx.filter = "none";
  scratchCtx.globalCompositeOperation = "source-atop";
  scratchCtx.fillStyle = tintColor(bloodLerp);
  scratchCtx.fillRect(0, 0, scratch.width, scratch.height);
  scratchCtx.restore();

  ctx.drawImage(scratch, x, y, scratch.width, scratch.height);
}

export function drawClouds(options: { elapsed: number; moon: MoonState }) {
  const context = ctx;
  if (!context) return;

  const bloodLerp = options.moon.bloodLerp;

  for (const cloud of CLOUDS) {
    const image = cloudImage(cloud.kind);
    if (!image) continue;

    const frame = cloudFrame(cloud.kind, cloud.frame, image);
    const drawW = frame.sw * cloud.scale;
    const drawH = frame.sh * cloud.scale;
    const span = WIDTH + drawW;
    const x = ((cloud.x - options.elapsed * cloud.speed) % span + span) % span - drawW;

    drawTintedCloud(image, frame, x, cloud.y, drawW, drawH, cloud.alpha, bloodLerp);
  }
}
