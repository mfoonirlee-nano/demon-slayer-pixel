# 普通敌人数值

> 实现状态：部分实现。本文记录当前源码中已经生效的普通敌人数值、archetype 状态机和仍未接入的幕数生成池。

## Purpose

记录当前普通敌人的生成、生命、伤害、速度成长、已接入 archetype 和素材选择方式。未实现的按幕生成权重、预算和轮换规则见 [enemy-archetypes.md](enemy-archetypes.md)。

## Current State

当前普通敌人已经拆出多个运行时 archetype。生成时仍从 `ENEMY_SHEETS` 中随机选择 sheet，并通过 `enemyArchetypeForSheet()` 映射到对应行为；基础生命和接触伤害仍主要按 `elapsed` 统一成长。

已接入的运行时行为：

- `chaser`：基础追踪。
- `crawler`：低伏接近、前摇、前扑、恢复。
- `runner`：接近、前摇、冲刺、恢复。
- `duelist`：接近、前摇、短距离斩击、恢复。
- `brute`：站立持盾推进，伤害先扣盾牌耐久，破盾后进入硬直并改用无盾推进/横扫；`armor_break` 可直接破盾但不打本体。
- `caster`：保持施法距离，前摇后发射追踪幽火；普通状态每 `5s` 单发，觉醒每 `3s` 三连发，终幕每 `3s` 六连发并加快幽火序列帧。
- `leaper`：低速跟踪，锁定玩家位置前摇后抛物线跳跃落地；当前按 `elapsed >= 35s` 才进入随机候选。
- `glider`：低空悬停，前摇后俯冲掠过；当前按 `elapsed >= 70s` 才进入随机候选。
- `binder`：保持施法距离，前摇后在身前生成法阵并释放贴附符纸；当前按 `elapsed >= 90s` 才进入随机候选。
- `burrower`：低速贴地接近，进入距离后潜入、以地面轨迹移动到玩家附近半身偏移点，再钻出造成一次性伤害；当前按 `elapsed >= 90s` 才进入随机候选。
- `splitter`：接近玩家，父体被击败后进入分裂动作并生成分裂体，分裂体以更低生命和体型继续追击。
- `warden`：保持中距离光环支援，强化范围内其他敌人的移动和威胁。

当前仍未实现：

- 没有 `bossKills`、`act` 或统一 `threatScalar`。
- 没有按幕常规敌人池、轮换池或生成预算。
- 幕数生成池、终幕池预算和 Boss 召唤池仍未统一读取 `enemyDirectorConfig`。
- Boss 召唤仍调用普通 `spawnEnemy()`，尚未读取 Boss archetype 的召唤池配置。

无 Boss 时，运行时按刷怪计时器生成普通敌人。Boss 存在时常规刷怪暂停，但 Boss 召唤分支仍会调用 `spawnEnemy()`。

## Key Formulas

刷新规则：

| 项 | 当前值 |
| --- | ---: |
| 最大同时存在数 | `12` |
| 初始刷怪间隔 | `1.2s` |
| 间隔衰减 | `elapsed * 0.012` |
| 最小刷怪间隔 | `0.38s` |
| 左右生成概率 | `50% / 50%` |
| 右侧生成 X | `WIDTH + 20` |
| 左侧生成 X | `-40` |

刷怪间隔：

```ts
max(0.38, 1.2 - elapsed * 0.012)
```

约 `68.3s` 后达到最小刷怪间隔。

敌人数值：

| 项 | 当前公式或值 |
| --- | --- |
| 基础生命 | `16 + elapsed * 0.3`，再乘 archetype `hpMultiplier` |
| 接触伤害 | `min(20, 3 + elapsed * 0.1)` |
| 基础速度 | 默认 `0.72 + random(0..1.08) + elapsed / 60`；专属 archetype 可覆盖 |
| 最大绝对速度 | `3.2` |
| 追踪转向力 | `0.03` |
| 离屏销毁边距 | `120` |

接触伤害约 `170s` 后达到上限 `20`。

碰撞体尺寸：

```ts
drawW = sheet.frameW * ENEMY_DRAW_SCALE
drawH = sheet.frameH * ENEMY_DRAW_SCALE
w = drawW * 0.42
h = drawH * 0.78
```

`ENEMY_CONFIG.w`、`ENEMY_CONFIG.h`、`ENEMY_CONFIG.yOffsetFromGround` 当前没有被敌人生成逻辑直接使用。

敌人素材：

- 生成时从 `ENEMY_SHEETS` 随机选择 `sheetIndex`。
- 当前 `ENEMY_SHEETS` 包含 `chaser.png`、`crawler.png`、`runner_approach.png`、`caster_move.png`、`duelist.png`、`brute_advance.png`、`binder_move.png`、`glider_hover.png`、`leaper_stalk.png`、`splitter_move.png`、`warden_move.png`、`burrower_move.png` 十二个表。
- 绘制缩放由 `ENEMY_DRAW_SCALE = 120 / ENEMY_SHEETS[1].frameW` 决定。

当前 archetype 摘要：

| Archetype | 生命倍率 | 生成限制 | 行为摘要 |
| --- | ---: | --- | --- |
| `chaser` | `1` | 无专属限制 | 基础追踪玩家横向位置 |
| `crawler` | `0.65` | 同时前扑最多 `2` | 触发距离内前摇后低伏前扑 |
| `runner` | `0.75` | 同时冲刺最多 `2` | 进入距离后前摇并高速冲刺 |
| `duelist` | `1.35` | 同场最多 `3`，同时攻击威胁最多 `1` | 近身前摇后短距离斩击 |
| `brute` | `3.25` | 同场最多 `2`，同时攻击最多 `1` | 盾牌耐久为本体生命 `200%`；完整盾牌先吃伤害，`armor_break` 直接破盾，破盾后改用无盾横扫 |
| `caster` | `1` | 每个 caster 幽火最多普通 `3` / 觉醒 `15` / 终幕 `30` | 保持距离，前摇后发射追踪幽火；普通 `1` 发，觉醒 `3` 发紫红幽火，终幕 `6` 发暗红幽火且动画更快 |
| `leaper` | `1.05` | `elapsed >= 35s` 后随机生成，同场最多 `2`，同时锁定落点最多 `1` | 低速跟踪，前摇锁定玩家位置后抛物线跳跃，落地一次性冲击后硬直 |
| `glider` | `0.92` | `elapsed >= 70s` 后随机生成，同场最多 `2`，同时俯冲压力最多 `1` | 低空悬停，收翼前摇后俯冲并掠过恢复 |
| `binder` | `1.5` | `elapsed >= 90s` 后随机生成，同场最多 `1`，法阵最多 `1`，飞行符纸最多 `2` | 保持距离，前摇后生成身前法阵并释放贴附符纸 |
| `burrower` | `1` | `elapsed >= 90s` 后随机生成，同场最多 `1` | 贴地接近，潜入后以地面轨迹移动到偏离玩家中心的锁定点，钻出造成一次性伤害后恢复 |
| `splitter` | `1.75` | 同场最多 `2` | 接近玩家并在父体被击败后释放分裂体；普通生成 `2` 个，觉醒/终幕生成 `3` 个 |
| `warden` | `1.6` | 同场最多 `1` | 中距离移动并维持强化光环，普通/觉醒提升范围内敌人移速与攻击力，最终阶段全战场强化并使敌人免伤 |

## Code Sources

- `src/constants/combat.ts`
- `src/constants/assets.ts`
- `src/constants/runtime.ts`
- `src/entities/enemy.ts`
- `src/entities/enemies/`
- `src/runtime.ts`
- `src/types/game-state.ts`
