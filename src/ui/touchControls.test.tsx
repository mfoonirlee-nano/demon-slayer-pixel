import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { languageAtom } from "../i18n/language";
import { TouchControls } from "./touchControls";

describe("TouchControls localization", () => {
  it("renders English accessible and visible action labels", () => {
    const store = createStore();
    store.set(languageAtom, "en");

    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <TouchControls />
      </Provider>,
    );

    expect(markup).toContain('aria-label="Move left"');
    expect(markup).toContain('aria-label="Use ultimate"');
    expect(markup).toContain(">JMP</button>");
    expect(markup).toContain(">ATK</button>");
    expect(markup).toContain(">SKL</button>");
    expect(markup).toContain(">ULT</button>");
    expect(markup).not.toMatch(/[向左右下落攻击准备跳跃释放技能大招]/u);
  });
});
