# 幕数与威胁值

> 实现状态：源码已接入 `act`/`actBand` helpers、威胁值、Boss 出场门槛、平台分段和奖励分段；数值仍需试玩调参。

## Purpose

说明数值系统的目标边界：用 Boss 击杀驱动幕数，用统一威胁值协调敌人、Boss、平台和奖励，并通过注册表支持内容扩展。

## Target Design

目标不是单纯提高血量或刷怪速度，而是建立可扩展的长期挑战框架：

- 前期、中期、后期都有明确体验差异。
- 击败 Boss 后进入下一幕，难度和内容池继续扩展。
- 时间只作为辅助压力来源，避免拖时间导致难度停滞。
- 新敌人、新 Boss、新技能优先通过配置接入。
- 敌人生成由 enemy director 管理：每局用 seed 生成稳定 `runEnemyOrder`，每幕控制解锁数量、常规池种类数、profile、波次和预算，不写死每幕具体敌人名单。

核心状态：

```ts
bossKills: number;
```

`act` 推荐通过 helper 派生，不作为唯一权威状态。幕结构是固定的 13 幕（见 [../game-design/act-structure.md](../game-design/act-structure.md)），`act` 上限 13。平台、奖励、敌人轮换通过 `actBand` 三段分档调参，废弃旧的 `lateGameBand = Math.min(4, act)`。

```ts
act = bossKills + 1   // 上限 13
actBand =
  act <= 6   ? "intro"      // 1-6 基础 Boss，逐幕解锁 12 敌人
  : act <= 12 ? "awakened"  // 7-12 蚀醒 Boss，刻意难度墙
  : "final"                 // 13 万相血月
```

## Key Formulas

统一威胁值改为**分段递增**：基础幕（前 6 次击杀）平缓，蚀醒幕（第 7 次击杀起）陡峭，制造刻意的蚀醒难度墙；时间只做辅助压力，4 分钟后封顶。

```ts
threatScalar =
  1
  + Math.min(bossKills, 6) * 0.26          // 第 1-7 幕的前 6 次击杀，平缓
  + Math.max(0, bossKills - 6) * 0.34       // 蚀醒幕，陡峭
  + Math.min(elapsed / 240, 1.5) * 0.10     // 时间辅助压力，4 分钟封顶
```

> 常数为指导值，须按 [../game-design/balance-acceptance.md](../game-design/balance-acceptance.md) 试玩微调。终幕（第 13 幕）的额外难度走 Boss 自身配置，不靠 `threatScalar` 再加。

阶段体验（逐幕细表见 [../game-design/act-structure.md](../game-design/act-structure.md)）：

| actBand | 幕 | 核心体验 | 敌人 | 平台 | Boss | 奖励 |
| --- | --- | --- | --- | --- | --- | --- |
| intro | 1-6 | 逐幕熟悉一种新压力，6 幕内见齐 12 敌人 | 解锁数量 `3,5,7,9,11,12`；常规池 `3,4,5,6,7,8`；1-3 固定教学 profile，4-6 随机补缺失机制 | 从安全片段逐步加入阶梯/悬浮/风险奖励 | 6 个基础 Boss，各承担一种机制 | 水晶为主，攻击奖励随幕略升 |
| awakened | 7-12 | 蚀醒难度墙，基础 Boss 蚀醒形态 1:1 重现 | 不引入新敌人；常规池 8；6 个 awakened profile 每局 shuffle 且不重复 | 高风险片段权重更高，仍保喘息 | 6 个蚀醒 Boss：+ 新月蚀术招 + 多一阶段 | 装备品质带提升，动态上限继续放宽 |
| final | 13 | 终盘换相借招总复习 | 排除 `chaser/crawler/runner`，其余 9 种非基础敌人全进；Boss 额外召唤 ≤ 4 | 高压片段不连续堆叠，Boss 战降低平台压力 | 万相血月，5 阶段，击败即通关 | 终盘装备/通关结算 |

平台速度建议：

```ts
platformSpeed = baseSpeed + randomSpeed + bossKills * 0.18 + Math.min(elapsed, 240) * 0.006
```

平台片段权重建议（终幕降低极限地形，避免与万相血月叠成不可解组合）：

| 片段 | 第 1 幕 | 第 2-3 幕 | 第 4-6 幕 | 蚀醒 7-12 | 终幕 13 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `breather` | `1.4` | `1.1` | `0.9` | `0.8` | `1.0` |
| `safeBridge` | `2.0` | `1.6` | `1.2` | `1.0` | `1.2` |
| `stairUp` | `0.8` | `1.3` | `1.4` | `1.5` | `1.2` |
| `stairDown` | `0.8` | `1.2` | `1.3` | `1.4` | `1.2` |
| `zigzag` | `0.2` | `0.8` | `1.5` | `1.6` | `1.0` |
| `gapJump` | `0.2` | `1.1` | `1.5` | `1.7` | `1.0` |
| `hoverPair` | `0` | `0.4` | `1.2` | `1.4` | `0.8` |
| `rewardRisk` | `0.2` | `0.7` | `1.3` | `1.5` | `0.6` |

奖励倍率建议（随分段提升，匹配蚀醒幕的更高威胁）：

| 幕段 | 攻击水晶 | 生命水晶 | 宝箱 |
| --- | ---: | ---: | ---: |
| 1-2 | `+2` | `24` | `+6 / 48` |
| 3-4 | `+3` | `26` | `+8 / 52` |
| 5-6 | `+3` | `28` | `+8 / 56` |
| 蚀醒 7-12 | `+4` | `30` | `+10 / 60` |
| 终幕 13 | `+4` | `32` | `+10 / 64` |

建议注册表：

| 注册表 | 职责 |
| --- | --- |
| `ENEMY_ARCHETYPES` | 敌人类型、贴图、标签、复杂度、基础数值、AI、生成权重 |
| `BOSS_ARCHETYPES` | Boss 类型、贴图、血量曲线、阶段技能、召唤池、出现幕数 |
| `SKILL_DEFS` | 技能动画、特效动画、伤害模型、消耗、解锁幕数、HUD 图标 |
| `ACT_CONFIGS` | 每幕敌人池、Boss 池、平台权重、奖励倍率、目标节奏 |

Boss 出现节奏由波次进度和时间共同控制。当前运行时把原设计秒数按 `0.75` 压缩，但保留最低波次数不变，让同样波次量更快完成：

| 幕段 | Min waves | Min elapsed in act | Max elapsed in act |
| --- | ---: | ---: | ---: |
| 1 | `3` | `34s` | `56s` |
| 2-3 | `4` | `41s` | `68s` |
| 4-6 | `5` | `49s` | `79s` |
| 7-12 | `5` | `56s` | `90s` |
| 13 | `3` | `34s` | `56s` |

Boss 前 prelude 等待随幕数线性递减：

```ts
bossPreludeWaitSeconds = max(0, 3 * (13 - act) / 12)
```

运行时会至少等待地面“月林 → 神社石地”按普通地面速度完成过渡后再刷新 Boss。地面滚动速度始终保持 `GROUND_TILE_SPRITES.scrollSpeed`；延长的 prelude 期间会按预算补普通小怪。

## Code Sources

目标落地点：

- `src/types/game-state.ts`
- `src/state.ts`
- `src/runtime.ts`
- `src/entities/enemy.ts`
- `src/entities/boss.ts`
- `src/entities/platform.ts`
- `src/entities/player.ts`
- `src/constants/*`

## Implementation Notes

- 先增加 `bossKills` 和 helper，再让各系统逐步读取派生的 `act` 和 `threatScalar`。
- 实体更新逻辑只读取配置和当前运行状态，不直接写死“第几幕出现什么”。
- 敌人生成先实现纯函数配置层：`buildRunEnemyOrder`、`selectActProfile`、`buildCurrentEnemyPool`、`pickWavePlan`，再接运行时。
- 第 4 幕后 profile 引入随机，但必须优先覆盖本局未重点出现过的机制标签；第 7-12 幕使用不重复 awakened profile cycle。
- 新敌人和新 Boss 第一版等待正式素材接入，不使用临时图形占位。
