import { describe, expect, it, vi } from "vitest";
import { drawTreasureGlow } from "./treasureGlow";

const POSITION = { x: 300, y: 250, phase: 2.4, strength: 1 };
const REVEAL_MIDPOINT = 0.65;
const INITIAL_ALPHA = 0.37;

function recordingContext() {
  const commands: number[][] = [];
  const gradient = { addColorStop: vi.fn() };
  const stack: { alpha: number; blend: GlobalCompositeOperation; width: number }[] = [];
  const context = {
    globalAlpha: INITIAL_ALPHA,
    globalCompositeOperation: "source-over",
    lineWidth: 2,
    createRadialGradient: vi.fn(() => gradient),
    createLinearGradient: vi.fn(() => gradient),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn((...values: number[]) => commands.push(values)),
    lineTo: vi.fn((...values: number[]) => commands.push(values)),
    fillRect: vi.fn((...values: number[]) => commands.push(values)),
    save: vi.fn(() => stack.push({ alpha: context.globalAlpha, blend: context.globalCompositeOperation, width: context.lineWidth })),
    restore: vi.fn(() => {
      const saved = stack.pop();
      if (saved) {
        context.globalAlpha = saved.alpha;
        context.globalCompositeOperation = saved.blend;
        context.lineWidth = saved.width;
      }
    }),
  } as unknown as CanvasRenderingContext2D;
  return { context, commands, stack };
}

describe("treasure light", () => {
  it("freezes its animation with the supplied gameplay phase", () => {
    const first = recordingContext();
    const second = recordingContext();
    drawTreasureGlow(first.context, POSITION);
    drawTreasureGlow(second.context, POSITION);
    expect(first.commands).toEqual(second.commands);
    const moved = recordingContext();
    drawTreasureGlow(moved.context, { ...POSITION, phase: POSITION.phase + 1 });
    expect(moved.commands).not.toEqual(first.commands);
  });

  it("leaves the next scene draw's blend, opacity and line width intact", () => {
    const { context, commands, stack } = recordingContext();
    drawTreasureGlow(context, { ...POSITION, hold: 1, reveal: REVEAL_MIDPOINT });
    expect(context.globalAlpha).toBe(INITIAL_ALPHA);
    expect(context.globalCompositeOperation).toBe("source-over");
    expect(context.lineWidth).toBe(2);
    expect(stack).toEqual([]);
    expect(commands.flat().every(Number.isFinite)).toBe(true);
  });

  it("disperses the opening rings before the reward choice freezes the final frame", () => {
    const closed = recordingContext();
    const opening = recordingContext();
    const settled = recordingContext();
    drawTreasureGlow(closed.context, { ...POSITION, reveal: 0 });
    drawTreasureGlow(opening.context, { ...POSITION, reveal: REVEAL_MIDPOINT });
    drawTreasureGlow(settled.context, { ...POSITION, reveal: 1 });
    expect(vi.mocked(opening.context.stroke).mock.calls.length)
      .toBeGreaterThan(vi.mocked(closed.context.stroke).mock.calls.length);
    expect(vi.mocked(settled.context.stroke).mock.calls.length)
      .toBe(vi.mocked(closed.context.stroke).mock.calls.length);
  });
});
