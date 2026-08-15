import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ResidualSpiritVessel,
  residualSpiritBeadChargeStage,
  residualSpiritBeadFillRatios,
} from "./residualSpiritVessel";

const RESIDUAL_SPIRIT_MAX = 60;
const PARTIAL_BEAD_VALUE = 15;
const FOUR_BEADS_VALUE = 40;
const OVER_CAP_VALUE = 80;
const BEAD_COUNT = 6;
const LOW_CHARGE_START = 0.1;
const LOW_CHARGE_END = 0.3;
const MEDIUM_CHARGE_START = 0.4;
const MEDIUM_CHARGE_END = 0.6;
const HIGH_CHARGE_START = 0.7;
const HIGH_CHARGE_END = 0.9;
const FULL_CHARGE_STAGE = 3;
const CHARGED_BEAD_COUNT = 3;
const DEPLOYED_DOCUMENT_BASE_URI =
  "https://example.com/demon-slayer-pixel/dist/index.html";
const DEPLOYED_BEAD_SHEET_URL =
  "https://example.com/demon-slayer-pixel/assets/sprites/ui/system/hud/residual-spirit-bead-charge-sheet.png";

describe("residual-spirit vessel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("maps nonzero partial charge into three readable stages before full", () => {
    expect([
      residualSpiritBeadChargeStage(0),
      residualSpiritBeadChargeStage(LOW_CHARGE_START),
      residualSpiritBeadChargeStage(LOW_CHARGE_END),
      residualSpiritBeadChargeStage(MEDIUM_CHARGE_START),
      residualSpiritBeadChargeStage(MEDIUM_CHARGE_END),
      residualSpiritBeadChargeStage(HIGH_CHARGE_START),
      residualSpiritBeadChargeStage(HIGH_CHARGE_END),
      residualSpiritBeadChargeStage(1),
    ]).toEqual([null, 0, 0, 1, 1, 2, 2, FULL_CHARGE_STAGE]);
  });

  it("renders animated charge pearls with a clear partial marker", () => {
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
    expect(markup).toContain("residual-spirit-bead-charge-sheet.png");
    expect(markup).not.toContain("sprites/pickups/residual-spirit.png");
    expect(markup.match(/class="residual-spirit-bead(?: |")/g)).toHaveLength(BEAD_COUNT);
    expect(markup.match(/residual-spirit-bead--full/g)).toHaveLength(2);
    expect(markup.match(/residual-spirit-bead--partial/g)).toHaveLength(1);
    expect(markup.match(/residual-spirit-bead-soul/g)).toHaveLength(CHARGED_BEAD_COUNT);
    expect(markup.match(/residual-spirit-bead-charge-marker/g)).toHaveLength(1);
    expect(markup).toContain('data-charge-stage="1"');
    expect(markup).toContain("--residual-spirit-charge-level:50%");
    expect(markup).toContain("25/60");
    expect(markup).toContain(">H</kbd>");
    expect(markup).toContain("residual-spirit-vessel--healing");
    expect(markup).toContain("--residual-spirit-heal-angle:180deg");
    expect(markup).toContain("data-residual-spirit-intake");
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

  it("keeps the CSS sprite sheet outside the dist bundle directory", async () => {
    vi.stubGlobal("document", { baseURI: DEPLOYED_DOCUMENT_BASE_URI });
    vi.resetModules();
    const { ResidualSpiritVessel: BrowserResidualSpiritVessel } = await import(
      "./residualSpiritVessel"
    );
    const markup = renderToStaticMarkup(
      <BrowserResidualSpiritVessel
        value={10}
        max={60}
        healTimer={0}
        healDuration={0.6}
        language="zh-CN"
      />,
    );

    expect(markup).toContain(DEPLOYED_BEAD_SHEET_URL);
    expect(markup).not.toContain("/dist/assets/sprites/");
  });
});
