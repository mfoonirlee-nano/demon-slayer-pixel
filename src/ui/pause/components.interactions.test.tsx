// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioVolumeControl } from "./components";
import {
  AUDIO_PERCENT_SCALE,
  PAUSE_SLIDER_THUMB_W,
  PAUSE_SLIDER_TRACK_W,
  PAUSE_SLIDER_WRAP_H,
} from "./constants";

const POINTER_ID = 17;
const TRACK_LEFT = 100;
const GRAB_OFFSET_DIVISOR = 3;
const FIRST_DRAG_VALUE = 0.6;
const SUB_PERCENT_DRAG_VALUE = 0.605;
const STALE_MOVE_VALUE = 0.2;
const TRACK_CLICK_VALUE = 0.21;
const KEYBOARD_VALUE = 0.22;
const OUTSIDE_TRACK_OFFSET = 80;
const CLOSE_PRECISION = 5;
const RENDERED_TRACK_W = PAUSE_SLIDER_TRACK_W / 2;
const RENDERED_THUMB_W = PAUSE_SLIDER_THUMB_W / 2;
const RENDERED_TRAVEL_W = RENDERED_TRACK_W - RENDERED_THUMB_W;

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

function createPointerEvent(
  type: "pointerdown" | "pointermove" | "pointerup",
  clientX: number,
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    cancelable: true,
    clientX,
  });
  Object.defineProperties(event, {
    isPrimary: { value: true },
    pointerId: { value: POINTER_ID },
    pointerType: { value: "mouse" },
  });
  return event;
}

function pointerX(value: number) {
  return TRACK_LEFT + RENDERED_THUMB_W / 2 + RENDERED_TRAVEL_W * value;
}

function installPointerCapture(target: HTMLElement) {
  const capturedPointers = new Set<number>();
  const setPointerCapture = vi.fn((pointerId: number) => {
    capturedPointers.add(pointerId);
  });
  const releasePointerCapture = vi.fn((pointerId: number) => {
    capturedPointers.delete(pointerId);
  });
  const hasPointerCapture = vi.fn((pointerId: number) => (
    capturedPointers.has(pointerId)
  ));

  Object.defineProperties(target, {
    hasPointerCapture: { configurable: true, value: hasPointerCapture },
    releasePointerCapture: { configurable: true, value: releasePointerCapture },
    setPointerCapture: { configurable: true, value: setPointerCapture },
  });

  return { capturedPointers, releasePointerCapture, setPointerCapture };
}

function VolumeHarness({ onValue }: { onValue: (value: number) => void }) {
  const [value, setValue] = useState(0.5);

  return (
    <AudioVolumeControl
      label="Volume"
      value={value}
      onChange={(nextValue) => {
        onValue(nextValue);
        setValue(nextValue);
      }}
    />
  );
}

describe("AudioVolumeControl interactions", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  });

  function renderControl(onValue = vi.fn<(value: number) => void>()) {
    act(() => {
      root.render(<VolumeHarness onValue={onValue} />);
    });

    const slider = container.querySelector<HTMLElement>('[data-audio-slider="true"]');
    const input = container.querySelector<HTMLInputElement>('input[type="range"]');
    if (!slider || !input) throw new Error("Audio slider did not render");

    vi.spyOn(slider, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({
      height: PAUSE_SLIDER_WRAP_H / 2,
      width: RENDERED_TRACK_W,
      x: TRACK_LEFT,
    }));

    return { input, onValue, slider };
  }

  it("keeps a grabbed thumb attached through smooth captured pointer movement", () => {
    const { onValue, slider } = renderControl();
    const capture = installPointerCapture(slider);
    const grabOffset = RENDERED_THUMB_W / GRAB_OFFSET_DIVISOR;

    act(() => {
      slider.dispatchEvent(createPointerEvent("pointerdown", pointerX(0.5) + grabOffset));
    });

    expect(capture.setPointerCapture).toHaveBeenCalledWith(POINTER_ID);
    expect(capture.capturedPointers.has(POINTER_ID)).toBe(true);
    expect(onValue).toHaveBeenLastCalledWith(0.5);

    act(() => {
      slider.dispatchEvent(createPointerEvent(
        "pointermove",
        pointerX(FIRST_DRAG_VALUE) + grabOffset,
      ));
    });
    expect(onValue).toHaveBeenLastCalledWith(
      expect.closeTo(FIRST_DRAG_VALUE, CLOSE_PRECISION),
    );
    expect(container.textContent).toContain("60%");

    act(() => {
      slider.dispatchEvent(createPointerEvent(
        "pointermove",
        pointerX(SUB_PERCENT_DRAG_VALUE) + grabOffset,
      ));
    });
    expect(onValue).toHaveBeenLastCalledWith(
      expect.closeTo(SUB_PERCENT_DRAG_VALUE, CLOSE_PRECISION),
    );
    expect(container.textContent).toContain("61%");
    const thumb = container.querySelector<HTMLElement>(".audio-volume-thumb");
    expect(Number.parseFloat(thumb?.style.left ?? "NaN")).toBeCloseTo(
      (PAUSE_SLIDER_TRACK_W - PAUSE_SLIDER_THUMB_W) * SUB_PERCENT_DRAG_VALUE,
      CLOSE_PRECISION,
    );

    act(() => {
      slider.dispatchEvent(createPointerEvent(
        "pointermove",
        TRACK_LEFT + RENDERED_TRACK_W + OUTSIDE_TRACK_OFFSET,
      ));
    });
    expect(onValue).toHaveBeenLastCalledWith(1);
    expect(container.textContent).toContain("100%");

    act(() => {
      slider.dispatchEvent(createPointerEvent(
        "pointerup",
        TRACK_LEFT + RENDERED_TRACK_W + OUTSIDE_TRACK_OFFSET,
      ));
    });
    expect(capture.releasePointerCapture).toHaveBeenCalledWith(POINTER_ID);

    const callCountAfterRelease = onValue.mock.calls.length;
    act(() => {
      slider.dispatchEvent(createPointerEvent("pointermove", pointerX(STALE_MOVE_VALUE)));
    });
    expect(onValue).toHaveBeenCalledTimes(callCountAfterRelease);
  });

  it("keeps track clicks and native keyboard input precise and accessible", () => {
    const { input, onValue, slider } = renderControl();
    installPointerCapture(slider);

    act(() => {
      slider.dispatchEvent(createPointerEvent("pointerdown", pointerX(TRACK_CLICK_VALUE)));
    });
    expect(onValue).toHaveBeenLastCalledWith(
      expect.closeTo(TRACK_CLICK_VALUE, CLOSE_PRECISION),
    );
    expect(container.textContent).toContain("21%");
    act(() => {
      slider.dispatchEvent(createPointerEvent("pointerup", pointerX(TRACK_CLICK_VALUE)));
    });

    expect(input.min).toBe("0");
    expect(input.max).toBe(String(AUDIO_PERCENT_SCALE));
    expect(input.step).toBe("1");
    expect(input.tabIndex).toBe(0);
    expect(input.getAttribute("aria-label")).toBe("Volume");
    expect(input.getAttribute("aria-valuetext")).toBe("21%");

    act(() => input.focus());
    const arrowRight = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    });
    input.dispatchEvent(arrowRight);
    expect(arrowRight.defaultPrevented).toBe(false);

    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    if (!valueSetter) throw new Error("Range value setter is unavailable");

    act(() => {
      valueSetter.call(input, "22");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(onValue).toHaveBeenLastCalledWith(KEYBOARD_VALUE);
    expect(container.textContent).toContain("22%");
    expect(document.activeElement).toBe(input);
  });
});
