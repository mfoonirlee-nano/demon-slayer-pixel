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
- `brute`：当前运行时为慢速推进、brace、stomp、恢复，brace/stomp 期间降低非大招伤害；目标重构为站立持盾重型，盾牌被击破后移除正面减伤并进入破防窗口。
- `caster`：保持施法距离，前摇后发射追踪鬼火。
- `leaper`：低速跟踪，锁定玩家位置前摇后抛物线跳跃落地；当前按 `elapsed >= 35s` 才进入随机候选。
- `glider`：低空悬停，前摇后俯冲掠过；当前按 `elapsed >= 70s` 才进入随机候选。
- `binder`：保持施法距离，前摇后生成减速/伤害咒圈；当前按 `elapsed >= 90s` 才进入随机候选。
- `burrower`：低速贴地接近，进入距离后潜入、以地面轨迹移动到玩家附近半身偏移点，再钻出造成一次性伤害；当前按 `elapsed >= 90s` 才进入随机候选。

当前仍未实现：

- 没有 `bossKills`、`act` 或统一 `threatScalar`。
- 没有按幕常规敌人池、轮换池或生成预算。
- `splitter`、`warden` 没有运行时实现。
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
| `brute` | `4.25` | 同场最多 `2`，同时攻击最多 `1` | 当前为旧 brace/stomp 减伤；目标重构为持盾推进，破盾后防御下降 |
| `caster` | `1` | 每个 caster 鬼火最多 `2` | 保持距离，前摇后发射追踪鬼火 |
| `leaper` | `1.05` | `elapsed >= 35s` 后随机生成，同场最多 `2`，同时锁定落点最多 `1` | 低速跟踪，前摇锁定玩家位置后抛物线跳跃，落地一次性冲击后硬直 |
| `glider` | `0.92` | `elapsed >= 70s` 后随机生成，同场最多 `2`，同时俯冲压力最多 `1` | 低空悬停，收翼前摇后俯冲并掠过恢复 |
| `binder` | `1.5` | `elapsed >= 90s` 后随机生成，同场最多 `1`，咒圈最多 `1` | 保持距离，前摇后生成减速/伤害咒圈 |
| `burrower` | `1` | `elapsed >= 90s` 后随机生成，同场最多 `1` | 贴地接近，潜入后以地面轨迹移动到偏离玩家中心的锁定点，钻出造成一次性伤害后恢复 |

## Code Sources

- `src/constants/combat.ts`
- `src/constants/assets.ts`
- `src/constants/runtime.ts`
- `src/entities/enemy.ts`
- `src/entities/enemies/`
- `src/runtime.ts`
- `src/types/game-state.ts`
