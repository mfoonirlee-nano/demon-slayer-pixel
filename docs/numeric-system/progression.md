# 经验与局内成长

> 实现状态：目标设计，未实现。当前源码没有经验、等级或升级三选一状态。

## Purpose

定义经验、等级、升级三选一和局内成长边界。

## Target Design

新增局内成长状态：

```ts
runXp: number;
runLevel: number;
pendingUpgradeChoices: UpgradeChoice[];
```

经验只服务单局内升级，重开后清空。升级时暂停成长结算并提供三选一奖励，玩家选择后立即生效。

成长边界：

- 不引入局外永久属性。
- 升级奖励不能绕过攻击上限、技能能量上限和最大生命上限的定义。
- 经验和装备分工明确：经验提供稳定小幅成长，Boss 掉落装备提供更明显的构筑方向。
- 技能解锁可以读取 `act`，但不依赖经验等级单独推进。

## Key Formulas

经验来源建议：

| 来源 | XP |
| --- | ---: |
| `chaser` | `6` |
| `runner` | `7` |
| `brute` | `12` |
| `caster` | `10` |
| Boss | `45 + bossKills * 8` |

升级需求建议：

```ts
xpToNextLevel = floor(55 + runLevel * 28 + runLevel ** 1.35 * 14)
```

升级处理：

```ts
runXp -= xpToNextLevel
runLevel += 1
pendingUpgradeChoices = rollThreeUpgradeChoices(act, runLevel)
```

三选一奖励池第一版：

| 类型 | 效果 | 边界 |
| --- | --- | --- |
| 攻击训练 | `attackBonus + 2` | 不超过动态攻击加成上限 |
| 体魄训练 | `maxHp + 8` 且治疗 `8` | 单局最大生命上限建议 `160` |
| 呼吸蓄力 | 技能能量上限 `+6` | 单局上限建议 `120` |
| 集中爆发 | 大招能量获取 `+8%` | 叠加上限建议 `+32%` |
| 技能专精 | 当前技能额外特效伤害 `+8%` | 单技能上限建议 `+24%` |

## Code Sources

目标落地点：

- `src/types/game-state.ts`
- `src/state.ts`
- `src/entities/player.ts`
- `src/entities/enemy.ts`
- `src/entities/boss.ts`
- `src/App.tsx`

## Implementation Notes

- 先把 Boss 和敌人死亡统一到奖励 helper，再接入 XP，避免多个击杀分支漏加经验。
- `pendingUpgradeChoices` 应阻止重复发放；选择完成后清空。
- 三选一 UI 只展示可执行选项，不把未解锁技能或未接入素材放入候选。
- 第一版只做局内成长，不扩展局外存档。
