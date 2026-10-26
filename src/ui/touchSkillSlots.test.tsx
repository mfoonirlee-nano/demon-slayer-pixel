// @vitest-environment jsdom
import { Provider } from "jotai";
import { createStore } from "jotai/vanilla";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gameSnapshotAtom, type PlayerSnapshot } from "../game/gameStore";
import { setupInput, teardownInput } from "../game/input";
import { resetState, getStateSnapshot } from "../game/state";
import { languageAtom } from "../i18n/language";
import { SKILL_SLOT_COUNT } from "../systems/loadout";
import { TouchSkillSlots } from "./touchSkillSlots";

vi.mock("../game/audio", () => ({ ensureAudio: vi.fn(), playSfx: vi.fn() }));
afterEach(() => { teardownInput(); document.body.innerHTML = ""; });

function renderHud(overrides: Partial<PlayerSnapshot>) {
  resetState();
  const store = createStore();
  store.set(languageAtom, "en");
  const snapshot = getStateSnapshot();
  store.set(gameSnapshotAtom, { ...snapshot, player: { ...snapshot.player, ...overrides } });
  return renderToStaticMarkup(<Provider store={store}><TouchSkillSlots /></Provider>);
}

describe("touch skill slots", () => {
  it("routes all three visible touch slots through the same input handlers", () => {
    document.body.innerHTML = renderHud({ skillIndex: 1 });
    const onSwitchSkill = vi.fn();
    setupInput({ onSwitchSkill });
    const buttons = document.querySelectorAll<HTMLButtonElement>(".touch-skill-slot");
    expect(buttons).toHaveLength(SKILL_SLOT_COUNT);
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
    buttons.forEach((button) => {
      button.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      button.dispatchEvent(new Event("pointerup", { bubbles: true }));
    });
    expect(onSwitchSkill.mock.calls).toEqual([[0], [1], [2]]);
  });

});
