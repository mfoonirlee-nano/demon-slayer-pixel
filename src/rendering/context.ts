export let canvas: HTMLCanvasElement | null = null;
export let ctx: CanvasRenderingContext2D | null = null;

export function setCanvas(nextCanvas: HTMLCanvasElement | null) {
  canvas = nextCanvas;
  ctx = nextCanvas?.getContext("2d") ?? null;
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }
}
