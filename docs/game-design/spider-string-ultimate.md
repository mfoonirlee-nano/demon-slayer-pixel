# 蛛弦专属大招：千丝牢笼

> 实现状态：已实现。本文记录蛛弦·蚀醒专属大招的玩法、素材和接入契约。

## Purpose

`千丝牢笼` 是第 7 幕 `蛛弦·蚀醒` 的专属大招。它强化蛛弦「牵丝、收网、逼迫走位」的身份，但不加入基础第 1 幕蛛弦，避免教学 Boss 过早复杂化。

目标体验：

- 阶段 1 先学习蛛弦的前摇、突进和突进后的近战普攻。
- 阶段 2 在保留近战循环的基础上，学习远程技能 `白蛛穿针`。
- 阶段 3 再加入带落点预警的地下蛛丝柱，并保留前两个阶段的全部招式。
- 蚀醒回归时，蛛弦增加由地面、空中和场地两侧连续落柱的大招。
- 大招主要考验读取柱位预警、跟随连续安全缝移动，不考验高精度跳跃。

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
| 基础招式交互 | 大招期间不启动突进、近战普攻、`白蛛穿针` 或地下蛛丝柱 |
| 大招结束后恢复节奏 | 将 `aiTimer` 设为 `90`，作为回到普通追猎节奏前的恢复状态 |

## Timeline

大招由 `12` 个 pulse 组成。下表的起始帧均相对大招开始计算，表示该 pulse 进入预警的时刻。

| 阶段 | pulse 数 | 起始帧 | 出柱方向 |
| --- | ---: | --- | --- |
| 地面上刺 | `3` | `0 / 18 / 36` | 从地面向上生长 |
| 空中下砸 | `3` | `72 / 90 / 108` | 同一柱图集沿 Y 轴镜像，从空中向下砸落 |
| 左右夹击 | `6` | `144 / 162 / 180 / 198 / 216 / 234` | 在安全缝左右两侧同时连续落柱 |

每个 pulse 先预警 `30` 帧，再播放 `24` 帧主动动画。相邻 pulse 可按上表重叠推进，形成持续柱压，而不是等前一批完全消失后再开始。

预警期使用 Frame 1-2。主动期播放 Frame 3-8，每帧保持 `4` 个游戏帧；其中 Frame 4-6，即 0-based frame `3-5`，为命中窗口。

最后一个 pulse 在第 `234` 帧开始，于第 `288` 帧结束全部特效；随后保留 `24` 帧恢复，总施法时长为 `312` 帧，约 `5.2s`。

## Boss State

大招期间：

- Boss 停在原地施法。
- Boss 不追踪、不跳跃，也不启动基础三阶段招式。
- Boss 可被玩家攻击。
- 不主动用身体追撞玩家。
- 最后一个柱 pulse 结束后保留 `24` 帧施法恢复；施法结束后再停顿 `90` 帧，才回到追猎。

运行时接入：

- 新增 `BossSkillMode`：`"spiderStringCage"`。
- 复用 Boss `actionState: "cast"`。
- 大招动作使用新图集 `boss_ultimate_cast.png`。
- 用独立状态保存 pulse、方向、安全缝和命中数据，不把它塞进现有 `bossSkill1Effects`。

## Lane And Gap Algorithm

场地横向切成 `8` 条 lane。每个 pulse 连续保留 `2` 条 lane 作为安全缝，其余 `6` 条 lane 各放置一根独立蛛丝柱。

在 `960px` 宽场地中，两条安全 lane 合计约 `240px`，足以让玩家横向调整和躲避柱体。

安全缝规则：

- 首个 pulse 的安全缝按玩家完整碰撞矩形选择，不能只容纳玩家中心点。
- 相邻两个 pulse 的安全缝至少重叠 `1` 条 lane，保证玩家能沿连续通路移动。
- 左右夹击阶段的安全缝不能贴住屏幕边缘，必须在缝隙两侧都生成危险柱。
- 每个 pulse 开始时锁定柱位与安全缝，预警后不再追踪玩家。
- 不使用可能切断连续通路的纯随机缝隙，避免理论可躲但实际来不及。

三个阶段的视觉和判定：

- 地面阶段从地面上刺三批柱，教学玩家读取单根落点和两 lane 安全缝。
- 空中阶段将同一图集沿 Y 轴镜像，三批柱从上方向下砸落。
- 左右阶段连续生成六批柱，每批都在内部安全缝左右两侧形成夹击。
- 左右阶段的“左右”表示柱位分布在安全缝两侧；柱体仍保持竖向，不旋转为横向素材。

## Hit Rules

判定细节：

- 每根柱使用独立矩形命中体，判定范围不得侵入该 pulse 的两 lane 安全缝。
- 同一 pulse 内多根柱共享一次命中上限，整个 pulse 最多伤害玩家一次。
- 玩家离开当前安全缝时，可被所在危险 lane 的柱命中；留在安全缝内不受伤。
- 不遍历 `state.enemies`，不伤害小怪。

## Damage And Debuff

命中惩罚为中等伤害 + 短暂缠丝减速，不眩晕、不禁跳、不禁攻击。

| 项 | 值 |
| --- | ---: |
| 每个 pulse 伤害 | `Boss 接触伤害 x 1.0` |
| 阶段 3 | `27` 点 |
| 阶段 4 | `30` 点 |
| 减速时长 | `54` 帧 |
| 移动倍率 | `0.55` |
| 影响范围 | 只影响横向移动 |

玩家状态：

```ts
player.spiderSilkSlowTimer = Math.max(player.spiderSilkSlowTimer, 54);
```

玩家移动倍率接入现有移动计算：

```ts
moveScale = Math.min(
  bindingZonePlayerMoveScale(),
  lanternAshZonePlayerMoveScale(),
  spiderSilkSlowPlayerMoveScale(),
)
  * equipmentMoveSpeedMultiplier(state)
  * dashRepositionMoveSpeedMultiplier(state)
  * moonTideMoveSpeedMultiplier();
```

## Defense Rules

`千丝牢笼` 遵守现有玩家防御和无敌规则，不做特殊穿透。

- 玩家受伤无敌帧可避免相邻 pulse 在短时间内连续结算伤害。
- 玩家大招启动短暂无敌可以躲过判定。
- `流步·潮闪` 的位移无敌可以穿过危险柱。
- `镜潮返` 可挡一次，并触发现有反击逻辑。
- 不新增「Boss 大招无视无敌/防御」规则。

## Asset Contract

大招使用两张序列帧图集。所有生成素材必须走 imagegen + chroma-key 去背流程，再做尺寸、透明边和 bbox 验证。

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
- 不把整屏柱阵画进 Boss 动作图，只画贴近身体的牵丝动作。
- 不改变碰撞体和 Boss 生命/伤害公式。

### 强化蛛丝柱 VFX

| 项 | 规格 |
| --- | --- |
| 路径 | `assets/sprites/boss/spider-string/boss_ultimate_pillar.png` |
| 帧数 | `8` |
| 单帧 | `240x420` |
| 总图 | `1920x420` |
| 类型 | Effect-only VFX sheet |
| 内容 | 单根独立竖向强化蛛丝柱、血色节点和断丝残影 |
| 禁止 | 不包含 Boss，不画固定全屏布局 |

帧语义：

| 帧 | 视觉用途 |
| ---: | --- |
| 1-2 | 细丝聚拢与落点预警 |
| 3 | 蛛丝柱快速成长 |
| 4-6 | 完整柱体与命中峰值 |
| 7 | 柱体断裂回缩 |
| 8 | 残丝消散 |

Runtime 使用：

- 每个危险 lane 绘制一个独立柱实例，不横向平铺、合并或拉伸成网带。
- `30` 帧预警阶段使用 Frame 1-2；随后 `24` 帧主动阶段依次播放 Frame 3-8。
- Frame 4-6，即 0-based frame `3-5`，与运行时命中窗口对齐。
- 地面柱按源方向绘制；空中柱围绕其锚点沿 Y 轴镜像，形成向下砸落。
- 左右夹击仍使用竖向柱实例，由运行时决定各柱所在 lane 和启动帧。
- 素材只表达单根柱的生命周期，不直接包含整屏阵型或安全缝。

## Implementation Notes

运行时组成：

- `SPIDER_STRING_CAGE_CONFIG`
- `SPIDER_STRING_ULTIMATE_CAST_SHEET`
- `SPIDER_STRING_ULTIMATE_PILLAR_SHEET`
- `SpiderStringCageState`
- `state.spiderStringCages`
- `player.spiderSilkSlowTimer`
- `updateSpiderStringCageEffects()`
- `drawSpiderStringCageEffects()`
- `spiderSilkSlowPlayerMoveScale()`

测试覆盖：

- 蛛弦基础形态不会触发 `千丝牢笼`。
- 蛛弦·蚀醒阶段 3 首次进入时强制触发。
- 大招期间 Boss 不移动，也不启动突进、近战普攻、`白蛛穿针` 或地下蛛丝柱。
- 依次生成 `3` 个地面 pulse、`3` 个空中 pulse 和 `6` 个左右夹击 pulse。
- 每个 pulse 在 `8` 条 lane 中连续保留 `2` 条安全 lane。
- 相邻安全缝至少重叠 `1` 条 lane，左右夹击阶段的安全缝不贴边。
- 玩家位于安全缝时不受伤；进入危险柱命中体时每个 pulse 最多受伤一次，并获得 `54` 帧减速。
- 大招遵守玩家无敌/防御逻辑。
- 强化蛛丝柱不伤害小怪。
- 新 PNG 尺寸、帧数、透明边、alpha bbox 和 docs/constant 同步。

## Validation

至少验证：

- `npm run typecheck`
- `npm run lint`
- 相关 Boss 行为单测
- 相关 sprite audit 或 `scripts/sprite_sheet_tool.py inspect`
- `git diff --check`

不要为验证启动 headless browser 或游戏进程。
