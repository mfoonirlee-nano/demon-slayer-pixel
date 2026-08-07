import { afterEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y, MIST_BONE_CONFIG, MIST_BONE_SPIKES_SHEET } from "../../constants";
import { playSfx } from "../../game/audio";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { drawMistBoneEffects, updateMistBoneEffects } from "./mistBoneEffects";

const originalSpikeImage = MIST_BONE_SPIKES_SHEET.image;

vi.mock("../../game/audio", () => ({ playSfx: vi.fn() }));

describe("mist bone effects", () => {
  afterEach(() => {
    resetState();
    setCanvas(null);
    MIST_BONE_SPIKES_SHEET.image = originalSpikeImage;
    vi.mocked(playSfx).mockClear();
  });

  it("draws burial fog before the spike warnings that remain readable above it", () => {
    const drawOrder: string[] = [];
    const context = createContext(drawOrder);
    MIST_BONE_SPIKES_SHEET.image = {} as HTMLImageElement;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    state.mistBoneFogs.push({
      kind: "burial",
      x: 320,
      y: GROUND_Y,
      radiusX: MIST_BONE_CONFIG.burialFogRadiusX,
      radiusY: MIST_BONE_CONFIG.burialFogRadiusY,
      life: MIST_BONE_CONFIG.burialFogLife,
      maxLife: MIST_BONE_CONFIG.burialFogLife,
      elapsed: 12,
    });
    state.mistBoneSpikes.push({
      x: 300,
      y: GROUND_Y - MIST_BONE_CONFIG.spikeHitH,
      w: MIST_BONE_CONFIG.spikeHitW,
      h: MIST_BONE_CONFIG.spikeHitH,
      delay: 20,
      warningFrames: MIST_BONE_CONFIG.spikeWarningFrames,
      elapsed: 0,
      frame: 0,
      life: MIST_BONE_CONFIG.spikeLife,
      damage: MIST_BONE_CONFIG.damageBase,
      hitPlayer: false,
    });

    drawMistBoneEffects();

    expect(context.ellipse).toHaveBeenCalled();
    expect(drawOrder.indexOf("fog")).toBeLessThan(drawOrder.indexOf("spike"));
  });

  it("expires a thin fog field after its configured lifetime", () => {
    resetState();
    state.mistBoneFogs.push({
      kind: "thin",
      x: 320,
      y: GROUND_Y,
      radiusX: MIST_BONE_CONFIG.thinFogRadiusX,
      radiusY: MIST_BONE_CONFIG.thinFogRadiusY,
      life: 2,
      maxLife: 2,
      elapsed: 0,
    });

    updateMistBoneEffects();

    expect(state.mistBoneFogs[0]).toMatchObject({ life: 1, elapsed: 1 });

    updateMistBoneEffects();

    expect(state.mistBoneFogs).toEqual([]);
  });

  it("keeps the original hazard lifetime while remapping its sprite animation", () => {
    resetState();
    state.player.x = 0;
    state.mistBoneSpikes.push({
      x: 320,
      y: GROUND_Y - MIST_BONE_CONFIG.spikeHitH,
      w: MIST_BONE_CONFIG.spikeHitW,
      h: MIST_BONE_CONFIG.spikeHitH,
      delay: 0,
      warningFrames: MIST_BONE_CONFIG.spikeWarningFrames,
      elapsed: 0,
      frame: 0,
      life: MIST_BONE_CONFIG.spikeLife,
      damage: MIST_BONE_CONFIG.damageBase,
      hitPlayer: false,
    });

    const animationFrames = MIST_BONE_SPIKES_SHEET.count
      * MIST_BONE_CONFIG.spikeFrameDuration;
    const framesBeforeRemoval = MIST_BONE_CONFIG.spikeWarningFrames + animationFrames;
    for (let i = 0; i < framesBeforeRemoval - 1; i += 1) updateMistBoneEffects();

    const spike = state.mistBoneSpikes[0];
    state.player.x = spike.x;
    state.player.y = spike.y;
    const hpBeforeLastActiveFrame = state.player.hp;
    updateMistBoneEffects();

    expect(state.mistBoneSpikes).toHaveLength(1);
    expect(state.mistBoneSpikes[0].frame).toBe(MIST_BONE_SPIKES_SHEET.count - 1);
    expect(state.player.hp).toBeLessThan(hpBeforeLastActiveFrame);

    updateMistBoneEffects();

    expect(state.mistBoneSpikes).toEqual([]);
  });

  it("uses the mist and bone-tip frames for the complete warning window", () => {
    resetState();
    state.mistBoneSpikes.push({
      x: 320,
      y: GROUND_Y - MIST_BONE_CONFIG.spikeHitH,
      w: MIST_BONE_CONFIG.spikeHitW,
      h: MIST_BONE_CONFIG.spikeHitH,
      delay: 0,
      warningFrames: MIST_BONE_CONFIG.spikeWarningFrames,
      elapsed: 0,
      frame: 0,
      life: MIST_BONE_CONFIG.spikeLife,
      damage: MIST_BONE_CONFIG.damageBase,
      hitPlayer: false,
    });

    const warningFrames = new Set<number>();
    for (let frame = 0; frame < MIST_BONE_CONFIG.spikeWarningFrames; frame += 1) {
      updateMistBoneEffects();
      warningFrames.add(state.mistBoneSpikes[0].frame);
    }

    expect([...warningFrames]).toEqual([0, 1]);
    updateMistBoneEffects();
    expect(state.mistBoneSpikes[0].frame).toBe(
      MIST_BONE_CONFIG.spikeWarningSpriteFrames,
    );
  });

  it("plays the bone-rise sound once when a warned spike becomes active", () => {
    state.player.x = 0;
    state.mistBoneSpikes.push({
      x: 320,
      y: GROUND_Y - MIST_BONE_CONFIG.spikeHitH,
      w: MIST_BONE_CONFIG.spikeHitW,
      h: MIST_BONE_CONFIG.spikeHitH,
      delay: 0,
      warningFrames: MIST_BONE_CONFIG.spikeWarningFrames,
      elapsed: MIST_BONE_CONFIG.spikeWarningFrames,
      frame: 1,
      life: MIST_BONE_CONFIG.spikeLife,
      damage: MIST_BONE_CONFIG.damageBase,
      hitPlayer: false,
    });

    updateMistBoneEffects();
    updateMistBoneEffects();

    expect(playSfx).toHaveBeenCalledTimes(1);
    expect(playSfx).toHaveBeenCalledWith("bossMistBoneSpike");
  });
});

function createContext(drawOrder: string[]) {
  return {
    beginPath: vi.fn(),
    drawImage: vi.fn(() => drawOrder.push("spike")),
    ellipse: vi.fn(),
    fill: vi.fn(() => drawOrder.push("fog")),
    fillStyle: "",
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
    ellipse: ReturnType<typeof vi.fn>;
  };
}
