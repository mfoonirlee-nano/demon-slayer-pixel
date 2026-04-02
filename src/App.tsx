import { useEffect, useRef } from "react";
import { Provider, useAtomValue } from "jotai";
import { WIDTH, HEIGHT, SKILLS } from "./constants";
import { setCanvas } from "./context";
import { startGame } from "./runtime";
import {
  bossHudAtom,
  elapsedAtom,
  gameOverAtom,
  gameSnapshotAtom,
  gameStore,
  loadingAtom,
  playerHudAtom,
  setGameSnapshot,
} from "./gameStore";

function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setCanvas(canvas);
    const stopGame = startGame({ onStateChange: setGameSnapshot });

    return () => {
      stopGame();
      setCanvas(null);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="game"
      width={WIDTH}
      height={HEIGHT}
      aria-label="Demon Slayer Pixel Survival"
      className="pixel-canvas block h-auto w-[960px] max-w-full bg-[#0b1220] max-md:h-[100svh] max-md:w-screen max-md:max-w-none"
    />
  );
}

function Hud() {
  const snapshot = useAtomValue(gameSnapshotAtom);
  const player = useAtomValue(playerHudAtom);
  const boss = useAtomValue(bossHudAtom);
  const elapsed = useAtomValue(elapsedAtom);
  const isLoading = useAtomValue(loadingAtom);
  const isGameOver = useAtomValue(gameOverAtom);
  const activeSkill = SKILLS[player.skillIndex] || SKILLS[0];

  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 z-10 hidden w-[360px] rounded border border-white/10 bg-black/40 p-4 text-[12px] leading-6 text-white backdrop-blur-[2px] md:block">
        <div className="flex items-center justify-between gap-4">
          <span>HP: {Math.max(0, Math.floor(player.hp))}</span>
          <div className="h-3 w-[150px] overflow-hidden bg-[#2f445e]">
            <div className="h-full bg-[#26d5ff]" style={{ width: `${Math.max(0, Math.min(100, player.hp))}%` }} />
          </div>
        </div>
        <div>击杀分: {player.score}</div>
        <div className="flex items-center justify-between gap-4">
          <span>招式: {activeSkill.name} ({player.skillIndex + 1})</span>
          <span>可用: {player.skillCharges}/3</span>
        </div>
        <div>攻击加成: +{player.attackBonus}</div>
        <div className="mt-1 h-2 w-[110px] overflow-hidden bg-[#2f445e]">
          <div className="h-full bg-[#7fe8ff]" style={{ width: `${Math.max(0, Math.min(100, player.skillEnergy))}%` }} />
        </div>
        {!activeSkill.image ? <div className="mt-1 text-[#ffb3c1]">技能贴图加载失败</div> : null}
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-10 hidden text-right text-[12px] leading-6 text-white md:block">
        <div>生存: {elapsed.toFixed(1)}s</div>
        <div>敌人: {snapshot.enemiesCount}</div>
        <div>J: 普攻 K: 技能 1/2/3: 切换技能</div>
      </div>

      {boss ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 hidden w-[380px] -translate-x-1/2 rounded border border-white/10 bg-black/40 px-4 py-2 text-white md:block">
          <div className="mb-1 text-center text-[12px]">下弦之鬼·阶段 {boss.phase}</div>
          <div className="h-3 w-full overflow-hidden bg-[#443246]">
            <div className="h-full bg-[#ff6e93]" style={{ width: `${Math.max(0, Math.min(100, (boss.hp / boss.hpMax) * 100))}%` }} />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30 text-sm text-white md:hidden">
          加载像素贴图中...
        </div>
      ) : null}

      {isGameOver ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-6 text-center text-white">
          <div className="space-y-3">
            <div className="text-2xl md:text-4xl">战斗结束</div>
            <div className="text-sm md:text-lg">最终生存: {elapsed.toFixed(1)}s</div>
            <div className="text-sm md:text-base">按 R 重新开始</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function TouchControls() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-between p-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto flex items-end gap-3">
        <button className="touch-btn dir-btn flex h-[58px] w-[58px] items-center justify-center rounded-[14px] border-2 border-[rgba(210,236,255,0.8)] bg-[rgba(16,31,56,0.58)] text-2xl text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="a" data-hold="true" aria-label="向左移动">◀</button>
        <button className="touch-btn dir-btn flex h-[58px] w-[58px] items-center justify-center rounded-[14px] border-2 border-[rgba(210,236,255,0.8)] bg-[rgba(16,31,56,0.58)] text-2xl text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="d" data-hold="true" aria-label="向右移动">▶</button>
      </div>
      <div className="pointer-events-auto flex items-end gap-3">
        <button className="touch-btn jump-btn flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-[rgba(175,220,255,0.95)] bg-[rgba(16,31,56,0.58)] text-lg text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="w" aria-label="跳跃">跳</button>
        <button className="touch-btn attack-btn flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-[rgba(116,236,255,0.95)] bg-[rgba(16,31,56,0.58)] text-lg text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="j" aria-label="攻击">攻</button>
        <button className="touch-btn skill-btn flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-[rgba(118,255,228,0.95)] bg-[rgba(16,31,56,0.58)] text-lg text-[#e8f6ff] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="k" aria-label="释放技能">式</button>
      </div>
    </div>
  );
}

function AppShell() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1020px] flex-col items-center justify-center px-4 py-4 text-center max-md:max-w-none max-md:px-0 max-md:py-0">
      <h1 className="mb-4 text-base tracking-[1px] md:text-2xl max-md:hidden">鬼灭之刃：炭治郎生存战</h1>
      <p className="mb-2 text-[10px] opacity-90 md:text-[13px] max-md:hidden">A/D 移动 · W/空格 跳跃 · J 攻击 · K 释放技能 · 1/2/3 切换技能 · R 重开</p>
      <section className="relative w-fit max-w-full overflow-hidden border-4 border-[#3f5f8a] bg-black shadow-[0_16px_48px_rgba(0,0,0,0.5)] max-md:h-[100svh] max-md:w-screen max-md:border-0 max-md:shadow-none">
        <GameCanvas />
        <Hud />
        <TouchControls />
      </section>
      <p className="mt-2 text-[10px] opacity-90 md:text-[13px] max-md:hidden">目标：生存并迎战阶段式 Boss（下弦之鬼）。</p>
    </main>
  );
}

export default function App() {
  return (
    <Provider store={gameStore}>
      <AppShell />
    </Provider>
  );
}
