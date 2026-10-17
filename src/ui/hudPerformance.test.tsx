// @vitest-environment jsdom
import { act, Profiler } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "jotai";
import { expect, it, vi } from "vitest";
import { gameStore, setGameSnapshot } from "../game/gameStore";
import { getStateSnapshot, resetState, state } from "../game/state";
import { GameHud } from "./gameHud";
import { TouchControls } from "./touchControls";

const FPS = 60;

it("does not reconcile HUD or touch buttons when only the world clock advances", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  resetState();
  setGameSnapshot(getStateSnapshot());
  const container = document.createElement("div");
  const root = createRoot(container);
  const commits = vi.fn();
  try {
    act(() => root.render(
      <Provider store={gameStore}>
        <Profiler id="hud" onRender={commits}><GameHud /></Profiler>
        <Profiler id="touch" onRender={commits}><TouchControls /></Profiler>
      </Provider>,
    ));
    commits.mockClear();
    for (let frame = 1; frame <= FPS; frame += 1) {
      act(() => {
        state.elapsed = frame / FPS;
        setGameSnapshot(getStateSnapshot());
      });
    }
    expect(commits.mock.calls.length).toBe(0);
  } finally {
    act(() => root.unmount());
    resetState();
    vi.unstubAllGlobals();
  }
});
