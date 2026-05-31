# 经验与局内成长

> 实现状态：目标设计，未实现。当前源码没有经验、角色等级、普通技能等级、大招强化等级或升级三选一状态；本文是后续实现依据，不表示功能已经接入。

## Purpose

定义经验、角色等级、普通技能等级、大招强化等级、升级三选一和局内成长边界。

## Target Design

经验系统只提供单局内成长。每局开始时经验、角色等级、普通技能等级和大招强化等级重置，重开后不保留。

新增运行时状态：

```ts
runXp: number;
runLevel: number;
skillLevels: Record<SkillId, 1 | 2 | 3>;
ultimateLevel: number;
pendingUpgradeChoices: UpgradeChoice[];
```

推荐初始值：

```ts
runXp = 0;
runLevel = 1;
skillLevels = {
  skill1: 1,
  skill2: 1,
  skill3: 1,
};
ultimateLevel = 0;
pendingUpgradeChoices = [];
```

已解锁普通技能初始等级为 Lv1，最高提升到 Lv3；后续新解锁技能进入本局时也从 Lv1 开始。

`ultimateLevel = 0` 表示本局尚未获得“大招强化”奖励；第一次选择后进入 Lv1，后续最高提升到 Lv3。

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
- 普通技能等级只在当前局内生效，每个技能独立记录，初始 Lv1，上限 Lv3，死亡或重开后清空回 Lv1。
- 大招强化等级只在当前局内生效，`ultimateLevel` 上限为 `3`，死亡或重开后清空回 `0`。
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
| 终式精进 | `ultimateLevel + 1` | `ultimateLevel <= 3` |
| 技能精进 | 指定已解锁普通技能等级 `+1` | 单技能等级 `<= 3` |

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
ultimateLevel = min(3, ultimateLevel + 1);
skillLevels[chosenSkillId] = min(3, skillLevels[chosenSkillId] + 1);
```

`attackBonusCap` 使用装备系统文档中的动态攻击上限定义；如果装备系统尚未实现，第一版可以沿用当前攻击加成上限 `24`。

普通技能等级：

| 等级 | 定位 | 成长方向 |
| --- | --- | --- |
| Lv1 | 基础形态 | 技能拥有完整功能，满足该技能的核心定位 |
| Lv2 | 稳定强化 | 小幅提高伤害、命中反馈或关键效果稳定性 |
| Lv3 | 专精形态 | 强化该技能最核心的战术价值，但不改变技能类型 |

普通技能等级奖励必须绑定一个具体 `skillId`，例如 `skill1` 的 `水龙破精进`。达到 Lv3 的技能不进入候选池。技能等级成长字段由 `SKILL_DEFS` 按技能类型定义，可以包含：

- `damageMultiplier`。
- `effectScale` 或命中形状小幅修正。
- `effectDuration`，仅适用于控场、防反或破甲类技能。
- `resourceRefund` 或击杀返还，必须有上限。
- `bossEffectMultiplier`，用于限制控场、破甲、反击对 Boss 的强度。

大招强化等级：

| 等级 | 定位 | 成长方向 |
| --- | --- | --- |
| Lv1 | 基础月潮状态 | 小幅提升移动速度、跳跃能力、普攻节奏和伤害，普攻生成短促残影水刃 |
| Lv2 | 稳定强化状态 | 延长持续时间，残影水刃触发更稳定，移动和跳跃提升更明显 |
| Lv3 | 终阶爆发状态 | 残影斩命中反馈和追加伤害更强，但仍保留有限持续时间 |

后续实现字段先按趋势定义，不在本文锁死具体数值：

- `duration` 随等级增加。
- `moveSpeedMultiplier` 随等级增加。
- `jumpMultiplier` 或空中控制随等级增加。
- `attackSpeedMultiplier` 随等级增加。
- `damageMultiplier` 和残影追加伤害随等级增加。
- 大招期间不提供长期无敌；如需保护，只允许开启动作短暂抗打断或减伤。

## 长局奖励池防枯竭（13 幕）

一次完整 1→13 清版约 18-22 分钟，`runLevel` 会被推到约 `20-30`。若上限固定，中后期升级会频繁出现「无可选项」或全是无效选项，三选一失去意义。解决办法是让上限随 `actBand` 放宽，并补一档随幕解锁的高阶选项，而不是无限叠加单一属性。

上限随 `actBand` 放宽（仍是单局内、死亡清空，不违反「无局外永久战力」）：

| 选项 | intro（1-6） | awakened（7-12） | final（13） |
| --- | --- | --- | --- |
| 攻击训练 | `+2` / cap 走 `attackBonusCap` | `+3` / cap 走 `attackBonusCap` | `+3` |
| 体魄训练 | `maxHp <= 160` | `maxHp <= 200` | `maxHp <= 220` |
| 呼吸蓄力 | `skillEnergyMax <= 120` | `skillEnergyMax <= 150` | `skillEnergyMax <= 160` |
| 集中爆发 | 叠加 `<= +32%` | 叠加 `<= +48%` | 叠加 `<= +56%` |
| 终式精进 | `ultimateLevel <= 3` | `ultimateLevel <= 3` | `ultimateLevel <= 3` |
| 技能精进 | 单技能 `<= Lv3` | 单技能 `<= Lv3` | 单技能 `<= Lv3` |

```ts
// 上限随 actBand 提高；rollThreeUpgradeChoices 已传入 act，可直接派生 actBand
function upgradeCaps(actBand) {
  switch (actBand) {
    case "intro":    return { maxHp: 160, skillEnergyMax: 120, ultMul: 1.32, skillLevelMax: 3 };
    case "awakened": return { maxHp: 200, skillEnergyMax: 150, ultMul: 1.48, skillLevelMax: 3 };
    case "final":    return { maxHp: 220, skillEnergyMax: 160, ultMul: 1.56, skillLevelMax: 3 };
  }
}
```

防枯竭规则：

- 候选池按当前 `actBand` 的上限判定是否「已满」，未满才进池——觉醒幕放宽上限后，前期已满的选项会重新进入候选。
- 仍保留「可选项不足 3 个就降级为 2/1 个」的回退，但放宽上限后正常局应几乎不触发。
- 玩家强度上限随 `actBand` 抬升，必须与 [act-and-threat.md](act-and-threat.md) 的分段 `threatScalar` 一起核对强度比（见 [../game-design/balance-acceptance.md](../game-design/balance-acceptance.md)），确保觉醒幕是「陡但可解」。

## Input and UI

HUD 要求：

- 常驻显示当前 `runLevel`。
- 常驻显示当前 XP 和下一级 XP 需求。
- XP 显示应在满级或无下一等级配置时有明确状态；第一版没有满级时持续使用公式增长。

升级 overlay 要求：

- 存在 `pendingUpgradeChoices` 时显示 3 个升级奖励选项。
- 每个选项展示名称、数值效果和当前叠加/等级上限状态。
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
