# 装备系统

> 实现状态：目标设计，未实现。当前源码没有装备槽位、装备掉落或装备属性派生。

## Purpose

定义第一版装备系统的完整设计：装备不是静态属性堆叠，而是单局内的构筑规则。玩家通过 Boss 掉落三选一获得装备，在 `blade`、`garb`、`talisman` 三个槽位中替换构筑方向，让同一套基础动作在不同局内形成不同打法。

## Design Principles

1. 装备优先改变打法，其次才提供数值。
2. 每件装备都应鼓励一种主动行为，例如连续命中、贴近穿梭、连杀、低血反击或频繁释放。
3. 三个槽位分别负责输出方式、生存节奏、资源循环。
4. 装备按流派标签组织，同流派有软协同，但不做硬套装。
5. 品质提升主要改变机制完整度，数值只是辅助。
6. 装备是单局内奖励，死亡、重开或返回开始界面后清空。
7. 第一版不做局外养成、强化、随机词缀、套装收集和正式图标依赖。

## Core Loop

```text
Boss 击杀
  ↓
生成 3 个装备候选
  ↓
玩家选择 1 件
  ↓
进入对应槽位，替换同槽位旧装备
  ↓
改变当前局内打法
  ↓
继续推进下一幕和下一轮 Boss
```

Boss 装备选择和经验升级选择必须使用不同队列，不能互相覆盖。如果同一帧同时触发多个奖励选择，优先级建议为：Boss 装备选择 > 经验升级选择 > 普通即时奖励。

## Slots

旧命名 `weapon / haori / charm` 不再作为设计用语使用，避免过分贴近特定作品设定。新命名如下：

| 槽位 ID | 中文 UI | 定位 | 设计边界 |
| --- | --- | --- | --- |
| `blade` | 刃器 | 输出方式：普攻、技能、Boss 爆发、特殊攻击触发 | 不直接提供主要生存收益 |
| `garb` | 衣装 | 生存节奏：移动容错、低血保护、受伤后恢复节奏 | 不直接成为主要伤害来源 |
| `talisman` | 饰符 | 资源循环：技能能量、大招能量、释放频率、触发返还 | 不直接提供大量攻击或生命 |

推荐状态：

```ts
equipment: {
  blade?: EquipmentItem;
  garb?: EquipmentItem;
  talisman?: EquipmentItem;
};
pendingEquipmentChoices: EquipmentItem[];
```

## Families

第一版装备池由 6 个流派组成，每个流派 3 件装备，分别对应 3 个槽位，共 18 件。

| 流派 ID | 中文名 | 核心体验 | 主动行为 |
| --- | --- | --- | --- |
| `flow` | 流水系 | 普攻与技能循环 | 普攻积攒节奏，释放强化技能 |
| `burst` | 破势系 | Boss 爆发与斩杀 | 抓 Boss 窗口，集中输出 |
| `shadowstep` | 影步系 | 位移穿梭与机动收益 | 移动、换位、贴近危险区域 |
| `hunt` | 狩猎系 | 连杀清怪与地图压制 | 快速击杀小怪，滚动收益 |
| `risk` | 残心系 | 低血反杀与高风险收益 | 控制危险血线，打开反击窗口 |
| `tempo` | 节奏系 | 释放频率与冷却变化 | 高频命中、快速释放、节奏压制 |

## Tier Rules

装备品质随 `actBand` 提升。后期装备必须比前期更完整，否则替换式构筑没有意义。

| 品质 ID | 中文名 | 掉落幕段 | 机制定位 |
| --- | --- | --- | --- |
| `common` | 普通 | intro 1-6 | 给出核心机制，数值保守 |
| `fine` | 精良 | awakened 7-12 | 降低触发门槛，增加稳定性 |
| `awakened` | 觉醒 | final 13 | 增加额外行为反馈或终局效果 |

```ts
function equipmentTier(actBand: ActBand): EquipmentTier {
  return actBand === "final"
    ? "awakened"
    : actBand === "awakened"
      ? "fine"
      : "common";
}
```

品质设计原则：

- 普通：让玩家知道这件装备鼓励什么行为。
- 精良：让该行为更容易触发，或收益更稳定。
- 觉醒：加入一个能改变体验的额外效果，但不改变槽位职责。

## Equipment Data Model

推荐配置结构：

```ts
type EquipmentSlot = "blade" | "garb" | "talisman";
type EquipmentFamily = "flow" | "burst" | "shadowstep" | "hunt" | "risk" | "tempo";
type EquipmentTier = "common" | "fine" | "awakened";

interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  family: EquipmentFamily;
  tier: EquipmentTier;
  summary: string;
  effects: EquipmentEffect[];
  uiTags: string[];
}
```

装备效果不要直接散落在多个战斗分支里。实现时应通过统一 helper 聚合：

```ts
getEquipmentEffects(equipment)
getEquipmentDerivedStats(equipment)
applyEquipmentTrigger(event, state)
```

## Equipment Pool

详细装备池已拆至 [equipment-pool.md](./equipment-pool.md)，包括 6 个流派、18 件装备和普通、精良、觉醒三档效果。

## Soft Synergy

不做传统套装，不出现“集齐 3 件同系装备后获得巨大固定加成”。同流派只提供轻量软协同，目的是鼓励而不是强迫。

推荐规则：

```ts
familyCount = countEquipmentByFamily(equipment, family);
```

| 同流派数量 | 效果方向 |
| ---: | --- |
| 1 | 只有装备自身效果 |
| 2 | 该流派触发型效果的冷却略微降低，或触发门槛略微降低 |
| 3 | 该流派核心效果获得轻量额外反馈，例如少量能量、短暂移速或一次性强化 |

软协同限制：

- 不提供直接大额攻击、生命或减伤。
- 不改变槽位职责。
- 不让混搭变成错误选择。
- UI 中只显示“同系共鸣：轻微增强”，避免玩家误以为必须凑套。

## Drop Rules

Boss 击杀后生成 3 个装备选项。候选项应构成一个选择题，而不是 3 个随机数值。

### Candidate Intent

每次三选一优先包含：

1. 强化已有路线：给出当前已有流派的另一个槽位，或更高品质替换。
2. 补足短板：根据玩家当前状态给出生存、资源或输出方向。
3. 改变打法：给出不同流派的强选项，允许转型。

示例：

```text
当前装备：流水刃 + 连珠符
下一次 Boss 掉落：
- 涟波衣：强化流水路线
- 踏影衣：补足移动生存
- 破月刃：转向 Boss 爆发
```

### Slot Rules

- 候选数量固定为 3。
- 同一次候选中尽量不出现 3 件同槽位装备。
- 如果玩家某槽位为空，候选中至少 1 件优先来自空槽位。
- 同槽位装备允许替换旧装备。
- 当前已装备的同 ID 低品质版本不再出现。
- 觉醒品质只在 final 幕段出现。
- 未配置完整效果或没有 UI 文案的装备不进入掉落池。

### Family Weighting

基础权重：6 个流派均等。

动态修正建议：

| 情况 | 权重倾向 |
| --- | --- |
| 玩家已有某流派 1 件 | 该流派 + 中等权重，鼓励形成方向 |
| 玩家已有某流派 2 件 | 该流派 + 小权重，避免强迫凑满 |
| 玩家生命长期偏低 | `risk`、`shadowstep`、`burst_garb` 倾向提高 |
| 玩家技能能量长期溢出 | `flow`、`tempo` 倾向降低 |
| Boss 战耗时过长 | `burst` 倾向提高 |
| 小怪击杀压力过大 | `hunt`、`shadowstep` 倾向提高 |

第一版实现可以先用规则化候选，不必做复杂权重模型。

## Boss Archetype Preference

Boss archetype 可以轻微影响掉落池，但不能完全锁死装备。建议每个 Boss 偏好 2-3 个流派。

| Boss archetype | 偏好流派 | 说明 |
| --- | --- | --- |
| `spider-string` | `shadowstep` / `hunt` / `flow` | 需要穿梭和清怪 |
| `lantern-ember` | `burst` / `risk` / `tempo` | 高压窗口与爆发节奏 |
| `mirror-dream` | `flow` / `shadowstep` / `tempo` | 位移、节奏、技能释放判断 |
| `fang-gale` | `shadowstep` / `tempo` / `hunt` | 高速移动与追击压制 |
| `mist-bone` | `risk` / `burst` / `shadowstep` | 危险血线与穿插机会 |
| `dead-bell` | `burst` / `flow` / `risk` | Boss 爆发与反击窗口 |
| `blood-moon-many-faces` | 全流派 | 终局 Boss 开放觉醒选择 |

## Derived Stats And Formulas

装备设计虽然以机制为主，但仍需要统一数值派生，避免在不同伤害分支手写重复倍率。

动态攻击上限建议：

```ts
attackBonusCap = 24 + bossKills * 8 + equipmentCapBonus;
```

派生攻击：

```ts
totalAttack = baseAttack + min(attackBonus, attackBonusCap) + equipmentAttackFlat;
```

技能消耗：

```ts
skillEnergyCost = clamp(30 - equipmentSkillCostReduction, 24, 30);
```

装备效果应被拆为两类：

| 类型 | 示例 | 处理方式 |
| --- | --- | --- |
| 派生属性 | 攻击、减伤、技能消耗、移速、受伤无敌帧 | 每帧或结算时统一读取 helper |
| 触发效果 | 连杀、低血、影斩、Boss 斩杀、大招保留 | 通过事件系统或状态机处理 |

## Balance Boundaries

具体数值后续可以调，但第一版设计应遵守边界：

| 项 | 设计边界 |
| --- | --- |
| 装备直接攻击 | 只作为少量辅助，不作为主要差异 |
| 装备直接最大生命 | 只出现在少数衣装，不能让生存流无脑站桩 |
| 减伤 | 优先绑定条件，例如移动中、低血、Boss 战，而不是常驻 |
| 技能消耗降低 | 最低消耗不低于 24 |
| 大招能量获取 | 必须有触发条件或冷却，不能无条件高速增长 |
| 低血收益 | 必须有阈值、每幕限制或冷却 |
| 连杀收益 | 必须有时间窗口，避免离线式累计 |
| 影步收益 | 必须要求真实移动或贴近风险，不能原地刷触发 |

## UI Rules

装备卡片必须让玩家快速理解三件事：

1. 它属于哪个槽位。
2. 它属于哪个流派。
3. 它希望玩家怎么打。

推荐卡片格式：

```text
流影刃
刃器 / 影步系 / 精良

移动一段距离后，下一次普攻变为影斩。
影斩范围扩大，并对小怪造成额外伤害。

替换：当前刃器「流水刃」
```

UI 标签示例：

| 流派 | 标签 |
| --- | --- |
| 流水 | 技能循环 / 普攻蓄势 |
| 破势 | Boss 爆发 / 斩杀 |
| 影步 | 移动收益 / 穿梭 |
| 狩猎 | 连杀 / 清怪 |
| 残心 | 低血 / 反击 |
| 节奏 | 高频 / 冷却 |

## Replacement Rules

- 玩家选择装备后进入对应槽位。
- 如果槽位为空，直接装备。
- 如果槽位已有装备，新装备替换旧装备。
- 替换时 UI 必须显示旧装备名和新装备槽位。
- 如果替换影响最大生命，需要重新夹取当前生命。
- 替换时清除旧装备提供的持续状态，例如影斩层数、连杀触发状态、低血每幕触发标记。
- 已经发生的即时收益不回滚，例如装备触发时已经获得的技能能量不扣回。

## Acceptance Criteria

设计验收：

- 三槽位命名统一使用 `blade / garb / talisman`。
- 18 件装备都能对应一个明确流派和主动行为。
- 每个流派都有输出、生存、资源三件装备。
- 每件装备有普通、精良、觉醒三档机制描述。
- 影步系替代原守势方向，强调移动穿梭而非被动防御。
- 掉落三选一能表达“强化已有路线 / 补足短板 / 改变打法”。
- 同流派有软协同，但没有硬套装。
- 所有装备都能在无正式图标的情况下用 UI 文案表达。

实现验收：

- Boss 死亡后出现 3 个装备选项。
- 选择装备后进入正确槽位。
- 同槽位装备会替换旧装备。
- 重开或死亡后装备清空。
- 装备选择不会覆盖经验升级选择。
- 替换最大生命相关装备时当前生命被正确夹取。
- 触发型装备不会在原地或无风险状态下无限刷收益。

## Code Sources

目标落地点：

- `src/types/game-state.ts`
- `src/state.ts`
- `src/entities/player.ts`
- `src/entities/enemy.ts`
- `src/entities/boss.ts`
- `src/entities/projectile.ts`
- `src/App.tsx`

## Implementation Notes

- 第一版先实现配置、状态、掉落、选择 UI 和少数核心触发事件。
- 不要把 18 件装备一次性写成大量特殊分支，应优先抽象触发条件和效果处理。
- 建议优先实现 3 个垂直切片：`flow_blade`、`shadowstep_blade`、`hunt_talisman`，验证触发、UI、替换和派生流程。
- 装备没有正式图标时不接图标占位，先用卡片标题、槽位、流派、品质、效果文案表达。
