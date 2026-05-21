# 时间成长与运行时缩放

> 实现状态：已实现。本文记录当前源码中已经生效的运行时缩放公式。

## Purpose

记录当前刷怪间隔、Boss 出场计时、平台速度和地图时间成长公式。未实现的幕数和威胁值驱动缩放见 [act-and-threat.md](act-and-threat.md)。

## Current State

当前难度主要随 `elapsed` 线性增长。普通敌人、Boss 血量、平台速度和地图片段权重各自读取时间，没有统一威胁值。

## Key Formulas

普通敌人刷怪：

```ts
enemySpawnInterval = max(0.38, 1.2 - elapsed * 0.012)
```

运行时条件：

- 只有 `!state.boss` 且 `spawnTimer <= 0` 时常规刷怪。
- 生成后重新设置 `spawnTimer`。
- 最大同时存在敌人数为 `12`。

Boss 出场：

| 项 | 当前值 |
| --- | ---: |
| 初始 Boss 计时器 | `28s` |
| 最早允许时间 | `elapsed > 18s` |
| Boss 存在后计时器 | `9999` |
| Boss 死亡后重生计时 | `45s` |

出场条件：

```ts
!state.boss && bossSpawnTimer <= 0 && elapsed > 18
```

Boss 死亡后的 `45s` 来自 `PLAYER_COMBAT.skillChargeResetDelay`。该常量名像帧数延迟，但运行时按秒递减。

Boss 血量：

```ts
bossHp = 460 + elapsed * 2.2
```

普通敌人成长：

```ts
enemyHp = 16 + elapsed * 0.3
enemyDamage = min(20, 3 + elapsed * 0.1)
enemyInitialSpeed = 0.72 + random(0..1.08) + elapsed / 60
```

平台速度：

```ts
platformVx = -(1.4 + random(0..0.9) + elapsed * 0.02)
```

地图片段难度：

```ts
difficulty = clamp(elapsed / 120, 0, 1)
```

平台生成间隔：

```ts
targetGap = lerp(280, 205, difficulty)
expectedPixelsPerSecond = (1.4 + 0.9 / 2 + elapsed * 0.02) * 60
base = targetGap / expectedPixelsPerSecond
jitter = lerp(0.35, 0.16, difficulty)
interval = base * (1 + random * jitter)
```

最终间隔限制在 `0.62s` 到 `3.2s`。Boss 存在时额外增加 `0.25s`。

地图片段权重当前按时间过渡，`tension` 过高时提高 `breather` 和 `safeBridge` 权重，降低高压片段权重。

平台层级：

| 层级 | Y 范围 |
| --- | --- |
| `low` | `366-367` |
| `mid` | `274-275` |
| `high` | `182-183` |
| `top` | `90-91` |

层级转移偏向相邻层，避免平台生成到角色不可达的高度。

片段类型：

| 类型 | 作用 |
| --- | --- |
| `breather` | 宽平台，降低压力 |
| `safeBridge` | 常规单平台 |
| `stairUp` | 逐步上升 |
| `stairDown` | 逐步下降 |
| `zigzag` | 三个平台上下折返 |
| `gapJump` | 链式跳跃平台 |
| `hoverPair` | 两个错相位悬浮平台 |
| `rewardRisk` | 安全主路加高风险奖励平台 |

当前未使用的运行时平台间隔常量：

- `RUNTIME_CONFIG.platformSpawnBaseInterval`
- `RUNTIME_CONFIG.platformSpawnRandomInterval`

## Code Sources

- `src/constants/runtime.ts`
- `src/constants/platform.ts`
- `src/constants/combat.ts`
- `src/runtime.ts`
- `src/entities/enemy.ts`
- `src/entities/boss.ts`
- `src/entities/platform.ts`
