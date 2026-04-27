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

const HP_GHOST_LERP_SPEED = 0.04;

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
                style={{ width: `${hpPercent}%`, background: "linear-gradient(90deg,#1a8aaa,#26d5ff)" }}
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
      <div className="pointer-events-none absolute left-4 top-4 z-10 hidden text-[12px] text-white md:block">
        {/* HP bar row */}
        <div className="relative flex items-center" style={{ height: HUD_UI.hpBarH }}>
          {/* hp_bar background image */}
          <img
            src="assets/sprites/hp_bar.png"
            alt=""
            draggable={false}
            style={{ width: HUD_UI.hpBarW, height: HUD_UI.hpBarH, imageRendering: "pixelated", display: "block" }}
          />
          {/* HP fill — clipped to the inner fill zone of the bar */}
          <div
            className="absolute"
            style={{
              left: HUD_UI.hpFillLeft,
              top: HUD_UI.hpFillTop,
              width: HUD_UI.hpFillW,
              height: HUD_UI.hpFillH,
              overflow: "hidden",
              borderRadius: 2,
            }}
          >
            {/* ghost (delayed) fill */}
            <div className="absolute inset-y-0 left-0 h-full" style={{ width: `${ghostHpPercent}%`, background: "#1a6e8a" }} />
            {/* current fill */}
            <div className="absolute inset-y-0 left-0 h-full" style={{ width: `${hpPercent}%`, background: "linear-gradient(90deg,#26a8d5,#26d5ff)" }} />
          </div>
          {/* HP number centered on bar */}
          <span
            className="absolute select-none"
            style={{
              left: HUD_UI.hpFillLeft,
              width: HUD_UI.hpFillW,
              top: 0,
              height: HUD_UI.hpBarH,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#e0f4ff",
              textShadow: "0 1px 3px rgba(0,0,0,0.9)",
              letterSpacing: "0.05em",
            }}
          >
            {Math.max(0, Math.floor(player.hp))} / {player.maxHp}
          </span>
          {/* hp_icon overlapping left edge of bar */}
          <img
            src="assets/sprites/hp_icon.png"
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: -HUD_UI.hpIconOverlap,
              top: "50%",
              transform: "translateY(-50%)",
              width: HUD_UI.hpIconSize,
              height: HUD_UI.hpIconSize,
              imageRendering: "pixelated",
            }}
          />
        </div>
        {/* Skill row */}
        <div className="mt-2 flex items-center justify-between gap-3" style={{ paddingLeft: HUD_UI.hpIconSize - HUD_UI.hpIconOverlap }}>
          <span>{activeSkill.name}</span>
          <span>{player.skillCharges}/{player.maxSkillCharges}</span>
        </div>
        <div className="mt-1 overflow-hidden bg-[#2f445e]" style={{ height: 6, width: HUD_UI.hpFillW, marginLeft: HUD_UI.hpIconSize - HUD_UI.hpIconOverlap }}>
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
