import { useEffect, useRef, useState } from "react";
import { Provider, useAtomValue } from "jotai";
import { WIDTH, HEIGHT, SKILLS, HUD_UI } from "./constants";
import { setCanvas } from "./context";
import { startGame } from "./runtime";
import { gameSnapshotAtom, gameStore, setGameSnapshot, type GameSnapshot } from "./gameStore";

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

const GHOST_LERP_SPEED = 0.04;

function useGhostValue(value: number) {
  const [ghost, setGhost] = useState(value);
  const ghostRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (value === ghostRef.current) return;
    const animate = () => {
      const diff = value - ghostRef.current;
      if (Math.abs(diff) < 0.1) {
        ghostRef.current = value;
        setGhost(value);
        return;
      }
      ghostRef.current += diff * GHOST_LERP_SPEED;
      setGhost(ghostRef.current);
      rafRef.current = requestAnimationFrame(animate);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return ghost;
}

function GhostBar({ value, max, ghostValue, color, ghostColor }: {
  value: number; max: number; ghostValue: number;
  color: string; ghostColor: string;
}) {
  const percent = clampMeterPercent(value, max);
  const ghostPercent = clampMeterPercent(ghostValue, max);
  const wide = Math.max(percent, ghostPercent);
  const narrow = Math.min(percent, ghostPercent);
  return (
    <>
      <div className="absolute inset-y-0 left-0 h-full" style={{ width: `${wide}%`, background: ghostColor }} />
      <div className="absolute inset-y-0 left-0 h-full" style={{ width: `${narrow}%`, background: color }} />
    </>
  );
}

function PauseScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const { player } = snapshot;
  const activeSkill = SKILLS[player.skillIndex] || SKILLS[0];
  const totalAttack = player.baseAttack + player.attackBonus;
  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const skillEnergyPercent = Math.max(0, Math.min(100, (player.skillEnergy / player.skillEnergyMax) * 100));

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(5,10,22,0.82)", backdropFilter: "blur(2px)" }}>
      <div
        className="relative flex flex-col gap-0 text-white"
        style={{
          width: 300,
          border: "2px solid rgba(100,180,255,0.35)",
          background: "linear-gradient(160deg, rgba(8,18,38,0.97) 0%, rgba(14,25,50,0.97) 100%)",
          boxShadow: "0 0 0 1px rgba(38,213,255,0.12), 0 8px 40px rgba(0,0,0,0.7)",
          imageRendering: "pixelated",
        }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(38,213,255,0.18)" }}>
          <span className="text-[11px] tracking-[3px] uppercase opacity-60">— PAUSED —</span>
          <span className="text-[11px] tracking-[2px] opacity-60">ESC / P</span>
        </div>

        {/* title */}
        <div className="px-4 pt-3 pb-1 text-[13px] tracking-[2px]" style={{ color: "#26d5ff", fontWeight: 700, letterSpacing: "0.15em" }}>
          竈門炭治郎
        </div>

        {/* divider */}
        <div className="mx-4 mb-3" style={{ height: 1, background: "linear-gradient(90deg, rgba(38,213,255,0.5) 0%, transparent 100%)" }} />

        {/* stats */}
        <div className="px-4 pb-4 flex flex-col gap-4">

          {/* HP */}
          <div>
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span style={{ color: "#7fc8e0" }}>生命值</span>
              <span style={{ color: "#26d5ff" }}>{Math.max(0, Math.floor(player.hp))} / {player.maxHp}</span>
            </div>
            <div className="relative h-[6px] w-full overflow-hidden" style={{ background: "#0d2135" }}>
              <div
                className="absolute inset-y-0 left-0 h-full transition-none"
                style={{ width: `${hpPercent}%`, background: "linear-gradient(90deg,#2a8a3a,#5aff6a)" }}
              />
            </div>
          </div>

          {/* Attack */}
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: "#7fc8e0" }}>攻击力</span>
            <span>
              <span style={{ color: "#26d5ff", fontWeight: 700 }}>{totalAttack}</span>
              {player.attackBonus > 0 && (
                <span style={{ color: "#7fe8d0", fontSize: 10 }}> ({player.baseAttack}+{player.attackBonus})</span>
              )}
            </span>
          </div>

          {/* divider */}
          <div style={{ height: 1, background: "rgba(38,213,255,0.1)" }} />

          {/* Current skill */}
          <div>
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span style={{ color: "#7fc8e0" }}>当前技能</span>
              <span style={{ color: "#26d5ff" }}>{activeSkill.name}</span>
            </div>

            {/* skill charges */}
            <div className="flex items-center justify-between mb-2 text-[11px]">
              <span style={{ color: "#7fc8e0" }}>技能充能</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: player.maxSkillCharges }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 18,
                      height: 18,
                      border: `2px solid ${i < player.skillCharges ? "rgba(38,213,255,0.9)" : "rgba(38,213,255,0.25)"}`,
                      background: i < player.skillCharges ? "rgba(38,213,255,0.22)" : "rgba(38,213,255,0.04)",
                      boxShadow: i < player.skillCharges ? "0 0 6px rgba(38,213,255,0.4)" : "none",
                    }}
                  />
                ))}
                <span style={{ color: "#26d5ff", marginLeft: 4 }}>{player.skillCharges}/{player.maxSkillCharges}</span>
              </div>
            </div>

            {/* energy bar */}
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span style={{ color: "#7fc8e0" }}>充能进度</span>
              <span style={{ color: "#7fe8ff" }}>{Math.floor(player.skillEnergy)}/{player.skillEnergyMax}</span>
            </div>
            <div className="relative h-[6px] w-full overflow-hidden" style={{ background: "#0d2135" }}>
              <div
                className="absolute inset-y-0 left-0 h-full"
                style={{ width: `${skillEnergyPercent}%`, background: "linear-gradient(90deg,#1a6b8a,#7fe8ff)" }}
              />
            </div>
          </div>

          {/* All skills */}
          <div>
            <div className="mb-2 text-[11px]" style={{ color: "#7fc8e0" }}>技能列表</div>
            <div className="flex flex-col gap-1">
              {SKILLS.map((skill, i) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between text-[11px] px-2 py-1"
                  style={{
                    background: i === player.skillIndex ? "rgba(38,213,255,0.12)" : "transparent",
                    border: `1px solid ${i === player.skillIndex ? "rgba(38,213,255,0.35)" : "rgba(38,213,255,0.08)"}`,
                  }}
                >
                  <span style={{ color: i === player.skillIndex ? "#26d5ff" : "#4a7a9a" }}>
                    {i + 1}. {skill.name}
                  </span>
                  {i === player.skillIndex && <span style={{ color: "#26d5ff", fontSize: 9, letterSpacing: 1 }}>当前</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="px-4 py-2 text-center text-[10px] opacity-40" style={{ borderTop: "1px solid rgba(38,213,255,0.12)" }}>
          按 ESC 或 P 继续游戏
        </div>
      </div>
    </div>
  );
}

function Hud() {
  const snapshot = useAtomValue(gameSnapshotAtom);
  const { player, boss, elapsed, spritesReady, gameOver } = snapshot;
  const activeSkill = SKILLS[player.skillIndex] || SKILLS[0];

  const skillValue = player.skillCharges * player.skillEnergyMax + player.skillEnergy;
  const skillMax = player.maxSkillCharges * player.skillEnergyMax;
  const bossHp = boss?.hp ?? 0;
  const bossHpMax = boss?.hpMax ?? 1;

  const ghostHp = useGhostValue(player.hp);
  const ghostSkill = useGhostValue(skillValue);
  const ghostBossHp = useGhostValue(bossHp);

  const skillChargePercent = clampMeterPercent(skillValue, skillMax);

  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 z-10 hidden text-[12px] text-white md:block">
        <div style={{ position: "relative", width: HUD_UI.statusBarContainerW, height: HUD_UI.statusBarContainerH }}>
          {/* HP fill — upper track */}
          <div style={{ position: "absolute", zIndex: 0, left: HUD_UI.hpFillLeft, top: HUD_UI.hpFillTop, width: HUD_UI.hpFillW, height: HUD_UI.hpFillH, overflow: "hidden", borderRadius: 1 }}>
            <GhostBar value={player.hp} max={player.maxHp} ghostValue={ghostHp} color="linear-gradient(90deg,#2a8a3a,#5aff6a)" ghostColor="#2d6b2d" />
          </div>
          {/* Skill energy fill — lower track */}
          <div style={{ position: "absolute", zIndex: 0, left: HUD_UI.skillFillLeft, top: HUD_UI.skillFillTop, width: HUD_UI.skillFillW, height: HUD_UI.skillFillH, overflow: "hidden", borderRadius: 1 }}>
            <GhostBar value={skillValue} max={skillMax} ghostValue={ghostSkill} color="linear-gradient(90deg,#1a6b8a,#7fe8ff)" ghostColor="#245a6d" />
          </div>
          {/* frame image — transparent tracks reveal fills behind */}
          <img
            src="assets/sprites/status_bar.png"
            alt=""
            draggable={false}
            style={{ position: "absolute", zIndex: 1, width: HUD_UI.statusBarImgW, left: 0, top: 0, imageRendering: "pixelated" }}
          />
          {/* HP text — centered on upper track */}
          <span style={{ position: "absolute", zIndex: 2, left: HUD_UI.hpFillLeft, top: HUD_UI.hpFillTop, width: HUD_UI.hpFillW, height: HUD_UI.hpFillH, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#e0ffe0", textShadow: "0 1px 3px rgba(0,0,0,0.9)", letterSpacing: "0.04em", lineHeight: 1 }}>
            {Math.max(0, Math.floor(player.hp))} / {player.maxHp}
          </span>
        </div>
      </div>

      {boss ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 rounded border border-white/10 bg-black/40 px-4 py-2 text-white md:block" style={{ width: HUD_UI.bossBarWidth }}>
          <div className="mb-1 text-center text-[12px]">下弦之鬼·阶段 {boss.phase}</div>
          <div className="relative h-3 w-full overflow-hidden bg-[#443246]">
            <GhostBar value={bossHp} max={bossHpMax} ghostValue={ghostBossHp} color="#ff6e93" ghostColor="#9a3a5a" />
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

      {snapshot.paused && !gameOver ? <PauseScreen snapshot={snapshot} /> : null}
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
        <button className="touch-btn pause-btn flex h-[44px] w-[44px] items-center justify-center rounded-[10px] border border-[rgba(150,200,255,0.5)] bg-[rgba(16,31,56,0.5)] text-[11px] text-[#b0d4f0] shadow-[0_1px_0_rgba(0,0,0,0.25)]" data-key="p" aria-label="暂停">⏸</button>
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
      <p className="mb-2 text-[10px] opacity-90 md:text-[13px] max-md:hidden">A/D 移动 · W/空格 跳跃 · J 攻击 · K 释放技能 · 1/2/3 切换技能 · ESC/P 暂停 · R 重开</p>
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
