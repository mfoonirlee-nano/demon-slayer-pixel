# 高台秘藏

> 实现状态：已实现。本文同时作为高台宝藏的数值契约、运行时边界和验收口径；首轮调参仍需结合实际游玩遥测继续校准。

## Purpose

当前地面路线可以持续承载玩家移动和输出，高台主要提供短时躲避、下落攻击和位置调整，缺少稳定、可预期的路线收益。高台秘藏用于建立以下核心循环：

```text
看到宝藏预告
  ↓
判断当前资源和场上风险
  ↓
主动离开地面路线并连续登高
  ↓
在 high / top 平台领取宝藏
  ↓
从 3 个动态奖励中选择 1 个
  ↓
回到正常战斗
```

系统首先解决“玩家为什么要往平台上跳”，其次才提供额外资源。宝藏必须改变路线决策，不能退化为随机散落在必经路线上的普通拾取物。

## Goals

1. 每幕稳定制造一次可见的登高动机。
2. 让玩家在即时补给和长期成长之间做选择。
3. 奖励数值随幕数和玩家当前资源状态变化，前期不过量、后期不失去价值。
4. 奖励出现概率响应可见状态，但不通过读隐藏行为强行操控结果。
5. 保留 Boss 装备、每幕经验升级和残灵主动治疗的既有身份。
6. 宝藏选择与 Boss 装备、经验升级使用独立状态，不互相覆盖。

## Non-Goals

第一版不包含：

- 宝藏稀有度、宝箱品质或多阶段开箱。
- 连续跳跃倍率、无伤登高倍率或计时挑战。
- 局外货币、局外收藏和永久成长。
- 资源溢出护盾、过量治疗或溢出经验转换。
- 悬浮平台宝藏、攻击开箱和 Boss 战中开箱。
- 装备随机词缀、宝藏装备升品或第二层装备三选一。

## Current-State Boundary

当前源码已接入独立的“月潮灵匣”高台宝藏。旧版平台攻击/生命水晶、攻击/治疗宝箱和 `rewardDebt` 仍保持移除；普通 `riskFork` 不直接提供奖励，控制器找不到合格宿主时才请求专用的安全主路 + 高台奖励支路。

本设计不是恢复旧的随机平台掉落。它引入的是每幕有预算、明确预告、只绑定可选高路线的独立事件。地图只提供合格承载平台，奖励生成和结算由宝藏系统负责。

实现按三层拆分：`highPlatformTreasure.ts` 管理每幕机会、附着、解封、驻留领取和开匣定格；`treasureRewards.ts` 生成并结算不可变奖励快照；`highPlatformTreasure.ts` 实体绘制模块负责右缘箭头、光柱、平台辉光、四帧灵匣和领取反馈。领取后的短开匣定格继续推进自身视觉计时但冻结玩法，最终打开帧留在 Canvas 上，再由独立的宝藏 overlay 接管选择。

## Spawn Budget

宝藏按“每幕机会”生成，不对每个平台独立掷概率。这样不会因为后期平台生成更快而提高单位时间奖励数量。

每幕维护一个状态：

```ts
type TreasureOpportunityState =
  | "idle"
  | "armed"
  | "attached"
  | "claimed"
  | "missed";
```

状态流转：

```text
idle
  ↓  elapsedInAct 到达 18s + seededRandom(0s, 8s)
armed
  ↓  找到合格的新平台
attached
  ├─ 玩家领取 → claimed
  ├─ 平台离屏 → missed
  └─ Boss 进入不可领取阶段 → missed
```

规则：

- 每幕最多 `1` 次机会。
- 同时最多存在 `1` 个场上宝藏或未完成宝藏选择。
- `armed` 后最多等待 `2` 个新地图片段或 `7s`。
- 超过等待上限仍没有合格平台时，请求 `spawnTreasureRouteSegment()` 生成一次带显式 `treasureHost` 标记的专用路线：安全主路加高台奖励支路。
- 玩家主动错过后，本幕不补刷。
- 如果系统尚未找到合格承载台，机会保持 `armed`；系统失败不能算作玩家错过。
- 重开时清空机会状态、场上宝藏、保底计数和待选卡。

`18-26s` 是首轮参数，不是长期硬编码。它的目的，是在正常幕内战斗已建立、但 Boss 压力尚未到来时提供一次路线选择。

## Host Platform Rules

宝藏只绑定新生成的平台，不能突然出现在已经进入玩家视野或已经站立的平台上。

合格承载台必须满足：

- 层级是 `high` 或 `top`。
- 非悬浮平台。
- 逻辑宽度至少 `120px`。
- 从当前路线可按既有跳跃约束到达。
- 不是低层恢复片段或 Boss 地面过渡的一部分。
- 不能同时作为普通敌人的平台出生点。

承载优先级：

1. 专用路线中显式标记的 `treasureHost` 奖励高台。
2. `stairUp` 的最高点。
3. `zigzag` 或 `gapJump` 的最高点。
4. 其他满足约束的 `high / top` 平台。

第一版排除普通 `riskFork`、`breather`、`safeBridge`、`stairDown` 和 `hoverPair`。`spawnTreasureRouteSegment()` 的专用路线必须生成静止、足宽且逐级可达的高台，并以 `treasureHost` 字段显式标记宿主，不能把普通高风险片段直接标成奖励路线。

地图生成器继续拥有可达性、平台形态和张力；宝藏控制器只提出“需要一个合格高台支路”的请求，不能绕过地图可达性检查。

## Telegraph And Claim

宝藏必须在玩家决定跳跃前可见：

- 承载台仍在屏幕右侧时，显示右缘金色方向标记。
- 进入屏幕后显示约 `80px` 高的弱光柱和平台边缘辉光。
- 每个宝藏只播放一次提示音。
- 平台完整进入屏幕后延迟 `0.6s` 解封，避免后期高速滚动时刚露头就误触。
- 最后约 `1.5s` 加快闪烁，表达即将离屏，不额外显示倒计时。

领取条件：

- `player.onPlatform` 必须指向宝藏承载台。
- 玩家与宝藏保持近距离 `0.2s`。
- 不能从地面、平台下方或攻击命中宝藏。
- Boss、死亡、胜利或其他阻塞状态下不能领取。

领取时先原子标记宝藏已领取并移除场上实体，再生成选择，避免连续碰撞、重复输入或 UI 重渲染造成重复领取。

## Boss Boundary

- Boss 存活时不生成、不领取宝藏。
- Boss 前奏进入最后不可领取窗口后不再附着新宝藏。
- Boss 到来时仍未领取的宝藏淡出并记为 `missed`。
- 宝藏不能通过暂停选择打断 Boss 招式或为 Boss 战制造免费安全窗口。
- 最终 Boss 击败后的胜利、装备和经验规则保持现状，不能再插入宝藏。

具体的“前奏最后窗口”应由 director 暴露语义状态，不要在宝藏模块复制 Boss 计时公式。首轮目标是至少给玩家约 `10s` 的完整预告和攀登窗口。

## Reward Snapshot

奖励在玩家成功领取、宝藏 overlay 即将激活时按当前状态计算一次，并保存为不可变快照。卡片显示、键盘切换、暂停恢复和 React 重渲染都不能重新掷结果。

确定性随机种子至少包含：

```text
runSeed + act + treasureSerial
```

每张卡保存：

```ts
type TreasureChoiceState =
  | {
      id: string;
      kind: "health" | "skillEnergy" | "ultimateEnergy" | "residualSpirit" | "runXp";
      amount: number;
      before: number;
      after: number;
    }
  | {
      id: string;
      kind: "equipment";
      equipment: EquipmentChoiceState;
      replacedEquippedId: EquipmentItemId | null;
    };
```

`amount` 必须是按容量和系统边界夹取后的实际有效值，不是卡面承诺的名义值。

## Dynamic Reward Amounts

### Shared Inputs

```ts
actProgress = clamp((act - 1) / 12, 0, 1);
resourceDeficit = clamp((maxValue - currentValue) / maxValue, 0, 1);
needScale = 0.75 + 0.5 * resourceDeficit;
```

- `actProgress` 在第 1 幕为 `0`，第 13 幕及以后为 `1`。
- `resourceDeficit` 越大，实际恢复量越高。
- `needScale` 只在 `0.75-1.25` 之间变化；出现概率可以更强地响应缺口，恢复量只做温和修正，避免玩家故意耗空资源换取超额奖励。

所有资源奖励都使用：

```ts
effectiveAmount = min(availableCapacity, roundedNominalAmount);
```

如果 `effectiveAmount` 小于名义奖励的 `35%`，该卡不进入候选池，避免出现看似有奖励、实际只补几点的选择。

### Amount Formulas

| 奖励 | 名义值公式 | 取整 |
| --- | --- | --- |
| 生命 | `maxHp * (0.12 + 0.06 * actProgress) * needScale` | 向上取整到整数 |
| 技能能量 | `currentSkillCost * (0.8 + 0.5 * actProgress) * needScale` | 最近的 `5` |
| 大招能量 | `ultimateEnergyMax * (0.12 + 0.08 * actProgress) * needScale` | 最近的 `5` |
| 残灵 | `residualHealCost * (0.75 + 0.5 * actProgress) * needScale` | 最近的 `5` |
| XP | `xpToNext * (0.08 + 0.04 * actProgress) * paceScale` | 向上取整到整数 |
| 装备 | 当前幕段品质的一件明确装备 | 不适用 |

`currentSkillCost` 必须读取装备结算后的实际技能消耗，不能固定假设为 `30`。残灵使用当前系统的单次引灵成本，而不是复制常量值。

XP 的节奏修正：

```ts
expectedActStartLevel = initialLevel + (act - 1) * levelsPerAct;
expectedNow = expectedActStartLevel + (isPastActMidpoint ? 1 : 0);
levelGap = clamp((expectedNow - runLevel) / 2, 0, 1);
paceScale = 1 + 0.35 * levelGap;
```

`isPastActMidpoint` 应基于当前幕的 director gate 计算，不能复制一份固定秒数。XP 仍走非 Boss XP 上限：它可以提前本幕普通战斗升级并填充 Boss 前经验条，但不能夺走 Boss 保留的第二次升级。实际 XP 再夹取到当前非 Boss headroom；有效空间不足时不生成 XP 卡。

### Expected First-Pass Ranges

这些范围只用于首轮 sanity check，不作为第二套配置源：

| 奖励 | 前期高缺口 | 后期高缺口 |
| --- | ---: | ---: |
| 生命 | 约 `15% maxHp` | 约 `22% maxHp` |
| 技能能量 | 约 `1` 次技能消耗 | 约 `1.5-1.6` 次技能消耗 |
| 大招能量 | 约 `15%` 上限 | 约 `25%` 上限 |
| 残灵 | 约 `15-20` | 约 `25-30` |
| XP | 约当前需求的 `8-11%` | 约当前需求的 `12-16%` |

## Eligibility

先执行硬过滤，再计算权重：

- 满生命，或可用生命缺口不足名义值的 `35%`：不出生命。
- 满技能能量，或可用缺口不足：不出技能能量。
- 未习得大招、大招能量已满、大招正在施法或生效：不出大招能量。
- 残灵已满，或剩余容量不足：不出残灵。
- 非 Boss XP headroom 不足：不出 XP。
- 没有合法、明确的装备候选：不出装备。

生命、技能能量、大招能量和残灵还要求归一化缺口大于 `8%`，与后续 `smoothNeed` 的零点保持一致。这里的百分比、斜率和上下限是公式调参锚点，不是固定产出或固定类别概率。

宝藏目标仍是三选一。通常每个奖励类别最多出现一张；装备候选是明确物品，因此在其他类别不足时可以提供不同装备作为不同卡。生成器在附着宝藏前应确认能够形成至少 `3` 个有效卡片候选。

领取时如果状态变化令某张卡失效，使用相同确定性随机流从剩余合法候选补位。极端情况下仍不足 `3` 张时，宁可只展示有效卡，也不能制造零收益卡；该异常必须记录遥测，用于判断候选规则是否需要扩展。

## Dynamic Selection Weights

系统不维护一张固定的六类概率表。每个合法奖励按玩家当前可见状态计算需求分数。

### Recovery Need

```ts
function smoothNeed(deficit: number) {
  const t = clamp((deficit - 0.08) / (0.8 - 0.08), 0, 1);
  return (t * t * (3 - 2 * t)) ** 1.4;
}

weight = smoothNeed(resourceDeficit)
  * actPressure
  * stateBonus
  * pityMultiplier;
```

关卡压力：

| 奖励 | `actPressure` |
| --- | --- |
| 生命 | `1 + 0.60 * actProgress` |
| 技能能量 | `1 + 0.25 * actProgress` |
| 大招能量 | `1 + 0.35 * actProgress` |
| 残灵 | `1 + 0.45 * actProgress` |

可见状态修正：

| 状态 | 修正 |
| --- | ---: |
| `hp / maxHp < 35%` | 生命 `x1.5` |
| `skillCharges === 0` | 技能能量 `x1.3` |
| 残灵不足一次引灵且 `hp / maxHp < 70%` | 残灵 `x1.35` |

大招不增加额外危急保底；未习得或当前不能接受能量时已经由硬过滤排除。

### Growth Need

XP 分数：

```ts
xpProgress = runXp / xpToNext;
xpWeight = xpHeadroomRatio
  * (0.75 + 0.35 * xpProgress + 0.60 * levelGap)
  * xpPity;
```

- 接近升级时略微提高出现概率，让卡面价值更容易被理解。
- 落后当前幕预期等级时显著提高。
- 被非 Boss XP 上限截断时，通过 `xpHeadroomRatio` 连续降低，最终归零。

装备分数：

```ts
emptySlotRatio = emptyEquipmentSlots / 3;
underbuiltSlotRatio = nonEmptySlotsBelowCurrentActTier / 3;
candidateRatio = clamp(validTreasureEquipmentCandidates / 3, 0, 1);

equipmentWeight = candidateRatio
  * (0.55
    + 0.45 * emptySlotRatio
    + 0.30 * underbuiltSlotRatio
    + 0.20 * actProgress)
  * equipmentPity;
```

装备权重响应空槽、当前幕构筑落后程度和合法候选数量，不读取玩家近期受伤、跳跃失败、下一 Boss 或推测流派偏好。

### Pity

保底按“本次符合资格但未展示”累计，而不是按“玩家是否选择”累计：

```ts
resourcePity = 1 + 0.12 * min(eligibleMisses, 5); // max 1.6
equipmentPity = 1 + 0.20 * min(eligibleMisses, 5); // max 2.0
```

- 生命、技能能量、大招能量、残灵和 XP 使用 `resourcePity`；装备使用 `equipmentPity`。
- 卡片一旦展示，计数立即归零，即使玩家没有选择。
- 奖励处于不合法状态时，计数冻结，不增加也不清零。
- 每局重置全部保底。
- 保底计数和原始权重进入调试快照，便于固定 seed 回放。

## Three-Choice Composition

三张卡按角色槽位构成，不使用三次完全独立抽取：

1. **恢复位**：从合法的生命、技能能量、大招能量和残灵中按动态需求权重抽取。
2. **成长位**：先按动态成长权重选择 XP 或装备类别；如果选中装备，再从合法的具体物品中选择一件。
3. **自由位**：从所有剩余合法候选中按剩余总需求分数抽取。

规则：

- 同一奖励类别通常不重复。
- 同一件装备绝不重复。
- 每组最多一张装备卡；只有为补足三个有效选择时，才允许出现多件不同装备。
- 如果恢复池为空，恢复位转入成长/自由池。
- 如果成长池为空，成长位转入恢复/自由池。
- 抽取使用无放回确定性随机。

这种结构保证健康玩家仍能看到长期成长，资源紧张玩家也至少有机会看到当前有用的补给，同时保留第三张卡的随机性。

装备类别只以一个聚合权重参与第一次抽取，不能把每件合法装备都当作一份完整类别权重，否则候选越多会被重复放大。进入装备类别后，具体物品优先覆盖空槽，其余候选在槽位多样性约束下使用确定性随机选择。

## Equipment Boundary

宝藏装备卡必须在第一层直接展示：

- 具体装备名称。
- 槽位、流派和当前幕段品质。
- 主要效果。
- 将替换的当前装备。

选择后直接加入背包并自动装备，不再打开第二层装备三选一。

宝藏装备规则：

- 只提供玩家尚未拥有的装备 ID。
- 可以填补空槽或替换同槽装备。
- 品质按当前 `actBand` 生成。
- 当前品质需要大招但玩家尚未习得时，候选无效。
- 不提供同 ID `tierUpgrade`；品质提升继续只由 Boss 装备奖励提供。
- 选择后沿用 Boss 装备的换装语义：清理槽位运行时状态、自动装备并重算派生属性。

Boss 仍稳定提供完整装备选择，宝藏只是低频的单张构筑机会，不能取代 Boss 奖励身份。详细装备规则见 [equipment.md](equipment.md)。

## Overlay And Queue

宝藏使用独立的 `pendingTreasureChoices`，不能复用 `pendingEquipmentChoices` 或 `pendingUpgradeChoices`。

推荐阻塞顺序：

```text
Boss 裂身 / death / victory
  ↓
Boss 装备选择
  ↓
高台宝藏选择
  ↓
XP 升级选择
  ↓
手动暂停
```

已经激活的 overlay 不被新奖励抢占；上述顺序用于同帧新队列的仲裁。

宝藏 overlay 激活时，游戏时间、平台、敌人、Boss、投射物、引灵和装备计时全部冻结。选择不能取消。输入支持现有奖励界面的方向键、`Enter`、`1/2/3` 和点击，并保证一次输入只结算一次。

选择 XP 时先清空宝藏选择，再结算非 Boss XP；如果触发升级，下一份快照自然展示升级三选一。选择装备时只清空宝藏队列，不能误清 Boss 或 XP 队列。

死亡、胜利、最终 Boss 结算和重开必须清空场上宝藏、机会状态与宝藏队列。旧 UI 点击回调不能落到新的一局。

## UI Copy Contract

资源卡必须展示实际变化：

```text
愈生
恢复生命 +47
生命：53 → 100
```

```text
凝技
恢复技能能量 +40
技能：12 → 52
```

XP 卡在能够触发升级时增加提示：

```text
历练
经验 +86
将提升等级，并继续选择升级强化
```

装备卡必须展示替换结果：

```text
流影刃
刃器 / 影步系 / 精良

移动一段距离后，下一次普攻变为影斩。
替换：当前刃器「流水刃」
```

地图上的宝藏不提前透露奖励类别，避免玩家看到不喜欢的类型后故意跳过、等待同幕重刷。

## Telemetry

当前首版在 `treasureDebug` 中保留最近一次领取或错过的确定性快照，覆盖幕数、种子、宿主、候选、权重、三张卡和最终选择，便于本地复现。跨幕追加历史与领取前后 `5s` 的事件窗口尚未接入正式遥测管线；下面列出的是后续平衡验收所需的完整口径，不应把当前单一快照误当作长期数据仓库。

至少记录：

- `act`、`elapsedInAct`、宝藏序号和随机种子。
- 承载平台层级、片段类型、是否为强制支路。
- 玩家是否看到预告、是否开始登高、是否领取、是否错过。
- 领取时的资源状态、合法候选、原始权重、保底倍率和最终三张卡。
- 每张卡的名义值、实际值和玩家选择。
- 领取前后 `5s` 内的受伤、跌落和死亡。
- 是否与 Boss 前奏、Boss、其他 overlay 或生命周期清理发生冲突。

## Acceptance Criteria

### Design And Generation

- 每幕最多一个宝藏机会，同时最多一个未解决宝藏。
- 宝藏只出现在可达的 `high / top` 静止平台。
- 玩家在需要决定路线前能够看到明确预告。
- 主动错过不在同幕补刷，固定 seed 下生成和选择稳定。
- 地图找不到合格平台时生成安全主路加奖励支路，而不是投放不可达宝藏。
- Boss 存活期间宝藏生成与领取均为零。

### Reward Correctness

- 恢复量同时响应幕数和当前缺口，并夹取到真实容量。
- 满资源、未习得大招、XP 无空间和装备无候选时不产生零收益卡。
- 三张卡通常包含恢复、成长和自由选择，且不会重复同一具体卡。
- 技能能量结算同步技能次数；大招和残灵沿用现有容量 helper。
- XP 不突破非 Boss 每幕升级边界。
- 宝藏装备不提供同 ID 升品，选择后正确入库、换装和重算属性。
- 宝藏、Boss 装备和 XP 升级队列不会互相覆盖。

### First-Pass Balance Targets

- 每幕宝藏机会成功附着率 `>= 98%`。
- Boss 重叠率 `< 1%`。
- 看到提示后尝试进入 `high / top` 路线的比例提升至少 `20` 个百分点。
- 熟悉系统后的领取率保持在 `45-70%`。
- 领取率超过 `80%` 时优先提高路线风险；低于 `35%` 时优先改善路线和预告，不先提高奖励。
- 没有单一奖励在所有状态下长期压倒其他选择。

## Target Integration Points

实现时预计涉及：

- `src/types/game/state.ts`
- `src/game/state.ts`
- `src/game/runtime.ts`
- `src/entities/platforms/generator.ts`
- `src/entities/platforms/runtime.ts`
- `src/systems/progression.ts`
- `src/systems/equipment.ts`
- `src/systems/equipmentState.ts`
- `src/systems/residualSpirit.ts`
- `src/ui/rewardOverlay.tsx`
- `src/ui/rewardOverlayLayout.ts`
- `src/ui/gameHud.tsx`

实现前应先为生成、动态数值、固定 seed 抽取、队列优先级和生命周期清理建立测试，再接视觉实体与 UI。
