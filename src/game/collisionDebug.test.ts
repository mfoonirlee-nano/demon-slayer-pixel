import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginCollisionDebugFrame,
  drawCollisionDebug,
  recordCollisionDebugEllipse,
  recordCollisionDebugPoint,
  recordCollisionDebugRect,
  recordCollisionDebugRing,
  recordCollisionDebugSegment,
} from "./collisionDebug";

type TestContext = CanvasRenderingContext2D & {
  arc: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  ellipse: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  strokeRect: ReturnType<typeof vi.fn>;
  strokeStyleValues: string[];
};

const TEST_RECT = { x: 10, y: 20, w: 30, h: 40 };
const TEST_ELLIPSE = {
  centerX: 50,
  centerY: 60,
  radiusX: 12,
  radiusY: 8,
};
const TEST_RING = {
  centerX: 80,
  centerY: 90,
  radius: 25,
  thickness: 6,
};
const EXPECTED_RING_OUTER_RADIUS = 31;
const EXPECTED_RING_INNER_RADIUS = 19;
const EXPECTED_BEGIN_PATH_COUNT = 5;
const EXPECTED_STROKE_COUNT = 4;
const TEST_SEGMENT = { x1: 3, y1: 4, x2: 13, y2: 14 };
const TEST_POINT = { x: 100, y: 110 };
const EXPECTED_POINT_DRAW_RADIUS = 3;
const MIN_DISTINCT_ROLE_COLORS = 4;
const ERROR_RECT = { x: 1, y: 2, w: 3, h: 4 };

function createContext(): TestContext {
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  } as unknown as TestContext;
  const strokeStyleValues: string[] = [];
  Object.defineProperty(context, "strokeStyle", {
    set: (value: string | CanvasGradient | CanvasPattern) => {
      strokeStyleValues.push(String(value));
    },
  });
  context.strokeStyleValues = strokeStyleValues;
  return context;
}

describe("collision debug recording", () => {
  beforeEach(() => {
    beginCollisionDebugFrame(false);
  });

  it("records only enabled frames, clears between frames, and deduplicates by geometry and role", () => {
    const context = createContext();

    recordCollisionDebugRect(TEST_RECT, "player");
    drawCollisionDebug(context);
    expect(context.strokeRect).not.toHaveBeenCalled();

    beginCollisionDebugFrame(true);
    recordCollisionDebugRect(TEST_RECT, "player");
    recordCollisionDebugRect(TEST_RECT, "player");
    recordCollisionDebugRect(TEST_RECT, "enemy");
    drawCollisionDebug(context);
    expect(context.strokeRect).toHaveBeenCalledTimes(2);

    context.strokeRect.mockClear();
    beginCollisionDebugFrame(true);
    drawCollisionDebug(context);
    expect(context.strokeRect).not.toHaveBeenCalled();
  });

  it("draws every supported geometry with high-contrast role colors", () => {
    const context = createContext();

    beginCollisionDebugFrame(true);
    recordCollisionDebugRect(TEST_RECT, "player");
    recordCollisionDebugEllipse(
      TEST_ELLIPSE.centerX,
      TEST_ELLIPSE.centerY,
      TEST_ELLIPSE.radiusX,
      TEST_ELLIPSE.radiusY,
      "enemy",
    );
    recordCollisionDebugRing(
      TEST_RING.centerX,
      TEST_RING.centerY,
      TEST_RING.radius,
      TEST_RING.thickness,
      "boss",
    );
    recordCollisionDebugSegment(
      TEST_SEGMENT.x1,
      TEST_SEGMENT.y1,
      TEST_SEGMENT.x2,
      TEST_SEGMENT.y2,
      "terrain",
    );
    recordCollisionDebugPoint(TEST_POINT.x, TEST_POINT.y, "pickup");
    drawCollisionDebug(context);

    expect(context.strokeRect).toHaveBeenCalledWith(
      TEST_RECT.x,
      TEST_RECT.y,
      TEST_RECT.w,
      TEST_RECT.h,
    );
    expect(context.ellipse).toHaveBeenCalledWith(
      TEST_ELLIPSE.centerX,
      TEST_ELLIPSE.centerY,
      TEST_ELLIPSE.radiusX,
      TEST_ELLIPSE.radiusY,
      0,
      0,
      Math.PI * 2,
    );
    expect(context.arc).toHaveBeenCalledWith(
      TEST_RING.centerX,
      TEST_RING.centerY,
      EXPECTED_RING_OUTER_RADIUS,
      0,
      Math.PI * 2,
    );
    expect(context.arc).toHaveBeenCalledWith(
      TEST_RING.centerX,
      TEST_RING.centerY,
      EXPECTED_RING_INNER_RADIUS,
      0,
      Math.PI * 2,
    );
    expect(context.beginPath).toHaveBeenCalledTimes(EXPECTED_BEGIN_PATH_COUNT);
    expect(context.stroke).toHaveBeenCalledTimes(EXPECTED_STROKE_COUNT);
    expect(context.moveTo).toHaveBeenCalledWith(TEST_SEGMENT.x1, TEST_SEGMENT.y1);
    expect(context.lineTo).toHaveBeenCalledWith(TEST_SEGMENT.x2, TEST_SEGMENT.y2);
    expect(context.arc).toHaveBeenCalledWith(
      TEST_POINT.x,
      TEST_POINT.y,
      EXPECTED_POINT_DRAW_RADIUS,
      0,
      Math.PI * 2,
    );
    expect(new Set(context.strokeStyleValues).size)
      .toBeGreaterThanOrEqual(MIN_DISTINCT_ROLE_COLORS);
  });

  it("draws other roles before semantic roles without changing their recording order", () => {
    const context = createContext();

    beginCollisionDebugFrame(true);
    recordCollisionDebugRect(TEST_RECT, "pickup");
    drawCollisionDebug(context);
    const pickupStyle = context.strokeStyleValues[context.strokeStyleValues.length - 1];

    beginCollisionDebugFrame(true);
    recordCollisionDebugRect(TEST_RECT);
    drawCollisionDebug(context);
    const otherStyle = context.strokeStyleValues[context.strokeStyleValues.length - 1];
    expect(pickupStyle).not.toBe(otherStyle);

    context.strokeStyleValues.length = 0;
    beginCollisionDebugFrame(true);
    recordCollisionDebugRect(TEST_RECT, "pickup");
    recordCollisionDebugRect(TEST_RECT);
    drawCollisionDebug(context);

    expect(context.strokeStyleValues).toEqual([otherStyle, pickupStyle]);
  });

  it("restores the canvas state when drawing fails", () => {
    const context = createContext();
    context.strokeRect.mockImplementation(() => {
      throw new Error("canvas draw failed");
    });

    beginCollisionDebugFrame(true);
    recordCollisionDebugRect(ERROR_RECT);

    expect(() => drawCollisionDebug(context)).toThrow("canvas draw failed");
    expect(context.save).toHaveBeenCalledOnce();
    expect(context.restore).toHaveBeenCalledOnce();
  });
});
