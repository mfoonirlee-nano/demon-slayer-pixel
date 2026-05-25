import { useState } from "react";
import {
  BRUTE_SHEET_INDEX,
  CASTER_SHEET_INDEX,
  CRAWLER_SHEET_INDEX,
  ENEMY_SHEETS,
  RUNNER_SHEET_INDEX,
} from "./constants";
import type { SegmentKind } from "./entities/platform";

export type DebugEnemyKind = "chaser" | "crawler" | "runner" | "caster" | "duelist" | "brute";

type DebugRuntimeActions = {
  canSpawn: () => boolean;
  publish: () => void;
  spawnEnemySheet: (sheetIndex: number, side: number) => void;
  spawnPlatformSegment: (kind: SegmentKind) => void;
  spawnBoss: () => void;
};

const CHASER_SHEET_INDEX = 0;
const DUELIST_SHEET_INDEX = 4;

const DEBUG_ENEMY_SHEET_INDEX: Record<DebugEnemyKind, number> = {
  chaser: CHASER_SHEET_INDEX,
  crawler: CRAWLER_SHEET_INDEX,
  runner: RUNNER_SHEET_INDEX,
  caster: CASTER_SHEET_INDEX,
  duelist: DUELIST_SHEET_INDEX,
  brute: BRUTE_SHEET_INDEX,
};

const DEBUG_ENEMY_OPTIONS: Array<{ kind: DebugEnemyKind; label: string }> = [
  { kind: "chaser", label: "chaser" },
  { kind: "crawler", label: "crawler" },
  { kind: "runner", label: "runner" },
  { kind: "caster", label: "caster" },
  { kind: "duelist", label: "duelist" },
  { kind: "brute", label: "brute" },
];

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
  spawnEnemySheet: () => {},
  spawnPlatformSegment: () => {},
  spawnBoss: () => {},
};

export const isDebugMode = typeof window !== "undefined"
  && new URLSearchParams(window.location.search).get("debug") === "1";

export function canAutoSpawnEntities() {
  return !isDebugMode;
}

export function setDebugRuntimeActions(actions: DebugRuntimeActions) {
  runtimeActions = actions;
}

function runDebugAction(action: () => void) {
  if (!isDebugMode || !runtimeActions.canSpawn()) return;
  action();
  runtimeActions.publish();
}

function spawnDebugEnemy(kind: DebugEnemyKind) {
  const sheetIndex = DEBUG_ENEMY_SHEET_INDEX[kind];
  if (!ENEMY_SHEETS[sheetIndex]) return;
  runDebugAction(() => runtimeActions.spawnEnemySheet(sheetIndex, 1));
}

function spawnDebugPlatformSegment(kind: SegmentKind) {
  runDebugAction(() => runtimeActions.spawnPlatformSegment(kind));
}

function spawnDebugBoss() {
  runDebugAction(runtimeActions.spawnBoss);
}

export function DebugPanel() {
  const [enemyKind, setEnemyKind] = useState<DebugEnemyKind>("chaser");
  const [platformKind, setPlatformKind] = useState<SegmentKind>("safeBridge");

  if (!isDebugMode) return null;

  return (
    <div className="pointer-events-auto absolute right-2 top-2 z-30 w-[190px] max-w-[calc(100%-16px)] rounded-[6px] border border-[#70d7ff66] bg-[#07131ee6] p-2 text-left text-[10px] leading-none text-[#e7f8ff] shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
      <div className="mb-2 flex items-center justify-between border-b border-[#70d7ff33] pb-1">
        <span className="text-[9px] font-bold text-[#7fe8ff]">DEBUG</span>
        <span className="text-[8px] text-[#9fbfd0]">Auto off</span>
      </div>
      <label className="block text-[8px] text-[#9ed8ff]" htmlFor="debug-enemy-kind">Enemy</label>
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
        <button
          type="button"
          className="rounded-[4px] border border-[#88f3ff77] bg-[#12394a] px-2 py-1 text-[9px] font-bold text-[#e7fbff] active:translate-y-px"
          onClick={() => spawnDebugEnemy(enemyKind)}
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
      <button
        type="button"
        className="mt-2 w-full rounded-[4px] border border-[#ffcf7a99] bg-[#4a2b12] px-2 py-1.5 text-[9px] font-bold text-[#fff2c7] active:translate-y-px"
        onClick={spawnDebugBoss}
      >
        Spawn Boss
      </button>
    </div>
  );
}
