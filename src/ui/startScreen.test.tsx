import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { languageAtom } from "../i18n/language";
import { StartScreen } from "./startScreen";

describe("StartScreen localization", () => {
  it("shows measured progress and a localized retry on failure", () => {
    const store = createStore();
    store.set(languageAtom, "en");
    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <StartScreen
          assetsReady={false}
          assetProgress={{ status: "error", loaded: 1, total: 2, failed: ["assets/a.png"] }}
          startQueued
          controlsOpen={false}
          onOpenControls={() => undefined}
          onCloseControls={() => undefined}
          onStart={() => undefined}
          onRetry={() => undefined}
        />
      </Provider>,
    );
    expect(markup).toContain("50%");
    expect(markup).toContain("Loaded 1 / 2");
    expect(markup).toContain("Retry loading");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('value="1" max="2"');
    expect(markup).not.toContain("Press any key or click to start");
  });
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
