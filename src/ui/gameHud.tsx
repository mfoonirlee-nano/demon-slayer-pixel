import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { HUD_UI } from "../constants";
import { DebugPanel } from "../game/debug";
import { gameSnapshotAtom } from "../game/gameStore";
import { skillEnergyCostForTalisman } from "../systems/equipment";
import { DeathScreen } from "./deathScreen";
import { PauseScreen } from "./pauseScreen";
import { RewardOverlay } from "./rewardOverlay";
import { VictoryScreen } from "./victoryScreen";
import { getSkill, romanLevel, skillIconSrc } from "./uiDisplay";
import { UiSprite, uiSpriteDisplaySize } from "./uiSprite";
import {
  HUD_HP_METER_FRAME,
  HUD_HP_METER_PLACEMENT,
  HUD_SKILL_METER_FRAME,
  HUD_SKILL_METER_PLACEMENT,
  type HudMeterFrame,
  type HudMeterPlacement,
} from "./gameHudLayout";

function clampMeterPercent(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.max(0, Math.min(HUD_UI.meterPercentMax, (value / maxValue) * HUD_UI.meterPercentMax));
}

function filledCostMarkerPercents(value: number, max: number, cost: number) {
  if (value < cost || max <= 0 || cost <= 0) return [];
  const percents: number[] = [];
  const filledValue = Math.min(value, max);

  for (let markerValue = cost; markerValue < max && markerValue <= filledValue; markerValue += cost) {
    percents.push(clampMeterPercent(markerValue, max));
  }

  return percents;
}

const GHOST_LERP_SPEED = 0.04;
const GHOST_SNAP_EPSILON = 0.1;
const ULTIMATE_ORB_DEFAULT_SIZE = 44;
const ULTIMATE_GLOW_BASE_OPACITY = 0.24;
const ULTIMATE_GLOW_OPACITY_SCALE = 0.82;
const ULTIMATE_CHARGE_LAST_FRAME = 7;
const ULTIMATE_CHARGE_FRAME_COUNT = 8;
const ULTIMATE_PERCENT_SCALE = 100;
const ULTIMATE_DECAY_FULL_ANGLE = 360;
const ULTIMATE_DECAY_MIN_ANGLE = 8;
function useGhostValue(value: number) {
  const [ghost, setGhost] = useState(value);
  const ghostRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (value === ghostRef.current) return;
    const animate = () => {
      const diff = value - ghostRef.current;
      if (Math.abs(diff) < GHOST_SNAP_EPSILON) {
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

function HudMeter({ value, max, ghostValue, color, ghostColor, text, width, frame, placement, markerPercents = [], className = "" }: {
  value: number;
  max: number;
  ghostValue: number;
  color: string;
  ghostColor: string;
  text: string;
  width: number;
  frame: HudMeterFrame;
  placement: HudMeterPlacement;
  markerPercents?: number[];
  className?: string;
}) {
  const leftW = uiSpriteDisplaySize(frame.left).w;
  const rightSize = uiSpriteDisplaySize(frame.right);
  const rightW = rightSize.w;
  const midWidth = Math.max(uiSpriteDisplaySize(frame.mid).w, width - leftW - rightW);

  return (
    <div
      className={`player-hud-meter ${className}`}
      style={{ width, height: frame.height, left: placement.left, top: placement.top }}
    >
      <div className="player-hud-meter-frame">
        <UiSprite id={frame.left} width={leftW} height={frame.height} />
        <UiSprite id={frame.mid} width={midWidth} height={frame.height} />
        <UiSprite
          id={frame.right}
          width={rightW}
          height={rightSize.h}
          style={{ position: "relative", top: frame.rightTop }}
        />
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
        {markerPercents.length > 0 ? (
          <div className="player-hud-meter-cost-marks" aria-hidden="true">
            {markerPercents.map((percent) => (
              <span
                key={percent}
                className="player-hud-meter-cost-mark"
                style={{ left: `${percent}%` }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <span className="player-hud-meter-text" style={{ left: leftW, right: rightW }}>{text}</span>
    </div>
  );
}

function UltimateOrb({ value, max, ready, size = ULTIMATE_ORB_DEFAULT_SIZE, activePercent = 0 }: {
  value: number;
  max: number;
  ready: boolean;
  size?: number;
  activePercent?: number;
}) {
  const percent = clampMeterPercent(value, max) / HUD_UI.meterPercentMax;
  const active = activePercent > 0;
  const activeClamped = Math.max(0, Math.min(1, activePercent));
  const glowOpacity = percent <= 0 ? 0 : Math.min(1, ULTIMATE_GLOW_BASE_OPACITY + percent * ULTIMATE_GLOW_OPACITY_SCALE);
  const chargeFrame = Math.min(ULTIMATE_CHARGE_LAST_FRAME, Math.floor(percent * ULTIMATE_CHARGE_FRAME_COUNT));
  const chargeFramePosition = chargeFrame / ULTIMATE_CHARGE_LAST_FRAME * ULTIMATE_PERCENT_SCALE;
  const decayAngle = Math.max(ULTIMATE_DECAY_MIN_ANGLE, activeClamped * ULTIMATE_DECAY_FULL_ANGLE);

  return (
    <div
      className={`ultimate-orb ${ready ? "ultimate-orb-ready" : active ? "ultimate-orb-active" : ""}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderColor: ready ? "#bdf8ff" : active ? "#82f3ff" : percent > 0 ? "#3fb7e8" : "#12324d",
        boxShadow: ready
          ? "0 0 12px rgba(139,238,255,0.95), inset 0 0 12px rgba(64,190,255,0.72)"
          : active
            ? "0 0 10px rgba(100,220,255,0.8), inset 0 0 10px rgba(52,170,255,0.55)"
            : percent > 0
            ? "0 0 7px rgba(55,180,232,0.64), inset 0 0 9px rgba(25,96,156,0.68)"
            : "inset 0 0 8px rgba(0,0,0,0.9)",
      }}
    >
      {active ? (
        <div
          className="ultimate-orb-countdown"
          style={{
            "--ultimate-decay-angle": `${decayAngle}deg`,
          } as CSSProperties}
        />
      ) : null}
      <div
        className="ultimate-orb-sprite-stage"
      >
        <div
          className={`ultimate-orb-sprite ${ready ? "ultimate-orb-sprite-animated" : ""}`}
          style={ready ? undefined : { backgroundPosition: `${chargeFramePosition}% 0` }}
        />
      </div>
      <div className="ultimate-orb-moon-glow" style={{ opacity: glowOpacity }} />
      <div className="ultimate-orb-glass" />
    </div>
  );
}

export function GameHud() {
  const snapshot = useAtomValue(gameSnapshotAtom);
  const { player, boss, elapsed, spritesReady } = snapshot;
  const activeSkillId = player.equippedSkillIds[player.skillIndex];
  const activeSkill = getSkill(activeSkillId);
  const activeSkillLevel = activeSkillId ? player.skillLevels[activeSkillId] : undefined;

  const skillValue = player.skillEnergy;
  const skillMax = player.skillEnergyMax;
  const activeSkillEnergyCost = activeSkill
    ? activeSkill.energyCost ?? skillEnergyCostForTalisman(snapshot.equipment.equipped.talisman?.id)
    : 0;
  const skillMarkerPercents = filledCostMarkerPercents(skillValue, skillMax, activeSkillEnergyCost);
  const bossHp = boss?.hp ?? 0;
  const bossHpMax = boss?.hpMax ?? 1;
  const xpPercent = clampMeterPercent(player.runXp, player.xpToNext);
  const ultimateActivePercent = player.ultimateTimer > 0
    ? player.ultimateTimer / Math.max(1, player.ultimateDuration)
    : player.ultimateCastTimer > 0
      ? 1
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
              placement={HUD_HP_METER_PLACEMENT}
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
              placement={HUD_SKILL_METER_PLACEMENT}
              markerPercents={skillMarkerPercents}
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

      {snapshot.activeOverlay === "death" ? <DeathScreen elapsed={elapsed} /> : null}
      {snapshot.activeOverlay === "victory" ? <VictoryScreen elapsed={elapsed} /> : null}

      {snapshot.activeOverlay === "pause" ? <PauseScreen snapshot={snapshot} /> : null}
      {snapshot.activeOverlay === "upgrade" || snapshot.activeOverlay === "bossEquipment" ? (
        <RewardOverlay snapshot={snapshot} />
      ) : null}
    </>
  );
}
