# 装备系统

> 实现状态：目标设计，未实现。当前源码没有装备槽位、装备掉落或装备属性派生。

## Purpose

定义装备槽位、Boss 掉落三选一、装备属性和派生数值。

## Target Design

装备是单局内构筑奖励，主要由 Boss 击杀后掉落。每次 Boss 死亡生成三件候选装备，玩家选择一件进入对应槽位。

推荐槽位：

| 槽位 | 定位 |
| --- | --- |
| `weapon` | 攻击、技能伤害、Boss 伤害方向 |
| `haori` | 生命、防御、受伤容错方向 |
| `charm` | 技能能量、大招能量、资源循环方向 |

推荐状态：

```ts
equipment: {
  weapon?: EquipmentItem;
  haori?: EquipmentItem;
  charm?: EquipmentItem;
};
pendingEquipmentChoices: EquipmentItem[];
```

Boss 掉落：

- 每次 Boss 击杀后生成 3 个装备选项。
- 选项按当前 `act`、`bossKills` 和 Boss archetype 权重生成。
- 同槽位新装备可以替换旧装备。
- 不生成没有正式素材或未配置效果的装备。

13 幕一共 13 次 Boss 击杀对 3 个槽位 = 替换式构筑：后期掉落必须比前期更强，否则中后期换装无意义。装备**品质分级随 `actBand` 提升**（仍是单局内、死亡清空）：

| 品质 | 掉落幕段（actBand） | 属性带 | 说明 |
| --- | --- | --- | --- |
| 普通（白） | intro 1-6 | 属性池下限～中段 | 教学期，给方向感而非碾压 |
| 精良（蓝） | awakened 7-12 | 属性池中段～上限 | 匹配觉醒幕更高威胁 |
| 觉醒（金） | final 13 | 属性池上限 + 一条额外词条 | 终幕掉落，仍只在本局生效 |

```ts
// Boss 掉落时按 actBand 决定品质带，再在带内 roll 具体数值
function equipmentTier(actBand) {
  return actBand === "final" ? "awakened"
       : actBand === "awakened" ? "fine"
       : "common";
}
```

## Key Formulas

动态攻击上限建议：

```ts
attackBonusCap = 24 + bossKills * 8 + equipmentCapBonus
```

13 幕强度核对：`bossKills` 在终幕前最大为 `12`，对应 `attackBonusCap = 24 + 96 = 120`（不含装备额外上限）。这条上限必须和 [act-and-threat.md](act-and-threat.md) 的分段 `threatScalar`（觉醒幕从 `bossKills=6` 起每次击杀 `+0.34`）一起核对玩家/敌人强度比：目标是觉醒幕「陡但可解」、终幕「巅峰但可解」，而非攻击上限跑赢威胁导致后期无脑碾压。核对口径与逐幕比值见 [../game-design/balance-acceptance.md](../game-design/balance-acceptance.md)。

派生攻击：

```ts
totalAttack = baseAttack + min(attackBonus, attackBonusCap) + equipmentAttackFlat
```

技能消耗：

```ts
skillEnergyCost = clamp(30 - equipmentSkillCostReduction, 24, 30)
```

装备属性池第一版：

| 槽位 | 属性 | 建议范围 |
| --- | --- | ---: |
| `weapon` | `attackFlat` | `+4` / `+7` / `+10` |
| `weapon` | `skillDamageMultiplier` | `+8%` 到 `+16%` |
| `weapon` | `bossDamageMultiplier` | `+6%` 到 `+12%` |
| `haori` | `maxHpFlat` | `+12` / `+20` / `+28` |
| `haori` | `damageReduction` | `5%` 到 `12%` |
| `haori` | `hurtInvincibleBonusFrames` | `+3` 到 `+8` |
| `charm` | `skillEnergyGainFlat` | `+2` 到 `+5` |
| `charm` | `ultimateEnergyGainMultiplier` | `+8%` 到 `+20%` |
| `charm` | `skillCostReduction` | `1` 到 `6` |

三档数值（如 `+4 / +7 / +10`）对应上面的普通 / 精良 / 觉醒品质带；`actBand` 决定 roll 落在哪一档。

## Code Sources

目标落地点：

- `src/types/game-state.ts`
- `src/state.ts`
- `src/entities/player.ts`
- `src/entities/enemy.ts`
- `src/entities/boss.ts`
- `src/App.tsx`

## Implementation Notes

- 装备属性只影响数值派生，不在多个伤害分支里手写重复倍率。
- Boss 掉落选择应与经验升级选择分开，避免同一时刻出现两个未处理选择队列。
- 如果装备会改变最大生命，替换装备时需要重新夹取当前生命。
- 第一版使用正式装备配置和 UI 文案即可；没有正式装备图标时先不接入图标占位。
