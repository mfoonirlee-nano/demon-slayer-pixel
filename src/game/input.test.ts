// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { keys, setupInput, teardownInput } from "./input";

vi.mock("./audio", () => ({
  ensureAudio: vi.fn(),
}));

afterEach(() => {
  teardownInput();
});

describe("configured gameplay input", () => {
  it("routes every action key to its matching handler", () => {
    const handlers = {
      onAttack: vi.fn(),
      onSkill: vi.fn(),
      onUltimate: vi.fn(),
      onHeal: vi.fn(),
      onSwitchSkill: vi.fn(),
      onRestart: vi.fn(),
      onPause: vi.fn(),
    };
    setupInput(handlers);

    for (const key of ["j", "k", "l", "h", "1", "2", "3", "r", "Escape"]) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key }));
      window.dispatchEvent(new KeyboardEvent("keyup", { key }));
    }

    expect(handlers.onAttack).toHaveBeenCalledOnce();
    expect(handlers.onSkill).toHaveBeenCalledOnce();
    expect(handlers.onUltimate).toHaveBeenCalledOnce();
    expect(handlers.onHeal).toHaveBeenCalledOnce();
    expect(handlers.onSwitchSkill.mock.calls).toEqual([[0], [1], [2]]);
    expect(handlers.onRestart).toHaveBeenCalledOnce();
    expect(handlers.onPause).toHaveBeenCalledOnce();
  });
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

describe("residual-spirit healing input", () => {
  it("requires a release before another heal press", () => {
    const onHeal = vi.fn();
    setupInput({ onHeal });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h", repeat: true }));

    expect(onHeal).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new KeyboardEvent("keyup", { key: "h" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));

    expect(onHeal).toHaveBeenCalledTimes(2);
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
