import { describe, expect, it } from "vitest";
import { createStore } from "jotai/vanilla";
import {
  createLanguageAtom,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  readLanguage,
  writeLanguage,
} from "./language";

class MemoryStorage {
  constructor(private value: string | null) {}

  getItem(_key: string) {
    return this.value;
  }

  setItem(_key: string, value: string) {
    this.value = value;
  }
}

describe("language preference", () => {
  it.each([
    ["zh-CN", "zh-CN"],
    ["en", "en"],
    ["ja", DEFAULT_LANGUAGE],
    [null, DEFAULT_LANGUAGE],
  ] as const)("reads %s as %s", (storedLanguage, expectedLanguage) => {
    expect(readLanguage(new MemoryStorage(storedLanguage))).toBe(expectedLanguage);
  });

  it("persists a supported language", () => {
    const storage = new MemoryStorage(null);

    writeLanguage("en", storage);

    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
  });

  it("applies a language change to app state, storage, and page metadata", () => {
    const storage = new MemoryStorage(null);
    const page = { documentElement: { lang: "" }, title: "" };
    const languageAtom = createLanguageAtom(storage, page);
    const store = createStore();

    expect(store.get(languageAtom)).toBe("zh-CN");
    expect(page).toEqual({ documentElement: { lang: "zh-CN" }, title: "月潮夜行" });

    store.set(languageAtom, "en");

    expect(store.get(languageAtom)).toBe("en");
    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(page).toEqual({
      documentElement: { lang: "en" },
      title: "Moonlit Tide Survivor",
    });
  });
});
