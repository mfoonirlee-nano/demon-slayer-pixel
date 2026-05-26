# 经验与局内成长

> 实现状态：目标设计，未实现。当前源码没有经验、等级或升级三选一状态；本文是后续实现依据，不表示功能已经接入。

## Purpose

定义经验、等级、升级三选一和局内成长边界。

## Target Design

经验系统只提供单局内成长。每局开始时等级和经验重置，重开后不保留。

新增运行时状态：

```ts
runXp: number;
runLevel: number;
pendingUpgradeChoices: UpgradeChoice[];
```

推荐初始值：

```ts
runXp = 0;
runLevel = 1;
pendingUpgradeChoices = [];
```

升级流程：

1. 击杀敌人或 Boss 时获得 XP。
2. 如果 `runXp >= xpToNextLevel`，扣除当前等级需求并提升 `runLevel`。
3. 每次升级生成 3 个可选奖励，写入 `pendingUpgradeChoices`。
4. 存在待选升级奖励时暂停战斗和实体更新，等待玩家选择。
5. 玩家选择 1 个奖励后立即生效，清空当前选择。
6. 如果剩余 `runXp` 仍满足下一等级需求，继续弹出下一次三选一。

连续升级处理应一次只展示一组三选一，避免多个升级奖励同时堆叠在 UI 上。战斗暂停期间不继续推进 `elapsed`、刷怪、Boss AI、平台移动、投射物、碰撞或奖励拾取。

成长边界：

- 不引入局外永久属性。
- 升级奖励不能绕过攻击上限、技能能量上限和最大生命上限的定义。
- 经验和装备分工明确：经验提供稳定小幅成长，Boss 掉落装备提供更明显的构筑方向。
- 技能解锁可以读取 `act`，但不依赖经验等级单独推进。
- 升级三选一和 Boss 装备三选一应分队列处理，同一时间只展示一个选择 overlay。

## Key Formulas

经验来源：

| 来源 | XP |
| --- | ---: |
| `chaser` | `6` |
| `runner` | `7` |
| `brute` | `12` |
| `caster` | `10` |
| Boss | `45 + bossKills * 8` |

升级需求：

```ts
xpToNextLevel = floor(55 + runLevel * 28 + runLevel ** 1.35 * 14)
```

`runLevel` 使用升级前的当前等级计算。例如 `runLevel = 1` 时，升到 2 级需要：

```ts
floor(55 + 1 * 28 + 1 ** 1.35 * 14) // 97
```

升级处理：

```ts
while (runXp >= xpToNextLevel(runLevel) && pendingUpgradeChoices.length === 0) {
  runXp -= xpToNextLevel(runLevel);
  runLevel += 1;
  pendingUpgradeChoices = rollThreeUpgradeChoices(act, runLevel);
}
```

选择完成后再次检查是否可以升级。不要在已有 `pendingUpgradeChoices` 时继续扣经验或提升等级。

三选一奖励池第一版：

| 类型 | 效果 | 默认上限 |
| --- | --- | --- |
| 攻击训练 | `attackBonus + 2` | 不超过动态攻击加成上限 |
| 体魄训练 | `maxHp + 8`，并治疗 `8` | `maxHp <= 160` |
| 呼吸蓄力 | `skillEnergyMax + 6` | `skillEnergyMax <= 120` |
| 集中爆发 | 大招能量获取 `+8%` | 叠加加成 `<= +32%` |
| 技能专精 | 当前技能额外特效伤害 `+8%` | 单技能加成 `<= +24%` |

奖励生成规则：

- 每次升级从当前可执行奖励中随机 3 个不同选项。
- 达到默认上限的奖励不进入候选池。
- 未解锁技能或未接入效果的奖励不进入候选池。
- 如果可选项不足 3 个，优先降级为 2 个或 1 个可执行选项，不展示无效选项。
- 选择奖励时再次夹取数值，避免同帧内其他系统改变上限后越界。

数值边界：

```ts
attackBonus = min(attackBonusCap, attackBonus + 2);
maxHp = min(160, maxHp + 8);
hp = min(maxHp, hp + 8);
skillEnergyMax = min(120, skillEnergyMax + 6);
ultimateEnergyGainMultiplier = min(1.32, ultimateEnergyGainMultiplier + 0.08);
currentSkillBonusMultiplier = min(1.24, currentSkillBonusMultiplier + 0.08);
```

`attackBonusCap` 使用装备系统文档中的动态攻击上限定义；如果装备系统尚未实现，第一版可以沿用当前攻击加成上限 `24`。

## Input and UI

HUD 要求：

- 常驻显示当前 `runLevel`。
- 常驻显示当前 XP 和下一级 XP 需求。
- XP 显示应在满级或无下一等级配置时有明确状态；第一版没有满级时持续使用公式增长。

升级 overlay 要求：

- 存在 `pendingUpgradeChoices` 时显示 3 个升级奖励选项。
- 每个选项展示名称、数值效果和当前叠加/上限状态。
- overlay 显示期间暂停战斗画面更新，但保留当前画面作为背景。
- 选择后立即关闭 overlay；如果连续升级，下一组 overlay 随后出现。

输入方式：

| 输入 | 行为 |
| --- | --- |
| 鼠标点击 | 选择对应奖励 |
| 触屏点击 | 选择对应奖励 |
| `1` | 选择第 1 个奖励 |
| `2` | 选择第 2 个奖励 |
| `3` | 选择第 3 个奖励 |

键盘输入只在升级 overlay 打开时生效；没有对应选项时忽略。

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
