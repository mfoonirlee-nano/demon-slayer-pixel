import { afterEach, describe, expect, it, vi } from "vitest";
import { canvasBackingScale, ctx, setCanvas } from "./context";

describe("rendering context", () => {
  afterEach(() => {
    setCanvas(null);
  });

  it("scales the canvas context while preserving pixel-art sampling", () => {
    const context = {
      imageSmoothingEnabled: true,
      setTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const scale = 2.5;

    setCanvas({
      getContext: () => context,
    } as unknown as HTMLCanvasElement, scale);

    expect(ctx).toBe(context);
    expect(canvasBackingScale).toBe(scale);
    expect(context.setTransform).toHaveBeenCalledWith(scale, 0, 0, scale, 0, 0);
    expect(context.imageSmoothingEnabled).toBe(false);
  });
});
