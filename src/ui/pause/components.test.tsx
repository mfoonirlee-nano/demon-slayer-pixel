import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AudioVolumeControl, PauseSquareIcon } from "./components";
import { PAUSE_SLIDER_TRACK_W } from "./constants";

describe("PauseSquareIcon", () => {
  it("marks disabled icons as a full disabled square", () => {
    const markup = renderToStaticMarkup(
      <PauseSquareIcon
        disabled
        iconSrc="equipment.png"
        badgeSrc="slot.png"
        size={56}
        iconSize={36}
        badgeSize={16}
      />,
    );

    expect(markup).toContain("pause-square-disabled");
    expect(markup).toContain("skill-slot-disabled.png");
  });

  it("does not mark enabled icons as disabled", () => {
    const markup = renderToStaticMarkup(
      <PauseSquareIcon
        iconSrc="equipment.png"
        size={56}
        iconSize={36}
      />,
    );

    expect(markup).not.toContain("pause-square-disabled");
    expect(markup).toContain("skill-slot-normal.png");
  });
});

describe("AudioVolumeControl", () => {
  it.each([
    { value: 0, label: "0%", fillWidth: 0, thumbLeft: 0 },
    { value: 0.5, label: "50%", fillWidth: 260, thumbLeft: 249 },
    { value: 1, label: "100%", fillWidth: 509, thumbLeft: 498 },
  ])("keeps the fill and thumb bounded at $label", ({ value, fillWidth, thumbLeft }) => {
    const markup = renderToStaticMarkup(
      <AudioVolumeControl label="Volume" value={value} onChange={() => undefined} />,
    );

    expect(markup).toMatch(
      new RegExp(`data-audio-slider="true"[^>]*style="width:${PAUSE_SLIDER_TRACK_W}px`),
    );
    expect(markup).toContain(`width:${fillWidth === 0 ? "0" : `${fillWidth}px`}`);
    expect(markup).toContain(`left:${thumbLeft === 0 ? "0" : `${thumbLeft}px`}`);
  });
});
