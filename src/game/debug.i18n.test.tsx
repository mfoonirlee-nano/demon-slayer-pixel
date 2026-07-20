// @vitest-environment jsdom

import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("DebugPanel localization", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
    vi.resetModules();
  });

  it("renders its full selector surface in the active language", async () => {
    window.history.replaceState({}, "", "/?debug=1");
    vi.resetModules();
    const [{ DebugPanel }, { languageAtom }] = await Promise.all([
      import("./debug"),
      import("../i18n/language"),
    ]);

    const renderPanel = (language: "zh-CN" | "en") => {
      const store = createStore();
      store.set(languageAtom, language);
      return renderToStaticMarkup(
        <Provider store={store}>
          <DebugPanel />
        </Provider>,
      );
    };

    const chineseMarkup = renderPanel("zh-CN");
    const englishMarkup = renderPanel("en");

    expect(chineseMarkup).toContain("游戏窗口");
    expect(chineseMarkup).toContain("潮龙·破阵");
    expect(chineseMarkup).toContain("蛛弦");
    expect(englishMarkup).toContain("Game window");
    expect(englishMarkup).toContain("Tidal Dragon: Breakthrough");
    expect(englishMarkup).toContain("Spider String");
    expect(englishMarkup).not.toMatch(/\p{Script=Han}/u);
  });
});
