# 未来装备系统

## Purpose

定义未来装备槽位、Boss 掉落三选一、装备属性和派生数值。该文档是目标设计，当前源码未实现装备系统。

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

## Key Formulas

动态攻击上限建议：

```ts
attackBonusCap = 24 + bossKills * 8 + equipmentCapBonus
```

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

