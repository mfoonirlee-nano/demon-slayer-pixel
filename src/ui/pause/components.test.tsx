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
    { value: 0, percent: 0, transform: "translateX(0)" },
    { value: 0.5, percent: 50, transform: "translateX(-50%)" },
    { value: 1, percent: 100, transform: "translateX(-100%)" },
  ])("keeps the fill and thumb aligned at $percent%", ({ value, percent, transform }) => {
    const markup = renderToStaticMarkup(
      <AudioVolumeControl label="Volume" value={value} onChange={() => undefined} />,
    );

    expect(markup).toMatch(
      new RegExp(`data-audio-slider="true"[^>]*style="width:${PAUSE_SLIDER_TRACK_W}px`),
    );
    expect(markup).toContain(`width:${percent}%`);
    expect(markup).toContain(`left:${percent}%`);
    expect(markup).toContain(`transform:${transform}`);
  });
});
