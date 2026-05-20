# 未来敌人类型与生成权重

## Purpose

定义未来普通敌人 archetype、生成权重、技能随进度解锁和素材接入边界。该文档是目标设计，当前源码仍是单一敌人数值与 AI。

## Target Design

普通敌人进入注册表：

```ts
ENEMY_ARCHETYPES
```

第一版核心类型：

| 类型 | 定位 | 行为 | 推荐出现阶段 |
| --- | --- | --- | --- |
| `chaser` | 基础追击 | 向玩家移动，数值稳定 | 第 1 幕 |
| `runner` | 快攻压力 | 低血、高速、低伤，迫使快速处理 | 第 2 幕 |
| `brute` | 高血目标 | 高血、低速、高伤，压迫空间 | 第 3 幕 |
| `caster` | 远程施压 | 保持距离，周期性发射投射物 | 第 3 幕 |

配置形态建议：

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

## Key Formulas

生成权重建议：

| 幕 | chaser | runner | brute | caster |
| --- | ---: | ---: | ---: | ---: |
| 1 | `1.00` | `0` | `0` | `0` |
| 2 | `0.65` | `0.35` | `0` | `0` |
| 3 | `0.42` | `0.25` | `0.18` | `0.15` |
| 4+ | `0.34` | `0.25` | `0.22` | `0.19` |

生成节奏建议：

```ts
enemySpawnInterval = clamp(1.15 - bossKills * 0.08 - elapsed * 0.0015, 0.42, 1.15)
enemyMaxCount = Math.min(10 + bossKills * 2, 24)
```

敌人生命建议读取统一威胁值：

```ts
enemyHp = archetype.baseHp * threatScalar + elapsed * archetype.hpScale
```

敌人技能解锁：

| 类型 | 解锁规则 |
| --- | --- |
| `runner` 冲刺 | `act >= 2` |
| `brute` 霸体短窗 | `act >= 3` |
| `caster` 投射物 | `act >= 3` |
| 精英变体 | `act >= 4` 且低概率出现 |

## Code Sources

目标落地点：

- `src/constants/assets.ts`
- `src/constants/combat.ts`
- `src/types/game-state.ts`
- `src/entities/enemy.ts`
- `src/entities/projectile.ts`
- `src/runtime.ts`

## Implementation Notes

- 新敌人第一版等待正式素材接入，不使用临时图形占位。
- 素材未接入前，只做配置级或无渲染数值验证，不进入实际生成池。
- 击杀奖励应从 archetype 读取，不再由所有敌人共享同一套固定奖励。
- `caster` 可以复用现有 projectile 状态，但投射物来源和伤害应来自敌人配置。
