export let canvas: HTMLCanvasElement | null = null;
export let ctx: CanvasRenderingContext2D | null = null;
export let canvasBackingScale = 1;

export function setCanvas(nextCanvas: HTMLCanvasElement | null, nextCanvasBackingScale = 1) {
  canvas = nextCanvas;
  ctx = nextCanvas?.getContext("2d") ?? null;
  canvasBackingScale = nextCanvas ? nextCanvasBackingScale : 1;
  if (ctx) {
    if (typeof ctx.setTransform === "function") {
      ctx.setTransform(canvasBackingScale, 0, 0, canvasBackingScale, 0, 0);
    }
    ctx.imageSmoothingEnabled = false;
  }
}
