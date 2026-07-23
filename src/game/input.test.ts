// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { setupInput, teardownInput } from "./input";

vi.mock("./audio", () => ({
  ensureAudio: vi.fn(),
}));

afterEach(() => {
  teardownInput();
});

describe("jump input", () => {
  it("requires a release before another keyboard jump press", () => {
    const onJump = vi.fn();
    setupInput({ onJump });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w", repeat: true }));

    expect(onJump).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "w" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }));

    expect(onJump).toHaveBeenCalledTimes(2);
  });
});
