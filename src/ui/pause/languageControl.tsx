import {
  isLanguage,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type Language,
} from "../../i18n/language";

export function LanguageControl({
  language,
  label,
  onChange,
}: {
  language: Language;
  label: string;
  onChange: (language: Language) => void;
}) {
  return (
    <label className="grid gap-2 px-2 py-[5px] text-[10px] leading-none text-[#c8efff]">
      <span className="text-[#7fc8e0]">{label}</span>
      <span className="relative h-8 rounded-sm border border-[#26d5ff] bg-[rgba(8,25,45,0.9)] shadow-[inset_0_0_0_1px_rgba(38,213,255,0.16)] focus-within:border-[#7fe8ff] focus-within:shadow-[inset_0_0_0_1px_rgba(127,232,255,0.32),0_0_8px_rgba(38,213,255,0.34)]">
        <select
          className="h-full w-full cursor-pointer appearance-none bg-transparent px-3 pr-8 text-[11px] font-bold text-[#e8fbff]"
          value={language}
          aria-label={label}
          onChange={(event) => {
            const nextLanguage = event.currentTarget.value;
            if (isLanguage(nextLanguage)) onChange(nextLanguage);
          }}
        >
          {SUPPORTED_LANGUAGES.map((option) => (
            <option
              key={option}
              value={option}
              className="bg-[#07111f] text-[#e8fbff]"
            >
              {LANGUAGE_LABELS[option]}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] text-[#7fe8ff]"
        >
          ▼
        </span>
      </span>
    </label>
  );
}
