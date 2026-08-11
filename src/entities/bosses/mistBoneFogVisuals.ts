import { MIST_BONE_FOG_SHEETS } from "../../constants";
import { ctx } from "../../rendering/context";
import { drawSheetFrame } from "../../rendering/graphics";

type MistBoneFogStackKind = "thin" | "burial" | "aura";
type MistBoneFogVariant = 0 | 1 | 2;

type MistBoneFogLayer = {
  variant: MistBoneFogVariant;
  xOffset: number;
  bottomLift: number;
  widthScale: number;
  heightScale: number;
  alpha: number;
  phaseOffset: number;
  facing?: -1 | 1;
};

type DrawMistBoneFogStackOptions = {
  kind: MistBoneFogStackKind;
  centerX: number;
  bottomY: number;
  width: number;
  height: number;
  elapsedFrames: number;
  phaseSeed: number;
  alpha: number;
};

type DrawMistBoneFogSpriteOptions = {
  variant: number;
  centerX: number;
  centerY: number;
  drawW: number;
  drawH: number;
  elapsedFrames: number;
  phaseOffset: number;
  alpha: number;
  facing?: -1 | 1;
};

const VEIL_FRAME_DURATION = 8;
const ROLL_FRAME_DURATION = 7;
const WISP_FRAME_DURATION = 9;
const FOG_FRAME_DURATIONS = [
  VEIL_FRAME_DURATION,
  ROLL_FRAME_DURATION,
  WISP_FRAME_DURATION,
] as const;

const THIN_FOG_LAYERS = [
  { variant: 0, xOffset: 0, bottomLift: 0, widthScale: 1.05, heightScale: 0.92, alpha: 0.52, phaseOffset: 0 },
  { variant: 1, xOffset: -0.2, bottomLift: 0.02, widthScale: 0.72, heightScale: 1.12, alpha: 0.36, phaseOffset: 13 },
  { variant: 1, xOffset: 0.22, bottomLift: 0.04, widthScale: 0.68, heightScale: 1.04, alpha: 0.32, phaseOffset: 31, facing: -1 },
  { variant: 2, xOffset: 0, bottomLift: 0.02, widthScale: 0.44, heightScale: 1.25, alpha: 0.25, phaseOffset: 47 },
] as const satisfies readonly MistBoneFogLayer[];

const BURIAL_FOG_LAYERS = [
  { variant: 0, xOffset: -0.18, bottomLift: 0, widthScale: 0.72, heightScale: 0.44, alpha: 0.48, phaseOffset: 0 },
  { variant: 0, xOffset: 0.18, bottomLift: 0.03, widthScale: 0.72, heightScale: 0.44, alpha: 0.42, phaseOffset: 19, facing: -1 },
  { variant: 1, xOffset: -0.3, bottomLift: 0.04, widthScale: 0.55, heightScale: 0.56, alpha: 0.34, phaseOffset: 7 },
  { variant: 1, xOffset: 0, bottomLift: 0.16, widthScale: 0.62, heightScale: 0.6, alpha: 0.38, phaseOffset: 29, facing: -1 },
  { variant: 1, xOffset: 0.3, bottomLift: 0.06, widthScale: 0.55, heightScale: 0.56, alpha: 0.34, phaseOffset: 43 },
  { variant: 2, xOffset: -0.25, bottomLift: 0.3, widthScale: 0.28, heightScale: 0.52, alpha: 0.25, phaseOffset: 11 },
  { variant: 2, xOffset: 0, bottomLift: 0.38, widthScale: 0.3, heightScale: 0.56, alpha: 0.28, phaseOffset: 37, facing: -1 },
  { variant: 2, xOffset: 0.25, bottomLift: 0.28, widthScale: 0.28, heightScale: 0.52, alpha: 0.25, phaseOffset: 53 },
] as const satisfies readonly MistBoneFogLayer[];

const AURA_FOG_LAYERS = [
  { variant: 0, xOffset: 0, bottomLift: 0, widthScale: 0.95, heightScale: 0.55, alpha: 0.48, phaseOffset: 0 },
  { variant: 1, xOffset: -0.2, bottomLift: 0.04, widthScale: 0.68, heightScale: 0.86, alpha: 0.34, phaseOffset: 17 },
  { variant: 1, xOffset: 0.22, bottomLift: 0.02, widthScale: 0.64, heightScale: 0.8, alpha: 0.32, phaseOffset: 41, facing: -1 },
  { variant: 2, xOffset: 0, bottomLift: 0.18, widthScale: 0.42, heightScale: 1.05, alpha: 0.28, phaseOffset: 61 },
] as const satisfies readonly MistBoneFogLayer[];

const FOG_STACK_LAYERS = {
  thin: THIN_FOG_LAYERS,
  burial: BURIAL_FOG_LAYERS,
  aura: AURA_FOG_LAYERS,
} as const satisfies Record<MistBoneFogStackKind, readonly MistBoneFogLayer[]>;

export function drawMistBoneFogStack(options: DrawMistBoneFogStackOptions) {
  const layers: readonly MistBoneFogLayer[] = FOG_STACK_LAYERS[options.kind];
  for (const layer of layers) {
    const drawW = options.width * layer.widthScale;
    const drawH = options.height * layer.heightScale;
    drawMistBoneFogSprite({
      variant: layer.variant,
      centerX: options.centerX + options.width * layer.xOffset,
      centerY: options.bottomY - options.height * layer.bottomLift - drawH / 2,
      drawW,
      drawH,
      elapsedFrames: options.elapsedFrames,
      phaseOffset: options.phaseSeed + layer.phaseOffset,
      alpha: options.alpha * layer.alpha,
      facing: layer.facing,
    });
  }
}

export function drawMistBoneFogSprite(options: DrawMistBoneFogSpriteOptions) {
  if (!ctx || options.alpha <= 0) return;
  const variant = mistBoneFogVariant(options.variant);
  const sheet = MIST_BONE_FOG_SHEETS[variant];
  const frameDuration = FOG_FRAME_DURATIONS[variant];
  const frame = Math.floor(
    (Math.max(0, options.elapsedFrames) + Math.max(0, options.phaseOffset))
      / frameDuration,
  ) % sheet.count;

  ctx.save();
  ctx.globalAlpha *= Math.min(1, options.alpha);
  drawSheetFrame(
    sheet,
    frame,
    options.centerX - options.drawW / 2,
    options.centerY - options.drawH / 2,
    options.drawW,
    options.drawH,
    options.facing,
  );
  ctx.restore();
}

function mistBoneFogVariant(index: number): MistBoneFogVariant {
  const normalized = ((Math.floor(index) % MIST_BONE_FOG_SHEETS.length)
    + MIST_BONE_FOG_SHEETS.length) % MIST_BONE_FOG_SHEETS.length;
  if (normalized === 1) return 1;
  if (normalized === 2) return 2;
  return 0;
}
