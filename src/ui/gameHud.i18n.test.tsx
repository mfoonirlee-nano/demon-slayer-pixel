import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { gameSnapshotAtom, gameStore } from "../game/gameStore";
import { languageAtom } from "../i18n/language";
import type { GameSnapshot } from "../game/gameStore";
import { GameHud } from "./gameHud";

describe("GameHud localization", () => {
  it("derives an English awakened Boss title from snapshot identity", () => {
    const store = createStore();
    store.set(languageAtom, "en");
    const snapshot = {
      ...gameStore.get(gameSnapshotAtom),
      boss: {
        id: "mirror-dream",
        displayName: "镜魇",
        phaseTitle: "血月眷属 · 镜魇·蚀醒 · 阶段 1",
        hp: 100,
        hpMax: 100,
        phase: 1,
        awakened: true,
      },
    } as GameSnapshot;
    store.set(gameSnapshotAtom, snapshot);

    const markup = renderToStaticMarkup(
      <Provider store={store}>
        <GameHud />
      </Provider>,
    );

    expect(markup).toContain("Blood Moon Kin · Awakened Mirror Dream · Phase 1");
    expect(markup).toContain("boss-locale-emblem");
    expect(markup).toContain(">KO<");
    expect(markup).not.toContain("血月眷属");
  });
});
