# 奖励与资源数值

> 实现状态：已实现。本文记录当前源码中已经生效的击杀奖励、残灵储存与消耗规则。

## Purpose

记录当前得分、技能能量、大招能量和残灵规则。经验成长和每幕升级节奏见 [progression.md](progression.md)，装备掉落见 [equipment.md](equipment.md)。

## Current State

当前普通敌人奖励由击杀产生：玩家击杀敌人时获得得分、技能能量、XP，并让敌人在原地掉落可拾取的残灵；已习得终式后还会获得大招能量。残灵拾取后只进入单局储存器，不会立刻恢复生命，也不会提高攻击。

玩家按 `H` 可开始 `0.6s` 引灵：引灵完成后消耗 `20` 点残灵并恢复 `15%` 最大生命。满生命、残灵不足、玩家死亡或已有引灵进行中时不能再次开始。残灵、装备和其他单局资源不会带入下一局，并在重开时清空；当前没有局外战力成长。

Boss 击杀会给装备三选一，但不会掉落终式；`习得终式` 只会随角色升级进入三选一候选。

## Key Formulas

击杀奖励：

| 事件 | 得分 | 技能能量 | 大招能量 |
| --- | ---: | ---: | ---: |
| 普通攻击/下落攻击击杀小怪 | `10` | `10` | 已习得终式后 `8 / 3` |
| 技能/技能特效/大招击杀小怪 | `12` | `10` | 已习得终式后 `8 / 3` |
| 击杀 Boss | `220` | `60` | 已习得终式后 `40` |

普通敌人残灵掉落量：

| 敌人类别 | 残灵 |
| --- | ---: |
| splitter 分裂体 | `1` |
| 复杂度 T1 | `3` |
| 复杂度 T2 | `4` |
| 复杂度 T3 | `5` |
| 复杂度 T4 | `5` |
| elite | `8` |

`elite` 的固定值优先于复杂度档位。只有走正常玩家击杀奖励入口的死亡会生成残灵；例如 Boss 造成且标记为 `reward: "none"` 的敌人死亡不会掉落。

残灵储存与治疗：

| 项 | 当前值 |
| --- | ---: |
| 储存上限 | `60` |
| 单次治疗消耗 | `20` |
| 引灵时间 | `0.6s` |
| 单次恢复 | `maxHp * 15%` |
| 操作 | `H` |

```ts
stored = min(60, stored + pickedUpAmount)
heal = maxHp * 0.15
```

储存已满时不会继续吸收超出容量的残灵。引灵完成时会再次检查玩家存活、生命未满且残灵足够；条件不成立时不扣残灵，也不治疗。治疗结果不超过 `maxHp`。

终式习得：

| 项 | 当前值 |
| --- | ---: |
| 触发方式 | 角色升级时，玩家尚未习得终式 |
| 升级候选 | `习得终式`，选择后 `ultimateLevel = 1` |
| Boss 击杀 | 不产生终式学习奖励 |
| 未习得时 | 不获得大招能量，HUD 不显示 ready，不能释放大招 |

能量上限：

```ts
skillEnergy = min(skillEnergyMax, skillEnergy + gain)
skillCharges = min(maxSkillCharges, floor(skillEnergy / 30))
ultimateEnergy = min(ultimateEnergyMax, ultimateEnergy + gain)
```

## HUD Contract

残灵储存器使用六颗祈念珠/灵龛承载位表达 `0-60` 容量，而不是普通横向槽。每个承载位对应 `10` 点容量，局部填充显示当前十点区间的进度；数值文字负责精确读数。引灵期间 HUD 显示 `0.6s` 的施法进度，移动端与键盘共用同一套治疗入口。

## Removed Reward Path

旧版平台攻击/生命水晶、攻击/治疗宝箱、`rewardDebt` 奖励预算和平台奖励投放均已移除。`riskFork` 只表示“安全主路 + 高风险支路”的地形结构，不再承载或提高奖励概率。

## Code Sources

- `src/constants/residualSpirit.ts`
- `src/entities/residualSpirit.ts`
- `src/entities/enemies/defeat.ts`
- `src/systems/residualSpirit.ts`
- `src/game/input.ts`
- `src/game/state.ts`
- `src/ui/gameHud.tsx`
