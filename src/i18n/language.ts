import { atom } from "jotai";

export const SUPPORTED_LANGUAGES = ["zh-CN", "en"] as const;

export type Language = typeof SUPPORTED_LANGUAGES[number];

export const DEFAULT_LANGUAGE: Language = "zh-CN";
export const LANGUAGE_STORAGE_KEY = "moonlit-tide-language";

type LanguageStorageReader = Pick<Storage, "getItem">;
type LanguageStorageWriter = Pick<Storage, "setItem">;
type LanguageStorage = LanguageStorageReader & LanguageStorageWriter;
type LanguagePage = {
  documentElement: { lang: string };
  title: string;
};

const PAGE_TITLES: Record<Language, string> = {
  "zh-CN": "月潮夜行",
  en: "Moonlit Tide Survivor",
};

export function readLanguage(storage: LanguageStorageReader | undefined = browserStorage()): Language {
  if (!storage) return DEFAULT_LANGUAGE;

  try {
    const storedLanguage = storage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function writeLanguage(
  language: Language,
  storage: LanguageStorageWriter | undefined = browserStorage(),
) {
  if (!storage) return;

  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The selected language still applies for the current session.
  }
}

export function createLanguageAtom(
  storage: LanguageStorage | undefined = browserStorage(),
  page: LanguagePage | undefined = browserDocument(),
) {
  const initialLanguage = readLanguage(storage);
  const valueAtom = atom<Language>(initialLanguage);
  applyLanguageToPage(initialLanguage, page);

  return atom(
    (get) => get(valueAtom),
    (_get, set, language: Language) => {
      set(valueAtom, language);
      writeLanguage(language, storage);
      applyLanguageToPage(language, page);
    },
  );
}

export const languageAtom = createLanguageAtom();

function browserStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function browserDocument(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}

function applyLanguageToPage(language: Language, page: LanguagePage | undefined) {
  if (!page) return;
  page.documentElement.lang = language;
  page.title = PAGE_TITLES[language];
}

function isLanguage(value: string | null): value is Language {
  return SUPPORTED_LANGUAGES.some((language) => language === value);
}
