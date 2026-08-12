// @vitest-environment jsdom

import { act } from "react";
import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StartScreen } from "./startScreen";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

describe("StartScreen controls entry", () => {
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
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("opens the guide without starting the run", () => {
    const onOpenControls = vi.fn();
    const onStart = vi.fn();

    act(() => {
      root.render(
        <Provider store={createStore()}>
          <StartScreen
            assetsReady
            startQueued={false}
            controlsOpen={false}
            onOpenControls={onOpenControls}
            onCloseControls={() => undefined}
            onStart={onStart}
          />
        </Provider>,
      );
    });

    const controlsButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("按键说明"));
    expect(controlsButton).toBeDefined();

    act(() => {
      controlsButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onOpenControls).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("closes the modal without letting its click start the run", () => {
    const onCloseControls = vi.fn();
    const onStart = vi.fn();

    act(() => {
      root.render(
        <Provider store={createStore()}>
          <StartScreen
            assetsReady
            startQueued={false}
            controlsOpen
            onOpenControls={() => undefined}
            onCloseControls={onCloseControls}
            onStart={onStart}
          />
        </Provider>,
      );
    });

    const backButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("返回"));
    expect(backButton).toBeDefined();

    act(() => {
      backButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onCloseControls).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("renders the guide as part of the cover instead of reusing reward UI sprites", () => {
    act(() => {
      root.render(
        <Provider store={createStore()}>
          <StartScreen
            assetsReady
            startQueued={false}
            controlsOpen
            onOpenControls={() => undefined}
            onCloseControls={() => undefined}
            onStart={() => undefined}
          />
        </Provider>,
      );
    });

    expect(container.querySelector(".controls-guide-dialog > .ui-sprite")).toBeNull();
    expect(container.querySelector(".start-menu-button .ui-sprite")).toBeNull();
  });

  it("keeps keyboard focus inside the open guide", () => {
    act(() => {
      root.render(
        <Provider store={createStore()}>
          <StartScreen
            assetsReady
            startQueued={false}
            controlsOpen
            onOpenControls={() => undefined}
            onCloseControls={() => undefined}
            onStart={() => undefined}
          />
        </Provider>,
      );
    });

    const buttons = [...container.querySelectorAll<HTMLButtonElement>("[role='dialog'] button")];
    const backButton = buttons[0];
    const startButton = buttons[1];
    expect(document.activeElement).toBe(backButton);

    act(() => {
      backButton.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        key: "Tab",
        shiftKey: true,
      }));
    });
    expect(document.activeElement).toBe(startButton);

    act(() => {
      startButton.dispatchEvent(new KeyboardEvent("keydown", {
        bubbles: true,
        key: "Tab",
      }));
    });
    expect(document.activeElement).toBe(backButton);
  });
});
