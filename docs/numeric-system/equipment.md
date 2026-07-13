# 装备系统

> 实现状态：第一版已接入。当前源码实现了 18 件普通品质装备、Boss 三选一、三槽位换装和暂停页展示；精良/觉醒品质、单局升品、13+ 觉醒掉落和无限关卡前置规则仍是目标设计。

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
生成最多 3 个装备候选
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

## Slot Base Stats

每件装备在保留原有机制的同时，按槽位和当前品质提供一项固定基础属性。不同流派的同槽位装备使用相同数值，不额外叠加同一装备的低品质数值。

| 槽位 | 普通 | 精良 | 觉醒 |
| --- | ---: | ---: | ---: |
| `blade` | 攻击力 `+2` | 攻击力 `+4` | 攻击力 `+6` |
| `garb` | 最大生命 `+10` | 最大生命 `+20` | 最大生命 `+30` |
| `talisman` | 技能能量上限 `+10` | 技能能量上限 `+20` | 技能能量上限 `+30` |

等级成长先计算当前等级的基础攻击、最大生命和技能能量上限，再叠加当前装备的槽位基础属性；装备不会覆盖或写回等级成长值。换装、升品或降品后立即按新装备重算，当前生命和技能能量分别夹取到新的最大生命和技能能量上限。死亡、重开或返回开始界面清空装备时，这些基础属性也一并清除。

推荐状态：

```ts
equipment: {
  inventory: EquipmentInventoryEntry[];
  equipped: Record<EquipmentSlot, EquipmentItemId | null>;
  pendingChoices: EquipmentChoice[];
};

type EquipmentInventoryEntry = {
  id: EquipmentItemId;
  tier: EquipmentTier;
};

type EquipmentChoice = {
  id: EquipmentItemId;
  tier: EquipmentTier;
  previousTier: EquipmentTier | null;
  reason: "new" | "tierUpgrade" | "replacement";
};
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
| `awakened` | 觉醒 | final 13+ | 增加额外行为反馈或终局效果 |

```ts
function equipmentTier(actBand: ActBand): EquipmentTier {
  return actBand === "final" ? "awakened" : actBand === "awakened" ? "fine" : "common";
}
```

品质设计原则：

- 普通：让玩家知道这件装备鼓励什么行为。
- 精良：让该行为更容易触发，或收益更稳定。
- 觉醒：加入一个能改变体验的额外效果，但不改变槽位职责。
- 除固定槽位基础属性外，品质提升以机制完整度为主，数值只作为门槛、冷却、稳定性的辅助调参。
- 高品质包含低品质的核心玩法，但实现时按当前 `tier` 产出一份完整效果，不叠加多个品质效果对象。
- 最高品质在装备 UI 中显示为“觉醒”；“蚀醒”只用于 Boss 或敌方状态。

## Quality Upgrade Flow

品质提升仍然只通过 Boss 装备奖励进入，不加入材料、强化石、暂停页主动强化或局外养成。

```text
Boss 击杀
  ↓
按当前幕段生成装备候选及固定 tier
  ↓
玩家选择 1 件
  ↓
背包同 ID 记录被新高品质覆盖
  ↓
选择项自动装备到对应槽位
  ↓
该槽位旧运行时状态清零
```

品质与装备 ID 分离。同一件装备保持稳定 ID，例如 `flow_blade` 始终表示“流水刃”；背包记录该 ID 在本局内获得的最高品质。`equippedEquipment` 只保存槽位里的 `EquipmentItemId | null`，实际品质从背包最高品质读取。

背包规则：

- 背包里同一 `EquipmentItemId` 只保留一条记录。
- 获得同 ID 更高品质时，覆盖旧品质。
- 相同或更低品质不会进入候选。
- 普通可以直接升到觉醒；精良不是必经步骤。
- 品质记录和装备一样都是单局状态，死亡、重开或返回开始界面后清空。

掉落品质：

```text
Act 1-6: common
Act 7-12: fine
Act 13+: awakened
```

后期首次获得某件装备时，也直接获得当前幕段品质。这样玩家在精良或觉醒阶段转流派时不会被迫从低品质补课。

升品不会保留该槽位运行时层数、冷却或 ready 状态。选择高品质同 ID 装备视为一次重新装备，例如 `flow_blade` 普通的普攻命中层数在升到精良后清零。

### Ultimate Dependency

当前品质效果如果包含大招能量获取、大招命中、大招保留或大招期间收益，需要显式标记 `requiresUltimate: true`。玩家尚未习得大招时，这类候选不进入掉落池。

过滤规则按“当前品质”判断，而不是按整件装备判断：

```text
流水刃普通/精良不依赖大招，可以掉落。
流水刃觉醒含大招能量收益，未习得大招时不掉落。
燃魂符普通起就依赖大招，未习得大招时所有品质都不掉落。
```

被 `requiresUltimate` 过滤后不降级 fallback，也不提供相同 ID 的低品质重复卡。升品保底会跳过不可用候选，继续尝试其他已装备装备。

### Final Boss And Endless Bridge

目标长期规则：第 13 幕最终 Boss 击败后直接进入觉醒装备三选一，选择后进入 14+ 无限关卡。

当前版本尚未实现无限关卡时，先接入可验证的过渡行为：

```text
击败 blood-moon-many-faces
  ↓
如果有觉醒装备候选，弹觉醒装备选择
  ↓
玩家选择后写入背包并自动装备
  ↓
进入 victory
```

如果第 13 幕最终 Boss 击败时没有觉醒装备候选，则跳过装备 overlay，进入 victory。

最终 Boss 后不再展示经验升级三选一。当前版本可以丢弃最终 Boss XP 触发但尚未展示的 `pendingUpgradeChoices`；未来接入 14+ 无限关卡后，再改为“觉醒装备选择 -> 经验升级选择 -> 无限关卡”。

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

Boss 击杀后优先生成最多 3 个装备选项。候选项应构成一个选择题，而不是 3 个随机数值。有效候选不足时可以少于 3 张。

### Candidate Intent

每次三选一优先包含：

1. 强化已有路线：最多 1 张当前已装备装备的更高品质卡。
2. 补足短板：如果存在空槽，尽量保留 1 张空槽装备卡。
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

- 候选数量最多为 3。
- 有效装备候选充足时显示 3 张；只有 1-2 个有效候选时，只显示 1-2 张装备卡。
- 有效装备候选为 0 时，不打开装备 overlay，改发无候选占位奖励。
- 同一次候选优先覆盖 `blade / garb / talisman` 三个槽位，不足时才允许重复槽位。
- 如果玩家某槽位为空，候选中尽量保留 1 件空槽装备。
- 同槽位装备允许替换旧装备。
- 当前已拥有的同 ID 相同或低品质版本不再出现。
- 当前已装备的同 ID 更高品质版本可以出现，并优先作为升品保底。
- 觉醒品质只在 `act >= 13` 出现。
- 未配置完整效果、没有 UI 文案、未通过基础测试或被 `requiresUltimate` 过滤的品质不进入掉落池。

无候选占位奖励：

```ts
heal = Math.ceil(player.maxHp * 0.2);
player.hp = Math.min(player.maxHp, player.hp + heal);
```

这个治疗只用于避免 Boss 奖励完全空掉，不作为无限关卡平衡系统。后续如果有正式无限奖励系统，可以替换该占位。

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

第一版品质实现使用规则化候选，不接 Boss 偏好权重，也不做复杂权重模型。

## Future Boss Archetype Preference

Boss archetype 后续可以轻微影响普通候选池，但不能影响升品保底，也不能完全锁死装备。第一版品质实现不启用该规则。

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
totalAttack = baseAttack + min(attackBonus, attackBonusCap);
```

装备基础属性：

```ts
equipmentAttackFlat = blade ? { common: 2, fine: 4, awakened: 6 }[blade.tier] : 0;
equipmentMaxHpFlat = garb ? { common: 10, fine: 20, awakened: 30 }[garb.tier] : 0;
equipmentSkillEnergyMaxFlat = talisman ? { common: 10, fine: 20, awakened: 30 }[talisman.tier] : 0;

baseAttack = baseAttackForLevel(runLevel) + equipmentAttackFlat;
maxHp = maxHpForLevel(runLevel) + equipmentMaxHpFlat;
skillEnergyMax = maxSkillEnergyForLevel(runLevel) + equipmentSkillEnergyMaxFlat;
hp = min(hp, maxHp);
skillEnergy = min(skillEnergy, skillEnergyMax);
```

`baseAttack`、`maxHp` 和 `skillEnergyMax` 物化保存“当前等级基础值 + 当前槽位、当前品质固定数值”；每次等级或装备变化都从等级公式重新计算，不在旧值上重复累加。

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
| 装备直接攻击 | 所有刃器按品质固定提供 `+2 / +4 / +6`，只作为少量辅助，不作为主要差异 |
| 装备直接最大生命 | 所有衣装按品质固定提供 `+10 / +20 / +30`，机制仍不能让生存流无脑站桩 |
| 装备直接技能能量上限 | 所有饰符按品质固定提供 `+10 / +20 / +30`，不直接补充当前技能能量 |
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
4. 它是新获得、替换还是品质提升。

推荐卡片格式：

```text
流影刃
刃器 / 影步系 / 精良

移动一段距离后，下一次普攻变为影斩。
影斩范围扩大，并对小怪造成额外伤害。

替换：当前刃器「流水刃」
```

品质变化展示：

```text
流水刃
刃器 / 流水 / 精良

品质提升：普通 -> 精良
```

新获得展示：

```text
踏影衣
衣装 / 影步 / 精良

新装备：精良
```

暂停页只展示当前品质，不展示历史品质。第一版不新增品质图标或品质宝石；只用文字显示 `普通 / 精良 / 觉醒`。

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
- 如果选择的是同 ID 更高品质，背包品质覆盖并继续装备在原槽位。
- 替换时 UI 必须显示旧装备名和新装备槽位。
- 换装、升品或降品后重新计算槽位基础属性；最大生命降低时将当前生命夹取到新上限，技能能量上限降低时将当前技能能量夹取到新上限。
- 替换时清除旧装备提供的持续状态，例如影斩层数、连杀触发状态、低血每幕触发标记。
- 已经发生的即时收益不回滚，例如装备触发时已经获得的技能能量不扣回。

## Acceptance Criteria

设计验收：

- 三槽位命名统一使用 `blade / garb / talisman`。
- 18 件装备都能对应一个明确流派和主动行为。
- 每个流派都有输出、生存、资源三件装备。
- 每件装备有普通、精良、觉醒三档机制描述。
- 所有刃器按普通、精良、觉醒分别提供 `+2 / +4 / +6` 攻击力。
- 所有衣装按普通、精良、觉醒分别提供 `+10 / +20 / +30` 最大生命。
- 所有饰符按普通、精良、觉醒分别提供 `+10 / +20 / +30` 技能能量上限。
- 装备基础属性叠加在等级成长值上，死亡、重开或返回开始界面后随装备清除。
- 品质提升规则只服务单局内构筑，不保留任何局外进度。
- `act 1-6 / 7-12 / 13+` 分别对应普通、精良、觉醒。
- 当前已装备升品最多保底 1 张，空槽补位尽量保留 1 张。
- 未习得大招时，当前品质带 `requiresUltimate` 的候选不掉落。
- 影步系替代原守势方向，强调移动穿梭而非被动防御。
- 掉落三选一能表达“强化已有路线 / 补足短板 / 改变打法”。
- 同流派有软协同，但没有硬套装。
- 所有装备都能在无正式图标的情况下用 UI 文案表达。

实现验收：

- Boss 死亡后优先出现最多 3 个装备选项。
- 装备背包支持 `{ id, tier }[]`，并保证同 ID 只有一条记录。
- `pendingEquipmentChoices` 固定保存 `id / tier / previousTier / reason`，UI 不临时按 act 推导品质。
- Boss 候选按当前幕段生成品质，并支持普通直接跳到觉醒。
- 同 ID 高品质覆盖低品质；相同或低品质不进入候选。
- 候选可少于 3 张；0 候选时跳过装备 overlay 并给 20% 最大生命治疗。
- 选择装备后进入正确槽位。
- 同槽位装备会替换旧装备。
- 同 ID 升品也重置该槽位运行时状态。
- 重开或死亡后装备清空。
- 装备选择不会覆盖经验升级选择。
- 普通 Boss 后的队列顺序为装备选择优先，其后继续展示经验升级选择。
- 第 13 幕最终 Boss 当前版本在觉醒装备选择后进入 victory，不再展示经验升级选择。
- 换装或降品导致最大生命或技能能量上限降低时，当前生命或技能能量被正确夹取。
- 触发型装备不会在原地或无风险状态下无限刷收益。
- 18 件装备的精良和觉醒效果全部接入；表现型追加斩击、水刃等第一版可以实现为额外伤害结算，不新增 projectile 或 VFX 资产。
- 效果测试覆盖每件装备至少一个高品质差异点；UI 测试只覆盖品质显示和品质变化，不为每件装备做快照。

## Code Sources

目标落地点：

- `src/types/game/domain.ts`
- `src/types/game/state.ts`
- `src/types/game/entities.ts`
- `src/game/state.ts`
- `src/entities/bosses/defeat.ts`
- `src/entities/player.ts`
- `src/entities/enemy.ts`
- `src/systems/equipment.ts`
- `src/systems/equipmentCatalog.ts`
- `src/ui/rewardOverlay.tsx`
- `src/ui/pauseScreen.tsx`
- `src/ui/pause/detailCopy.ts`

## Implementation Notes

- 先改文档准规格，再实现逻辑。
- 实现顺序：
  1. 数据模型和 helper：背包记录、品质比较、候选记录、`requiresUltimate` 过滤。
  2. 掉落/选择规则测试：幕段品质、高品质覆盖、跳级、保底、空槽、0 候选治疗。
  3. UI：奖励卡显示新获得/品质提升，暂停页显示当前品质。
  4. 18 件高品质效果：沿用现有专用 runtime 字段风格，必要时只加触发状态字段。
  5. 效果测试：每件装备至少覆盖一个高品质差异点，资源公式和一次性触发类重点测试。
  6. 第 13 幕最终 Boss 觉醒掉落后进入 victory 的当前版本流程。
- 不先做通用装备效果引擎；按现有 `flowBladeHits`、`huntKillTimer`、`burstTalismanCooldown` 风格增加少量必要 runtime 字段。
- 不新增装备特效资产、品质图标或专属动画；第一版用现有反馈表达效果。
