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
const DEATH_SPRITE_COLUMNS = 6;
const DEATH_SPRITE_ROWS = 4;
const DEATH_SPRITE_FRAMES = DEATH_SPRITE_COLUMNS * DEATH_SPRITE_ROWS;
const DEATH_FRAME_MS = 70;
const DEATH_SHEET_WIDTH = 1672;
const DEATH_SHEET_HEIGHT = 941;
const DEATH_FRAME_WIDTH = 272;
const DEATH_FRAME_HEIGHT = 203;
const DEATH_FRAME_CONTENT_OFFSET_X = 23;
const DEATH_FRAME_CONTENT_OFFSET_Y = 22;

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
  return (
    <>
      <div className="absolute inset-y-0 left-0 h-full" style={{ width: `${ghostPercent}%`, background: ghostColor }} />
      <div className="absolute inset-y-0 left-0 h-full" style={{ width: `${percent}%`, background: color }} />
    </>
  );
}

function UltimateOrb({ value, max, ready, size = 44 }: {
  value: number;
  max: number;
  ready: boolean;
  size?: number;
}) {
  const percent = clampMeterPercent(value, max) / HUD_UI.meterPercentMax;
  const flameOpacity = percent <= 0 ? 0 : Math.min(1, 0.28 + percent * 0.92);
  const chargeFrame = Math.min(7, Math.floor(percent * 8));
  const chargeFramePosition = chargeFrame / 7 * 100;

  return (
    <div
      className={`ultimate-orb ${ready ? "ultimate-orb-ready" : ""}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderColor: ready ? "#ffdf73" : percent > 0 ? "#a7271d" : "#35100f",
        boxShadow: ready
          ? "0 0 12px rgba(255,122,47,0.95), inset 0 0 12px rgba(255,58,28,0.8)"
          : percent > 0
            ? "0 0 7px rgba(180,34,24,0.65), inset 0 0 9px rgba(129,20,18,0.72)"
            : "inset 0 0 8px rgba(0,0,0,0.9)",
      }}
    >
      <div
        className="ultimate-orb-sprite-stage"
      >
        <div
          className={`ultimate-orb-sprite ${ready ? "ultimate-orb-sprite-animated" : ""}`}
          style={ready ? undefined : { backgroundPosition: `${chargeFramePosition}% 0` }}
        />
      </div>
      <div className="ultimate-orb-heat" style={{ opacity: flameOpacity }} />
      <div className="ultimate-orb-glass" />
    </div>
  );
}

function DeathScreen({ elapsed }: { elapsed: number }) {
  const [frame, setFrame] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    setFrame(0);
    setShowMessage(false);
    let animationFrameId = 0;
    let lastFrameAt = performance.now();
    let currentFrame = 0;

    const tick = (now: number) => {
      if (now - lastFrameAt >= DEATH_FRAME_MS) {
        const steps = Math.floor((now - lastFrameAt) / DEATH_FRAME_MS);
        lastFrameAt += steps * DEATH_FRAME_MS;
        currentFrame = Math.min(DEATH_SPRITE_FRAMES - 1, currentFrame + steps);
        setFrame(currentFrame);

        if (currentFrame >= DEATH_SPRITE_FRAMES - 1) {
          setShowMessage(true);
          return;
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [elapsed]);

  const column = frame % DEATH_SPRITE_COLUMNS;
  const row = Math.floor(frame / DEATH_SPRITE_COLUMNS);

  return (
    <div className="death-screen absolute inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-center text-white">
      <div aria-hidden="true" className="death-sprite-frame">
        <img
          src="assets/sprites/ui/end.png"
          alt=""
          draggable={false}
          className="death-sprite-sheet"
          style={{
            width: DEATH_SHEET_WIDTH,
            height: DEATH_SHEET_HEIGHT,
            transform: `translate3d(-${column * DEATH_FRAME_WIDTH + DEATH_FRAME_CONTENT_OFFSET_X}px, -${row * DEATH_FRAME_HEIGHT + DEATH_FRAME_CONTENT_OFFSET_Y}px, 0)`,
          }}
        />
      </div>

      <div
        className={`death-message space-y-3 ${showMessage ? "death-message-visible" : ""}`}
        aria-hidden={!showMessage}
      >
        <div className="death-survival-text">最终生存 {elapsed.toFixed(1)}s</div>
        <div className="death-restart-text">按 R 重新开始</div>
      </div>
    </div>
  );
}

function PauseScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const { player } = snapshot;
  const activeSkill = SKILLS[player.skillIndex] || SKILLS[0];
  const totalAttack = player.baseAttack + player.attackBonus;
  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const skillEnergyPercent = Math.max(0, Math.min(100, (player.skillEnergy / player.skillEnergyMax) * 100));

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(5,10,22,0.65)" }}>
      <div className="relative flex items-center justify-center" style={{ width: "96%", maxWidth: 960 }}>
        <img
          src="assets/sprites/ui/pasue_ui.png"
          alt=""
          draggable={false}
          className="w-full"
          style={{ imageRendering: "pixelated", display: "block" }}
        />
        {/* Content overlay aligned to sprite center panel */}
        <div
          className="absolute flex flex-col pt-2"
          style={{ inset: "20% 33% 11% 33%", overflow: "hidden" }}
        >
          {/* header */}
          <div className="flex items-center justify-between text-[9px] tracking-[2px] uppercase text-white opacity-55">
            <span>— PAUSED —</span>
            <span style={{ letterSpacing: 2 }}>ESC / P</span>
          </div>

          {/* title row: name + attack inline */}
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-[12px] font-bold tracking-[0.12em]" style={{ color: "#26d5ff" }}>竈門炭治郎</span>
            <span className="text-[10px]">
              <span style={{ color: "#7fc8e0" }}>攻击 </span>
              <span style={{ color: "#26d5ff", fontWeight: 700 }}>{totalAttack}</span>
              {player.attackBonus > 0 && (
                <span style={{ color: "#7fe8d0" }}> ({player.baseAttack}+{player.attackBonus})</span>
              )}
            </span>
          </div>

          {/* divider */}
          <div className="my-1" style={{ height: 1, background: "linear-gradient(90deg, rgba(38,213,255,0.5) 0%, transparent 100%)" }} />

          {/* stats */}
          <div className="flex flex-col gap-1.5 py-3">
            {/* HP */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-0.5 text-[10px]">
                <span style={{ color: "#7fc8e0" }}>生命值</span>
                <span style={{ color: "#26d5ff" }}>{Math.max(0, Math.floor(player.hp))} / {player.maxHp}</span>
              </div>
              <div className="relative h-[5px] w-full overflow-hidden" style={{ background: "#0d2135" }}>
                <div
                  className="absolute inset-y-0 left-0 h-full"
                  style={{ width: `${hpPercent}%`, background: "linear-gradient(90deg,#2a8a3a,#5aff6a)" }}
                />
              </div>
            </div>

            {/* Skill: tiles + charges + energy, consolidated */}
            <div>
              <div className="flex items-center justify-between mb-0.5 text-[10px]">
                <span style={{ color: "#7fc8e0" }}>技能</span>
                <span className="flex items-center gap-1" style={{ color: "#26d5ff" }}>
                  {Array.from({ length: player.maxSkillCharges }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: i < player.skillCharges ? "#26d5ff" : "transparent",
                        border: `1px solid ${i < player.skillCharges ? "#26d5ff" : "rgba(38,213,255,0.4)"}`,
                        boxShadow: i < player.skillCharges ? "0 0 4px rgba(38,213,255,0.6)" : "none",
                        display: "inline-block",
                      }}
                    />
                  ))}
                  <span style={{ marginLeft: 2 }}>{player.skillCharges}/{player.maxSkillCharges}</span>
                </span>
              </div>

              {/* skill tiles — replaces separate "current" + "all skills" blocks */}
              <div className="flex gap-1 mb-1">
                {SKILLS.map((skill, i) => {
                  const active = i === player.skillIndex;
                  return (
                    <div
                      key={skill.id}
                      className="flex-1 text-center text-[10px]"
                      style={{
                        padding: "2px 4px",
                        background: active ? "rgba(38,213,255,0.18)" : "transparent",
                        border: `1px solid ${active ? "rgba(38,213,255,0.55)" : "rgba(38,213,255,0.12)"}`,
                        color: active ? "#26d5ff" : "#4a7a9a",
                        fontWeight: active ? 700 : 400,
                      }}
                    >
                      {i + 1}. {skill.name}
                    </div>
                  );
                })}
              </div>

              {/* active skill energy bar */}
              <div className="relative h-[5px] w-full overflow-hidden" style={{ background: "#0d2135" }}>
                <div
                  className="absolute inset-y-0 left-0 h-full"
                  style={{ width: `${skillEnergyPercent}%`, background: "linear-gradient(90deg,#1a6b8a,#7fe8ff)" }}
                />
              </div>
              <div className="flex justify-between text-[9px] mt-0.5" style={{ color: "#7fe8ff", opacity: 0.8 }}>
                <span>{activeSkill.name} 充能</span>
                <span>{Math.floor(player.skillEnergy)}/{player.skillEnergyMax}</span>
              </div>

              <div className="mt-1 flex justify-end">
                <UltimateOrb value={player.ultimateEnergy} max={player.ultimateEnergyMax} ready={player.ultimateReady} size={36} />
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="pt-1 text-center text-[9px] opacity-40 text-white">
            按 ESC 或 P 继续游戏
          </div>
        </div>
      </div>
    </div>
  );
}

function Hud() {
  const snapshot = useAtomValue(gameSnapshotAtom);
  const { player, boss, elapsed, spritesReady, gameOver } = snapshot;

  const skillValue = player.skillCharges * player.skillEnergyMax + player.skillEnergy;
  const skillMax = player.maxSkillCharges * player.skillEnergyMax;
  const bossHp = boss?.hp ?? 0;
  const bossHpMax = boss?.hpMax ?? 1;

  const ghostHp = useGhostValue(player.hp);
  const ghostSkill = useGhostValue(skillValue);
  const ghostBossHp = useGhostValue(bossHp);

  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 z-10 hidden text-[12px] text-white md:block">
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
            src="assets/sprites/ui/status_bar.png"
            alt=""
            draggable={false}
            style={{ position: "absolute", zIndex: 1, width: HUD_UI.statusBarImgW, left: 0, top: 0, imageRendering: "pixelated" }}
          />
          {/* HP text — centered on upper track */}
          <span style={{ position: "absolute", zIndex: 2, left: HUD_UI.hpFillLeft, top: HUD_UI.hpFillTop, width: HUD_UI.hpFillW, height: HUD_UI.hpFillH, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#e0ffe0", textShadow: "0 1px 3px rgba(0,0,0,0.9)", letterSpacing: "0.04em", lineHeight: 1 }}>
            {Math.max(0, Math.floor(player.hp))} / {player.maxHp}
          </span>
          {/* Skill icon — circular area left of bars */}
          <img
            src={`assets/sprites/ui/skill${player.skillIndex + 1}_icon.png`}
            alt=""
            draggable={false}
            style={{ position: "absolute", zIndex: 2, left: 48, top: 25, width: 60, height: 60, borderRadius: "50%", objectFit: "cover" }}
          />
          <div style={{ position: "absolute", zIndex: 3, left: 340, top: 46 }}>
            <UltimateOrb value={player.ultimateEnergy} max={player.ultimateEnergyMax} ready={player.ultimateReady} size={42} />
          </div>
        </div>
      </div>

      {boss ? (
        <div
          className="pointer-events-none absolute left-1/2 top-2 z-10 hidden -translate-x-1/2 overflow-hidden text-white md:block"
          style={{ width: HUD_UI.bossBarContainerW, height: HUD_UI.bossBarContainerH }}
        >
          <div
            style={{
              position: "absolute",
              zIndex: 0,
              left: HUD_UI.bossFillLeft,
              top: HUD_UI.bossFillTop,
              width: HUD_UI.bossFillW,
              height: HUD_UI.bossFillH,
              overflow: "hidden",
              background: "#241018",
            }}
          >
            <GhostBar
              value={bossHp}
              max={bossHpMax}
              ghostValue={ghostBossHp}
              color="linear-gradient(90deg,#7b111f 0%,#d82d36 58%,#ff8a55 100%)"
              ghostColor="#5b202a"
            />
          </div>
          <img
            src="assets/sprites/ui/boss_hp_bar.png"
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              zIndex: 1,
              width: HUD_UI.bossBarImgW,
              left: 0,
              top: HUD_UI.bossBarImgTop,
              imageRendering: "pixelated",
            }}
          />
          <span
            style={{
              position: "absolute",
              zIndex: 2,
              left: HUD_UI.bossFillLeft,
              top: HUD_UI.bossFillTop,
              width: HUD_UI.bossFillW,
              height: HUD_UI.bossFillH,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 7,
              fontWeight: 700,
              color: "#ffe0ca",
              textShadow: "0 1px 4px rgba(0,0,0,0.95)",
              lineHeight: 1,
            }}
          >
            下弦之鬼 · 阶段 {boss.phase}
          </span>
        </div>
      ) : null}

      {!spritesReady ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30 text-sm text-white md:hidden">
          加载像素贴图中...
        </div>
      ) : null}

      {gameOver ? <DeathScreen elapsed={elapsed} /> : null}

      {snapshot.paused && !gameOver ? <PauseScreen snapshot={snapshot} /> : null}
    </>
  );
}

function TouchControls() {
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

function AppShell() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1020px] flex-col items-center justify-center px-4 py-4 text-center max-md:max-w-none max-md:px-0 max-md:py-0">
      <h1 className="mb-4 text-base tracking-[1px] md:text-2xl max-md:hidden">鬼灭之刃：炭治郎生存战</h1>
      <p className="mb-2 text-[10px] opacity-90 md:text-[13px] max-md:hidden">A/D 移动 · W/空格 跳跃 · J 攻击 · K 释放技能 · L 大招 · 1/2/3 切换技能 · ESC/P 暂停 · R 重开</p>
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
