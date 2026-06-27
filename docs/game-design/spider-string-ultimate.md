# 蛛弦专属大招：千丝牢笼

> 实现状态：设计 brief。本文记录已确认的玩法、素材和接入边界，用于后续实现蛛弦·蚀醒专属大招。

## Purpose

`千丝牢笼` 是第 7 幕 `蛛弦·蚀醒` 的专属大招。它强化蛛弦「牵丝、收网、逼迫走位」的身份，但不加入基础第 1 幕蛛弦，避免教学 Boss 过早复杂化。

目标体验：

- 玩家先学习基础蛛弦的追猎、召唤和 `白蛛穿针`。
- 蚀醒回归时，蛛弦增加全屏分段收网大招。
- 大招主要考验读预警线、移动到安全段，不考验高精度跳跃。

## Scope

只给以下 Boss 使用：

```ts
boss.id === "spider-string" && boss.awakened && boss.phase >= 3
```

基础蛛弦不释放 `千丝牢笼`。`千丝牢笼` 只影响玩家，不伤害小怪，也不清空已有小怪。

## Trigger Rules

| 项 | 规则 |
| --- | --- |
| 首次触发 | 蛛弦·蚀醒进入阶段 3 时强制释放一次 |
| 后续冷却 | `1200` 帧，约 `20s` |
| 阶段限制 | 阶段 3 起可用 |
| Boss 条件 | `spider-string` 且 `awakened === true` |
| 召唤交互 | 大招期间不触发 Boss 召唤 |
| 大招结束后召唤计时 | 建议 `aiTimer = 90`，避免结束瞬间补召唤 |

## Timeline

大招由三段收束组成，每段先预警，再进入短命中窗口。

| 段 | 预警 | 命中窗口 | 段间停顿 |
| ---: | ---: | ---: | ---: |
| 1 | `42` 帧 | `14` 帧 | `18` 帧 |
| 2 | `36` 帧 | `14` 帧 | `18` 帧 |
| 3 | `36` 帧 | `14` 帧 | 结束恢复 |

结束恢复：`42` 帧。

总时长：

```text
42 + 14 + 18 + 36 + 14 + 18 + 36 + 14 + 42 = 234 帧
```

约 `3.9s`。

## Boss State

大招期间：

- Boss 停在原地施法。
- Boss 不追踪、不跳跃、不召唤。
- Boss 可被玩家攻击。
- 不主动用身体追撞玩家。
- 大招结束后进入恢复硬直，再回到追猎。

建议接入方式：

- 新增 `BossSkillMode`：`"spiderStringCage"`。
- 复用 Boss `actionState: "cast"`。
- 大招动作使用新图集 `boss_ultimate_cast.png`。
- 用独立状态保存三段收束数据，不把它塞进现有 `bossSkill1Effects`。

## Safe Segment Algorithm

场地横向切成 `5` 个竖向区域，每段约 `192px`。

每次收束至少留 `1` 个完整安全段，宽度约 `170-190px`。危险区域内绘制蛛网墙或中空线层。

安全段规则：

- 第 1 段偏教学，安全段离玩家当前位置不超过 `1` 段。
- 第 2 段安全段不能与第 1 段完全相同。
- 第 3 段可以回到第 1 段附近，但不能连续重复第 2 段。
- 如果玩家站在边缘，优先保证安全段可达，而不是强行变化。
- 不使用纯随机安全段，避免理论可躲但实际来不及。

危险段视觉和判定：

- 第 1 段：地面蛛网墙，主要逼横向走位。
- 第 2 段：中低空蛛网线，惩罚盲跳。
- 第 3 段：竖向蛛网墙 + 中空线交错，但仍留完整安全段。

## Hit Rules

命中判定使用玩家脚底中心点，而不是全身矩形：

```ts
const footX = player.x + player.w / 2;
const footY = player.y + player.h;
```

判定细节：

- 危险段左右各内缩约 `14-18px`。
- 玩家站在安全段边缘时，不因肩膀、刀光或 sprite 外扩误判。
- 中空线层只在脚底高度进入对应高度带时判定。
- 视觉蛛网可以略宽于实际判定，保证视觉危险大于实际危险。
- 每段最多命中玩家一次。
- 不遍历 `state.enemies`，不伤害小怪。

## Damage And Debuff

命中惩罚为中等伤害 + 短暂缠丝减速，不眩晕、不禁跳、不禁攻击。

| 项 | 值 |
| --- | ---: |
| 每段伤害 | `contactDamage * 1.4` |
| 阶段 3 约值 | `25` 点 |
| 减速时长 | `54` 帧 |
| 移动倍率 | `0.55` |
| 影响范围 | 只影响横向移动 |

建议新增玩家状态：

```ts
player.spiderSilkSlowTimer = Math.max(player.spiderSilkSlowTimer, 54);
```

玩家移动倍率接入现有移动计算：

```ts
moveScale = Math.min(
  bindingZonePlayerMoveScale(),
  lanternAshZonePlayerMoveScale(),
  spiderSilkSlowPlayerMoveScale(),
) * equipmentMoveSpeedMultiplier(state) * moonTideMoveSpeedMultiplier();
```

## Defense Rules

`千丝牢笼` 遵守现有玩家防御和无敌规则，不做特殊穿透。

- 玩家受伤无敌帧可避免同一段重复受伤。
- 玩家大招启动短暂无敌可以躲过判定。
- `流步·潮闪` 的位移无敌可以穿过危险段。
- `镜潮返` 可挡一次，并触发现有反击逻辑。
- 不新增「Boss 大招无视无敌/防御」规则。

## Asset Contract

需要两张新增序列帧图集。所有生成素材必须走 imagegen + chroma-key 去背流程，再做尺寸、透明边和 bbox 验证。

### Boss 大招动作

| 项 | 规格 |
| --- | --- |
| 路径 | `assets/sprites/boss/spider-string/boss_ultimate_cast.png` |
| 帧数 | `8` |
| 单帧 | `400x400` |
| 总图 | `3200x400` |
| 类型 | Boss actor sheet |
| 朝向 | 面向右 |
| 锚点 | 底部稳定，匹配现有蛛弦施法图 |

帧语义：

| 帧 | 动作 |
| ---: | --- |
| 1 | 停步低头，红袍下摆静止，蛛足收拢 |
| 2 | 抬手，白丝从指尖和蛛足关节拉出 |
| 3 | 蛛足向两侧完全展开，身体后仰蓄力 |
| 4 | 双手交叉牵丝，身前出现细密丝线 |
| 5 | 猛然张开双臂，蛛足外扩，进入大招峰值 |
| 6 | 全身牵引，丝线向外拉紧 |
| 7 | 收束后残势，红袍和白发被拉动 |
| 8 | 回到可恢复姿态，但保留施法余韵 |

约束：

- 保持蛛弦身份：白发、暗红衣袍、背后蛛足。
- 不画全屏蛛网，只画贴近 Boss 身体的牵丝动作。
- 不改变碰撞体和 Boss 生命/伤害公式。

### 蛛网线 VFX

| 项 | 规格 |
| --- | --- |
| 路径 | `assets/sprites/boss/spider-string/boss_ultimate_web.png` |
| 帧数 | `8` |
| 单帧 | `480x220` |
| 总图 | `3840x220` |
| 类型 | Effect-only VFX sheet |
| 内容 | 蛛丝线、血色节点、收束闪光 |
| 禁止 | 不包含 Boss，不画固定全屏布局 |

帧语义：

| 帧 | 视觉用途 |
| ---: | --- |
| 1-2 | 极细、半透明感白色蛛丝预警线，少量血色节点 |
| 3-5 | 蛛网快速变粗、交叉、收束，作为命中窗口主视觉 |
| 6-7 | 最亮的切割/绷断峰值 |
| 8 | 断丝消散，用于段落结束残影 |

Runtime 使用：

- 预警阶段循环或停留 Frame 1-2。
- 命中窗口播放 Frame 3-7。
- 段尾播放 Frame 8 或淡出。
- 素材用于组合绘制危险段，不直接锁死安全段布局。

## Implementation Notes

建议新增：

- `SPIDER_STRING_CAGE_CONFIG`
- `SPIDER_STRING_ULTIMATE_CAST_SHEET`
- `SPIDER_STRING_ULTIMATE_WEB_SHEET`
- `SpiderStringCageState`
- `state.spiderStringCages`
- `player.spiderSilkSlowTimer`
- `updateSpiderStringCageEffects()`
- `drawSpiderStringCageEffects()`
- `spiderSilkSlowPlayerMoveScale()`

建议测试覆盖：

- 蛛弦基础形态不会触发 `千丝牢笼`。
- 蛛弦·蚀醒阶段 3 首次进入时强制触发。
- 大招期间 Boss 不移动、不召唤。
- 三段都生成至少一个安全段。
- 连续两段安全段不会完全相同。
- 玩家脚底在安全段时不受伤。
- 玩家脚底在危险段命中窗口内受伤一次，并获得 `54` 帧减速。
- 大招遵守玩家无敌/防御逻辑。
- 蛛网不伤害小怪。
- 新 PNG 尺寸、帧数、透明边、alpha bbox 和 docs/constant 同步。

## Validation

实现时至少验证：

- `npm run typecheck`
- `npm run lint`
- 相关 Boss 行为单测
- 相关 sprite audit 或 `scripts/sprite_sheet_tool.py inspect`
- `git diff --check`

不要为验证启动 headless browser 或游戏进程。
