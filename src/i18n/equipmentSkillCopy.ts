import { SKILL_IDS } from "../constants";
import type { EquipmentSkillRuleId } from "../systems/equipmentSkillRules";
import type { SkillId } from "../types/assets";
import type { EquipmentItemId } from "../types/game-state";
import type { Language } from "./language";

type RuleCopy = { name: string; description: string };

const RULE_COPY: Record<Language, Record<EquipmentSkillRuleId, RuleCopy>> = {
  "zh-CN": {
    mark: { name: "潮印", description: "流水刃：技能命中留下潮印；同招不刷新标记，换另一招命中才转化。" },
    sweep: { name: "异技扫潮", description: "不同技能命中标记，消耗它并沿当前朝向放出扫潮；每次施法最多一次。" },
    gather: { name: "鸣拍聚潮", description: "流水刃 × 鸣拍符：异技转化改为吞并附近标记，原地聚潮牵引，替代向前扫潮。" },
    rupture: { name: "破势裂潮", description: "破月刃：技能命中受控或破甲目标，留下延迟范围爆裂；每次施法最多一次。" },
    tideEye: { name: "踏影潮眼", description: "踏影衣：移动蓄势后，下次技能命中留下短暂牵引潮眼；潮眼本身不造成伤害。" },
    lingering: { name: "涟波续势", description: "涟波衣：潮印和控制衔接窗口持续更久；成功触发反应后短暂减伤。" },
    spread: { name: "连珠传印", description: "流水刃 × 连珠符：带标记的目标死亡时，把原招式标记传给附近两个未标记目标。" },
  },
  en: {
    mark: { name: "Tide Mark", description: "Flow Blade: skill hits leave a Tide Mark. The same skill cannot refresh it; another skill converts it." },
    sweep: { name: "Cross-Skill Sweep", description: "A different skill consumes a mark and sends a sweep in your current facing direction, once per cast." },
    gather: { name: "Beatcall Convergence", description: "Flow Blade × Beatcall: conversions consume nearby marks and form a stationary pulling surge, replacing the forward sweep." },
    rupture: { name: "Moonbreak Rupture", description: "Moonbreak Blade: skill hits on controlled or armor-broken targets leave a delayed area blast, once per cast." },
    tideEye: { name: "Shadowstep Tide Eye", description: "Shadowstep Garb: movement primes your next skill hit to leave a brief pulling eye. The eye deals no damage." },
    lingering: { name: "Ripple Sustain", description: "Ripple Garb: marks and control follow-up windows last longer; successful reactions briefly reduce incoming damage." },
    spread: { name: "Chainbead Relay", description: "Flow Blade × Chainbead: marked target deaths pass the original skill's mark to two nearby unmarked targets." },
  },
};

const ITEM_SUMMARY: Record<Language, Partial<Record<EquipmentItemId, string>>> = {
  "zh-CN": {
    flow_blade: "技能铺下潮印，换招命中转化为定向扫潮；普攻蓄势强化技能。",
    burst_blade: "技能命中受控或破甲目标，引发延迟范围爆裂；强化对低血 Boss 的伤害。",
    shadowstep_garb: "移动蓄势后，技能命中留下牵引潮眼；持续移动降低接触伤害。",
    flow_garb: "延长潮印和控制衔接窗口，触发反应后短暂减伤；释放技能提高移速。",
    hunt_talisman: "搭配流水刃，带标记目标死亡后向附近两目标传印；击杀同时恢复双能量。",
    tempo_talisman: "搭配流水刃，扫潮改为吞并附近标记的定点聚潮牵引；降低技能消耗。",
  },
  en: {
    flow_blade: "Skills mark targets; another skill converts marks into directional sweeps. Basics charge stronger skills.",
    burst_blade: "Skills rupture controlled or armor-broken targets after a delay. Deal more damage to low-HP Bosses.",
    shadowstep_garb: "Movement primes a pulling eye on your next skill hit. Keep moving to reduce contact damage.",
    flow_garb: "Marks and control windows last longer; reactions briefly guard you. Casting skills grants movement speed.",
    hunt_talisman: "With Flow Blade, marked deaths relay marks to two nearby targets. Kills restore skill and ultimate energy.",
    tempo_talisman: "With Flow Blade, conversions gather nearby marks into a pulling surge instead of a sweep. Skills cost less.",
  },
};

export function equipmentSkillRuleCopy(language: Language, rule: EquipmentSkillRuleId) {
  return RULE_COPY[language][rule];
}

export function equipmentSkillItemSummary(language: Language, itemId: EquipmentItemId) {
  return ITEM_SUMMARY[language][itemId];
}

export function equipmentSkillUsageCopy(language: Language, skillId: SkillId, rules: EquipmentSkillRuleId[]) {
  const zh = language === "zh-CN";
  const hasMarks = rules.includes("mark");
  const hasRupture = rules.includes("rupture");
  switch (skillId) {
    case SKILL_IDS.returningBlade:
      return hasMarks ? zh ? "回刃去回沿线铺标；移动换位后收刀，可衔接另一招转化。" : "Mark along the blade's outward and return paths; reposition before recall, then convert with another skill." : "";
    case SKILL_IDS.dashReposition:
      return hasMarks ? zh ? "潮闪穿过敌列铺标，再转身衔接下一招。" : "Dash through a line to mark targets, then turn into the next skill." : "";
    case SKILL_IDS.vortexControl:
      return hasRupture ? zh ? "回涡命中普通敌人即可控制并留下破裂；Boss 需破甲。" : "Vortex hits control normal enemies and trigger rupture immediately; Bosses require Armor Break." : "";
    case SKILL_IDS.verticalWave:
      return hasRupture ? zh ? "升浪命中普通敌人即可控制并留下破裂；Boss 需破甲。" : "Rising Tide hits control normal enemies and trigger rupture immediately; Bosses require Armor Break." : "";
    case SKILL_IDS.armorBreak:
      return hasRupture ? zh ? "破甲当次即可留下破裂，后续技能可继续利用破甲窗口。" : "Armor Break triggers rupture on impact; later skills can also exploit the armor-break window." : "";
    case SKILL_IDS.lineProjectile:
      return hasMarks ? zh ? "潮龙沿敌列铺标，再用另一招转化。" : "Breakthrough marks a line of enemies; convert those marks with another skill." : "";
    default:
      return hasMarks ? zh ? "用这招铺标或转化另一招的标记；聚敌让范围反应更集中。" : "Use this skill to mark or convert another skill's marks; grouping concentrates area reactions." : "";
  }
}
