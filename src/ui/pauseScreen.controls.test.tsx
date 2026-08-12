// @vitest-environment jsdom

import { act } from "react";
import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gameSnapshotAtom, gameStore } from "../game/gameStore";
import { languageAtom } from "../i18n/language";
import { PauseScreen } from "./pauseScreen";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

describe("PauseScreen controls tab", () => {
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

  it("opens the same quick-reference guide from the pause menu", () => {
    const store = createStore();
    store.set(languageAtom, "zh-CN");

    act(() => {
      root.render(
        <Provider store={store}>
          <PauseScreen snapshot={gameStore.get(gameSnapshotAtom)} />
        </Provider>,
      );
    });

    const controlsTab = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((button) => button.textContent?.includes("按键"));
    expect(controlsTab).toBeDefined();

    act(() => controlsTab!.click());

    expect(controlsTab?.getAttribute("aria-selected")).toBe("true");
    expect(container.textContent).toContain("月潮键谱");
    expect(container.textContent).toContain("空中落击");
    expect(container.textContent).toContain("奖励选择");
  });
});
