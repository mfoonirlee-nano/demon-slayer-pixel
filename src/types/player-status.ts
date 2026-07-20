export type PlayerStatusId =
  | "line_projectile_knockback"
  | "close_arc_basic_crescent"
  | "guard_counter"
  | "moon_tide"
  | "flow_blade_charge"
  | "flow_blade_surge_hit_window"
  | "flow_garb"
  | "burst_blade_execute_zone"
  | "burst_blade_execute_ready"
  | "burst_garb_guard_ready"
  | "burst_garb_escape_haste"
  | "shadowstep_blade_charge"
  | "shadowstep_blade_ready"
  | "shadowstep_blade_quick_charge"
  | "shadowstep_garb_moving_guard"
  | "shadowstep_garb_hurt_haste"
  | "hunt_kill_chain"
  | "hunt_blade_ready"
  | "hunt_blade_water"
  | "hunt_garb_haste"
  | "hunt_garb_guard_ready"
  | "risk_blade_low_hp"
  | "risk_blade_skill_ready"
  | "risk_garb_low_hp"
  | "risk_garb_lifeline_ready"
  | "risk_talisman_ready"
  | "tempo_blade_chain"
  | "tempo_garb_recovery"
  | "tempo_talisman_swap_ready"
  | "spider_silk_slow"
  | "binder_talisman_slow"
  | "binder_talisman_damage"
  | "binder_talisman_key_scramble"
  | "binder_talisman_stun"
  | "binder_talisman_stunned"
  | "lantern_ash_zone";

export type PlayerStatusSnapshot = {
  id: PlayerStatusId;
  remainingFrames: number | null;
  durationFrames: number | null;
  stacks?: number;
  maxStacks?: number;
  progress?: number;
};
