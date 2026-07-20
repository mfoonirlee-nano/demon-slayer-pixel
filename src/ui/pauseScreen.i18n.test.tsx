import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { gameSnapshotAtom, gameStore } from "../game/gameStore";
import { languageAtom, type Language } from "../i18n/language";
import { PauseScreen } from "./pauseScreen";

function renderPauseScreen(language: Language) {
  const store = createStore();
  store.set(languageAtom, language);
  const snapshot = gameStore.get(gameSnapshotAtom);
  return renderToStaticMarkup(
    <Provider store={store}>
      <PauseScreen snapshot={snapshot} />
    </Provider>,
  );
}

describe("PauseScreen localization", () => {
  it("derives Chinese and English copy from the same game snapshot", () => {
    const chineseMarkup = renderPauseScreen("zh-CN");
    const englishMarkup = renderPauseScreen("en");

    expect(chineseMarkup).toContain("基础信息");
    expect(chineseMarkup).toContain("潮龙·破阵");
    expect(englishMarkup).toContain("Overview");
    expect(englishMarkup).toContain("Tidal Dragon: Breakthrough");
    expect(englishMarkup).toContain("Skill Energy");
    expect(englishMarkup).not.toMatch(/[基础信息装备设置技能能量潮龙破阵]/u);
  });
});
