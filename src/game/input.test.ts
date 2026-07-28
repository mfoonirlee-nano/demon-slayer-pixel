// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { keys, setupInput, teardownInput } from "./input";

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

describe("debug input", () => {
  it("delegates Meta+D once per physical press without treating it as gameplay input", () => {
    const onToggleCollisionDebug = vi.fn();
    setupInput({ onToggleCollisionDebug });

    const firstPress = new KeyboardEvent("keydown", {
      key: "d",
      metaKey: true,
      cancelable: true,
    });
    window.dispatchEvent(firstPress);
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "d",
      metaKey: true,
      repeat: true,
    }));

    expect(firstPress.defaultPrevented).toBe(true);
    expect(onToggleCollisionDebug).toHaveBeenCalledTimes(1);
    expect(keys.has("d")).toBe(false);
  });
});
