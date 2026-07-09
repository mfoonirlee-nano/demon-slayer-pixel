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

const DEBUG_ENEMY_OPTIONS: Array<{ kind: DebugEnemyKind; label: string }> = [
  { kind: "chaser", label: "chaser" },
  { kind: "crawler", label: "crawler" },
  { kind: "runner", label: "runner" },
  { kind: "caster", label: "caster" },
  { kind: "duelist", label: "duelist" },
  { kind: "brute", label: "brute" },
  { kind: "binder", label: "binder" },
  { kind: "glider", label: "glider" },
  { kind: "leaper", label: "leaper" },
  { kind: "splitter", label: "splitter" },
  { kind: "warden", label: "warden" },
  { kind: "burrower", label: "burrower" },
];

const DEBUG_ENEMY_GROWTH_OPTIONS: Array<{ stage: ActBand; label: string }> = [
  { stage: "intro", label: "intro" },
  { stage: "awakened", label: "awakened" },
  { stage: "final", label: "final" },
];

const DEBUG_BOSS_OPTIONS = Object.values(BOSS_ARCHETYPES).map((boss) => ({
  id: boss.id,
  label: boss.displayName,
}));

const DEBUG_SKILL_OPTIONS = implementedPlayerSkills().map((skill) => ({
  id: skill.id,
  label: skill.name,
}));

const DEBUG_SKILL_SLOT_OPTIONS = [0, 1, 2] as const;
const MAX_DEBUG_SKILL_LEVEL: SkillLevel = 3;
const DEBUG_SKILL_LEVEL_OPTIONS: SkillLevel[] = [1, 2, MAX_DEBUG_SKILL_LEVEL];

const DEBUG_PLATFORM_OPTIONS: Array<{ kind: SegmentKind; label: string }> = [
  { kind: "safeBridge", label: "safeBridge" },
  { kind: "breather", label: "breather" },
  { kind: "stairUp", label: "stairUp" },
  { kind: "stairDown", label: "stairDown" },
  { kind: "zigzag", label: "zigzag" },
  { kind: "gapJump", label: "gapJump" },
  { kind: "hoverPair", label: "hoverPair" },
  { kind: "rewardRisk", label: "rewardRisk" },
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
  const [collapsed, setCollapsed] = useState(false);
  const [enemyKind, setEnemyKind] = useState<DebugEnemyKind>("chaser");
  const [enemyGrowthStage, setEnemyGrowthStage] = useState<ActBand>("intro");
  const [bossId, setBossId] = useState<BossArchetypeId>(DEBUG_BOSS_OPTIONS[0]?.id ?? "spider-string");
  const [bossAwakened, setBossAwakened] = useState(false);
  const [platformKind, setPlatformKind] = useState<SegmentKind>("safeBridge");
  const [skillSlotIndex, setSkillSlotIndex] = useState<number>(0);
  const [skillId, setSkillId] = useState<SkillId>(DEBUG_SKILL_OPTIONS[0]?.id ?? "line_projectile");
  const [skillLevel, setSkillLevelValue] = useState<SkillLevel>(1);
  const [infiniteHealth, setInfiniteHealth] = useState(hasDebugInfiniteHealth());
  const [infiniteSkillCharge, setInfiniteSkillCharge] = useState(hasDebugInfiniteSkillCharge());
  const [infiniteUltimateCharge, setInfiniteUltimateCharge] = useState(hasDebugInfiniteUltimateCharge());
  const gameWindowSize = useGameWindowSize();

  if (!isDebugMode) return null;

  const panelClassName = `${collapsed ? "w-[82px]" : "w-[190px]"} pointer-events-auto absolute right-2 top-2 z-30 max-w-[calc(100%-16px)] rounded-[6px] border border-[#70d7ff66] bg-[#07131ee6] p-2 text-left text-[10px] leading-none text-[#e7f8ff] shadow-[0_8px_20px_rgba(0,0,0,0.35)]`;
  const collapseLabel = collapsed ? "Expand debug panel" : "Collapse debug panel";
  const panelHeader = (
    <div className={`${collapsed ? "" : "mb-2 border-b border-[#70d7ff33] pb-1"} flex items-center justify-between gap-2`}>
      <span className="text-[9px] font-bold text-[#7fe8ff]">DEBUG</span>
      <div className="flex items-center gap-1">
        {collapsed ? null : <span className="text-[8px] text-[#9fbfd0]">Auto off</span>}
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
        <span className="text-[#9ed8ff]">Game window</span>
        <span className="font-bold tabular-nums text-[#e7f8ff]">
          {gameWindowSize ? `${gameWindowSize.width}x${gameWindowSize.height}` : "unknown"}
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
        Infinite health
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
        Skill charge full
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
        Ultimate charge full
      </label>
      <label className="block text-[8px] text-[#9ed8ff]" htmlFor="debug-skill-kind">Skill</label>
      <div className="mt-1 flex gap-1">
        <select
          id="debug-skill-slot"
          aria-label="Skill slot"
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
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>
      <label className="mt-1 block text-[8px] text-[#9ed8ff]" htmlFor="debug-skill-level">Skill level</label>
      <select
        id="debug-skill-level"
        className="mt-1 w-full rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
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
      <label className="mt-2 block text-[8px] text-[#9ed8ff]" htmlFor="debug-enemy-kind">Enemy</label>
      <div className="mt-1 flex gap-1">
        <select
          id="debug-enemy-kind"
          className="min-w-0 flex-1 rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
          value={enemyKind}
          onChange={(event) => setEnemyKind(event.target.value as DebugEnemyKind)}
        >
          {DEBUG_ENEMY_OPTIONS.map((option) => (
            <option key={option.kind} value={option.kind}>{option.label}</option>
          ))}
        </select>
        <select
          id="debug-enemy-growth"
          aria-label="Enemy growth"
          className="w-[74px] rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
          value={enemyGrowthStage}
          onChange={(event) => setEnemyGrowthStage(event.target.value as ActBand)}
        >
          {DEBUG_ENEMY_GROWTH_OPTIONS.map((option) => (
            <option key={option.stage} value={option.stage}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-[4px] border border-[#88f3ff77] bg-[#12394a] px-2 py-1 text-[9px] font-bold text-[#e7fbff] active:translate-y-px"
          onClick={() => spawnDebugEnemy(enemyKind, enemyGrowthStage)}
        >
          Spawn
        </button>
      </div>
      <label className="mt-2 block text-[8px] text-[#9ed8ff]" htmlFor="debug-platform-kind">Platform</label>
      <div className="mt-1 flex gap-1">
        <select
          id="debug-platform-kind"
          className="min-w-0 flex-1 rounded-[4px] border border-[#70d7ff44] bg-[#102033] px-1 py-1 text-[9px] text-[#f2fbff]"
          value={platformKind}
          onChange={(event) => setPlatformKind(event.target.value as SegmentKind)}
        >
          {DEBUG_PLATFORM_OPTIONS.map((option) => (
            <option key={option.kind} value={option.kind}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-[4px] border border-[#88f3ff77] bg-[#12394a] px-2 py-1 text-[9px] font-bold text-[#e7fbff] active:translate-y-px"
          onClick={() => spawnDebugPlatformSegment(platformKind)}
        >
          Spawn
        </button>
      </div>
      <label className="mt-2 block text-[8px] text-[#ffd899]" htmlFor="debug-boss-kind">Boss</label>
      <label className="mt-1 flex items-center gap-2 text-[8px] text-[#ffe6b5]" htmlFor="debug-boss-awakened">
        <input
          id="debug-boss-awakened"
          type="checkbox"
          className="h-3 w-3 accent-[#ffcf7a]"
          checked={bossAwakened}
          onChange={(event) => setBossAwakened(event.target.checked)}
        />
        Awakened
      </label>
      <div className="mt-1 flex gap-1">
        <select
          id="debug-boss-kind"
          className="min-w-0 flex-1 rounded-[4px] border border-[#ffcf7a66] bg-[#2c1d12] px-1 py-1 text-[9px] text-[#fff7dd]"
          value={bossId}
          onChange={(event) => setBossId(event.target.value as BossArchetypeId)}
        >
          {DEBUG_BOSS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-[4px] border border-[#ffcf7a99] bg-[#4a2b12] px-2 py-1 text-[9px] font-bold text-[#fff2c7] active:translate-y-px"
          onClick={() => spawnDebugBoss(bossId, bossAwakened)}
        >
          Spawn
        </button>
      </div>
    </div>
  );
}
