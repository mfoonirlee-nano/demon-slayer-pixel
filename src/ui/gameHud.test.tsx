import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UltimateOrb, ultimateChargeStage } from "./gameHud";

const ENERGY_MAX = 100;
const BELOW_FIRST_STAGE = 12.49;
const FIRST_STAGE_THRESHOLD = 12.5;
const HALF_ENERGY = 50;
const FINAL_STAGE_THRESHOLD = 87.5;
const OVERCHARGED_ENERGY = 120;
const ACTIVE_PERCENT = 0.5;
const FIRST_CHARGED_STAGE = 1;
const HALF_CHARGED_STAGE = 4;
const FULL_CHARGED_STAGE = 7;

describe("ultimate charge stages", () => {
  it.each([
    [0, 0],
    [BELOW_FIRST_STAGE, 0],
    [FIRST_STAGE_THRESHOLD, FIRST_CHARGED_STAGE],
    [HALF_ENERGY, HALF_CHARGED_STAGE],
    [FINAL_STAGE_THRESHOLD, FULL_CHARGED_STAGE],
    [ENERGY_MAX, FULL_CHARGED_STAGE],
    [OVERCHARGED_ENERGY, FULL_CHARGED_STAGE],
  ])("maps %s energy to stage %s", (value, expectedStage) => {
    expect(ultimateChargeStage(value, ENERGY_MAX)).toBe(expectedStage);
  });

  it("clamps invalid and negative energy to the empty stage", () => {
    expect(ultimateChargeStage(HALF_ENERGY, 0)).toBe(0);
    expect(ultimateChargeStage(-HALF_ENERGY, ENERGY_MAX)).toBe(0);
  });
});

describe("ultimate orb animation state", () => {
  it("animates inside the selected row while charging", () => {
    const markup = renderToStaticMarkup(
      <UltimateOrb value={HALF_ENERGY} max={ENERGY_MAX} ready={false} />,
    );

    expect(markup).toContain("ultimate-orb-sprite-charging");
    expect(markup).toContain("--ultimate-charge-stage-y:57.14285714285714%");
    expect(markup).not.toContain("ultimate-orb-sprite-animated");
  });

  it("keeps empty and active orbs on a static charge frame", () => {
    const emptyMarkup = renderToStaticMarkup(
      <UltimateOrb value={0} max={ENERGY_MAX} ready={false} />,
    );
    const activeMarkup = renderToStaticMarkup(
      <UltimateOrb
        value={HALF_ENERGY}
        max={ENERGY_MAX}
        ready={false}
        activePercent={ACTIVE_PERCENT}
      />,
    );

    expect(emptyMarkup).not.toContain("ultimate-orb-sprite-charging");
    expect(activeMarkup).not.toContain("ultimate-orb-sprite-charging");
  });

  it("keeps the existing ready animation separate from charging", () => {
    const markup = renderToStaticMarkup(
      <UltimateOrb value={ENERGY_MAX} max={ENERGY_MAX} ready />,
    );

    expect(markup).toContain("ultimate-orb-sprite-animated");
    expect(markup).not.toContain("ultimate-orb-sprite-charging");
  });
});
