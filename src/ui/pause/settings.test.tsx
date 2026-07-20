import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { languageAtom } from "../../i18n/language";
import { PauseSettings } from "./settings";

describe("PauseSettings localization", () => {
  it("renders the English language setting alongside localized audio controls", () => {
    const store = createStore();
    store.set(languageAtom, "en");

    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <PauseSettings />
      </Provider>,
    );

    expect(markup).toContain("Master volume");
    expect(markup).toContain("Sound effects");
    expect(markup).toContain("Language");
    expect(markup).toContain('aria-pressed="true">English');
    expect(markup).not.toMatch(/[主音量音效设置]/u);
  });
});
