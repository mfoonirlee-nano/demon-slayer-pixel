# 数值系统优化方案

> 对应现状文档：`docs/numeric-system.md`
>
> 本文档描述后续数值系统和内容扩展的目标方案，不记录当前线上数值现状。

## 目标

本轮优化的目标不是单纯调高敌人血量或刷怪速度，而是建立一套能支撑长期内容扩展的数值框架：

- 前期、中期、后期都保持挑战性。
- 不同阶段有明显不同体验，覆盖平台、敌人、Boss、技能和奖励。
- 支持无限挑战，玩家击败 Boss 后进入下一幕，难度和内容继续扩展。
- 支持后续新增 Boss、敌人、技能美术资源，新增内容应优先通过配置接入。

最终体验应是：玩家每击败一轮 Boss，都会感觉游戏进入了新的幕；新幕会改变敌人组合、Boss 行为、平台压力、技能价值和奖励路线，而不只是把已有敌人调得更硬。

## 核心设计

### Boss 循环驱动阶段

使用 Boss 击杀次数作为主阶段驱动：

```ts
bossKills = 已击败 Boss 数
act = Math.min(4, bossKills + 1)
```

- `act = 1`：第 1 幕，基础生存与首轮 Boss。
- `act = 2`：第 2 幕，加入快攻压力和更多跳跃压力。
- `act = 3`：第 3 幕，加入重型/远程压力和高风险平台。
- `act = 4`：第 4 幕及之后，完整内容池轮换并无限缩放。

时间 `elapsed` 只作为辅助压力来源，用于避免玩家拖时间导致难度停滞。核心强度主要由 `bossKills` 决定。

### 统一威胁值

引入连续难度标量 `threatScalar`，供敌人、Boss、奖励和平台共同读取：

```ts
threatScalar = 1 + bossKills * 0.28 + Math.min(elapsed / 240, 1.5) * 0.12
```

推荐规则：

- Boss 轮次是主要增长来源。
- 时间补正有上限，避免无限时间堆叠造成不可控。
- 各系统可以再叠加自己的轻微倍率，但不要各自发明独立成长曲线。

### 数据注册表驱动内容

新增内容不应写死在实体逻辑里，而应进入注册表：

- `ENEMY_ARCHETYPES`：敌人类型、贴图、基础数值、AI、出现幕数、生成权重。
- `BOSS_ARCHETYPES`：Boss 类型、贴图、血量曲线、阶段技能、召唤池、出现幕数。
- `SKILL_DEFS`：技能动画、特效动画、伤害模型、消耗、解锁幕数、HUD 图标。
- `ACT_CONFIGS`：每幕敌人池、Boss 池、平台权重、奖励倍率、目标节奏。

实体更新逻辑只读取配置和当前运行状态，不直接关心“第几幕应该出现什么”。

## 阶段体验设计

| 阶段 | 触发 | 核心体验 | 敌人 | 平台 | Boss | 奖励 |
| --- | --- | --- | --- | --- | --- | --- |
| 第 1 幕 | `bossKills = 0` | 熟悉基础移动、攻击、技能充能 | 基础追击 | 低/中层、安全片段为主 | 首轮教学压力 | 水晶较多，治疗兜底 |
| 第 2 幕 | `bossKills = 1` | 处理速度压力和跳跃路线 | 基础追击 + 快攻 | 增加阶梯、链式平台 | 开始混合召唤 | 攻击奖励略提高 |
| 第 3 幕 | `bossKills = 2` | 处理空间压迫和高血目标 | 快攻 + 重型 + 远程 | 增加悬浮、风险奖励 | 技能组合更复杂 | 高风险路线收益提高 |
| 第 4 幕+ | `bossKills >= 3` | 全内容池轮换，无限挑战 | 全敌人池 | 全片段池，保留喘息 | Boss 池轮换并强化 | 动态成长上限 |

第 4 幕后不再增加新的固定幕，而是继续通过 `bossKills` 提高威胁值，并从完整内容池中按权重轮换。

## 进度系统

### 新增状态

在全局运行态中增加：

```ts
bossKills: number;
act: number;
```

`act` 可以在快照生成时派生，也可以在状态中缓存。推荐把 `bossKills` 作为唯一权威状态，`act` 通过 helper 派生，避免状态不同步。

### Boss 击杀统一入口

新增 `defeatBoss()` helper，所有 Boss 死亡路径都调用它：

- 普通攻击击杀 Boss。
- 下落攻击击杀 Boss。
- 技能瞬时伤害击杀 Boss。
- 技能特效击杀 Boss。
- 大招击杀 Boss。
- 防守反击击杀 Boss。

`defeatBoss()` 统一处理：

```ts
player.score += bossKillScore;
gainSkillEnergy(bossEnergyGain);
gainUltimateEnergy(bossUltimateEnergyGain);
state.bossKills += 1;
state.boss = null;
state.bossSpawnTimer = getBossRespawnDelay(state.bossKills);
```

这样可以避免当前多处分支重复维护 Boss 击杀奖励和重生计时。

### Boss 重生节奏

推荐节奏：

| Boss 击杀数 | 下一轮 Boss 间隔 |
| ---: | ---: |
| 0 | 首轮约 `40s` 出场 |
| 1 | `32s` |
| 2 | `28s` |
| 3+ | `24s`，最低不再降低 |

首轮 Boss 出场稍晚于当前 `28s`，给玩家更多前期成长时间。后续间隔逐步压缩，让无限挑战保持循环压力。

## 敌人系统

### 敌人类型

先定义四类核心敌人。后续新增美术资源时，可以绑定到这些类型，也可以新增类型。

| 类型 | 定位 | 行为 | 推荐出现阶段 |
| --- | --- | --- | --- |
| `chaser` | 基础追击 | 向玩家移动，数值稳定 | 第 1 幕 |
| `runner` | 快攻压力 | 低血、高速、低伤，迫使快速处理 | 第 2 幕 |
| `brute` | 高血目标 | 高血、低速、高伤，压迫空间 | 第 3 幕 |
| `caster` | 远程施压 | 保持距离，周期性发射投射物 | 第 3 幕 |

### 敌人配置形态

推荐每个敌人 archetype 包含：

```ts
{
  id: "runner",
  displayName: "快攻鬼",
  sheetId: "enemy_runner_01",
  unlockAct: 2,
  baseHp: 12,
  hpScale: 0.18,
  baseDamage: 3,
  damageScale: 0.05,
  baseSpeed: 1.35,
  randomSpeed: 0.9,
  maxAbsVelocity: 4.2,
  steeringForce: 0.045,
  scoreValue: 10,
  skillEnergyGain: 8,
  ultimateEnergyGain: 2,
  spawnWeightByAct: { 1: 0, 2: 0.35, 3: 0.28, 4: 0.24 },
}
```

`EnemyState` 增加：

```ts
archetypeId: string;
aiTimer: number;
```

远程敌人可额外增加：

```ts
attackCd?: number;
preferredRange?: number;
```

### 敌人生成权重

推荐权重：

| 幕 | chaser | runner | brute | caster |
| --- | ---: | ---: | ---: | ---: |
| 1 | `1.00` | `0` | `0` | `0` |
| 2 | `0.65` | `0.35` | `0` | `0` |
| 3 | `0.42` | `0.25` | `0.18` | `0.15` |
| 4+ | `0.34` | `0.25` | `0.22` | `0.19` |

生成数量和间隔使用阶段函数，而不是继续只按时间衰减：

```ts
enemySpawnInterval = clamp(1.15 - bossKills * 0.08 - elapsed * 0.0015, 0.42, 1.15)
enemyMaxCount = Math.min(10 + bossKills * 2, 24)
```

这样前期不会过早满屏，后期也有明确上限。

## Boss 系统

### Boss 类型

每个 Boss 作为独立 archetype：

```ts
{
  id: "lower_moon_01",
  displayName: "下弦之鬼",
  sheetId: "boss_lower_moon_01",
  unlockAct: 1,
  baseHp: 520,
  hpPerCycle: 145,
  phaseThresholds: [0.66, 0.33],
  contactDamage: { base: 12, perPhase: 2, perCycle: 1 },
  skills: ["slash_wave", "blood_projectile"],
  summonPoolByPhase: {
    1: ["chaser"],
    2: ["chaser", "runner"],
    3: ["runner", "brute"]
  },
  weightByAct: { 1: 1, 2: 1, 3: 0.7, 4: 0.5 },
}
```

后续新增 Boss 美术资源时，新增 Boss archetype 即可进入对应幕的 Boss 池。

### Boss 血量曲线

推荐公式：

```ts
bossHp = baseHp + bossKills * hpPerCycle + elapsed * 0.35
```

设计意图：

- `bossKills` 是主要成长来源。
- 时间补正较低，只防止玩家拖时间。
- 不再使用过强的纯时间血量线性增长。

### Boss 行为升级

Boss 仍保留 3 个血量阶段，但轮次会改变行动池：

- 第 1 轮：接近当前体验，移动、接触、单技能、少量召唤。
- 第 2 轮：提高召唤频率，引入 runner。
- 第 3 轮：提高弹幕密度，引入 brute/caster。
- 第 4 轮+：根据 Boss archetype 混合多个技能和召唤池。

Boss AI 冷却推荐：

```ts
aiCooldown = clamp(baseCooldown - phase * phaseReduction - bossKills * 5, 42, baseCooldown)
```

Boss 技能冷却推荐同样设置最低值，避免后期连续施法导致不可解。

## 技能系统

### 技能配置化

当前三招作为初始技能，后续技能美术资源接入 `SKILL_DEFS`：

```ts
{
  id: "water_dragon",
  name: "壹之型",
  unlockAct: 1,
  castSheetId: "skill1_cast",
  effectSheetId: "skill1_effect",
  energyCost: 30,
  damageModel: "line_projectile",
  enemyDamageMultiplier: 1.15,
  bossDamageMultiplier: 0.85,
  role: "远程清线"
}
```

### 初始技能定位

| 技能 | 定位 | 调整方向 |
| --- | --- | --- |
| 壹之型 | 远程清线 | 保持飞行速度和距离，适合处理 runner/caster |
| 贰之型 | 群体压制 | 强化中近距离范围价值，适合处理混怪和 brute |
| 叁之型 | 防守反击 | 支持抵挡 caster/Boss 投射物，后期保命价值更明确 |
| 大招 | 危机清场 | 对小怪维持强清场，对 Boss 使用软上限避免跳过阶段 |

### 后续技能扩展

技能扩展优先按角色定位设计，而不是只叠伤害：

- 位移技能：解决高风险平台和远程敌人。
- 控场技能：短暂减速或击退敌群。
- 破防技能：专门处理 brute 和 Boss 阶段护甲。
- 防御技能：吸收投射物或短暂无敌。

技能新增时必须明确：

- 解锁幕数。
- 主要克制对象。
- 对小怪和 Boss 的伤害倍率。
- 是否生成独立持续特效。
- 是否需要 HUD 图标。

## 平台与奖励系统

### 平台阶段化

平台片段权重从当前“按时间过渡”改为“按幕数配置”。

推荐权重：

| 片段 | 第 1 幕 | 第 2 幕 | 第 3 幕 | 第 4 幕+ |
| --- | ---: | ---: | ---: | ---: |
| `breather` | `1.4` | `1.1` | `0.9` | `0.8` |
| `safeBridge` | `2.0` | `1.6` | `1.2` | `1.0` |
| `stairUp` | `0.8` | `1.3` | `1.4` | `1.5` |
| `stairDown` | `0.8` | `1.2` | `1.3` | `1.4` |
| `zigzag` | `0.2` | `0.8` | `1.5` | `1.6` |
| `gapJump` | `0.2` | `1.1` | `1.5` | `1.7` |
| `hoverPair` | `0` | `0.4` | `1.2` | `1.4` |
| `rewardRisk` | `0.2` | `0.7` | `1.3` | `1.5` |

`tension` 机制保留：当连续高压片段过多时，强制提高 `breather` 和 `safeBridge` 权重，避免不可持续。

### 平台速度

平台速度改为同时读取幕数和时间：

```ts
platformSpeed = baseSpeed + randomSpeed + bossKills * 0.18 + Math.min(elapsed, 240) * 0.006
```

保留最大值限制，推荐后期上限不超过当前玩家可稳定应对的移动能力。

### 奖励成长

攻击加成上限改为动态：

```ts
attackBonusCap = 24 + bossKills * 8
```

奖励路线按风险区分：

- 安全平台更偏治疗。
- 高层、链式、悬浮、风险奖励平台更偏攻击加成。
- Boss 击杀后可以短暂提高下一个片段的奖励概率，形成击败 Boss 后的恢复窗口。

推荐奖励倍率：

| 幕 | 攻击水晶 | 生命水晶 | 宝箱 |
| --- | ---: | ---: | ---: |
| 1 | `+2` | `24` | `+6 / 48` |
| 2 | `+2` | `24` | `+6 / 48` |
| 3 | `+3` | `26` | `+8 / 52` |
| 4+ | `+3` | `28` | `+8 / 56` |

## HUD 与反馈

HUD 只做必要扩展，不重做整体 UI：

- 显示当前幕数，例如 `第 2 幕`。
- Boss 血条显示 Boss 名称和阶段。
- 暂停面板显示当前 `bossKills`、总攻击、动态攻击上限、当前技能定位。
- 后续技能扩展后，技能切换 UI 从固定 1/2/3 改为读取已解锁技能列表。

移动端按钮仍保留当前数量。新增技能较多时，优先考虑“技能轮换按钮”，不要直接堆更多按钮。

## 落地顺序

### 第一步：进度和配置骨架

- 增加 `bossKills` 状态。
- 增加 `getAct()`、`getThreatScalar()`、`getBossRespawnDelay()`。
- 新增 `ACT_CONFIGS`，先让平台和敌人读取当前幕。
- 新增 `defeatBoss()`，替换所有 Boss 死亡分支。

完成这一步后，即使还没有新增美术资源，也能开始按幕推进。

### 第二步：敌人注册表

- 新增 `ENEMY_ARCHETYPES`。
- `spawnEnemy()` 改为按当前幕选择 archetype。
- `EnemyState` 增加 `archetypeId`。
- 先用现有敌人贴图映射 `chaser`、`runner`、`brute`、`caster`。
- 为 `caster` 增加最小远程攻击能力，复用现有 projectile 逻辑。

### 第三步：Boss 注册表

- 新增 `BOSS_ARCHETYPES`。
- `spawnBoss()` 按当前幕和轮次选择 Boss archetype。
- Boss 血量、接触伤害、AI 冷却、召唤池读取配置。
- 当前 Boss 作为第一个 archetype，后续新增 Boss 直接加配置。

### 第四步：技能注册表

- 将当前 `SKILLS` 和技能特效配置逐步合并到 `SKILL_DEFS`。
- 技能释放、HUD、伤害公式改为读取技能定义。
- 当前三招作为默认解锁技能。
- 后续新增技能资源只新增配置和资源元数据。

### 第五步：阶段调优

- 调整每幕平台权重、敌人权重、Boss 轮换和奖励倍率。
- 保留 `docs/numeric-system.md` 记录当前实际数值。
- 每次大调参后同步更新本文档或新增调参记录。

## 验收场景

该方案落地后，应能满足以下体验场景：

- 第 1 幕玩家主要学习移动、普攻、技能和基础 Boss，不会在 30 秒内被满屏敌人压死。
- 第 2 幕玩家明显遇到速度压力，壹之型远程清线价值上升。
- 第 3 幕玩家明显遇到高血和远程压力，贰之型群体压制和叁之型防守反击都有用武之地。
- 第 4 幕之后敌人、Boss、平台组合持续变化，而不是只重复同一个 Boss 加血。
- 新增一个敌人美术资源时，只需要新增贴图元数据和 `ENEMY_ARCHETYPES` 配置即可进入生成池。
- 新增一个 Boss 美术资源时，只需要新增 Boss 贴图元数据和 `BOSS_ARCHETYPES` 配置即可进入对应幕。
- 新增一个技能美术资源时，只需要新增技能定义、施法动画、特效动画和 HUD 图标配置即可接入。

## 当前实现需要特别处理的问题

- 当前 Boss 击杀逻辑散落在多个伤害分支中，必须先集中，否则 `bossKills` 容易重复增加或漏加。
- 当前敌人只有单一 AI，新增敌人类型前需要给 `EnemyState` 增加 archetype 标识。
- 当前 Boss 是单例配置，新增 Boss 前需要拆出 Boss archetype。
- 当前技能有一部分配置在 `SKILLS`，一部分特效逻辑写在 `particle.ts`，技能扩展前需要先定义统一技能配置边界。
- 当前 `PLAYER_COMBAT.skillChargeResetDelay = 45` 实际按秒用于 Boss 重生，应在进度系统中替换为语义更明确的 Boss 重生延迟函数。
