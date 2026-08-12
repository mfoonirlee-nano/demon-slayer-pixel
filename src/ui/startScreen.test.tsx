import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { languageAtom } from "../i18n/language";
import { StartScreen } from "./startScreen";

describe("StartScreen localization", () => {
  it("renders the saved English language", () => {
    const store = createStore();
    store.set(languageAtom, "en");

    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <StartScreen
          assetsReady
          startQueued={false}
          controlsOpen={false}
          onOpenControls={() => undefined}
          onCloseControls={() => undefined}
          onStart={() => undefined}
        />
      </Provider>,
    );

    expect(markup).toContain("Press any key or click to start");
    expect(markup).toContain("Controls");
    expect(markup).not.toContain("按任意键开始");
  });

  it("localizes the loading prompt", () => {
    const store = createStore();
    store.set(languageAtom, "en");

    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <StartScreen
          assetsReady={false}
          startQueued
          controlsOpen={false}
          onOpenControls={() => undefined}
          onCloseControls={() => undefined}
          onStart={() => undefined}
        />
      </Provider>,
    );

    expect(markup).toContain("Loading pixel art...");
    expect(markup).not.toContain("加载像素贴图中...");
  });
});
