import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Provider, useAtomValue } from "jotai";
import {
  WIDTH,
  HEIGHT,
  SKILLS,
  HUD_UI,
  UI_SPRITES,
  type UiSpriteId,
} from "./constants";
import { loadSprites } from "./assets";
import { setCanvas } from "./context";
import { DebugPanel } from "./debug";
import {
  chooseBossEquipment,
  chooseUpgradeReward,
  equipEquipment,
  equipSkillSlot,
  startGame,
} from "./runtime";
import { gameSnapshotAtom, gameStore, setGameSnapshot, type GameSnapshot } from "./gameStore";
import { StartScreen } from "./startScreen";
import { ensureAudio } from "./audio";
import type { EquipmentItemState, EquipmentSlot, SkillLevel, UltimateLevel } from "./types/game-state";
import type { SkillId } from "./types/assets";

type AppPhase = "menu" | "playing";

function clampMeterPercent(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.max(0, Math.min(HUD_UI.meterPercentMax, (value / maxValue) * HUD_UI.meterPercentMax));
}

function uiSpriteStyle(spriteId: UiSpriteId, width?: number, height?: number): CSSProperties {
  const sprite = UI_SPRITES[spriteId];
  const displaySize = uiSpriteDisplaySize(spriteId);
  const displayW = width ?? displaySize.w;
  const displayH = height ?? displaySize.h;

  return {
    width: displayW,
    height: displayH,
    backgroundImage: `url("${sprite.src}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${displayW}px ${displayH}px`,
    imageRendering: "pixelated",
  };
}

function uiSpriteDisplaySize(spriteId: UiSpriteId) {
  const sprite = UI_SPRITES[spriteId];
  return {
    w: "displayW" in sprite ? sprite.displayW : sprite.w,
    h: "displayH" in sprite ? sprite.displayH : sprite.h,
  };
}

function UiSprite({ id, width, height, className = "", style, children }: {
  id: UiSpriteId;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className={`ui-sprite ${className}`} style={{ ...uiSpriteStyle(id, width, height), ...style }}>
      {children}
    </div>
  );
}

function getSkill(skillId: SkillId | null | undefined) {
  if (!skillId) return null;
  return SKILLS.find((skill) => skill.id === skillId) ?? null;
}

function skillIconSrc(skillId: SkillId) {
  return `assets/sprites/ui/${skillId}_icon.png`;
}

function romanLevel(level: SkillLevel | UltimateLevel | 0 | undefined) {
  if (!level) return "0";
  if (level === 1) return "I";
  if (level === 2) return "II";
  return "III";
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
      aria-label="Moonlit Tide Survivor"
      className="pixel-canvas block h-auto w-[960px] max-w-full bg-[#0b1220] max-md:h-[100svh] max-md:w-screen max-md:max-w-none"
    />
  );
}

const GHOST_LERP_SPEED = 0.04;
const HUD_HP_METER_FRAME: HudMeterFrame = {
  left: "hudHpBarLeft",
  mid: "hudHpBarMid",
  right: "hudHpBarRight",
  height: 20,
  fillTop: 7,
  fillBottom: 1,
  fillInsetLeft: 15,
  fillInsetRight: 7,
};
const HUD_SKILL_METER_FRAME: HudMeterFrame = {
  left: "hudSkillBarLeft",
  mid: "hudSkillBarMid",
  right: "hudSkillBarRight",
  height: 18,
  fillTop: 7,
  fillBottom: 3,
  fillInsetLeft: 15,
  fillInsetRight: 7,
};
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

type HudMeterFrame = {
  left: UiSpriteId;
  mid: UiSpriteId;
  right: UiSpriteId;
  height: number;
  fillTop: number;
  fillBottom: number;
  fillInsetLeft: number;
  fillInsetRight: number;
};

function HudMeter({ value, max, ghostValue, color, ghostColor, text, width, frame, className = "" }: {
  value: number;
  max: number;
  ghostValue: number;
  color: string;
  ghostColor: string;
  text: string;
  width: number;
  frame: HudMeterFrame;
  className?: string;
}) {
  const leftW = uiSpriteDisplaySize(frame.left).w;
  const rightW = uiSpriteDisplaySize(frame.right).w;
  const midWidth = Math.max(uiSpriteDisplaySize(frame.mid).w, width - leftW - rightW);

  return (
    <div className={`player-hud-meter ${className}`} style={{ width, height: frame.height }}>
      <div className="player-hud-meter-frame">
        <UiSprite id={frame.left} width={leftW} height={frame.height} />
        <UiSprite id={frame.mid} width={midWidth} height={frame.height} />
        <UiSprite id={frame.right} width={rightW} height={frame.height} />
      </div>
      <div
        className="player-hud-meter-fill"
        style={{
          left: frame.fillInsetLeft,
          right: frame.fillInsetRight,
          top: frame.fillTop,
          bottom: frame.fillBottom,
        }}
      >
        <GhostBar value={value} max={max} ghostValue={ghostValue} color={color} ghostColor={ghostColor} />
      </div>
      <span className="player-hud-meter-text" style={{ left: leftW, right: rightW }}>{text}</span>
    </div>
  );
}

function UltimateOrb({ value, max, ready, size = 44, activePercent = 0 }: {
  value: number;
  max: number;
  ready: boolean;
  size?: number;
  activePercent?: number;
}) {
  const percent = clampMeterPercent(value, max) / HUD_UI.meterPercentMax;
  const active = activePercent > 0;
  const flameOpacity = percent <= 0 ? 0 : Math.min(1, 0.28 + percent * 0.92);
  const chargeFrame = Math.min(7, Math.floor(percent * 8));
  const chargeFramePosition = chargeFrame / 7 * 100;

  return (
    <div
      className={`ultimate-orb ${ready ? "ultimate-orb-ready" : active ? "ultimate-orb-active" : ""}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderColor: ready ? "#ffdf73" : active ? "#82f3ff" : percent > 0 ? "#a7271d" : "#35100f",
        boxShadow: ready
          ? "0 0 12px rgba(255,122,47,0.95), inset 0 0 12px rgba(255,58,28,0.8)"
          : active
            ? "0 0 10px rgba(100,220,255,0.8), inset 0 0 10px rgba(52,170,255,0.55)"
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
      {active ? (
        <div className="ultimate-orb-tide" style={{ transform: `scaleY(${Math.max(0.02, Math.min(1, activePercent))})` }} />
      ) : null}
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

const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  blade: "刃器",
  garb: "衣装",
  talisman: "饰符",
};

function StatRow({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[10px] leading-[1.5]">
      <span className="text-[#7fc8e0]">{label}</span>
      <span className={accent ? "font-bold text-[#ffd46e]" : "font-bold text-[#26d5ff]"}>{value}</span>
    </div>
  );
}

function PauseScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const { player, equipment } = snapshot;
  const [selectedSkillSlot, setSelectedSkillSlot] = useState<number | null>(null);
  const [selectedEquipmentSlot, setSelectedEquipmentSlot] = useState<EquipmentSlot | null>(null);
  const activeSkill = getSkill(player.equippedSkillIds[player.skillIndex]);
  const totalAttack = player.baseAttack + player.attackBonus;
  const attackText = player.attackBonus > 0
    ? `${totalAttack} (${player.baseAttack}+${player.attackBonus})`
    : `${totalAttack}`;
  const skillEnergyText = `${Math.floor(player.skillEnergy)} / ${player.skillEnergyMax}`;
  const ultimateEnergyText = `${Math.floor(player.ultimateEnergy)} / ${player.ultimateEnergyMax}`;
  const learnedSkills = SKILLS.filter((skill) => player.skillLevels[skill.id]);

  useEffect(() => {
    const closeOpenList = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((key === "escape" || key === "p") && (selectedSkillSlot !== null || selectedEquipmentSlot !== null)) {
        event.preventDefault();
        event.stopPropagation();
        setSelectedSkillSlot(null);
        setSelectedEquipmentSlot(null);
      }
    };
    window.addEventListener("keydown", closeOpenList, { capture: true });
    return () => window.removeEventListener("keydown", closeOpenList, { capture: true });
  }, [selectedEquipmentSlot, selectedSkillSlot]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(5,10,22,0.72)] px-3">
      <UiSprite id="pausePanel" width={940} height={529} className="relative">
        <div className="absolute inset-[42px] flex flex-col text-left text-white">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-bold text-[#26d5ff]">潮刃者</span>
            <span className="text-[10px] text-[#7fc8e0]">当前技能：<span className="text-[#26d5ff]">{activeSkill?.name ?? "未装备"}</span></span>
          </div>

          <div className="mt-3 grid flex-1 grid-cols-3 gap-4">
            <UiSprite id="pauseColumnFrame" width={270} height={450} className="relative p-5">
              <div className="mb-3 text-[10px] font-bold text-[#7fc8e0]">角色状态</div>
              <div className="grid gap-2">
                <StatRow label="等级" value={`Lv.${player.runLevel}`} />
                <StatRow label="经验" value={`${player.runXp} / ${player.xpToNext}`} />
                <StatRow label="生命值" value={`${Math.max(0, Math.floor(player.hp))} / ${player.maxHp}`} />
                <StatRow label="攻击力" value={attackText} />
                <StatRow label="技能充能" value={skillEnergyText} />
                <StatRow label="大招充能" value={ultimateEnergyText} accent={player.ultimateReady} />
                <StatRow label="终式等级" value={romanLevel(player.ultimateLevel)} />
                <StatRow label="分数" value={player.score} />
              </div>
            </UiSprite>

            <UiSprite id="pauseColumnFrame" width={270} height={450} className="relative p-5">
              <div className="mb-3 text-[10px] font-bold text-[#7fc8e0]">装备栏</div>
              <div className="grid gap-2">
                {(["blade", "garb", "talisman"] as EquipmentSlot[]).map((slot) => {
                  const item = equipment.equipped[slot];
                  const active = selectedEquipmentSlot === slot;
                  return (
                    <button
                      key={slot}
                      className="relative text-left"
                      onClick={() => {
                        setSelectedEquipmentSlot(active ? null : slot);
                        setSelectedSkillSlot(null);
                      }}
                    >
                      <UiSprite id={active ? "slotFrameActive" : "slotFrameNormal"} width={230} height={61} className="px-4 py-2">
                        <div className="text-[9px] text-[#7fc8e0]">{EQUIPMENT_SLOT_LABELS[slot]}</div>
                        <div className="truncate text-[10px] font-bold text-[#d9f6ff]">{item?.name ?? "未装备"}</div>
                      </UiSprite>
                    </button>
                  );
                })}
              </div>

              {selectedEquipmentSlot ? (
                <div className="mt-3 grid gap-1">
                  {equipment.equipped[selectedEquipmentSlot] ? (
                    <button
                      className="text-left text-[9px] text-[#ffd46e]"
                      onClick={() => equipEquipment(selectedEquipmentSlot, null)}
                    >
                      卸下当前{EQUIPMENT_SLOT_LABELS[selectedEquipmentSlot]}
                    </button>
                  ) : null}
                  {equipment.inventory.filter((item) => item.slot === selectedEquipmentSlot).map((item) => (
                    <button
                      key={item.id}
                      className="text-left text-[9px] leading-[1.45] text-[#c8efff]"
                      onClick={() => {
                        equipEquipment(selectedEquipmentSlot, item.id);
                        setSelectedEquipmentSlot(null);
                      }}
                    >
                      {item.name} · {item.summary}
                    </button>
                  ))}
                </div>
              ) : null}
            </UiSprite>

            <UiSprite id="pauseColumnFrame" width={270} height={450} className="relative p-5">
              <div className="mb-3 text-[10px] font-bold text-[#7fc8e0]">技能栏</div>
              <div className="grid gap-2">
                {player.equippedSkillIds.map((skillId, index) => {
                  const skill = getSkill(skillId);
                  const active = selectedSkillSlot === index;
                  const level = skillId ? player.skillLevels[skillId] : undefined;
                  return (
                    <button
                      key={index}
                      className="relative text-left"
                      onClick={() => {
                        setSelectedSkillSlot(active ? null : index);
                        setSelectedEquipmentSlot(null);
                      }}
                    >
                      <UiSprite id={active ? "slotFrameActive" : skill ? "slotFrameNormal" : "slotFrameDisabled"} width={230} height={61} className="px-4 py-2">
                        <div className="text-[9px] text-[#7fc8e0]">槽位 {index + 1}</div>
                        <div className="truncate text-[10px] font-bold text-[#d9f6ff]">{skill ? `${skill.name} ${romanLevel(level)}` : "空槽"}</div>
                      </UiSprite>
                    </button>
                  );
                })}
              </div>

              {selectedSkillSlot !== null ? (
                <div className="mt-3 grid gap-1">
                  {learnedSkills.map((skill) => {
                    const equippedElsewhere = player.equippedSkillIds.some((skillId, index) => (
                      index !== selectedSkillSlot && skillId === skill.id
                    ));
                    return (
                      <button
                        key={skill.id}
                        disabled={equippedElsewhere}
                        className={`text-left text-[9px] leading-[1.45] ${equippedElsewhere ? "text-[#4a7a9a]" : "text-[#c8efff]"}`}
                        onClick={() => {
                          equipSkillSlot(selectedSkillSlot, skill.id);
                          setSelectedSkillSlot(null);
                        }}
                      >
                        {skill.name} {romanLevel(player.skillLevels[skill.id])}{equippedElsewhere ? " · 已装备" : ""}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 text-[9px] leading-[1.45] text-[#c8efff]">
                  {activeSkill?.description ?? "选择一个空槽装备已习得技能。"}
                </div>
              )}
            </UiSprite>
          </div>

          <div className="pt-2 text-center text-[10px] text-white/55">按 ESC 或 P 继续游戏</div>
        </div>
      </UiSprite>
    </div>
  );
}

function RewardOverlay({ snapshot }: { snapshot: GameSnapshot }) {
  const isBossReward = snapshot.activeOverlay === "bossEquipment";
  const choices = isBossReward ? snapshot.pendingEquipmentChoices : snapshot.pendingUpgradeChoices;
  const panelSprite = isBossReward ? "bossRewardPanel" : "upgradeRewardPanel";
  const cardSprite = isBossReward ? "bossChoiceCard" : "upgradeChoiceCard";
  const activeCardSprite = isBossReward ? "bossChoiceCardActive" : "upgradeChoiceCardActive";
  const title = isBossReward ? "血鬼遗物" : "等级提升";
  const subtitle = isBossReward
    ? "选择一件装备"
    : `Lv.${snapshot.player.runLevel - 1} -> Lv.${snapshot.player.runLevel}  选择一项强化`;

  useEffect(() => {
    const handleRewardKey = (event: KeyboardEvent) => {
      const key = event.key;
      if (key !== "1" && key !== "2" && key !== "3") return;
      const index = Number(key) - 1;
      if (!choices[index]) return;
      event.preventDefault();
      event.stopPropagation();
      if (isBossReward) {
        chooseBossEquipment(index);
      } else {
        chooseUpgradeReward(index);
      }
    };

    window.addEventListener("keydown", handleRewardKey, { capture: true });
    return () => window.removeEventListener("keydown", handleRewardKey, { capture: true });
  }, [choices, isBossReward]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(4,7,16,0.78)] px-4 text-white">
      <UiSprite id={panelSprite} width={860} height={356} className="relative">
        <div className="absolute inset-[34px] flex flex-col">
          <div className="text-center">
            <div className={`text-[15px] font-bold ${isBossReward ? "text-[#ffd46e]" : "text-[#26d5ff]"}`}>{title}</div>
            <div className="mt-2 text-[10px] text-[#c8efff]">{subtitle}</div>
          </div>

          <div className="mt-6 grid flex-1 grid-cols-3 gap-4">
            {choices.map((choice, index) => {
              const item = isBossReward ? choice as EquipmentItemState : null;
              const upgrade = isBossReward ? null : choice as typeof snapshot.pendingUpgradeChoices[number];
              return (
                <button
                  key={choice.id}
                  className="relative text-left"
                  onClick={() => {
                    if (isBossReward) chooseBossEquipment(index);
                    else chooseUpgradeReward(index);
                  }}
                >
                  <UiSprite id={index === 0 ? activeCardSprite : cardSprite} width={246} height={295} className="p-5">
                    <div className={`mb-3 text-[9px] ${isBossReward ? "text-[#ffd46e]" : "text-[#7fc8e0]"}`}>[{index + 1}] {isBossReward ? item?.uiTags.join(" · ") : upgrade?.title}</div>
                    <div className="mb-3 min-h-[34px] text-[13px] font-bold text-[#f7f3e9]">{choice.name}</div>
                    <div className="text-[9px] leading-[1.6] text-[#c8efff]">
                      {isBossReward ? item?.summary : upgrade?.description}
                    </div>
                    {isBossReward && item ? (
                      <div className="mt-4 text-[8px] leading-[1.5] text-[#ffd9a0]">
                        当前{EQUIPMENT_SLOT_LABELS[item.slot]}：{snapshot.equipment.equipped[item.slot]?.name ?? "无"}
                      </div>
                    ) : null}
                  </UiSprite>
                </button>
              );
            })}
          </div>
        </div>
      </UiSprite>
    </div>
  );
}

function Hud() {
  const snapshot = useAtomValue(gameSnapshotAtom);
  const { player, boss, elapsed, spritesReady, gameOver } = snapshot;
  const activeSkillId = player.equippedSkillIds[player.skillIndex];
  const activeSkill = getSkill(activeSkillId);
  const activeSkillLevel = activeSkillId ? player.skillLevels[activeSkillId] : undefined;

  const skillValue = player.skillEnergy;
  const skillMax = player.skillEnergyMax;
  const bossHp = boss?.hp ?? 0;
  const bossHpMax = boss?.hpMax ?? 1;
  const xpPercent = clampMeterPercent(player.runXp, player.xpToNext);
  const ultimateActivePercent = player.ultimateTimer > 0
    ? player.ultimateTimer / Math.max(1, player.ultimateDuration)
    : player.ultimateCastTimer > 0
      ? player.ultimateCastTimer / Math.max(1, player.ultimateCastDuration)
      : 0;

  const ghostHp = useGhostValue(player.hp);
  const ghostSkill = useGhostValue(skillValue);
  const ghostBossHp = useGhostValue(bossHp);
  const playerBarWidth = Math.min(
    HUD_UI.playerBarMaxW,
    HUD_UI.playerBarBaseW + Math.max(0, player.runLevel - 1) * HUD_UI.playerBarGrowthPerLevel,
  );

  return (
    <>
      <DebugPanel />

      <div className="pointer-events-none absolute left-2 top-2 z-10 hidden text-white md:block">
        <div className="player-hud">
          <div className="player-hud-abilities">
            <UiSprite id="ultimateFrame" width={72} height={72} className="player-hud-ultimate-frame flex items-center justify-center">
              <UltimateOrb
                value={player.ultimateEnergy}
                max={player.ultimateEnergyMax}
                ready={player.ultimateReady}
                size={44}
                activePercent={ultimateActivePercent}
              />
            </UiSprite>
            <UiSprite id="currentSkillFrame" width={36} height={36} className="player-hud-current-skill">
              {activeSkillId && activeSkill ? (
                <>
                  <img src={skillIconSrc(activeSkillId)} alt="" draggable={false} />
                  <span>{romanLevel(activeSkillLevel)}</span>
                </>
              ) : (
                <span>--</span>
              )}
            </UiSprite>
          </div>
          <div className="player-hud-bars">
            <HudMeter
              className="player-hud-meter-hp"
              value={player.hp}
              max={player.maxHp}
              ghostValue={ghostHp}
              color="linear-gradient(90deg,#246f35,#5aff6a)"
              ghostColor="#254f27"
              text={`${Math.max(0, Math.floor(player.hp))} / ${player.maxHp}`}
              width={playerBarWidth}
              frame={HUD_HP_METER_FRAME}
            />
            <HudMeter
              className="player-hud-meter-skill"
              value={skillValue}
              max={skillMax}
              ghostValue={ghostSkill}
              color="linear-gradient(90deg,#145f82,#7fe8ff)"
              ghostColor="#1c475c"
              text={`${Math.floor(skillValue)} / ${skillMax}`}
              width={playerBarWidth}
              frame={HUD_SKILL_METER_FRAME}
            />
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
            {boss.phaseTitle}
          </span>
        </div>
      ) : null}

      {!spritesReady ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30 text-sm text-white md:hidden">
          加载像素贴图中...
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10">
        <div className="hud-xp-bar">
          <div className="hud-xp-fill" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>
      <div className="hud-level-label pointer-events-none absolute bottom-1 left-2 z-10 hidden md:block">
        Lv.{player.runLevel}
      </div>

      {gameOver ? <DeathScreen elapsed={elapsed} /> : null}

      {snapshot.activeOverlay === "pause" ? <PauseScreen snapshot={snapshot} /> : null}
      {snapshot.activeOverlay === "upgrade" || snapshot.activeOverlay === "bossEquipment" ? (
        <RewardOverlay snapshot={snapshot} />
      ) : null}
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
    ensureAudio();
    setStartQueued(true);
    if (assetsReady) {
      setPhase("playing");
    }
  }, [assetsReady, phase]);

  useEffect(() => {
    if (phase === "menu" && startQueued && assetsReady) {
      setPhase("playing");
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1020px] flex-col items-center justify-center px-4 py-4 text-center max-md:max-w-none max-md:px-0 max-md:py-0">
      {isPlaying ? (
        <>
          <h1 className="mb-4 text-base tracking-[1px] md:text-2xl max-md:hidden">月潮夜行</h1>
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
