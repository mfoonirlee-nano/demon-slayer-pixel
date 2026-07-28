import type { RectLike } from "./utils";

export type CollisionDebugRole =
  | "player"
  | "enemy"
  | "boss"
  | "terrain"
  | "pickup"
  | "playerAttack"
  | "enemyAttack"
  | "supportRange"
  | "other";

type CollisionDebugRect = RectLike & {
  type: "rect";
  role: CollisionDebugRole;
};

type CollisionDebugEllipse = {
  type: "ellipse";
  role: CollisionDebugRole;
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
};

type CollisionDebugRing = {
  type: "ring";
  role: CollisionDebugRole;
  centerX: number;
  centerY: number;
  radius: number;
  thickness: number;
};

type CollisionDebugSegment = {
  type: "segment";
  role: CollisionDebugRole;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type CollisionDebugPoint = {
  type: "point";
  role: CollisionDebugRole;
  x: number;
  y: number;
};

type CollisionDebugRecord =
  | CollisionDebugRect
  | CollisionDebugEllipse
  | CollisionDebugRing
  | CollisionDebugSegment
  | CollisionDebugPoint;

const ROLE_STROKE_COLOR: Record<CollisionDebugRole, string> = {
  player: "#00ff66",
  enemy: "#ff334d",
  boss: "#ff9500",
  terrain: "#00e5ff",
  pickup: "#fff200",
  playerAttack: "#ff4dff",
  enemyAttack: "#ff1744",
  supportRange: "#8c7bff",
  other: "#ffffff",
};

const FULL_CIRCLE = Math.PI * 2;
const DEBUG_LINE_WIDTH = 2;
const DEBUG_POINT_RADIUS = 3;
const DEFAULT_ROLE: CollisionDebugRole = "other";

let isCollisionDebugEnabled = false;
let records: CollisionDebugRecord[] = [];
const recordKeys = new Set<string>();

function addCollisionDebugRecord(
  record: CollisionDebugRecord,
  geometry: readonly number[],
) {
  if (!isCollisionDebugEnabled) return;
  const key = JSON.stringify([record.type, record.role, ...geometry]);
  if (recordKeys.has(key)) return;
  recordKeys.add(key);
  records.push(record);
}

export function beginCollisionDebugFrame(enabled: boolean) {
  isCollisionDebugEnabled = enabled;
  records = [];
  recordKeys.clear();
}

export function recordCollisionDebugRect(
  rect: RectLike,
  role: CollisionDebugRole = DEFAULT_ROLE,
) {
  if (!isCollisionDebugEnabled) return;
  const record: CollisionDebugRect = {
    type: "rect",
    role,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
  };
  addCollisionDebugRecord(record, [record.x, record.y, record.w, record.h]);
}

export function recordCollisionDebugEllipse(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  role: CollisionDebugRole = DEFAULT_ROLE,
) {
  if (!isCollisionDebugEnabled) return;
  const record: CollisionDebugEllipse = {
    type: "ellipse",
    role,
    centerX,
    centerY,
    radiusX,
    radiusY,
  };
  addCollisionDebugRecord(record, [centerX, centerY, radiusX, radiusY]);
}

export function recordCollisionDebugRing(
  centerX: number,
  centerY: number,
  radius: number,
  thickness: number,
  role: CollisionDebugRole = DEFAULT_ROLE,
) {
  if (!isCollisionDebugEnabled) return;
  const record: CollisionDebugRing = {
    type: "ring",
    role,
    centerX,
    centerY,
    radius,
    thickness,
  };
  addCollisionDebugRecord(record, [centerX, centerY, radius, thickness]);
}

export function recordCollisionDebugSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  role: CollisionDebugRole = DEFAULT_ROLE,
) {
  if (!isCollisionDebugEnabled) return;
  const record: CollisionDebugSegment = { type: "segment", role, x1, y1, x2, y2 };
  addCollisionDebugRecord(record, [x1, y1, x2, y2]);
}

export function recordCollisionDebugPoint(
  x: number,
  y: number,
  role: CollisionDebugRole = DEFAULT_ROLE,
) {
  if (!isCollisionDebugEnabled) return;
  const record: CollisionDebugPoint = { type: "point", role, x, y };
  addCollisionDebugRecord(record, [x, y]);
}

function drawCollisionDebugRecord(
  context: CanvasRenderingContext2D,
  record: CollisionDebugRecord,
) {
  context.strokeStyle = ROLE_STROKE_COLOR[record.role];
  context.fillStyle = ROLE_STROKE_COLOR[record.role];
  context.lineWidth = DEBUG_LINE_WIDTH;

  if (record.type === "rect") {
    context.strokeRect(record.x, record.y, record.w, record.h);
    return;
  }

  context.beginPath();
  if (record.type === "ellipse") {
    context.ellipse(
      record.centerX,
      record.centerY,
      record.radiusX,
      record.radiusY,
      0,
      0,
      FULL_CIRCLE,
    );
    context.stroke();
    return;
  }
  if (record.type === "ring") {
    const outerRadius = record.radius + record.thickness;
    context.arc(record.centerX, record.centerY, outerRadius, 0, FULL_CIRCLE);
    context.stroke();
    const innerRadius = Math.max(0, record.radius - record.thickness);
    if (innerRadius > 0) {
      context.beginPath();
      context.arc(record.centerX, record.centerY, innerRadius, 0, FULL_CIRCLE);
      context.stroke();
    }
    return;
  }
  if (record.type === "segment") {
    context.moveTo(record.x1, record.y1);
    context.lineTo(record.x2, record.y2);
    context.stroke();
    return;
  }
  context.arc(record.x, record.y, DEBUG_POINT_RADIUS, 0, FULL_CIRCLE);
  context.fill();
}

export function drawCollisionDebug(context: CanvasRenderingContext2D) {
  if (records.length === 0) return;
  context.save();
  try {
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.lineCap = "round";
    context.lineJoin = "round";
    // Shared AABB checks can duplicate semantic geometry; paint generic records
    // first so the role-specific color remains visible on top.
    for (const record of records) {
      if (record.role === DEFAULT_ROLE) {
        drawCollisionDebugRecord(context, record);
      }
    }
    for (const record of records) {
      if (record.role !== DEFAULT_ROLE) {
        drawCollisionDebugRecord(context, record);
      }
    }
  } finally {
    context.restore();
  }
}
