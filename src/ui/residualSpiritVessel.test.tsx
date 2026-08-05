import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ResidualSpiritVessel,
  residualSpiritBeadFillRatios,
} from "./residualSpiritVessel";

const RESIDUAL_SPIRIT_MAX = 60;
const PARTIAL_BEAD_VALUE = 15;
const FOUR_BEADS_VALUE = 40;
const OVER_CAP_VALUE = 80;
const BEAD_COUNT = 6;

describe("residual-spirit vessel", () => {
  it("fills six beads in order, with partial spirit preserved", () => {
    expect(residualSpiritBeadFillRatios(0, RESIDUAL_SPIRIT_MAX))
      .toEqual([0, 0, 0, 0, 0, 0]);
    expect(residualSpiritBeadFillRatios(PARTIAL_BEAD_VALUE, RESIDUAL_SPIRIT_MAX))
      .toEqual([1, 0.5, 0, 0, 0, 0]);
    expect(residualSpiritBeadFillRatios(FOUR_BEADS_VALUE, RESIDUAL_SPIRIT_MAX))
      .toEqual([1, 1, 1, 1, 0, 0]);
    expect(residualSpiritBeadFillRatios(OVER_CAP_VALUE, RESIDUAL_SPIRIT_MAX))
      .toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("renders the generated frame, six spirit sprites, count, key hint, and channel state", () => {
    const markup = renderToStaticMarkup(
      <ResidualSpiritVessel
        value={25}
        max={60}
        healTimer={0.3}
        healDuration={0.6}
        language="en"
      />,
    );

    expect(markup).toContain("residual-spirit-vessel-frame.png");
    expect(markup.match(/<img[^>]*residual-spirit\.png/g)).toHaveLength(BEAD_COUNT);
    expect(markup).toContain("25/60");
    expect(markup).toContain(">H</kbd>");
    expect(markup).toContain("residual-spirit-vessel--healing");
    expect(markup).toContain("--residual-spirit-heal-angle:180deg");
  });

  it("keeps the mobile presentation compact and omits the keyboard hint", () => {
    const markup = renderToStaticMarkup(
      <ResidualSpiritVessel
        value={8}
        max={60}
        healTimer={0}
        healDuration={0.6}
        language="zh-CN"
        compact
      />,
    );

    expect(markup).toContain("residual-spirit-vessel--compact");
    expect(markup).toContain("残灵 8 / 60");
    expect(markup).not.toContain("<kbd");
  });
});
