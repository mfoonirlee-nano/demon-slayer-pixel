// @vitest-environment jsdom
import { act, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "jotai";
import { expect, it, vi } from "vitest";
import { gameStore, setGameSnapshot } from "../game/gameStore";
import { getStateSnapshot, resetState, state } from "../game/state";
import { updateUltimateCastAndTimer } from "../entities/players/skillCasting";
import { GameHud } from "./gameHud";

const { vesselRenders } = vi.hoisted(() => ({ vesselRenders: vi.fn() }));
vi.mock("./residualSpiritVessel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./residualSpiritVessel")>();
  return { ...actual, ResidualSpiritVessel(props: ComponentProps<typeof actual.ResidualSpiritVessel>) {
    vesselRenders();
    return <actual.ResidualSpiritVessel {...props} />;
  } };
});

const FPS = 60;
const ULTIMATE_DURATION = 600;

it("advances the ultimate countdown without rerendering unrelated spirit vessels", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  resetState();
  state.player.ultimateLevel = 3;
  state.player.ultimateTimer = ULTIMATE_DURATION;
  state.player.ultimateDuration = ULTIMATE_DURATION;
  setGameSnapshot(getStateSnapshot());
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    act(() => root.render(<Provider store={gameStore}><GameHud /></Provider>));
    const countdown = container.querySelector(".ultimate-orb-countdown");
    const originalAngle = countdown?.getAttribute("style");
    vesselRenders.mockClear();
    for (let frame = 0; frame < FPS; frame += 1) {
      act(() => {
        updateUltimateCastAndTimer();
        state.elapsed += 1 / FPS;
        setGameSnapshot(getStateSnapshot());
      });
    }
    expect(countdown?.getAttribute("style")).not.toBe(originalAngle);
    expect(state.player.ultimateTimer).toBe(ULTIMATE_DURATION - FPS);
    expect(vesselRenders.mock.calls.length).toBe(0);
  } finally {
    act(() => root.unmount());
    resetState();
    vi.unstubAllGlobals();
  }
});
