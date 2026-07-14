import type { EquipmentItemId, EquipmentTier } from "../types/game-state";

export const EQUIPMENT_PRIMARY_STAT_BONUS_RATIOS: Record<
  EquipmentItemId,
  Record<EquipmentTier, number>
> = {
  flow_blade: { common: 0.12, fine: 0.25, awakened: 0.38 },
  burst_blade: { common: 0.14, fine: 0.27, awakened: 0.4 },
  shadowstep_blade: { common: 0.11, fine: 0.24, awakened: 0.37 },
  hunt_blade: { common: 0.13, fine: 0.26, awakened: 0.39 },
  risk_blade: { common: 0.15, fine: 0.28, awakened: 0.41 },
  tempo_blade: { common: 0.1, fine: 0.23, awakened: 0.36 },
  flow_garb: { common: 0.1, fine: 0.2, awakened: 0.3 },
  burst_garb: { common: 0.12, fine: 0.22, awakened: 0.32 },
  shadowstep_garb: { common: 0.09, fine: 0.19, awakened: 0.29 },
  hunt_garb: { common: 0.11, fine: 0.21, awakened: 0.31 },
  risk_garb: { common: 0.13, fine: 0.23, awakened: 0.33 },
  tempo_garb: { common: 0.08, fine: 0.18, awakened: 0.28 },
  flow_talisman: { common: 0.11, fine: 0.22, awakened: 0.35 },
  burst_talisman: { common: 0.1, fine: 0.21, awakened: 0.34 },
  shadowstep_talisman: { common: 0.12, fine: 0.23, awakened: 0.36 },
  hunt_talisman: { common: 0.13, fine: 0.24, awakened: 0.37 },
  risk_talisman: { common: 0.14, fine: 0.25, awakened: 0.38 },
  tempo_talisman: { common: 0.09, fine: 0.2, awakened: 0.33 },
};
