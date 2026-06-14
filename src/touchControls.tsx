export function TouchControls() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-between gap-2 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto flex items-end gap-2">
        <button className="touch-btn dir-btn flex h-[54px] w-[54px] items-center justify-center rounded-[14px] border-2 border-[rgba(210,236,255,0.8)] bg-[rgba(16,31,56,0.58)] text-2xl text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="a" data-hold="true" aria-label="向左移动">◀</button>
        <button className="touch-btn dir-btn flex h-[54px] w-[54px] items-center justify-center rounded-[14px] border-2 border-[rgba(210,236,255,0.8)] bg-[rgba(16,31,56,0.58)] text-2xl text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="d" data-hold="true" aria-label="向右移动">▶</button>
      </div>
      <div className="pointer-events-auto grid grid-cols-3 place-items-center gap-2">
        <button className="touch-btn pause-btn flex h-[44px] w-[44px] items-center justify-center rounded-[10px] border border-[rgba(150,200,255,0.5)] bg-[rgba(16,31,56,0.5)] text-[11px] text-[#b0d4f0] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="p" aria-label="暂停">⏸</button>
        <button className="touch-btn jump-btn flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[rgba(175,220,255,0.95)] bg-[rgba(16,31,56,0.58)] text-lg text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="w" aria-label="跳跃">跳</button>
        <button className="touch-btn attack-btn flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[rgba(116,236,255,0.95)] bg-[rgba(16,31,56,0.58)] text-lg text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="j" aria-label="攻击">攻</button>
        <button className="touch-btn skill-btn flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[rgba(118,255,228,0.95)] bg-[rgba(16,31,56,0.58)] text-lg text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="k" aria-label="释放技能">式</button>
        <button className="touch-btn ultimate-btn flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[rgba(255,212,112,0.95)] bg-[rgba(56,24,16,0.58)] text-lg text-[#fff1c7] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="l" aria-label="释放大招">奥</button>
      </div>
    </div>
  );
}
