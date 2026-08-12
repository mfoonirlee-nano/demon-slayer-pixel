// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureAudio } from "../game/audio";
import App from "./App";

vi.mock("../assets", () => ({
  loadSprites: vi.fn(() => new Promise<void>(() => undefined)),
}));

vi.mock("../game/audio", () => ({
  ensureAudio: vi.fn(),
}));

vi.mock("../game/runtime", () => ({
  startGame: vi.fn(() => () => undefined),
}));

vi.mock("../rendering/context", () => ({
  setCanvas: vi.fn(),
}));

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

describe("App controls guide keyboard flow", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("keeps arbitrary keys from starting a run while the guide is open", () => {
    act(() => root.render(<App />));

    const controlsButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("按键说明"));
    expect(controlsButton).toBeDefined();

    act(() => {
      controlsButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement?.textContent).toContain("返回");

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "j" })));
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(ensureAudio).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector(".start-screen")).not.toBeNull();
    expect(document.activeElement?.textContent).toContain("按键说明");

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        key: "j",
      }));
    });
    expect(ensureAudio).toHaveBeenCalledOnce();
  });
});
