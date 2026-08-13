// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SUPPORTED_LANGUAGES } from "../../i18n/language";
import { LanguageControl } from "./languageControl";

const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
};

describe("LanguageControl", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("opens every supported language in the Moonlit Tide option frames", () => {
    act(() => {
      root.render(
        <LanguageControl language="en" label="Language" onChange={() => undefined} />,
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-haspopup="listbox"]',
    );
    expect(trigger?.getAttribute("aria-labelledby")).toContain("-label");
    expect(trigger?.getAttribute("aria-labelledby")).toContain("-value");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.textContent).toContain("English");
    expect(container.querySelector("select")).toBeNull();

    act(() => trigger?.click());

    const options = [...container.querySelectorAll<HTMLButtonElement>('[role="option"]')];
    expect(options).toHaveLength(SUPPORTED_LANGUAGES.length);
    expect(options.map((option) => option.dataset.language)).toEqual([...SUPPORTED_LANGUAGES]);
    expect(options.map((option) => option.querySelector(".language-select-value")?.textContent))
      .toEqual(["中文", "English"]);
    expect(options[1].getAttribute("aria-selected")).toBe("true");
    expect(options[1].querySelector(".ui-sprite")?.getAttribute("style"))
      .toContain("pause-option-active.png");

    act(() => {
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it("supports keyboard selection and consumes Escape before the pause shortcut", () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <LanguageControl language="zh-CN" label="语言" onChange={onChange} />,
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-haspopup="listbox"]',
    );
    act(() => {
      trigger?.dispatchEvent(new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      }));
    });

    const chineseOption = container.querySelector<HTMLButtonElement>('[data-language="zh-CN"]');
    expect(document.activeElement).toBe(chineseOption);

    act(() => {
      chineseOption?.dispatchEvent(new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      }));
    });

    const englishOption = container.querySelector<HTMLButtonElement>('[data-language="en"]');
    expect(document.activeElement).toBe(englishOption);
    act(() => {
      englishOption?.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(onChange).toHaveBeenCalledWith("en");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    act(() => trigger?.click());
    const onWindowKeyDown = vi.fn();
    window.addEventListener("keydown", onWindowKeyDown);
    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      container.querySelector<HTMLButtonElement>('[data-language="zh-CN"]')
        ?.dispatchEvent(escapeEvent);
    });
    window.removeEventListener("keydown", onWindowKeyDown);

    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(onWindowKeyDown).not.toHaveBeenCalled();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
