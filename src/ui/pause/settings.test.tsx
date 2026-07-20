// @vitest-environment jsdom

import { act } from "react";
import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LANGUAGE_STORAGE_KEY, languageAtom } from "../../i18n/language";
import { PauseSettings } from "./settings";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

describe("PauseSettings localization", () => {
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

  it("switches the live settings UI to English and persists the selection", () => {
    const store = createStore();

    act(() => {
      root.render(
        <Provider store={store}>
          <PauseSettings />
        </Provider>,
      );
    });

    const englishButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "English",
    );
    expect(englishButton).toBeDefined();

    act(() => englishButton?.click());

    expect(store.get(languageAtom)).toBe("en");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(container.textContent).toContain("Master volume");
    expect(container.textContent).toContain("Sound effects");
    expect(container.textContent).toContain("Language");
    expect(englishButton?.getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).not.toMatch(/[主音量音效设置]/u);
  });
});
