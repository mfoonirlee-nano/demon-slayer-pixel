import type {
  EquipmentFamily,
  EquipmentItemId,
  EquipmentItemState,
  EquipmentSlot,
  EquipmentTier,
} from "../types/game-state";
import { EQUIPMENT_PRIMARY_STAT_BONUSES } from "./equipmentTuning";

type EquipmentBaseItem = {
  id: EquipmentItemId;
  name: string;
  slot: EquipmentSlot;
  family: EquipmentFamily;
};

type EquipmentTierEffect = {
  summary: string;
  tag: string;
  requiresUltimate?: boolean;
};

export const EQUIPMENT_FAMILY_LABELS: Record<EquipmentFamily, string> = {
  flow: "流水",
  burst: "破势",
  shadowstep: "影步",
  hunt: "狩猎",
  risk: "残心",
  tempo: "节奏",
};

export const EQUIPMENT_TIER_LABELS: Record<EquipmentTier, string> = {
  common: "普通",
  fine: "精良",
  awakened: "觉醒",
};

const EQUIPMENT_BASE_ITEMS: Record<EquipmentItemId, EquipmentBaseItem> = {
  flow_blade: { id: "flow_blade", name: "流水刃", slot: "blade", family: "flow" },
  flow_garb: { id: "flow_garb", name: "涟波衣", slot: "garb", family: "flow" },
  flow_talisman: { id: "flow_talisman", name: "潮声符", slot: "talisman", family: "flow" },
  burst_blade: { id: "burst_blade", name: "破月刃", slot: "blade", family: "burst" },
  burst_garb: { id: "burst_garb", name: "断月衣", slot: "garb", family: "burst" },
  burst_talisman: { id: "burst_talisman", name: "燃魂符", slot: "talisman", family: "burst" },
  shadowstep_blade: { id: "shadowstep_blade", name: "流影刃", slot: "blade", family: "shadowstep" },
  shadowstep_garb: { id: "shadowstep_garb", name: "踏影衣", slot: "garb", family: "shadowstep" },
  shadowstep_talisman: { id: "shadowstep_talisman", name: "掠影符", slot: "talisman", family: "shadowstep" },
  hunt_blade: { id: "hunt_blade", name: "狩牙刃", slot: "blade", family: "hunt" },
  hunt_garb: { id: "hunt_garb", name: "逐猎衣", slot: "garb", family: "hunt" },
  hunt_talisman: { id: "hunt_talisman", name: "连珠符", slot: "talisman", family: "hunt" },
  risk_blade: { id: "risk_blade", name: "残心刃", slot: "blade", family: "risk" },
  risk_garb: { id: "risk_garb", name: "赤纹衣", slot: "garb", family: "risk" },
  risk_talisman: { id: "risk_talisman", name: "返魂符", slot: "talisman", family: "risk" },
  tempo_blade: { id: "tempo_blade", name: "疾奏刃", slot: "blade", family: "tempo" },
  tempo_garb: { id: "tempo_garb", name: "迅风衣", slot: "garb", family: "tempo" },
  tempo_talisman: { id: "tempo_talisman", name: "鸣拍符", slot: "talisman", family: "tempo" },
};

const EQUIPMENT_TIER_EFFECTS: Record<EquipmentItemId, Record<EquipmentTier, EquipmentTierEffect>> = {
  flow_blade: {
    common: { summary: "普攻命中 4 次后，下一次技能伤害提高。", tag: "普攻蓄势" },
    fine: { summary: "普攻命中 3 次后，下一次技能伤害提高；强化技能命中返还技能能量。", tag: "涌流返能" },
    awakened: {
      summary: "普攻命中 3 次后强化下一次技能；强化技能命中 Boss 时额外获得大招能量。",
      tag: "涌流终式",
      requiresUltimate: true,
    },
  },
  flow_garb: {
    common: { summary: "释放技能后，短时间内移动速度提高。", tag: "释放机动" },
    fine: { summary: "释放技能后提高移动速度，并获得轻微受伤减免。", tag: "机动减伤" },
    awakened: { summary: "释放技能后获得移动速度和轻微减伤；强化技能命中多个目标会延长持续时间。", tag: "涌流续势" },
  },
  flow_talisman: {
    common: { summary: "技能命中 2 个以上目标时，返还少量技能能量。", tag: "命中返能" },
    fine: { summary: "技能命中 2 个以上目标时返还更多技能能量；命中 Boss 也计作有效命中。", tag: "精准返能" },
    awakened: {
      summary: "技能命中 3 个以上目标或命中 Boss 时返还技能能量，并额外获得大招能量。",
      tag: "潮声终式",
      requiresUltimate: true,
    },
  },
  burst_blade: {
    common: { summary: "Boss 生命低于 35% 时，对 Boss 伤害提高。", tag: "Boss 斩杀" },
    fine: { summary: "Boss 低血时伤害提高；首次进入斩杀线后，下一次普攻强化。", tag: "斩线强击" },
    awakened: {
      summary: "Boss 低血时伤害提高；大招命中低血 Boss 时追加一次斩击。",
      tag: "终式斩杀",
      requiresUltimate: true,
    },
  },
  burst_garb: {
    common: { summary: "每场 Boss 战第一次受到致命伤害时，保留 1 点生命并获得短暂无敌。", tag: "Boss 保命" },
    fine: { summary: "致命保护触发后，额外获得短暂移动速度提高。", tag: "保命脱离" },
    awakened: { summary: "致命保护触发后清除受击硬直，获得短暂无敌，并获得一格技能能量。", tag: "断月回势" },
  },
  burst_talisman: {
    common: {
      summary: "对 Boss 造成伤害时，短冷却额外获得少量大招能量。",
      tag: "大招循环",
      requiresUltimate: true,
    },
    fine: {
      summary: "对 Boss 造成伤害时获得大招能量；技能命中 Boss 时额外触发一次。",
      tag: "技能燃魂",
      requiresUltimate: true,
    },
    awakened: {
      summary: "对 Boss 造成伤害时获得大招能量；击杀 Boss 后保留部分大招能量进入下一幕。",
      tag: "燃魂保留",
      requiresUltimate: true,
    },
  },
  shadowstep_blade: {
    common: { summary: "连续移动一段距离后，下一次普攻范围略微扩大。", tag: "移动影斩" },
    fine: { summary: "连续移动后触发影斩；影斩范围扩大，并提高伤害。", tag: "影斩扩幅" },
    awakened: {
      summary: "影斩命中后短时间内更快积攒下一次影斩；影斩命中 Boss 时获得大招能量。",
      tag: "影斩终式",
      requiresUltimate: true,
    },
  },
  shadowstep_garb: {
    common: { summary: "连续移动时，受到接触伤害降低；停止移动后快速消失。", tag: "移动容错" },
    fine: { summary: "连续移动时受到接触伤害降低，并略微降低受伤击退。", tag: "穿梭减退" },
    awakened: { summary: "连续移动时获得减伤和击退减轻；移动中受伤后短时间提高移动速度。", tag: "受击疾走" },
  },
  shadowstep_talisman: {
    common: { summary: "从敌人附近经过后，短冷却获得少量技能能量。", tag: "穿梭返能" },
    fine: { summary: "从敌人附近经过后获得技能能量；附近敌人较多时额外返能。", tag: "群影返能" },
    awakened: {
      summary: "从敌人或 Boss 附近经过后获得技能能量；在 Boss 附近还会获得大招能量。",
      tag: "掠影终式",
      requiresUltimate: true,
    },
  },
  hunt_blade: {
    common: { summary: "短时间内连续击杀小怪后，下一次普攻范围扩大。", tag: "连杀强化" },
    fine: { summary: "连杀触发后，下一次普攻范围扩大并造成更高伤害。", tag: "水刃强击" },
    awakened: { summary: "连杀触发后，短时间内普攻周期性获得扩幅与额外伤害。", tag: "连猎水刃" },
  },
  hunt_garb: {
    common: { summary: "击杀小怪后，短时间内移动速度提高。", tag: "击杀机动" },
    fine: { summary: "击杀小怪后移动速度提高；连杀时持续时间刷新。", tag: "连杀疾行" },
    awakened: { summary: "连杀时移动速度提高，并获得下一次受伤减免。", tag: "猎势护身" },
  },
  hunt_talisman: {
    common: { summary: "短时间内连续击杀 3 个小怪后，获得技能能量。", tag: "连杀回能" },
    fine: {
      summary: "连杀 3 个小怪后，获得技能能量和少量大招能量。",
      tag: "连杀终能",
      requiresUltimate: true,
    },
    awakened: {
      summary: "连杀 3 个小怪后获得技能和大招能量；该冷却可被 Boss 击杀重置。",
      tag: "连珠重置",
      requiresUltimate: true,
    },
  },
  risk_blade: {
    common: { summary: "生命低于 35% 时，普攻伤害提高。", tag: "低血反击" },
    fine: { summary: "生命低于 35% 时，普攻和技能伤害提高。", tag: "低血技伤" },
    awakened: { summary: "生命低于 35% 时伤害提高；首次进入低血后，下一次技能额外强化。", tag: "残心强技" },
  },
  risk_garb: {
    common: { summary: "生命低于 35% 时，受到伤害降低。", tag: "低血容错" },
    fine: { summary: "生命低于 35% 时受到伤害降低，并增加受伤后的无敌时间。", tag: "低血无敌" },
    awakened: { summary: "每场 Boss 战首次进入低血时，清除受击硬直并获得短暂无敌。", tag: "赤纹护命" },
  },
  risk_talisman: {
    common: { summary: "每幕首次生命低于 35% 时，获得技能能量。", tag: "濒死资源" },
    fine: { summary: "每幕首次生命低于 35% 时，获得更多技能能量。", tag: "濒死回能" },
    awakened: {
      summary: "每幕首次生命低于 35% 时，至少补满一格技能能量，并获得部分大招能量。",
      tag: "返魂终能",
      requiresUltimate: true,
    },
  },
  tempo_blade: {
    common: { summary: "普攻动作更快，但单次普攻伤害略低。", tag: "高频普攻" },
    fine: { summary: "普攻动作进一步加快，单次伤害惩罚降低。", tag: "疾奏减罚" },
    awakened: { summary: "普攻动作加快；连续命中后，下一次普攻不受伤害惩罚。", tag: "连拍破拍" },
  },
  tempo_garb: {
    common: { summary: "受伤后的击退略微降低，更容易回到战斗节奏。", tag: "抗击退" },
    fine: { summary: "受伤后的击退降低，受伤后短时间移动速度提高。", tag: "受击回速" },
    awakened: { summary: "受伤后降低击退并提高移速；若短时间内没有再次受伤，获得技能能量。", tag: "稳拍返能" },
  },
  tempo_talisman: {
    common: { summary: "技能消耗略微降低，但大招能量获取略微降低。", tag: "低耗技能" },
    fine: { summary: "技能消耗进一步降低，大招能量获取惩罚降低。", tag: "轻耗节奏" },
    awakened: { summary: "技能消耗降至下限；连续释放不同技能时，返还部分技能能量。", tag: "换招返能" },
  },
};

export const EQUIPMENT_CHOICE_IDS: EquipmentItemId[] = [
  "flow_blade",
  "flow_garb",
  "flow_talisman",
  "burst_blade",
  "burst_garb",
  "burst_talisman",
  "shadowstep_blade",
  "shadowstep_garb",
  "shadowstep_talisman",
  "hunt_blade",
  "hunt_garb",
  "hunt_talisman",
  "risk_blade",
  "risk_garb",
  "risk_talisman",
  "tempo_blade",
  "tempo_garb",
  "tempo_talisman",
];

export const EQUIPMENT_IDS_BY_SLOT: Record<EquipmentSlot, EquipmentItemId[]> = {
  blade: ["flow_blade", "burst_blade", "shadowstep_blade", "hunt_blade", "risk_blade", "tempo_blade"],
  garb: ["flow_garb", "burst_garb", "shadowstep_garb", "hunt_garb", "risk_garb", "tempo_garb"],
  talisman: [
    "flow_talisman",
    "burst_talisman",
    "shadowstep_talisman",
    "hunt_talisman",
    "risk_talisman",
    "tempo_talisman",
  ],
};

export function equipmentItemForTier(itemId: EquipmentItemId, tier: EquipmentTier): EquipmentItemState {
  const base = EQUIPMENT_BASE_ITEMS[itemId];
  const effect = EQUIPMENT_TIER_EFFECTS[itemId][tier];
  const primaryStatBonus = EQUIPMENT_PRIMARY_STAT_BONUSES[base.slot][tier];
  return {
    ...base,
    tier,
    primaryStatBonus,
    summary: effect.summary,
    uiTags: [EQUIPMENT_TIER_LABELS[tier], effect.tag],
    requiresUltimate: effect.requiresUltimate,
  };
}

export function equipmentRequiresUltimate(itemId: EquipmentItemId, tier: EquipmentTier) {
  return EQUIPMENT_TIER_EFFECTS[itemId][tier].requiresUltimate === true;
}

export const EQUIPMENT_ITEMS: Record<EquipmentItemId, EquipmentItemState> = Object.fromEntries(
  EQUIPMENT_CHOICE_IDS.map((itemId) => [itemId, equipmentItemForTier(itemId, "common")]),
) as Record<EquipmentItemId, EquipmentItemState>;
