import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setCanvas } from "../../rendering/context";
import type { EnemyState } from "../../types/game-state";
import { BRUTE_ARCHETYPE } from "./brute";
import { BURROWER_ARCHETYPE } from "./burrower";
import { CHASER_ARCHETYPE } from "./chaser";
import { CRAWLER_ARCHETYPE } from "./crawler";
import { DUELIST_ARCHETYPE } from "./duelist";
import { GLIDER_ARCHETYPE } from "./glider";

type FillRectCall = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const BAR_MIN_WIDTH = 30;
const BAR_MAX_HEIGHT = 8;
const BASE_ENEMY: EnemyState = {
  id: "chaser",
  spawnSource: "regular",
  spawnCost: 1,
  aiState: "move",
  aiTimer: 0,
  x: 300,
  y: 420,
  w: 48,
  h: 72,
  vx: 0,
  hp: 10,
  damage: 4,
  hitCd: 0,
  animSeed: 0,
  sheetIndex: 0,
};

let fillRects: FillRectCall[] = [];

function enemy(overrides: Partial<EnemyState>): EnemyState {
  return {
    ...BASE_ENEMY,
    ...overrides,
  };
}

function barLikeFillRects() {
  return fillRects.filter((rect) => rect.w >= BAR_MIN_WIDTH && rect.h <= BAR_MAX_HEIGHT);
}

function installCanvasContext() {
  const context = {
    imageSmoothingEnabled: false,
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
    filter: "none",
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {},
    ellipse() {},
    stroke() {},
    fill() {},
    drawImage() {},
    fillRect(x: number, y: number, w: number, h: number) {
      fillRects.push({ x, y, w, h });
    },
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    getContext() {
      return context;
    },
  } as unknown as HTMLCanvasElement;

  setCanvas(canvas);
}

describe("enemy charge indicators", () => {
  beforeEach(() => {
    fillRects = [];
    installCanvasContext();
  });

  afterEach(() => {
    setCanvas(null);
  });

  it("does not draw visible progress bars during enemy charge phases", () => {
    CHASER_ARCHETYPE.draw(enemy({
      chaserPhase: "reenter",
      chaserTimer: 12,
      chaserReenterDuration: 24,
      chaserFacing: 1,
    }));
    CRAWLER_ARCHETYPE.draw(enemy({
      id: "crawler",
      sheetIndex: 1,
      crawlerPhase: "windup",
      crawlerTimer: 7,
      crawlerFacing: 1,
    }));
    DUELIST_ARCHETYPE.draw(enemy({
      id: "duelist",
      sheetIndex: 4,
      duelistPhase: "windup",
      duelistTimer: 11,
      duelistFacing: 1,
    }));
    BRUTE_ARCHETYPE.draw(enemy({
      id: "brute",
      sheetIndex: 5,
      brutePhase: "guard",
      bruteTimer: 13,
      bruteFacing: 1,
    }));
    GLIDER_ARCHETYPE.draw(enemy({
      id: "glider",
      sheetIndex: 7,
      gliderPhase: "windup",
      gliderTimer: 17,
      gliderFacing: 1,
      gliderDiveVy: 0,
    }));
    BURROWER_ARCHETYPE.draw(enemy({
      id: "burrower",
      sheetIndex: 11,
      burrowerPhase: "burrow",
      burrowerTimer: 3,
      burrowerPhaseDuration: 8,
      burrowerTargetX: 420,
      burrowerFacing: 1,
    }));

    expect(barLikeFillRects()).toEqual([]);
  });
});
