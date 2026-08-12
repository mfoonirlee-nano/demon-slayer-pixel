import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { languageAtom, type Language } from "../i18n/language";
import { ControlsGuide } from "./controlsGuide";

function renderControlsGuide(language: Language) {
  const store = createStore();
  store.set(languageAtom, language);

  return renderToStaticMarkup(
    <Provider store={store}>
      <ControlsGuide />
    </Provider>,
  );
}

describe("ControlsGuide", () => {
  it("shows every player-facing keyboard control in Chinese", () => {
    const markup = renderControlsGuide("zh-CN");

    expect(markup).toContain("月潮键谱");
    expect(markup).toContain("左右移动");
    expect(markup).toContain("空中落击");
    expect(markup).toContain("普通攻击");
    expect(markup).toContain("当前技能");
    expect(markup).toContain("终式");
    expect(markup).toContain("引灵疗愈");
    expect(markup).toContain("切换技能");
    expect(markup).toContain("暂停 / 恢复");
    expect(markup).toContain("奖励选择");
    expect(markup).toContain("结束后重开");
    expect(markup).toContain("<kbd>A</kbd>");
    expect(markup).toContain("<kbd>S / ↓</kbd>");
    expect(markup).toContain("<kbd>Enter</kbd>");
    expect(markup).not.toContain("Meta");
  });

  it("derives the complete English guide from the same bindings", () => {
    const markup = renderControlsGuide("en");

    expect(markup).toContain("Moon-Tide Controls");
    expect(markup).toContain("Move left / right");
    expect(markup).toContain("Aerial plunge");
    expect(markup).toContain("Basic attack");
    expect(markup).toContain("Current skill");
    expect(markup).toContain("Ultimate");
    expect(markup).toContain("Spirit healing");
    expect(markup).toContain("Switch skill");
    expect(markup).toContain("Pause / resume");
    expect(markup).toContain("Choose rewards");
    expect(markup).toContain("Restart after a run");
    expect(markup).not.toMatch(/[月潮键谱左右移动空中落击普通攻击终式引灵疗愈]/u);
  });
});
