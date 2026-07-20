import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { gameStore } from "../game/gameStore";
import { DEFAULT_LANGUAGE, languageAtom } from "../i18n/language";
import App from "./App";

describe("App localization", () => {
  afterEach(() => {
    gameStore.set(languageAtom, DEFAULT_LANGUAGE);
  });

  it.each([
    ["zh-CN", "月潮夜行游戏画布"],
    ["en", "Moonlit Tide Survivor game canvas"],
  ] as const)("uses the %s canvas label", (language, canvasLabel) => {
    gameStore.set(languageAtom, language);

    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain(`aria-label="${canvasLabel}"`);
  });
});
