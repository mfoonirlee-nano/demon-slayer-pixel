import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spriteImageLoadTargets } from "../../assets/manifest";
import { TIDE_WEAVE_SURGE_SHEET, TIDE_WEAVE_SWEEP_SHEET } from "../../constants";
import { EQUIPMENT_REACTIONS as CONFIG } from "../../constants/equipmentReactions";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { EquipmentReactionEffectKind } from "../../types/game/equipmentReactions";
import { drawEquipmentReactionCues, drawEquipmentReactionEffects } from "./equipmentReactionVisuals";

const TEST_IMAGE = {} as HTMLImageElement;
const PEAK_FRAME = 2;
const DRAW_DESTINATION_INDEX = 5;
const SWEEP_PEAK_ALPHA = { width: 174, height: 158 } as const;
const PEAK_ALPHA_BOUNDS = {
  sweep: { left: 41, top: 69, right: 215, bottom: 227 },
  surge: { left: 24, top: 106, right: 228, bottom: 227 },
  rupture: { left: 24, top: 106, right: 228, bottom: 227 },
} as const;
const drawImage = vi.fn();
const translate = vi.fn();
const scale = vi.fn();
const ellipse = vi.fn();
const stroke = vi.fn();

function effect(kind: EquipmentReactionEffectKind, elapsed = 0) {
  const config = CONFIG[kind];
  const result = {
    kind, x: 300, y: 300, w: config.width, h: config.height,
    facing: -1, vx: config.speed, elapsed, life: config.lifeFrames - elapsed, maxLife: config.lifeFrames,
    damage: 10, bossDamage: 10, hitEnemies: [], hitBoss: null,
  };
  state.equipmentReactions.effects.push(result);
  return result;
}

beforeEach(() => {
  resetState();
  vi.clearAllMocks();
  setCanvas({ getContext: () => ({
    drawImage, translate, scale, ellipse, stroke, beginPath: vi.fn(),
    save: vi.fn(), restore: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
  }) } as unknown as HTMLCanvasElement);
  for (const sheet of [TIDE_WEAVE_SWEEP_SHEET, TIDE_WEAVE_SURGE_SHEET]) {
    const targets = spriteImageLoadTargets().filter((target) => target.src === sheet.src);
    expect(targets).toHaveLength(1);
    targets[0].setImage(TEST_IMAGE);
  }
});

afterEach(() => {
  TIDE_WEAVE_SWEEP_SHEET.image = null;
  TIDE_WEAVE_SURGE_SHEET.image = null;
  setCanvas(null);
});

describe("equipment reaction readability", () => {
  it.each(["surge", "rupture"] as const)("aligns the %s peak with its different impact time", (kind) => {
    const burst = effect(kind, CONFIG[kind].impactFrame);
    drawEquipmentReactionEffects();
    expect(drawImage).toHaveBeenCalledOnce();
    expect(drawImage.mock.calls[0][1]).toBe(PEAK_FRAME * TIDE_WEAVE_SURGE_SHEET.frameW);
    expect(translate).toHaveBeenCalledWith(burst.x, burst.y + burst.h / 2);
    expect(scale).toHaveBeenCalledWith(1, 1);
  });

  it("draws a fixed rupture warning at its exact blast area before showing the impact", () => {
    const blast = effect("rupture", CONFIG.rupture.impactFrame - 1);
    drawEquipmentReactionEffects();
    expect(drawImage).not.toHaveBeenCalled();
    expect(ellipse).toHaveBeenCalledWith(blast.x, blast.y, blast.w / 2, blast.h / 2, 0, 0, Math.PI * 2);
    expect(stroke).toHaveBeenCalledTimes(2);
  });

  it("keeps nondamaging eyes as readable rings without playing a hit sprite", () => {
    effect("eye");
    drawEquipmentReactionEffects();
    expect(drawImage).not.toHaveBeenCalled();
    expect(ellipse).toHaveBeenCalledTimes(2);
  });

  it("mirrors the sweep and maps the visible peak to its actual hit dimensions", () => {
    const sweep = effect("sweep");
    drawEquipmentReactionEffects();
    expect(scale).toHaveBeenCalledWith(-1, 1);
    const draw = drawImage.mock.calls[0];
    expect(draw[7] * SWEEP_PEAK_ALPHA.width / TIDE_WEAVE_SWEEP_SHEET.frameW).toBeCloseTo(sweep.w);
    expect(draw[8] * SWEEP_PEAK_ALPHA.height / TIDE_WEAVE_SWEEP_SHEET.frameH).toBeCloseTo(sweep.h);
  });

  it.each(["sweep", "surge", "rupture"] as const)("centers the %s peak alpha exactly on its hit shape", (kind) => {
    const elapsed = kind === "sweep"
      ? PEAK_FRAME * CONFIG.sweep.lifeFrames / TIDE_WEAVE_SWEEP_SHEET.count
      : CONFIG[kind].impactFrame;
    const burst = effect(kind, elapsed);
    drawEquipmentReactionEffects();
    const bounds = PEAK_ALPHA_BOUNDS[kind];
    const draw = drawImage.mock.calls[0];
    const sheet = kind === "sweep" ? TIDE_WEAVE_SWEEP_SHEET : TIDE_WEAVE_SURGE_SHEET;
    expect(draw[1]).toBe(PEAK_FRAME * sheet.frameW);
    const [offsetX, offsetY, width, height] = draw.slice(DRAW_DESTINATION_INDEX);
    expect(offsetX + bounds.left * width / sheet.frameW).toBeCloseTo(-burst.w / 2);
    expect(offsetX + bounds.right * width / sheet.frameW).toBeCloseTo(burst.w / 2);
    expect(burst.h / 2 + offsetY + bounds.top * height / sheet.frameH).toBeCloseTo(-burst.h / 2);
    expect(burst.h / 2 + offsetY + bounds.bottom * height / sheet.frameH).toBeCloseTo(burst.h / 2);
  });

  it("shows the movement cue only while the actual shadow garb trigger is armed", () => {
    state.equipmentReactions.movementDistance = CONFIG.movementDistance;
    drawEquipmentReactionCues();
    expect(stroke).not.toHaveBeenCalled();
    state.equippedEquipment.garb = "shadowstep_garb";
    drawEquipmentReactionEffects();
    expect(stroke).not.toHaveBeenCalled();
    drawEquipmentReactionCues();
    expect(stroke).toHaveBeenCalledTimes(2);
    stroke.mockClear();
    state.equipmentReactions.movementDistance = 0;
    drawEquipmentReactionCues();
    expect(stroke).not.toHaveBeenCalled();
  });

  it("never shows ready effects after the run ends", () => {
    effect("sweep");
    state.equippedEquipment.garb = "shadowstep_garb";
    state.equipmentReactions.movementDistance = CONFIG.movementDistance;
    state.gameOver = true;
    drawEquipmentReactionEffects();
    drawEquipmentReactionCues();
    expect(drawImage).not.toHaveBeenCalled();
    expect(stroke).not.toHaveBeenCalled();
  });
});
