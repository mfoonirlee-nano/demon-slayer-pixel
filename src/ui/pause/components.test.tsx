import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PauseSquareIcon } from "./components";

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
