import type { Language } from "../../i18n/language";

const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: "zh-CN", label: "中文" },
  { value: "en", label: "English" },
];

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
    <div className="grid gap-2 px-2 py-[5px] text-[10px] leading-none text-[#c8efff]">
      <span className="text-[#7fc8e0]">{label}</span>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={label}>
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`h-8 rounded-sm border text-[11px] font-bold ${
              language === option.value
                ? "border-[#26d5ff] bg-[rgba(38,213,255,0.18)] text-[#e8fbff]"
                : "border-[rgba(127,200,224,0.4)] bg-[rgba(4,11,25,0.48)] text-[#7fc8e0]"
            }`}
            onClick={() => onChange(option.value)}
            aria-pressed={language === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
