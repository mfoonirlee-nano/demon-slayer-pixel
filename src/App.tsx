import { useEffect, useRef, useState } from "react";
import { Provider, useAtomValue } from "jotai";
import { WIDTH, HEIGHT, SKILLS, HUD_UI } from "./constants";
import { setCanvas } from "./context";
import { startGame } from "./runtime";
import { gameSnapshotAtom, gameStore, setGameSnapshot } from "./gameStore";

function clampMeterPercent(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.max(0, Math.min(HUD_UI.meterPercentMax, (value / maxValue) * HUD_UI.meterPercentMax));
}

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

const HP_GHOST_LERP_SPEED = 0.04;

function Hud() {
  const snapshot = useAtomValue(gameSnapshotAtom);
  const { player, boss, elapsed, spritesReady, gameOver } = snapshot;
  const activeSkill = SKILLS[player.skillIndex] || SKILLS[0];

  const [ghostHp, setGhostHp] = useState(player.hp);
  const ghostHpRef = useRef(player.hp);
  const playerRafRef = useRef<number>(0);

  useEffect(() => {
    if (player.hp >= ghostHpRef.current) {
      ghostHpRef.current = player.hp;
      setGhostHp(player.hp);
      return;
    }
    const animate = () => {
      const diff = player.hp - ghostHpRef.current;
      if (Math.abs(diff) < 0.1) {
        ghostHpRef.current = player.hp;
        setGhostHp(player.hp);
        return;
      }
      ghostHpRef.current += diff * HP_GHOST_LERP_SPEED;
      setGhostHp(ghostHpRef.current);
      playerRafRef.current = requestAnimationFrame(animate);
    };
    cancelAnimationFrame(playerRafRef.current);
    playerRafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(playerRafRef.current);
  }, [player.hp]);

  const bossHp = boss?.hp ?? 0;
  const bossHpMax = boss?.hpMax ?? 1;
  const [ghostBossHp, setGhostBossHp] = useState(bossHp);
  const ghostBossHpRef = useRef(bossHp);
  const bossRafRef = useRef<number>(0);

  useEffect(() => {
    if (bossHp >= ghostBossHpRef.current) {
      ghostBossHpRef.current = bossHp;
      setGhostBossHp(bossHp);
      return;
    }
    const animate = () => {
      const diff = bossHp - ghostBossHpRef.current;
      if (Math.abs(diff) < 0.1) {
        ghostBossHpRef.current = bossHp;
        setGhostBossHp(bossHp);
        return;
      }
      ghostBossHpRef.current += diff * HP_GHOST_LERP_SPEED;
      setGhostBossHp(ghostBossHpRef.current);
      bossRafRef.current = requestAnimationFrame(animate);
    };
    cancelAnimationFrame(bossRafRef.current);
    bossRafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(bossRafRef.current);
  }, [bossHp]);

  const hpPercent = clampMeterPercent(player.hp, player.maxHp);
  const ghostHpPercent = clampMeterPercent(ghostHp, player.maxHp);
  const skillEnergyPercent = clampMeterPercent(player.skillEnergy, player.skillEnergyMax);
  const bossHpPercent = clampMeterPercent(bossHp, bossHpMax);
  const ghostBossHpPercent = clampMeterPercent(ghostBossHp, bossHpMax);

  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 z-10 hidden rounded border border-white/10 bg-black/40 p-3 text-[12px] text-white backdrop-blur-[2px] md:block" style={{ width: HUD_UI.panelWidth }}>
        <div className="flex items-center justify-between gap-3">
          <span>HP {Math.max(0, Math.floor(player.hp))}</span>
          <div className="relative h-3 overflow-hidden bg-[#2f445e]" style={{ width: HUD_UI.hpBarWidth }}>
            <div className="absolute inset-y-0 left-0 h-full bg-[#1a6e8a]" style={{ width: `${ghostHpPercent}%` }} />
            <div className="absolute inset-y-0 left-0 h-full bg-[#26d5ff]" style={{ width: `${hpPercent}%` }} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span>{activeSkill.name}</span>
          <span>{player.skillCharges}/{player.maxSkillCharges}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden bg-[#2f445e]" style={{ width: HUD_UI.skillBarWidth }}>
          <div className="h-full bg-[#7fe8ff]" style={{ width: `${skillEnergyPercent}%` }} />
        </div>
      </div>

      {boss ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 rounded border border-white/10 bg-black/40 px-4 py-2 text-white md:block" style={{ width: HUD_UI.bossBarWidth }}>
          <div className="mb-1 text-center text-[12px]">下弦之鬼·阶段 {boss.phase}</div>
          <div className="relative h-3 w-full overflow-hidden bg-[#443246]">
            <div className="absolute inset-y-0 left-0 h-full bg-[#7a2a44]" style={{ width: `${ghostBossHpPercent}%` }} />
            <div className="absolute inset-y-0 left-0 h-full bg-[#ff6e93]" style={{ width: `${bossHpPercent}%` }} />
          </div>
        </div>
      ) : null}

      {!spritesReady ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30 text-sm text-white md:hidden">
          加载像素贴图中...
        </div>
      ) : null}

      {gameOver ? (
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
