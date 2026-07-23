/// <reference types="vite/client" />
import type { CSSProperties } from "react";
import type { Language } from "../i18n/language";
import { playerStatusName } from "../i18n/statusCopy";
import type { PlayerStatusId, PlayerStatusSnapshot } from "../types/game-state";
import {
  HUD_STATUS_BAR_ICON_SIZE,
  HUD_STATUS_BAR_LEFT,
  HUD_STATUS_BAR_TOP,
} from "./gameHudLayout";

type PlayerStatusIconPath =
  | `assets/sprites/ui/status/${string}.png`
  | `assets/sprites/ui/equipment/${string}_icon.png`
  | `assets/sprites/skills/${string}/icon.png`;

const PLAYER_STATUS_ICON_URLS = import.meta.glob<string>(
  [
    "../../assets/sprites/ui/status/*.png",
    "../../assets/sprites/ui/equipment/*_icon.png",
    "../../assets/sprites/skills/*/icon.png",
  ],
  { eager: true, query: "?url", import: "default" },
);

export const PLAYER_STATUS_ICON_PATHS = {
  line_projectile_knockback: "assets/sprites/ui/status/line_projectile_passive_knockback.png",
  close_arc_basic_crescent: "assets/sprites/ui/status/close_arc_basic_attack_crescent.png",
  guard_counter_damage_reduction: "assets/sprites/skills/guard_counter/icon.png",
  dash_reposition_move_speed: "assets/sprites/skills/dash_reposition/icon.png",
  armor_break_shield_penetration: "assets/sprites/skills/armor_break/icon.png",
  guard_counter: "assets/sprites/skills/guard_counter/icon.png",
  moon_tide: "assets/sprites/skills/ultimate_skill/icon.png",
  flow_blade_charge: "assets/sprites/ui/equipment/flow_blade_icon.png",
  flow_blade_surge_hit_window: "assets/sprites/ui/status/flow_blade_surge_window.png",
  flow_garb: "assets/sprites/ui/equipment/flow_garb_icon.png",
  burst_blade_execute_zone: "assets/sprites/ui/equipment/burst_blade_icon.png",
  burst_blade_execute_ready: "assets/sprites/ui/status/burst_blade_execute_ready.png",
  burst_garb_guard_ready: "assets/sprites/ui/equipment/burst_garb_icon.png",
  burst_garb_escape_haste: "assets/sprites/ui/status/burst_garb_escape_haste.png",
  shadowstep_blade_charge: "assets/sprites/ui/equipment/shadowstep_blade_icon.png",
  shadowstep_blade_ready: "assets/sprites/ui/equipment/shadowstep_blade_icon.png",
  shadowstep_blade_quick_charge: "assets/sprites/ui/status/shadowstep_blade_quick_charge.png",
  shadowstep_garb_moving_guard: "assets/sprites/ui/equipment/shadowstep_garb_icon.png",
  shadowstep_garb_hurt_haste: "assets/sprites/ui/status/shadowstep_garb_hurt_haste.png",
  hunt_kill_chain: "assets/sprites/ui/status/hunt_chain.png",
  hunt_blade_ready: "assets/sprites/ui/equipment/hunt_blade_icon.png",
  hunt_blade_water: "assets/sprites/ui/status/hunt_blade_waterblade.png",
  hunt_garb_haste: "assets/sprites/ui/equipment/hunt_garb_icon.png",
  hunt_garb_guard_ready: "assets/sprites/ui/status/hunt_garb_guard_ready.png",
  risk_blade_low_hp: "assets/sprites/ui/equipment/risk_blade_icon.png",
  risk_blade_skill_ready: "assets/sprites/ui/status/risk_blade_skill_ready.png",
  risk_garb_low_hp: "assets/sprites/ui/equipment/risk_garb_icon.png",
  risk_garb_lifeline_ready: "assets/sprites/ui/status/risk_garb_lifeline_ready.png",
  risk_talisman_ready: "assets/sprites/ui/equipment/risk_talisman_icon.png",
  tempo_blade_chain: "assets/sprites/ui/equipment/tempo_blade_icon.png",
  tempo_garb_recovery: "assets/sprites/ui/status/tempo_garb_recovery_haste.png",
  tempo_talisman_swap_ready: "assets/sprites/ui/equipment/tempo_talisman_icon.png",
  spider_silk_slow: "assets/sprites/ui/status/spider_silk_slow.png",
  binder_talisman_slow: "assets/sprites/ui/status/binder_talisman_slow.png",
  binder_talisman_damage: "assets/sprites/ui/status/binder_talisman_damage.png",
  binder_talisman_key_scramble: "assets/sprites/ui/status/binder_talisman_key_scramble.png",
  binder_talisman_stun: "assets/sprites/ui/status/binder_talisman_stun.png",
  binder_talisman_stunned: "assets/sprites/ui/status/binder_talisman_stunned.png",
  lantern_ash_zone: "assets/sprites/ui/status/lantern_ash_slow.png",
} satisfies Record<PlayerStatusId, PlayerStatusIconPath>;

const FULL_CIRCLE_DEGREES = 360;
const PERCENT_SCALE = 100;
const TEMPO_BLADE_READY_ICON_PATH: PlayerStatusIconPath =
  "assets/sprites/ui/status/tempo_blade_full_power_ready.png";
export const PLAYER_STATUS_ICON_ASSETS = [
  ...new Set([...Object.values(PLAYER_STATUS_ICON_PATHS), TEMPO_BLADE_READY_ICON_PATH]),
];

function resolvePlayerStatusIcon(path: PlayerStatusIconPath) {
  const source = PLAYER_STATUS_ICON_URLS[`../../${path}`];
  if (source === undefined) throw new Error(`Missing player status icon: ${path}`);
  return source;
}

export const PLAYER_STATUS_ICON_SOURCES = Object.fromEntries(
  (Object.keys(PLAYER_STATUS_ICON_PATHS) as PlayerStatusId[]).map((id) => [
    id,
    resolvePlayerStatusIcon(PLAYER_STATUS_ICON_PATHS[id]),
  ]),
) as Record<PlayerStatusId, string>;
const TEMPO_BLADE_READY_ICON_SOURCE = resolvePlayerStatusIcon(TEMPO_BLADE_READY_ICON_PATH);
const DEBUFF_STATUS_IDS = new Set<PlayerStatusId>([
  "spider_silk_slow",
  "binder_talisman_slow",
  "binder_talisman_damage",
  "binder_talisman_key_scramble",
  "binder_talisman_stun",
  "binder_talisman_stunned",
  "lantern_ash_zone",
]);

export function statusRemainingRatio(status: PlayerStatusSnapshot) {
  if (status.remainingFrames === null || status.durationFrames === null) return null;
  if (status.durationFrames <= 0) return 0;
  return Math.max(0, Math.min(1, status.remainingFrames / status.durationFrames));
}

function statusProgress(status: PlayerStatusSnapshot) {
  if (status.progress === undefined) return null;
  return Math.max(0, Math.min(1, status.progress));
}

function statusIconSource(status: PlayerStatusSnapshot) {
  if (
    status.id === "tempo_blade_chain"
    && status.maxStacks !== undefined
    && status.stacks === status.maxStacks
  ) {
    return TEMPO_BLADE_READY_ICON_SOURCE;
  }
  return PLAYER_STATUS_ICON_SOURCES[status.id];
}

function statusAriaLabel(
  language: Language,
  name: string,
  status: PlayerStatusSnapshot,
  remainingRatio: number | null,
  progress: number | null,
) {
  const details: string[] = [];
  if (status.stacks !== undefined) {
    const stackValue = status.maxStacks === undefined
      ? `${status.stacks}`
      : `${status.stacks}/${status.maxStacks}`;
    details.push(language === "en" ? `${stackValue} stacks` : `${stackValue} 层`);
  }
  if (remainingRatio !== null) {
    const remainingPercent = Math.round(remainingRatio * PERCENT_SCALE);
    details.push(language === "en" ? `${remainingPercent}% remaining` : `剩余 ${remainingPercent}%`);
  }
  if (progress !== null) {
    const progressPercent = Math.round(progress * PERCENT_SCALE);
    details.push(language === "en" ? `${progressPercent}% charged` : `蓄势 ${progressPercent}%`);
  }
  const separator = language === "en" ? ", " : "，";
  return details.length > 0 ? `${name}${separator}${details.join(separator)}` : name;
}

export function PlayerStatusBar({
  statuses,
  language,
  width,
}: {
  statuses: PlayerStatusSnapshot[];
  language: Language;
  width: number;
}) {
  if (statuses.length === 0) return null;

  return (
    <div
      className="player-status-bar"
      role="list"
      aria-label={language === "en" ? "Active status effects" : "当前状态效果"}
      style={{
        width,
        left: HUD_STATUS_BAR_LEFT,
        top: HUD_STATUS_BAR_TOP,
        "--player-status-icon-size": `${HUD_STATUS_BAR_ICON_SIZE}px`,
      } as CSSProperties}
    >
      {statuses.map((status) => {
        const remainingRatio = statusRemainingRatio(status);
        const progress = statusProgress(status);
        const name = playerStatusName(language, status.id);
        const ariaLabel = statusAriaLabel(language, name, status, remainingRatio, progress);
        return (
          <div
            key={status.id}
            className={DEBUFF_STATUS_IDS.has(status.id)
              ? "player-status-icon player-status-icon--debuff"
              : "player-status-icon"}
            role="listitem"
            aria-label={ariaLabel}
            title={ariaLabel}
          >
            <img src={statusIconSource(status)} alt="" draggable={false} />
            {remainingRatio === null ? null : (
              <span
                className="player-status-duration-mask"
                aria-hidden="true"
                style={{
                  "--player-status-remaining-angle": `${remainingRatio * FULL_CIRCLE_DEGREES}deg`,
                } as CSSProperties}
              />
            )}
            {status.stacks === undefined ? null : (
              <span className="player-status-stacks" aria-hidden="true">{status.stacks}</span>
            )}
            {progress === null ? null : (
              <span className="player-status-progress" aria-hidden="true">
                <span style={{ width: `${progress * PERCENT_SCALE}%` }} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
