import { useCallback, useEffect, useRef, useState, type AnimationEvent, type CSSProperties } from "react";
import { Provider, useAtomValue } from "jotai";
import {
  WIDTH,
  HEIGHT,
  GROUND_Y,
  SKILLS,
  HUD_UI,
  PLAYER_COMBAT,
  PLAYER_DEFAULTS,
  PLAYER_DRAW,
  PLAYER_SHEETS,
  PLAYER_ANIMATION_STATES,
  SKILL1_EFFECT_CONFIG,
  SKILL2_EFFECT_CONFIG,
  SKILL3_EFFECT_CONFIG,
  SKY_SPRITES,
} from "./constants";
import { loadSprites } from "./assets";
import { setCanvas } from "./context";
import { startGame } from "./runtime";
import { gameSnapshotAtom, gameStore, setGameSnapshot, type GameSnapshot } from "./gameStore";

type AppPhase = "menu" | "intro" | "playing";
type CustomCssProperties = CSSProperties & Record<`--${string}`, string>;

const INTRO_DURATION_MS = 1100;
const INTRO_COMPLETION_FALLBACK_MS = INTRO_DURATION_MS + 120;
const SKY_SPRITE_SHEET_WIDTH = 1250;
const SKY_SPRITE_SHEET_HEIGHT = 880;
const START_MOON_SIZE = 168;
const START_MOON_SCALE = START_MOON_SIZE / SKY_SPRITES.moon.sw;
const RUN_SHEET = PLAYER_SHEETS[PLAYER_ANIMATION_STATES.run];
const INTRO_PLAYER_START_X = -140;
const INTRO_PLAYER_END_X = PLAYER_DEFAULTS.x + PLAYER_DEFAULTS.w / 2 - RUN_SHEET.drawW / 2;
const INTRO_PLAYER_BOTTOM = HEIGHT - (GROUND_Y - PLAYER_DRAW.yOffset);

function gamePercent(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

const moonSheetStyle: CSSProperties = {
  width: SKY_SPRITE_SHEET_WIDTH * START_MOON_SCALE,
  height: SKY_SPRITE_SHEET_HEIGHT * START_MOON_SCALE,
  maxWidth: "none",
  transform: `translate3d(-${SKY_SPRITES.moon.sx * START_MOON_SCALE}px, -${SKY_SPRITES.moon.sy * START_MOON_SCALE}px, 0)`,
};

const introRunnerStyle: CustomCssProperties = {
  "--intro-player-start-left": gamePercent(INTRO_PLAYER_START_X, WIDTH),
  "--intro-player-end-left": gamePercent(INTRO_PLAYER_END_X, WIDTH),
  "--intro-player-bottom": gamePercent(INTRO_PLAYER_BOTTOM, HEIGHT),
  "--intro-player-width": gamePercent(RUN_SHEET.drawW, WIDTH),
  "--intro-player-height": gamePercent(RUN_SHEET.drawH, HEIGHT),
};

function clampMeterPercent(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.max(0, Math.min(HUD_UI.meterPercentMax, (value / maxValue) * HUD_UI.meterPercentMax));
}

function GameCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setCanvas(canvas);
    if (!active) {
      return () => {
        setCanvas(null);
      };
    }

    const stopGame = startGame({ onStateChange: setGameSnapshot });

    return () => {
      stopGame();
      setCanvas(null);
    };
  }, [active]);

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

function StartMoon() {
  return (
    <div className="start-moon-crop" aria-hidden="true">
      <img
        src={SKY_SPRITES.src}
        alt=""
        draggable={false}
        className="start-moon-sheet"
        style={moonSheetStyle}
      />
    </div>
  );
}

function StartScreen({
  assetsReady,
  startQueued,
  onStart,
}: {
  assetsReady: boolean;
  startQueued: boolean;
  onStart: () => void;
}) {
  const promptText = assetsReady ? "按任意键开始" : "加载像素贴图中...";
  const promptClassName = startQueued && !assetsReady
    ? "start-prompt start-prompt-loading"
    : "start-prompt";

  return (
    <div
      className="start-screen absolute inset-0 z-40 overflow-hidden text-left"
      role="button"
      tabIndex={0}
      aria-label={promptText}
      onPointerDown={(event) => {
        event.preventDefault();
        onStart();
      }}
      onClick={onStart}
    >
      <div className="start-ridge start-ridge-back" aria-hidden="true" />
      <div className="start-ridge start-ridge-front" aria-hidden="true" />
      <StartMoon />
      <img
        src="assets/sprites/ui/start_blade.png"
        alt=""
        draggable={false}
        className="start-blade"
      />
      <div className="start-content">
        <div className="start-title">鬼灭之刃</div>
        <div className="start-subtitle">炭治郎生存战</div>
        <div className={promptClassName}>{promptText}</div>
      </div>
    </div>
  );
}

function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const completedRef = useRef(false);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const timer = window.setTimeout(complete, INTRO_COMPLETION_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [complete]);

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === "intro-runner-enter") {
      complete();
    }
  };

  return (
    <div className="intro-screen start-screen absolute inset-0 z-40 overflow-hidden text-left" aria-hidden="true">
      <div className="start-ridge start-ridge-back" />
      <div className="start-ridge start-ridge-front" />
      <StartMoon />
      <div
        className="intro-runner"
        style={introRunnerStyle}
        onAnimationEnd={handleAnimationEnd}
      />
    </div>
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

function formatSkillDamageFormula(skill: (typeof SKILLS)[number]) {
  if (skill.id === "skill1") return `伤害公式：角色攻击力 x ${SKILL1_EFFECT_CONFIG.damageMultiplier}`;
  if (skill.id === "skill2") return `伤害公式：角色攻击力 x ${SKILL2_EFFECT_CONFIG.damageMultiplier}`;
  return `伤害公式：角色攻击力 x ${SKILL3_EFFECT_CONFIG.damageMultiplier}，最多 ${SKILL3_EFFECT_CONFIG.maxHits} 次`;
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
  const damageFormula = formatSkillDamageFormula(activeSkill);
  const totalAttack = player.baseAttack + player.attackBonus;
  const skillChargeProgress = Math.min(100, Math.floor(player.skillEnergy / PLAYER_COMBAT.skillCastEnergyCost * 100));
  const skillEnergyText = `${skillChargeProgress} / 100`;
  const ultimateEnergyText = `${Math.floor(player.ultimateEnergy)} / ${player.ultimateEnergyMax}`;
  const attackText = player.attackBonus > 0
    ? `${totalAttack} (${player.baseAttack}+${player.attackBonus})`
    : `${totalAttack}`;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(5,10,22,0.65)" }}>
      <div className="relative flex items-center justify-center" style={{ width: "96%", maxWidth: 960 }}>
        <img
          src="assets/sprites/ui/pause_bg_v3.png"
          alt=""
          draggable={false}
          className="w-full"
          style={{ imageRendering: "pixelated", display: "block" }}
        />
        {/* Content overlay aligned to sprite center panel */}
        <div
          className="absolute flex flex-col pt-3"
          style={{ inset: "20% 17% 6% 17%", overflow: "hidden" }}
        >
          {/* title row */}
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-[12px] font-bold tracking-[0.12em]" style={{ color: "#26d5ff" }}>竈門炭治郎</span>
            <span className="text-[10px]" style={{ color: "#7fc8e0" }}>当前技能：<span style={{ color: "#26d5ff" }}>{activeSkill.name}</span></span>
          </div>

          {/* divider */}
          <div className="my-1" style={{ height: 1, background: "linear-gradient(90deg, rgba(38,213,255,0.5) 0%, transparent 100%)" }} />

          <div className="grid flex-1 grid-cols-[0.9fr_1.3fr] gap-3 py-2 text-left">
            <div
              className="p-2"
              style={{
                background: "rgba(5,17,30,0.34)",
              }}
            >
              <div className="mb-1 text-[9px] tracking-[1px]" style={{ color: "#7fc8e0" }}>基础数值</div>
              <div className="grid gap-1 text-[10px]">
                <div className="flex justify-between">
                  <span style={{ color: "#7fc8e0" }}>生命值</span>
                  <span style={{ color: "#26d5ff", fontWeight: 700 }}>{Math.max(0, Math.floor(player.hp))} / {player.maxHp}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#7fc8e0" }}>攻击力</span>
                  <span style={{ color: "#26d5ff", fontWeight: 700 }}>{attackText}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#7fc8e0" }}>技能充能</span>
                  <span style={{ color: "#26d5ff", fontWeight: 700 }}>{skillEnergyText}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#7fc8e0" }}>大招充能</span>
                  <span style={{ color: player.ultimateReady ? "#ffd46e" : "#26d5ff", fontWeight: 700 }}>{ultimateEnergyText}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#7fc8e0" }}>分数</span>
                  <span style={{ color: "#26d5ff", fontWeight: 700 }}>{player.score}</span>
                </div>
              </div>
            </div>

            <div
              className="p-2"
              style={{
                background: "linear-gradient(180deg, rgba(9,32,52,0.64), rgba(5,17,30,0.32))",
              }}
            >
              <div className="mb-1 flex items-center justify-between text-[9px] tracking-[1px]">
                <span style={{ color: "#7fc8e0" }}>当前技能</span>
                <span style={{ color: "#26d5ff" }}>{activeSkill.name}</span>
              </div>
              <div className="mb-2 grid grid-cols-3 gap-1">
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
              <div className="text-[9px] leading-[1.45]" style={{ color: "#c8efff" }}>
                {activeSkill.description}
              </div>
              <div className="mt-2 text-[8px] leading-[1.35]" style={{ color: "#7fc8e0" }}>
                {damageFormula}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="mt-auto pt-3 text-center text-[11px] opacity-55 text-white" style={{ transform: "translateY(10px)" }}>
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

  const skillValue = player.skillEnergy;
  const skillMax = player.skillEnergyMax;
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
          <div style={{ position: "absolute", zIndex: 3, left: 352, top: 54 }}>
            <UltimateOrb value={player.ultimateEnergy} max={player.ultimateEnergyMax} ready={player.ultimateReady} size={28} />
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
  const [phase, setPhase] = useState<AppPhase>("menu");
  const [assetsReady, setAssetsReady] = useState(false);
  const [startQueued, setStartQueued] = useState(false);
  const isPlaying = phase === "playing";

  useEffect(() => {
    let disposed = false;

    loadSprites()
      .then(() => {
        if (!disposed) setAssetsReady(true);
      })
      .catch((err) => {
        console.error("[app] preload sprites failed:", err);
        if (!disposed) setAssetsReady(true);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const requestStart = useCallback(() => {
    if (phase !== "menu") return;
    setStartQueued(true);
    if (assetsReady) {
      setPhase("intro");
    }
  }, [assetsReady, phase]);

  useEffect(() => {
    if (phase === "menu" && startQueued && assetsReady) {
      setPhase("intro");
    }
  }, [assetsReady, phase, startQueued]);

  useEffect(() => {
    if (phase !== "menu") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      requestStart();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, requestStart]);

  const completeIntro = useCallback(() => {
    setPhase("playing");
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1020px] flex-col items-center justify-center px-4 py-4 text-center max-md:max-w-none max-md:px-0 max-md:py-0">
      {isPlaying ? (
        <>
          <h1 className="mb-4 text-base tracking-[1px] md:text-2xl max-md:hidden">鬼灭之刃：炭治郎生存战</h1>
          <p className="mb-2 text-[10px] opacity-90 md:text-[13px] max-md:hidden">A/D 移动 · W/空格 跳跃 · J 攻击 · K 释放技能 · L 大招 · 1/2/3 切换技能 · ESC/P 暂停 · R 重开</p>
        </>
      ) : null}
      <section className="relative w-fit max-w-full overflow-hidden border-4 border-[#3f5f8a] bg-black shadow-[0_16px_48px_rgba(0,0,0,0.5)] max-md:h-[100svh] max-md:w-screen max-md:border-0 max-md:shadow-none">
        <GameCanvas active={isPlaying} />
        {isPlaying ? (
          <>
            <Hud />
            <TouchControls />
          </>
        ) : null}
        {phase === "menu" ? (
          <StartScreen assetsReady={assetsReady} startQueued={startQueued} onStart={requestStart} />
        ) : null}
        {phase === "intro" ? <IntroScreen onComplete={completeIntro} /> : null}
      </section>
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
