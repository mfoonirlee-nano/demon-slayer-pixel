# 普通敌人数值

> 实现状态：已实现。本文记录当前源码中已经生效的普通敌人数值。

## Purpose

记录当前普通敌人的生成、生命、伤害、速度成长和素材选择方式。未实现的敌人类型注册表和生成权重见 [enemy-archetypes.md](enemy-archetypes.md)。

## Current State

当前普通敌人只有一套数值和 AI。生成时会随机选择一个敌人贴图，但所有贴图共享同一套生命、伤害、速度、追踪和奖励规则。

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
| 生命 | `16 + elapsed * 0.3` |
| 接触伤害 | `min(20, 3 + elapsed * 0.1)` |
| 初始速度 | `0.72 + random(0..1.08) + elapsed / 60` |
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
- 当前 `ENEMY_SHEETS` 包含 `chaser.png`、`crawler.png`、`runner_approach.png`、`caster_move.png`、`duelist.png`、`brute_advance.png` 六个表。
- 绘制缩放由 `ENEMY_DRAW_SCALE = 120 / ENEMY_SHEETS[1].frameW` 决定。

## Code Sources

- `src/constants/combat.ts`
- `src/constants/assets.ts`
- `src/constants/runtime.ts`
- `src/entities/enemy.ts`
- `src/runtime.ts`
- `src/types/game-state.ts`
