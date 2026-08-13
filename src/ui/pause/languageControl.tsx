import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type Language,
} from "../../i18n/language";
import { UiSprite, uiSpriteDisplaySize } from "../uiSprite";

const LANGUAGE_OPTION_GAP = 4;
const LANGUAGE_OPTION_SIZE = uiSpriteDisplaySize("pauseOptionNormal");

function consumeMenuKey(event: KeyboardEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function languageMark(language: Language) {
  return language === "zh-CN" ? "中" : "EN";
}

function LanguageOptionContent({
  language,
  selected = false,
  trigger = false,
  valueId,
}: {
  language: Language;
  selected?: boolean;
  trigger?: boolean;
  valueId?: string;
}) {
  return (
    <>
      <span aria-hidden="true" className="language-select-locale-mark">
        {languageMark(language)}
      </span>
      <span id={valueId} className="language-select-value">{LANGUAGE_LABELS[language]}</span>
      {trigger ? (
        <span aria-hidden="true" className="language-select-arrow" />
      ) : selected ? (
        <span aria-hidden="true" className="language-select-current-mark" />
      ) : null}
    </>
  );
}

export function LanguageControl({
  language,
  label,
  onChange,
}: {
  language: Language;
  label: string;
  onChange: (language: Language) => void;
}) {
  const controlId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = SUPPORTED_LANGUAGES.indexOf(language);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);
  const labelId = `${controlId}-label`;
  const valueId = `${controlId}-value`;
  const listboxId = `${controlId}-listbox`;

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[highlightedIndex]?.focus({ preventScroll: true });
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [isOpen]);

  const openMenu = (initialIndex = selectedIndex) => {
    setHighlightedIndex(initialIndex);
    setIsOpen(true);
  };

  const closeMenu = (restoreFocus: boolean) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const moveHighlight = (offset: number) => {
    setHighlightedIndex((currentIndex) => (
      (currentIndex + offset + SUPPORTED_LANGUAGES.length) % SUPPORTED_LANGUAGES.length
    ));
  };

  const selectLanguage = (nextLanguage: Language) => {
    closeMenu(true);
    if (nextLanguage !== language) onChange(nextLanguage);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp") {
      consumeMenuKey(event);
      openMenu();
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      consumeMenuKey(event);
      openMenu(event.key === "Home" ? 0 : SUPPORTED_LANGUAGES.length - 1);
    }
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      consumeMenuKey(event);
      moveHighlight(1);
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      consumeMenuKey(event);
      moveHighlight(-1);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      consumeMenuKey(event);
      setHighlightedIndex(event.key === "Home" ? 0 : SUPPORTED_LANGUAGES.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      consumeMenuKey(event);
      selectLanguage(SUPPORTED_LANGUAGES[highlightedIndex]);
      return;
    }

    if (event.key === "Escape") {
      consumeMenuKey(event);
      closeMenu(true);
    }
  };

  return (
    <div className="grid gap-2 py-[5px] text-[10px] leading-none text-[#c8efff]">
      <span id={labelId} className="text-[#7fc8e0]">{label}</span>
      <div
        ref={rootRef}
        className={`language-select-control ${isOpen ? "language-select-control--open" : ""}`}
        style={{ width: LANGUAGE_OPTION_SIZE.w, height: LANGUAGE_OPTION_SIZE.h }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          className="language-select-trigger"
          aria-labelledby={`${labelId} ${valueId}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          onClick={() => openMenu()}
          onKeyDown={handleTriggerKeyDown}
        >
          <UiSprite id={isOpen ? "pauseOptionActive" : "pauseOptionNormal"}>
            <LanguageOptionContent language={language} trigger valueId={valueId} />
          </UiSprite>
        </button>

        {isOpen ? (
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className="language-select-menu"
            style={{
              transform: `translateY(-${selectedIndex * (LANGUAGE_OPTION_SIZE.h + LANGUAGE_OPTION_GAP)}px)`,
            }}
          >
            {SUPPORTED_LANGUAGES.map((option, index) => (
              <button
                key={option}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="option"
                tabIndex={highlightedIndex === index ? 0 : -1}
                aria-selected={language === option}
                data-language={option}
                className="language-select-option"
                onClick={() => selectLanguage(option)}
                onFocus={() => setHighlightedIndex(index)}
                onKeyDown={handleOptionKeyDown}
                onPointerEnter={() => setHighlightedIndex(index)}
              >
                <UiSprite id={highlightedIndex === index ? "pauseOptionActive" : "pauseOptionNormal"}>
                  <LanguageOptionContent language={option} selected={language === option} />
                </UiSprite>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
