import { describe, expect, it } from "vitest";
import {
  DEATH_FRAME_HEIGHT,
  DEATH_FRAME_WIDTH,
  DEATH_SPRITE_SCALE,
  deathSpriteFrameForStep,
} from "./deathScreen";

const INTRO_FRAME_COUNT = 24;
const LOOP_START_FRAME = 18;
const LOOP_FRAME_COUNT = 6;
const LOOP_CYCLES_TO_TEST = 2;
const PREVIOUS_FRAME_WIDTH = 272;
const PREVIOUS_FRAME_HEIGHT = 203;
const SCALE_NUMERATOR = 2;
const SCALE_DENOMINATOR = 3;

describe("death screen sprite animation", () => {
  it("plays the full intro once, then loops the final row", () => {
    expect(Array.from({ length: INTRO_FRAME_COUNT }, (_, step) => deathSpriteFrameForStep(step))).toEqual(
      Array.from({ length: INTRO_FRAME_COUNT }, (_, frame) => frame),
    );
    expect(
      Array.from(
        { length: LOOP_FRAME_COUNT * LOOP_CYCLES_TO_TEST },
        (_, step) => deathSpriteFrameForStep(step + INTRO_FRAME_COUNT),
      ),
    ).toEqual(
      Array.from(
        { length: LOOP_FRAME_COUNT * LOOP_CYCLES_TO_TEST },
        (_, step) => LOOP_START_FRAME + step % LOOP_FRAME_COUNT,
      ),
    );
  });

  it("renders at two-thirds of the previous size", () => {
    const expectedScale = SCALE_NUMERATOR / SCALE_DENOMINATOR;

    expect(DEATH_SPRITE_SCALE).toBe(expectedScale);
    expect(DEATH_FRAME_WIDTH).toBeCloseTo(PREVIOUS_FRAME_WIDTH * expectedScale);
    expect(DEATH_FRAME_HEIGHT).toBeCloseTo(PREVIOUS_FRAME_HEIGHT * expectedScale);
  });
});
