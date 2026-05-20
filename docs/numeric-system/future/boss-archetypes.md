# 未来 Boss 类型与技能池

## Purpose

定义未来 Boss 注册表、血量曲线、技能池、召唤池和 Boss 击杀循环。该文档是目标设计，当前源码仍是单例 Boss。

## Target Design

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

Boss 死亡统一入口：

```ts
defeatBoss()
```

所有 Boss 死亡路径都调用它，包括普攻、下落攻击、技能瞬时伤害、技能特效、大招和防守反击。

## Key Formulas

Boss 血量：

```ts
bossHp = baseHp + bossKills * hpPerCycle + elapsed * 0.35
```

Boss AI 冷却：

```ts
aiCooldown = clamp(baseCooldown - phase * phaseReduction - bossKills * 5, 42, baseCooldown)
```

Boss 重生节奏：

| Boss 击杀数 | 下一轮 Boss 间隔 |
| ---: | ---: |
| 0 | 首轮约 `40s` 出场 |
| 1 | `32s` |
| 2 | `28s` |
| 3+ | `24s`，最低不再降低 |

阶段行为：

| 轮次 | 行动池 |
| --- | --- |
| 第 1 轮 | 接近当前体验：移动、接触、单技能、少量召唤 |
| 第 2 轮 | 提高召唤频率，引入 `runner` |
| 第 3 轮 | 提高弹幕密度，引入 `brute` / `caster` |
| 第 4 轮+ | 根据 Boss archetype 混合多个技能和召唤池 |

Boss 技能解锁建议：

| 技能类型 | 解锁 |
| --- | --- |
| 单向斩波 | `act >= 1` |
| 多段投射物 | `act >= 2` |
| 召唤强化 | `act >= 2` |
| 区域封锁 | `act >= 3` |
| 组合技能 | `act >= 4` |

## Code Sources

目标落地点：

- `src/constants/assets.ts`
- `src/constants/combat.ts`
- `src/types/game-state.ts`
- `src/entities/boss.ts`
- `src/entities/enemy.ts`
- `src/entities/player.ts`
- `src/runtime.ts`

## Implementation Notes

- 新 Boss 第一版等待正式素材接入，不使用临时图形占位。
- 当前 Boss 可作为第一个 archetype 迁入注册表，保持首轮体验基本不变。
- 必须先集中 Boss 死亡逻辑，否则 `bossKills`、装备掉落、经验和重生计时容易重复或漏处理。
- Boss 技能冷却必须有最低值，避免后期连续施法导致不可解。

