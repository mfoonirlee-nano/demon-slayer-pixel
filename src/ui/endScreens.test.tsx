import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { languageAtom } from "../i18n/language";
import { DeathScreen } from "./deathScreen";
import { VictoryScreen } from "./victoryScreen";

describe("localized end screens", () => {
  it("renders an English death screen without the Chinese text sprite", () => {
    const store = createStore();
    store.set(languageAtom, "en");

    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <DeathScreen elapsed={12.3} />
      </Provider>,
    );

    expect(markup).toContain("Defeated");
    expect(markup).toContain("death-title-animated");
    expect(markup).toContain("Survived 12.3s");
    expect(markup).toContain("Press R to restart");
    expect(markup).not.toContain("assets/sprites/ui/end.png");
    expect(markup).not.toMatch(/[战死最终生存重新开始]/u);
  });

  it("renders the English victory copy", () => {
    const store = createStore();
    store.set(languageAtom, "en");

    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <VictoryScreen elapsed={45.6} />
      </Provider>,
    );

    expect(markup).toContain("Blood Moon Dawn");
    expect(markup).toContain("Cleared in 45.6s");
    expect(markup).toContain("Press R to restart");
    expect(markup).not.toMatch(/[血月破晓通关用时重新开始]/u);
  });
});
