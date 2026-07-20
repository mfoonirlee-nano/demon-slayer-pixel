import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import {
  BINDER_SHEET_INDEX,
  BRUTE_SHEET_INDEX,
  CASTER_SHEET_INDEX,
  CRAWLER_SHEET_INDEX,
  DUELIST_SHEET_INDEX,
  ENEMY_SHEETS,
  GLIDER_SHEET_INDEX,
  LEAPER_SHEET_INDEX,
  RUNNER_SHEET_INDEX,
  SPLITTER_SHEET_INDEX,
  WARDEN_SHEET_INDEX,
  BURROWER_SHEET_INDEX,
} from "../constants";
import { BOSS_ARCHETYPES } from "../entities/bosses/registry";
import { bossName } from "../i18n/bossCopy";
import { debugEnemyLabel, debugGrowthLabel, debugPlatformLabel } from "../i18n/debugCopy";
import { languageAtom } from "../i18n/language";
import { message } from "../i18n/messages";
import { skillName } from "../i18n/skillCopy";
import { implementedPlayerSkills } from "../systems/skillCatalog";
import { canvas } from "../rendering/context";
import type { SegmentKind } from "../entities/platform";
import type { SkillId } from "../types/assets";
import type { ActBand, BossArchetypeId, GameState, SkillLevel } from "../types/game-state";

export type DebugEnemyKind =
  | "chaser"
  | "crawler"
  | "runner"
  | "caster"
  | "duelist"
  | "brute"
  | "binder"
  | "glider"
  | "leaper"
  | "splitter"
  | "warden"
  | "burrower";

type DebugRuntimeActions = {
  canSpawn: () => boolean;
  publish: () => void;
  setInfiniteHealth: (enabled: boolean) => void;
  setInfiniteSkillCharge: (enabled: boolean) => void;
  setInfiniteUltimateCharge: (enabled: boolean) => void;
  spawnEnemySheet: (sheetIndex: number, side: number, options?: { growthStage?: ActBand }) => void;
  spawnPlatformSegment: (kind: SegmentKind) => void;
  spawnBoss: (id?: BossArchetypeId, options?: { awakened?: boolean }) => void;
  equipSkillSlot: (slotIndex: number, skillId: SkillId) => void;
  setSkillLevel: (skillId: SkillId, level: SkillLevel) => void;
};

const CHASER_SHEET_INDEX = 0;

const DEBUG_ENEMY_SHEET_INDEX: Record<DebugEnemyKind, number> = {
  chaser: CHASER_SHEET_INDEX,
  crawler: CRAWLER_SHEET_INDEX,
  runner: RUNNER_SHEET_INDEX,
  caster: CASTER_SHEET_INDEX,
  duelist: DUELIST_SHEET_INDEX,
  brute: BRUTE_SHEET_INDEX,
  binder: BINDER_SHEET_INDEX,
  glider: GLIDER_SHEET_INDEX,
  leaper: LEAPER_SHEET_INDEX,
  splitter: SPLITTER_SHEET_INDEX,
  warden: WARDEN_SHEET_INDEX,
  burrower: BURROWER_SHEET_INDEX,
};

const DEBUG_ENEMY_OPTIONS: DebugEnemyKind[] = Object.keys(DEBUG_ENEMY_SHEET_INDEX) as DebugEnemyKind[];
const DEBUG_ENEMY_GROWTH_OPTIONS: ActBand[] = ["intro", "awakened", "final"];
const DEBUG_BOSS_OPTIONS = Object.values(BOSS_ARCHETYPES).map((boss) => boss.id);
const DEBUG_SKILL_OPTIONS = implementedPlayerSkills().map((skill) => skill.id);

const DEBUG_SKILL_SLOT_OPTIONS = [0, 1, 2] as const;
const MAX_DEBUG_SKILL_LEVEL: SkillLevel = 3;
const DEBUG_SKILL_LEVEL_OPTIONS: SkillLevel[] = [1, 2, MAX_DEBUG_SKILL_LEVEL];

const DEBUG_PLATFORM_OPTIONS: SegmentKind[] = [
  "safeBridge",
  "breather",
  "stairUp",
  "stairDown",
  "zigzag",
  "gapJump",
  "hoverPair",
  "rewardRisk",
];

let runtimeActions: DebugRuntimeActions = {
  canSpawn: () => false,
  publish: () => {},
  setInfiniteHealth: () => {},
  setInfiniteSkillCharge: () => {},
  setInfiniteUltimateCharge: () => {},
  spawnEnemySheet: () => {},
  spawnPlatformSegment: () => {},
  spawnBoss: () => {},
  equipSkillSlot: () => {},
  setSkillLevel: () => {},
};

let debugInfiniteHealth = true;
let debugInfiniteSkillCharge = true;
let debugInfiniteUltimateCharge = false;

type GameWindowSize = {
  width: number;
  height: number;
};

export const isDebugMode = typeof window !== "undefined"
  && new URLSearchParams(window.location.search).get("debug") === "1";

export function canAutoSpawnEntities() {
  return !isDebugMode;
}

export function hasDebugInfiniteSkillCharge() {
  return isDebugMode && debugInfiniteSkillCharge;
}

export function hasDebugInfiniteUltimateCharge() {
  return isDebugMode && debugInfiniteUltimateCharge;
}

export function hasDebugInfiniteHealth() {
  return isDebugMode && debugInfiniteHealth;
}

export function applyDebugInfiniteUltimateCharge(gameState: GameState) {
  const player = gameState.player;
  if (player.ultimateLevel <= 0) player.ultimateLevel = 1;
  player.ultimateEnergy = player.ultimateEnergyMax;
}

export function setDebugRuntimeActions(actions: DebugRuntimeActions) {
  runtimeActions = actions;
}

function runDebugAction(action: () => void) {
  if (!isDebugMode || !runtimeActions.canSpawn()) return;
  action();
  runtimeActions.publish();
}

function spawnDebugEnemy(kind: DebugEnemyKind, growthStage: ActBand) {
  const sheetIndex = DEBUG_ENEMY_SHEET_INDEX[kind];
  if (!ENEMY_SHEETS[sheetIndex]) return;
  runDebugAction(() => runtimeActions.spawnEnemySheet(sheetIndex, 1, { growthStage }));
}

function spawnDebugPlatformSegment(kind: SegmentKind) {
  runDebugAction(() => runtimeActions.spawnPlatformSegment(kind));
}

function spawnDebugBoss(bossId: BossArchetypeId, awakened: boolean) {
  runDebugAction(() => runtimeActions.spawnBoss(bossId, { awakened }));
}

function equipDebugSkill(slotIndex: number, skillId: SkillId, level: SkillLevel) {
  runDebugAction(() => {
    runtimeActions.equipSkillSlot(slotIndex, skillId);
    runtimeActions.setSkillLevel(skillId, level);
  });
}

function setDebugSkillLevel(skillId: SkillId, level: SkillLevel) {
  runDebugAction(() => runtimeActions.setSkillLevel(skillId, level));
}

function setDebugInfiniteSkillCharge(enabled: boolean) {
  if (!isDebugMode) return;
  debugInfiniteSkillCharge = enabled;
  runtimeActions.setInfiniteSkillCharge(enabled);
  runtimeActions.publish();
}

function setDebugInfiniteUltimateCharge(enabled: boolean) {
  if (!isDebugMode) return;
  debugInfiniteUltimateCharge = enabled;
  runtimeActions.setInfiniteUltimateCharge(enabled);
  runtimeActions.publish();
}

function setDebugInfiniteHealth(enabled: boolean) {
  if (!isDebugMode) return;
  debugInfiniteHealth = enabled;
  runtimeActions.setInfiniteHealth(enabled);
  runtimeActions.publish();
}

function gameCanvasElement() {
  return canvas ?? document.getElementById("game");
}

function readGameWindowSize(): GameWindowSize | null {
  if (typeof document === "undefined") return null;

  const gameCanvas = gameCanvasElement();
  if (!(gameCanvas instanceof HTMLCanvasElement)) return null;

  const rect = gameCanvas.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function useGameWindowSize() {
  const [size, setSize] = useState<GameWindowSize | null>(readGameWindowSize);

  useEffect(() => {
    if (!isDebugMode) return;

    const updateSize = () => setSize(readGameWindowSize());
    const viewport = window.visualViewport;
    const gameCanvas = gameCanvasElement();
    const resizeObserver = gameCanvas && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateSize)
      : null;

    updateSize();
    window.addEventListener("resize", updateSize);
    viewport?.addEventListener("resize", updateSize);
    if (gameCanvas) resizeObserver?.observe(gameCanvas);

    return () => {
      window.removeEventListener("resize", updateSize);
      viewport?.removeEventListener("resize", updateSize);
      resizeObserver?.disconnect();
    };
  }, []);

  return size;
}

export function DebugPanel() {
  const language = useAtomValue(languageAtom);
  const [collapsed, setCollapsed] = useState(false);
  const [enemyKind, setEnemyKind] = useState<DebugEnemyKind>("chaser");
  const [enemyGrowthStage, setEnemyGrowthStage] = useState<ActBand>("intro");
  const [bossId, setBossId] = useState<BossArchetypeId>(DEBUG_BOSS_OPTIONS[0] ?? "spider-string");
  const [bossAwakened, setBossAwakened] = useState(false);
  const [platformKind, setPlatformKind] = useState<SegmentKind>("safeBridge");
  const [skillSlotIndex, setSkillSlotIndex] = useState<number>(0);
  const [skillId, setSkillId] = useState<SkillId>(DEBUG_SKILL_OPTIONS[0] ?? "line_projectile");
  const [skillLevel, setSkillLevelValue] = useState<SkillLevel>(1);
  const [infiniteHealth, setInfiniteHealth] = useState(hasDebugInfiniteHealth());
  const [infiniteSkillCharge, setInfiniteSkillCharge] = useState(hasDebugInfiniteSkillCharge());
  const [infiniteUltimateCharge, setInfiniteUltimateCharge] = useState(hasDebugInfiniteUltimateCharge());
  const gameWindowSize = useGameWindowSize();

  if (!isDebugMode) return null;

  const panelClassName = `${collapsed ? "w-[82px]" : "w-[190px]"} pointer-events-auto absolute right-2 top-2 z-30 max-w-[calc(100%-16px)] rounded-[6px] border border-[#70d7ff66] bg-[#07131ee6] p-2 text-left text-[10px] leading-none text-[#e7f8ff] shadow-[0_8px_20px_rgba(0,0,0,0.35)]`;
  const collapseLabel = message(
    language,
    collapsed ? "debug.expandPanel" : "debug.collapsePanel",
  );
  const panelHeader = (
    <div className={`${collapsed ? "" : "mb-2 border-b border-[#70d7ff33] pb-1"} flex items-center justify-between gap-2`}>
      <span className="text-[9px] font-bold text-[#7fe8ff]">DEBUG</span>
      <div className="flex items-center gap-1">
        {collapsed ? null : <span className="text-[8px] text-[#9fbfd0]">{message(language, "debug.autoOff")}</span>}
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-[#70d7ff55] bg-[#102033] text-[13px] font-bold leading-none text-[#c3efff] active:translate-y-px"
          aria-expanded={!collapsed}
          aria-label={collapseLabel}
          title={collapseLabel}
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? "+" : "-"}
        </button>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <div className={panelClassName}>
        {panelHeader}
      </div>
    );
  }

  return (
    <div className={panelClassName}>
      {panelHeader}
      <div className="mb-2 flex items-center justify-between rounded-[4px] border border-[#70d7ff33] bg-[#10203388] px-2 py-1 text-[8px]">
        <span className="text-[#9ed8ff]">{message(language, "debug.gameWindow")}</span>
        <span className="font-bold tabular-nums text-[#e7f8ff]">
          {gameWindowSize ? `${gameWindowSize.width}x${gameWindowSize.height}` : message(language, "debug.unknown")}
        </span>
      </div>
      <label className="mb-2 flex items-center gap-2 text-[8px] text-[#c3efff]" htmlFor="debug-infinite-health">
        <input
          id="debug-infinite-health"
          type="checkbox"
          className="h-3 w-3 accent-[#63f4ff]"
          checked={infiniteHealth}
          onChange={(event) => {
            const enabled = event.target.checked;
            setInfiniteHealth(enabled);
            setDebugInfiniteHealth(enabled);
          }}
        />
        {message(language, "debug.infiniteHealth")}
      </label>
      <label className="mb-2 flex items-center gap-2 text-[8px] text-[#c3efff]" htmlFor="debug-infinite-skill-charge">
        <input
          id="debug-infinite-skill-charge"
          type="checkbox"
          className="h-3 w-3 accent-[#63f4ff]"
          checked={infiniteSkillCharge}
          onChange={(event) => {
            const enabled = event.target.checked;
            setInfiniteSkillCharge(enabled);
            setDebugInfiniteSkillCharge(enabled);
          }}
        />
        {message(language, "debug.skillChargeFull")}
      </label>
      <label className="mb-2 flex items-center gap-2 text-[8px] text-[#c3efff]" htmlFor="debug-infinite-ultimate-charge">
        <input
          id="debug-infinite-ultimate-charge"
          type="checkbox"
          className="h-3 w-3 accent-[#63f4ff]"
          checked={infiniteUltimateCharge}
          onChange={(event) => {
            const enabled = event.target.checked;
            setInfiniteUltimateCharge(enabled);
            setDebugInfiniteUltimateCharge(enabled);
          }}
        />
        {message(language, "debug.ultimateChargeFull")}
      </label>
      <label className="block text-[8px] text-[#9ed8ff]" htmlFor="debug-skill-kind">{message(language, "debug.skill")}</label>
      <div className="mt-1 flex gap-1">
        <select
          id="debug-skill-slot"
          aria-label={message(language, "debug.skillSlot")}
          className="w-[44px] rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
          value={skillSlotIndex}
          onChange={(event) => setSkillSlotIndex(Number(event.target.value))}
        >
          {DEBUG_SKILL_SLOT_OPTIONS.map((slotIndex) => (
            <option key={slotIndex} value={slotIndex}>{slotIndex + 1}</option>
          ))}
        </select>
        <select
          id="debug-skill-kind"
          className="min-w-0 flex-1 rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
          value={skillId}
          onChange={(event) => {
            const nextSkillId = event.target.value as SkillId;
            setSkillId(nextSkillId);
            equipDebugSkill(skillSlotIndex, nextSkillId, skillLevel);
          }}
        >
          {DEBUG_SKILL_OPTIONS.map((option) => (
            <option key={option} value={option}>{skillName(language, option)}</option>
          ))}
        </select>
        <select
          id="debug-skill-level"
          aria-label={message(language, "debug.skillLevel")}
          className="w-[42px] rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
          value={skillLevel}
          onChange={(event) => {
            const nextLevel = Number(event.target.value) as SkillLevel;
            setSkillLevelValue(nextLevel);
            setDebugSkillLevel(skillId, nextLevel);
          }}
        >
          {DEBUG_SKILL_LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>
      <label className="mt-2 block text-[8px] text-[#9ed8ff]" htmlFor="debug-enemy-kind">{message(language, "debug.enemy")}</label>
      <div className="mt-1 flex gap-1">
        <select
          id="debug-enemy-kind"
          className="min-w-0 flex-1 rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
          value={enemyKind}
          onChange={(event) => setEnemyKind(event.target.value as DebugEnemyKind)}
        >
          {DEBUG_ENEMY_OPTIONS.map((option) => (
            <option key={option} value={option}>{debugEnemyLabel(language, option)}</option>
          ))}
        </select>
        <select
          id="debug-enemy-growth"
          aria-label={message(language, "debug.enemyGrowth")}
          className="w-[74px] rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
          value={enemyGrowthStage}
          onChange={(event) => setEnemyGrowthStage(event.target.value as ActBand)}
        >
          {DEBUG_ENEMY_GROWTH_OPTIONS.map((option) => (
            <option key={option} value={option}>{debugGrowthLabel(language, option)}</option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-[4px] border border-[#88f3ff77] bg-[#12394a] px-2 py-1 text-[9px] font-bold text-[#e7fbff] active:translate-y-px"
          onClick={() => spawnDebugEnemy(enemyKind, enemyGrowthStage)}
        >
          {message(language, "debug.spawn")}
        </button>
      </div>
      <label className="mt-2 block text-[8px] text-[#9ed8ff]" htmlFor="debug-platform-kind">{message(language, "debug.platform")}</label>
      <div className="mt-1 flex gap-1">
        <select
          id="debug-platform-kind"
          className="min-w-0 flex-1 rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
          value={platformKind}
          onChange={(event) => setPlatformKind(event.target.value as SegmentKind)}
        >
          {DEBUG_PLATFORM_OPTIONS.map((option) => (
            <option key={option} value={option}>{debugPlatformLabel(language, option)}</option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-[4px] border border-[#88f3ff77] bg-[#12394a] px-2 py-1 text-[9px] font-bold text-[#e7fbff] active:translate-y-px"
          onClick={() => spawnDebugPlatformSegment(platformKind)}
        >
          {message(language, "debug.spawn")}
        </button>
      </div>
      <label className="mt-2 block text-[8px] text-[#ffd899]" htmlFor="debug-boss-kind">{message(language, "debug.boss")}</label>
      <label className="mt-1 flex items-center gap-2 text-[8px] text-[#ffe6b5]" htmlFor="debug-boss-awakened">
        <input
          id="debug-boss-awakened"
          type="checkbox"
          className="h-3 w-3 accent-[#ffcf7a]"
          checked={bossAwakened}
          onChange={(event) => setBossAwakened(event.target.checked)}
        />
        {message(language, "debug.awakened")}
      </label>
      <div className="mt-1 flex gap-1">
        <select
          id="debug-boss-kind"
          className="min-w-0 flex-1 rounded-[4px] border border-[#ffcf7a66] bg-[#2c1d12] px-1 py-1 text-[9px] text-[#fff7dd]"
          value={bossId}
          onChange={(event) => setBossId(event.target.value as BossArchetypeId)}
        >
          {DEBUG_BOSS_OPTIONS.map((option) => (
            <option key={option} value={option}>{bossName(language, option)}</option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-[4px] border border-[#ffcf7a99] bg-[#4a2b12] px-2 py-1 text-[9px] font-bold text-[#fff2c7] active:translate-y-px"
          onClick={() => spawnDebugBoss(bossId, bossAwakened)}
        >
          {message(language, "debug.spawn")}
        </button>
      </div>
    </div>
  );
}
