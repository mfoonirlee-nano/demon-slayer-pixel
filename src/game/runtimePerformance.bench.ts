import { afterAll, bench, describe } from "vitest";
import { setCanvas } from "../rendering/context";
import { drawFallingLeaves, resolveFallingLeafRenderPlan } from "../rendering/fallingLeaves";
import { resolveNearForegroundOccluders } from "../rendering/nearForeground";
import { getStateSnapshot } from "./state";

const FPS = 60;
const SAMPLE_FRAMES = 600;
const RUN_SEED = 48271;
let frame = 0;
setCanvas({ getContext: () => ({ save() {}, restore() {} }) } as unknown as HTMLCanvasElement);
afterAll(() => setCanvas(null));

describe("CPU only; no rasterization or game process", () => {
  bench("uncached falling-leaf reference", () => {
    const elapsed = (frame++ % SAMPLE_FRAMES) / FPS;
    resolveFallingLeafRenderPlan({ elapsed, seed: RUN_SEED, layer: "far" });
    resolveFallingLeafRenderPlan({ elapsed, seed: RUN_SEED, layer: "near" });
  });
  bench("both falling-leaf layers", () => {
    const elapsed = (frame++ % SAMPLE_FRAMES) / FPS;
    drawFallingLeaves({ elapsed, seed: RUN_SEED, layer: "far" });
    drawFallingLeaves({ elapsed, seed: RUN_SEED, layer: "near" });
  });
  bench("foreground occluder placement", () => {
    resolveNearForegroundOccluders({ elapsed: 1, act: 1, bossPreludeElapsed: null });
  });
  bench("HUD snapshot projection", () => {
    getStateSnapshot();
  });
});
