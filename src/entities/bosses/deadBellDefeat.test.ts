import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEAD_BELL_AWAKENED_ECHO_BELL_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_SHEET,
  DEAD_BELL_WAVE_SHEET,
} from "../../constants";
import { playSfx } from "../../game/audio";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { spawnBoss } from "../boss";
import { drawBossDefeatSplitEffect } from "./bossDefeatSplitEffect";
import { defeatBoss } from "./defeat";
import { BOSS_ARCHETYPE_IDS } from "./registry";

vi.mock("../../game/audio", () => ({ playSfx: vi.fn() }));

const WAVE_X = 420;
const WAVE_Y = 260;
const FROZEN_WAVE_RADIUS = 180;
const ACTIVE_WAVE_ELAPSED_FRAMES = 10;
const ACTIVE_WAVE_FRAME = 2;
const BLADE_X = 300;
const BLADE_Y = 320;
const ACTIVE_BLADE_FRAME = 3;
const ACTIVE_BLADE_LIFE = 90;
const HAZARD_DAMAGE = 10;
const DEATH_DRAW_CALL_COUNT = 5;
const originalBodyImage = DEAD_BELL_SHEET.image;
const originalEchoImage = DEAD_BELL_AWAKENED_ECHO_BELL_SHEET.image;
const originalWaveImage = DEAD_BELL_WAVE_SHEET.image;

describe("Dead Bell defeat finish", () => {
  afterEach(() => {
    resetState();
    setCanvas(null);
    DEAD_BELL_SHEET.image = originalBodyImage;
    DEAD_BELL_AWAKENED_ECHO_BELL_SHEET.image = originalEchoImage;
    DEAD_BELL_WAVE_SHEET.image = originalWaveImage;
    vi.clearAllMocks();
  });

  it("freezes the last resonance, clears every hazard, and cracks its own bell", () => {
    const context = createContext();
    const bodyImage = {} as HTMLImageElement;
    const echoImage = {} as HTMLImageElement;
    const waveImage = {} as HTMLImageElement;
    DEAD_BELL_SHEET.image = bodyImage;
    DEAD_BELL_AWAKENED_ECHO_BELL_SHEET.image = echoImage;
    DEAD_BELL_WAVE_SHEET.image = waveImage;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    spawnBoss(BOSS_ARCHETYPE_IDS.deadBell);
    if (!state.boss) throw new Error("Dead Bell did not spawn");
    state.boss.entering = false;
    state.deadBellWaves.push({
      x: WAVE_X,
      y: WAVE_Y,
      radius: FROZEN_WAVE_RADIUS,
      maxRadius: DEAD_BELL_CONFIG.waveMaxRadius,
      thickness: DEAD_BELL_CONFIG.waveThickness,
      warningFrames: DEAD_BELL_CONFIG.waveWarningFrames,
      expandFrames: DEAD_BELL_CONFIG.waveExpandFrames,
      delay: 0,
      elapsed: DEAD_BELL_CONFIG.waveWarningFrames + ACTIVE_WAVE_ELAPSED_FRAMES,
      frame: ACTIVE_WAVE_FRAME,
      tone: "high",
      awakened: true,
      damage: HAZARD_DAMAGE,
      hitPlayer: false,
    });
    state.deadBellBlades.push({
      x: BLADE_X,
      y: BLADE_Y,
      w: DEAD_BELL_CONFIG.bladeHitW,
      h: DEAD_BELL_CONFIG.bladeHitH,
      vx: DEAD_BELL_CONFIG.bladeSpeed,
      facing: 1,
      delay: 0,
      warningFrames: 0,
      elapsed: ACTIVE_WAVE_ELAPSED_FRAMES,
      frame: ACTIVE_BLADE_FRAME,
      life: ACTIVE_BLADE_LIFE,
      damage: HAZARD_DAMAGE,
    });
    state.boss.hp = 0;
    vi.mocked(playSfx).mockClear();

    expect(defeatBoss()).toBe(true);

    expect(state.bossDefeatSplitEffect).toMatchObject({
      kind: "deadBellSilence",
      frozenWaves: [{
        x: WAVE_X,
        y: WAVE_Y,
        radius: FROZEN_WAVE_RADIUS,
        frame: ACTIVE_WAVE_FRAME,
        tone: "high",
        awakened: true,
      }],
    });
    expect(state.deadBellWaves).toEqual([]);
    expect(state.deadBellBlades).toEqual([]);
    expect(playSfx).toHaveBeenCalledOnce();
    expect(playSfx).toHaveBeenCalledWith("bossDeadBellDeath");

    drawBossDefeatSplitEffect();
    expect(context.drawImage).toHaveBeenCalledTimes(DEATH_DRAW_CALL_COUNT);
    expect(context.drawImage.mock.calls[0][0]).toBe(waveImage);
    expect(context.drawImage.mock.calls[1][0]).toBe(echoImage);
    expect(context.drawImage.mock.calls[2][0]).toBe(echoImage);
    expect(context.drawImage.mock.calls[3][0]).toBe(bodyImage);
    expect(context.drawImage.mock.calls[4][0]).toBe(bodyImage);
  });
});

function createContext() {
  return {
    beginPath: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
  } as unknown as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
  };
}
