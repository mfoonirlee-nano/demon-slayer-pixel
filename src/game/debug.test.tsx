// @vitest-environment jsdom

import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

describe("DebugPanel collision boxes", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState({}, "", "/?debug=1");
    vi.resetModules();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState({}, "", "/");
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
    vi.resetModules();
  });

  it("controls the shared collision-box debug state", async () => {
    const [{ DebugPanel }, { isCollisionDebugEnabledAtom }, { languageAtom }] = await Promise.all([
      import("./debug"),
      import("./gameStore"),
      import("../i18n/language"),
    ]);
    const store = createStore();
    store.set(languageAtom, "zh-CN");

    await act(async () => {
      root.render(
        <Provider store={store}>
          <DebugPanel />
        </Provider>,
      );
    });

    const checkbox = container.querySelector<HTMLInputElement>("#debug-collision-boxes");
    expect(checkbox).not.toBeNull();
    expect(checkbox?.checked).toBe(false);
    expect(store.get(isCollisionDebugEnabledAtom)).toBe(false);

    act(() => {
      checkbox!.click();
    });

    expect(checkbox?.checked).toBe(true);
    expect(store.get(isCollisionDebugEnabledAtom)).toBe(true);
  });
});
