# 当前 Boss 数值

## Purpose

记录当前 Boss 出场、阶段、AI 行为、召唤、投射物、专属技能和血量曲线。

## Current State

当前 Boss 是单例配置，没有 Boss 注册表，也没有 Boss 击杀次数或幕数状态。Boss 死亡奖励和重生计时分散在多个伤害分支中处理。

## Key Formulas

出场：

| 项 | 当前值 |
| --- | ---: |
| 初始 Boss 计时器 | `28s` |
| 最早允许时间 | `elapsed > 18s` |
| 实际首个 Boss 出场 | 通常约 `28s` |
| 生成 X | `WIDTH + 140` |
| 目标 X | `WIDTH - 170 = 790` |
| 入场速度 | `-2.6` |
| 入场后 AI 延迟 | `32` 帧 |
| 碰撞体 | `104 x 188` |
| 生命 | `460 + elapsed * 2.2` |

如果 Boss 在 `28s` 生成，生命约为 `521.6`。

阶段：

| 阶段 | 条件 | 接触伤害 | AI 冷却 |
| --- | --- | ---: | ---: |
| 1 | 初始 | `14` | `86` 帧 |
| 2 | 生命低于 `66%` | `16` | `72` 帧 |
| 3 | 生命低于 `33%` | `18` | `58` 帧 |

接触伤害：

```ts
12 + phase * 2
```

AI 冷却：

```ts
100 - phase * 14
```

移动与 AI：

| 行为 | 当前规则 |
| --- | --- |
| 横向追踪力 | `0.08 + phase * 0.02` |
| 横向阻尼 | `0.94` |
| 最大速度 | `4.8 + phase` |
| 跳跃/冲刺概率 | 每帧 `0.03 * phase` |
| 跳跃/冲刺加速 | `6 + phase` |
| 跳跃/冲刺冷却 | `34` 帧 |
| 发弹幕概率 | 阶段 2+ 时 `55%` |
| 召唤小怪 | 非弹幕分支召唤 1 只，阶段 3 额外 1 只 |

弹幕：

| 项 | 当前值 |
| --- | ---: |
| 数量 | 等于当前阶段 |
| 子弹尺寸 | `12 x 8` |
| 基础速度 | `5.2` |
| 速度递增 | 每枚 `+0.6` |
| 寿命 | `90` 帧 |
| 伤害 | `8 + phase` |

Boss 技能 1：

| 项 | 当前值 |
| --- | ---: |
| 初始冷却 | `150` 帧 |
| 后续冷却 | `260` 帧 |
| 施法时长 | `54` 帧 |
| 特效生成时间 | 第 `28` 帧 |
| 特效速度 | `16` |
| 特效重力 | `0.45` |
| 特效伤害 | `Boss 接触伤害 x 2` |
| 玩家命中冷却 | `24` 帧 |
| 敌人命中冷却 | `18` 帧 |
| 最低阶段 | `1` |

各阶段技能伤害：

| 阶段 | 伤害 |
| --- | ---: |
| 1 | `28` |
| 2 | `32` |
| 3 | `36` |

Boss 死亡后：

- 玩家得分增加 `220`。
- 技能能量增加 `60`。
- 大招能量增加 `40`。
- `state.boss = null`。
- `state.bossSpawnTimer = PLAYER_COMBAT.skillChargeResetDelay`，当前实际作为 `45s` 重生延迟使用。

当前未使用的 Boss 绘制偏移常量：

- `BOSS_CONFIG.drawOffsetX`
- `BOSS_CONFIG.drawOffsetY`
- `BOSS_SKILL1_CONFIG.drawOffsetX`
- `BOSS_SKILL1_CONFIG.drawOffsetY`

## Code Sources

- `src/constants/combat.ts`
- `src/constants/assets.ts`
- `src/constants/runtime.ts`
- `src/entities/boss.ts`
- `src/entities/player.ts`
- `src/entities/particle.ts`
- `src/entities/projectile.ts`
- `src/runtime.ts`
