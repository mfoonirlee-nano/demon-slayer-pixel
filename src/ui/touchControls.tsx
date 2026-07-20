import { useAtomValue } from "jotai";
import { languageAtom } from "../i18n/language";
import { message } from "../i18n/messages";

export function TouchControls() {
  const language = useAtomValue(languageAtom);
  const actionTextClass = language === "zh-CN" ? "text-lg" : "text-[11px] font-bold";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-between gap-2 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto flex items-end gap-2">
        <button className="touch-btn dir-btn flex h-[54px] w-[54px] items-center justify-center rounded-[14px] border-2 border-[rgba(210,236,255,0.8)] bg-[rgba(16,31,56,0.58)] text-2xl text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="a" data-hold="true" aria-label={message(language, "touch.moveLeft")}>◀</button>
        <button className="touch-btn dir-btn flex h-[54px] w-[54px] items-center justify-center rounded-[14px] border-2 border-[rgba(210,236,255,0.8)] bg-[rgba(16,31,56,0.58)] text-2xl text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="d" data-hold="true" aria-label={message(language, "touch.moveRight")}>▶</button>
      </div>
      <div className="pointer-events-auto grid grid-cols-3 place-items-center gap-2">
        <button className="touch-btn dir-btn flex h-[44px] w-[44px] items-center justify-center rounded-[10px] border border-[rgba(150,200,255,0.5)] bg-[rgba(16,31,56,0.5)] text-xl text-[#b0d4f0] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="s" data-hold="true" aria-label={message(language, "touch.fallAttack")}>▼</button>
        <button className="touch-btn pause-btn flex h-[44px] w-[44px] items-center justify-center rounded-[10px] border border-[rgba(150,200,255,0.5)] bg-[rgba(16,31,56,0.5)] text-[11px] text-[#b0d4f0] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="p" aria-label={message(language, "touch.pause")}>⏸</button>
        <button className={`touch-btn jump-btn flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[rgba(175,220,255,0.95)] bg-[rgba(16,31,56,0.58)] ${actionTextClass} text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]`} data-key="w" aria-label={message(language, "touch.jump")}>{message(language, "touch.jumpShort")}</button>
        <button className={`touch-btn attack-btn flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[rgba(116,236,255,0.95)] bg-[rgba(16,31,56,0.58)] ${actionTextClass} text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]`} data-key="j" aria-label={message(language, "touch.attack")}>{message(language, "touch.attackShort")}</button>
        <button className={`touch-btn skill-btn flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[rgba(118,255,228,0.95)] bg-[rgba(16,31,56,0.58)] ${actionTextClass} text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]`} data-key="k" aria-label={message(language, "touch.skill")}>{message(language, "touch.skillShort")}</button>
        <button className={`touch-btn ultimate-btn flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[rgba(255,212,112,0.95)] bg-[rgba(56,24,16,0.58)] ${actionTextClass} text-[#fff1c7] shadow-[0_1px_0_rgba(0,0,0,0.25)]`} data-key="l" aria-label={message(language, "touch.ultimate")}>{message(language, "touch.ultimateShort")}</button>
      </div>
    </div>
  );
}
