# 奖励与资源数值

> 实现状态：已实现。本文记录当前源码中已经生效的奖励和资源数值。

## Purpose

记录当前得分、技能能量、大招能量、水晶、宝箱和奖励预算规则。未实现的经验成长见 [progression.md](progression.md)，未实现的装备掉落见 [equipment.md](equipment.md)。

## Current State

当前奖励都属于单局内即时收益。攻击奖励只提高 `attackBonus`，治疗奖励只恢复当前生命；没有局外成长或 Boss 掉落三选一。

## Key Formulas

击杀奖励：

| 事件 | 得分 | 技能能量 | 大招能量 |
| --- | ---: | ---: | ---: |
| 普通攻击/下落攻击击杀小怪 | `10` | `10` | `8 / 3` |
| 技能/技能特效/大招击杀小怪 | `12` | `10` | `8 / 3` |
| 击杀 Boss | `220` | `60` | `40` |

能量上限：

```ts
skillEnergy = min(skillEnergyMax, skillEnergy + gain)
skillCharges = min(maxSkillCharges, floor(skillEnergy / 30))
ultimateEnergy = min(ultimateEnergyMax, ultimateEnergy + gain)
```

水晶：

| 项 | 当前值 |
| --- | ---: |
| 基础生成概率 | `45%` |
| 危险平台额外概率 | `+18%` |
| 攻击水晶概率 | `55%` |
| 攻击水晶效果 | `attackBonus + 2`，不超过 `24` |
| 生命水晶效果 | 治疗 `24` |

宝箱：

| 项 | 当前值 |
| --- | ---: |
| 触发方式 | `rewardDebt >= 4.8` |
| 攻击/治疗概率 | `50% / 50%` |
| 攻击效果 | `attackBonus + 6`，不超过 `24` |
| 治疗效果 | 治疗 `48` |

奖励预算：

| 项 | 当前值 |
| --- | ---: |
| 每个片段增加 | `1` |
| 风险奖励片段额外增加 | `0.8` |
| 水晶兜底阈值 | `1.7` |
| 宝箱阈值 | `4.8` |

生成规则：

- 每次生成地图片段时 `rewardDebt += 1`。
- `rewardRisk` 片段额外 `rewardDebt += 0.8`。
- 如果达到宝箱阈值，生成宝箱并清空奖励预算。
- 否则，如果达到水晶兜底阈值或命中随机概率，则生成水晶并扣除 `1.7` 奖励预算。

当前未使用的奖励常量：

- `CHEST_CONFIG.spawnEvery`
- `CHEST_CONFIG.spawnVariance`

## Code Sources

- `src/constants/combat.ts`
- `src/constants/platform.ts`
- `src/entities/player.ts`
- `src/entities/platform.ts`
- `src/entities/particle.ts`
