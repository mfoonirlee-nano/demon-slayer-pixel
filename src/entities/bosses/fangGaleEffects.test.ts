import { afterEach, describe, expect, it, vi } from "vitest";
import { FANG_GALE_CONFIG, FANG_GALE_WAVE_SHEET } from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import type { FangGaleWaveState } from "../../types/game-state";
import { drawFangGaleEffects, updateFangGaleEffects } from "./fangGaleEffects";

const originalWaveImage = FANG_GALE_WAVE_SHEET.image;

describe("fang gale effects", () => {
  afterEach(() => {
    FANG_GALE_WAVE_SHEET.image = originalWaveImage;
    setCanvas(null);
  });

  it("charges through local wave frames before the wind blade starts moving", () => {
    resetState();
    const wave = createWave();
    state.fangGaleWaves.push(wave);
    const startX = wave.x;
    state.player.x = wave.x;
    state.player.y = wave.y;
    const hpBeforeWarning = state.player.hp;
    const warningFrames = new Set<number>();

    for (let frame = 0; frame < wave.warningFrames; frame += 1) {
      updateFangGaleEffects();
      warningFrames.add(wave.frame);
      expect(wave.x).toBe(startX);
    }

    expect([...warningFrames]).toEqual([0, 1]);
    expect(state.player.hp).toBe(hpBeforeWarning);
    updateFangGaleEffects();
    expect(wave.frame).toBe(FANG_GALE_CONFIG.waveWarningSpriteFrames);
    expect(wave.x).toBe(startX + wave.vx);
    expect(state.player.hp).toBeLessThan(hpBeforeWarning);
    expect(state.fangGaleWaves).not.toContain(wave);
  });

  it("draws the warning as the first wind-blade sprite frame", () => {
    resetState();
    const context = createContext();
    const image = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    FANG_GALE_WAVE_SHEET.image = image;
    state.fangGaleWaves.push(createWave());

    drawFangGaleEffects();

    expect(context.drawImage).toHaveBeenCalledOnce();
    expect(context.drawImage.mock.calls[0][0]).toBe(image);
  });

  it("keeps the original active animation cadence after the sprite warning", () => {
    resetState();
    const wave = createWave();
    wave.damage = 0;
    state.fangGaleWaves.push(wave);

    for (let frame = 0; frame < wave.warningFrames; frame += 1) {
      updateFangGaleEffects();
    }
    for (let frame = 1; frame < FANG_GALE_CONFIG.waveFrameDuration; frame += 1) {
      updateFangGaleEffects();
      expect(wave.frame).toBe(FANG_GALE_CONFIG.waveWarningSpriteFrames);
    }

    updateFangGaleEffects();
    expect(wave.frame).toBe(FANG_GALE_CONFIG.waveWarningSpriteFrames + 1);
  });
});

function createWave(): FangGaleWaveState {
  return {
    x: 420,
    y: 260,
    w: FANG_GALE_CONFIG.waveHitW,
    h: FANG_GALE_CONFIG.waveHitH,
    vx: FANG_GALE_CONFIG.waveSpeed,
    facing: 1,
    warningFrames: FANG_GALE_CONFIG.waveWarningFrames,
    elapsed: 0,
    frame: 0,
    life: FANG_GALE_CONFIG.waveLife,
    damage: 1,
  };
}

function createContext() {
  return {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
  } as unknown as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
  };
}
