import type { CSSProperties } from "react";
import { resolveStaticAssetUrl } from "../assets/staticAssetUrl";
import type { Language } from "../i18n/language";
import { playerStatusName } from "../i18n/statusCopy";
import type { PlayerStatusId, PlayerStatusSnapshot } from "../types/game-state";
import {
  HUD_STATUS_BAR_GAP,
  HUD_STATUS_BAR_ICON_SIZE,
  HUD_STATUS_BAR_LEFT,
  HUD_STATUS_BAR_TOP,
  HUD_STATUS_PROGRESS_HEIGHT,
  HUD_STATUS_STACK_FONT_SIZE,
} from "./gameHudLayout";

type PlayerStatusTone = "buff" | "debuff";
type PlayerStatusIconPath =
  `assets/sprites/ui/status/semantic/${PlayerStatusTone}_${string}.png`;
type PlayerStatusPresentation = {
  icon: PlayerStatusIconPath;
  tone: PlayerStatusTone;
};
type BuffIcon = "attack" | "charge" | "combo" | "defense" | "energy" | "execute"
  | "knockback" | "lifeline" | "mobility" | "penetration" | "recovery" | "speed"
  | "ultimate";
type DebuffIcon = "damage" | "hazard" | "scramble" | "slow" | "stun";

function buff(icon: BuffIcon): PlayerStatusPresentation {
  return {
    icon: `assets/sprites/ui/status/semantic/buff_${icon}.png`,
    tone: "buff",
  };
}

function debuff(icon: DebuffIcon): PlayerStatusPresentation {
  return {
    icon: `assets/sprites/ui/status/semantic/debuff_${icon}.png`,
    tone: "debuff",
  };
}

export const PLAYER_STATUS_PRESENTATIONS = {
  line_projectile_knockback: buff("knockback"),
  close_arc_basic_crescent: buff("attack"),
  guard_counter_damage_reduction: buff("defense"),
  dash_reposition_move_speed: buff("speed"),
  vortex_control_double_jump: buff("mobility"),
  armor_break_shield_penetration: buff("penetration"),
  guard_counter: buff("defense"),
  moon_tide: buff("ultimate"),
  flow_blade_charge: buff("charge"),
  flow_blade_surge_hit_window: buff("energy"),
  flow_garb: buff("defense"),
  burst_blade_execute_zone: buff("execute"),
  burst_blade_execute_ready: buff("execute"),
  burst_garb_guard_ready: buff("lifeline"),
  burst_garb_escape_haste: buff("speed"),
  shadowstep_blade_charge: buff("charge"),
  shadowstep_blade_ready: buff("attack"),
  shadowstep_blade_quick_charge: buff("charge"),
  shadowstep_garb_moving_guard: buff("defense"),
  shadowstep_garb_hurt_haste: buff("speed"),
  shadowstep_talisman_ready: buff("energy"),
  shadowstep_talisman_cooldown: buff("recovery"),
  hunt_kill_chain: buff("combo"),
  hunt_blade_ready: buff("attack"),
  hunt_blade_water: buff("attack"),
  hunt_garb_haste: buff("speed"),
  hunt_garb_guard_ready: buff("defense"),
  risk_blade_low_hp: buff("attack"),
  risk_blade_skill_ready: buff("attack"),
  risk_garb_low_hp: buff("defense"),
  risk_garb_lifeline_ready: buff("lifeline"),
  risk_talisman_ready: buff("energy"),
  tempo_blade_chain: buff("combo"),
  tempo_garb_recovery: buff("recovery"),
  tempo_talisman_swap_ready: buff("energy"),
  spider_silk_slow: debuff("slow"),
  binder_talisman_slow: debuff("slow"),
  binder_talisman_damage: debuff("damage"),
  binder_talisman_key_scramble: debuff("scramble"),
  binder_talisman_stun: debuff("stun"),
  binder_talisman_stunned: debuff("stun"),
  lantern_ash_zone: debuff("hazard"),
} satisfies Record<PlayerStatusId, PlayerStatusPresentation>;

export const PLAYER_STATUS_ICON_PATHS = Object.fromEntries(
  (Object.entries(PLAYER_STATUS_PRESENTATIONS) as [
    PlayerStatusId,
    (typeof PLAYER_STATUS_PRESENTATIONS)[PlayerStatusId],
  ][]).map(([id, presentation]) => [id, presentation.icon]),
) as unknown as Record<PlayerStatusId, PlayerStatusIconPath>;

const FULL_CIRCLE_DEGREES = 360;
const PERCENT_SCALE = 100;
const TEMPO_BLADE_READY_ICON_PATH: PlayerStatusIconPath =
  "assets/sprites/ui/status/semantic/buff_attack.png";
export const PLAYER_STATUS_ICON_ASSETS = [
  ...new Set([...Object.values(PLAYER_STATUS_ICON_PATHS), TEMPO_BLADE_READY_ICON_PATH]),
];

function resolvePlayerStatusIcon(path: PlayerStatusIconPath) {
  return resolveStaticAssetUrl(path);
}

export const PLAYER_STATUS_ICON_SOURCES = Object.fromEntries(
  (Object.keys(PLAYER_STATUS_ICON_PATHS) as PlayerStatusId[]).map((id) => [
    id,
    resolvePlayerStatusIcon(PLAYER_STATUS_ICON_PATHS[id]),
  ]),
) as Record<PlayerStatusId, string>;
const TEMPO_BLADE_READY_ICON_SOURCE = resolvePlayerStatusIcon(TEMPO_BLADE_READY_ICON_PATH);

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
        "--player-status-gap": `${HUD_STATUS_BAR_GAP}px`,
        "--player-status-icon-size": `${HUD_STATUS_BAR_ICON_SIZE}px`,
        "--player-status-progress-height": `${HUD_STATUS_PROGRESS_HEIGHT}px`,
        "--player-status-stack-font-size": `${HUD_STATUS_STACK_FONT_SIZE}px`,
      } as CSSProperties}
    >
      {statuses.map((status) => {
        const presentation = PLAYER_STATUS_PRESENTATIONS[status.id];
        const remainingRatio = statusRemainingRatio(status);
        const progress = statusProgress(status);
        const name = playerStatusName(language, status.id);
        const ariaLabel = statusAriaLabel(language, name, status, remainingRatio, progress);
        return (
          <div
            key={status.id}
            className={presentation.tone === "debuff"
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
