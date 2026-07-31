# 13 幕闯关阶梯总表

> 实现状态：源码已接入 13 幕 Boss 阶梯、enemy director、按幕敌人池、平台/奖励分段、终幕 Boss 与通关结算；数值仍需试玩调参。其余设计文档的幕数、Boss 解锁、敌人解锁和威胁值都以本表为准。

## Purpose

把原「第 4 幕后无限轮换」框架重铺为一条**有明确终点的 13 幕 Boss 闯关阶梯**，作为「约 10 小时差异化体验」的内容骨架：

- 第 1-6 幕：每幕引入一个**基础 Boss**，同时逐幕解锁全部 12 种敌人。
- 第 7-12 幕：1:1 出现 6 个基础 Boss 的**加强版（蚀醒形态）**。
- 第 13 幕：**终极 Boss 万相血月**，5 阶段换相，是单局通关终点。

幕数仍由 Boss 击杀驱动：

```ts
act = bossKills + 1   // 上限 13
actBand =
  act <= 6   ? "intro"      // 1-6 基础 Boss
  : act <= 12 ? "awakened"  // 7-12 蚀醒 Boss
  : "final"                 // 13 万相血月
```

## Master Act Table

| 幕 | Boss | 类型 | 核心新体验 | 敌人导演规则 | 目标单幕时长 | 熟练玩家目标击杀率 |
|---:|---|---|---|---|---:|---:|
| 1 | 蛛弦 Spider String | 基础 | 教学：横穿/低位/冲刺 + 追猎召唤 | 解锁 3，常规池 3，固定 `basic_intro` | 60-90s | 60-75% |
| 2 | 雾骨 Mist Bone | 基础 | 区域封锁 + 骨刺弹幕（延迟爆发） | 解锁到 5，常规池 4，固定 `technique_intro` | 70-100s | 55-70% |
| 3 | 镜魇 Mirror Dream | 基础 | 分身干扰 + 反射投射物 | 解锁到 7，常规池 5，固定 `vertical_intro` | 70-100s | 50-65% |
| 4 | 牙岚 Fang Gale | 基础 | 高速冲刺 + 近身连击 | 解锁到 9，常规池 6，随机 profile 补未出现机制 | 70-100s | 50-65% |
| 5 | 灯烬 Lantern Ember | 基础 | 召唤强化 + 火线封路 | 解锁到 11，常规池 7，随机 profile 补未出现机制 | 80-110s | 45-60% |
| 6 | 枯铃 Dead Bell | 基础 | 节奏压迫 + 声波环 + 停拍窗口 | 解锁 12，常规池 8，随机 profile 补齐高阶机制 | 80-110s | 40-55% |
| 7 | 蛛弦·蚀醒 | 加强 | + 地面、空中与左右连续柱阵「千丝牢笼」 | 常规池 8，觉醒 profile shuffle cycle | 90-120s | 35-50% |
| 8 | 雾骨·蚀醒 | 加强 | + 视野遮蔽 + 多点延迟骨爆 | 常规池 8，觉醒 profile shuffle cycle | 90-120s | 30-45% |
| 9 | 镜魇·蚀醒 | 加强 | + 真假身每阶段互换 + 同步反击 | 常规池 8，觉醒 profile shuffle cycle | 90-120s | 30-45% |
| 10 | 牙岚·蚀醒 | 加强 | + 三段跨场冲刺连段 | 常规池 8，觉醒 profile shuffle cycle | 90-120s | 25-40% |
| 11 | 灯烬·蚀醒 | 加强 | + 火线成移动网格 + 灰烬叠加 | 常规池 8，觉醒 profile shuffle cycle | 100-130s | 25-40% |
| 12 | 枯铃·蚀醒 | 加强 | + 双频错相声波 + 强制停拍反震 | 常规池 8，觉醒 profile shuffle cycle | 100-130s | 20-35% |
| 13 | 万相血月 Blood Moon | 终极 | 5 阶段换相，每阶段借一名血月眷属的招式 | 排除基础怪，其余 9 种全进；Boss 召唤物 ≤ 4 | 150-240s | 15-30% |

**清版一次（1→13 全通）目标时长：约 18-22 分钟**（含 Boss 间小怪波次）。大多数尝试会在中途阵亡，长期时长来自反复挑战、局内构筑差异和通关后进阶难度（见 [balance-acceptance.md](balance-acceptance.md) 与 [../numeric-system/endgame-ascension.md](../numeric-system/endgame-ascension.md)）。

## Boss 形态对应

第 7-12 幕蚀醒顺序 = 第 1-6 幕基础顺序，保证「先学基础形态，再面对蚀醒形态」的教学闭环：

| 基础幕 | 基础 Boss | 蚀醒幕 | 蚀醒 Boss |
|---:|---|---:|---|
| 1 | 蛛弦 | 7 | 蛛弦·蚀醒 |
| 2 | 雾骨 | 8 | 雾骨·蚀醒 |
| 3 | 镜魇 | 9 | 镜魇·蚀醒 |
| 4 | 牙岚 | 10 | 牙岚·蚀醒 |
| 5 | 灯烬 | 11 | 灯烬·蚀醒 |
| 6 | 枯铃 | 12 | 枯铃·蚀醒 |
| — | — | 13 | 万相血月（终极） |

蚀醒形态的定义、招式和数值见 [../numeric-system/boss-archetypes.md](../numeric-system/boss-archetypes.md)；终幕换相借招见同文档与 [../art/bosses/blood-moon-many-faces.md](../art/bosses/blood-moon-many-faces.md)。

## 敌人解锁与差异化

- 12 种敌人**全部在第 1-6 幕解锁完毕**，但不写死每幕具体敌人；每局开局由 seed 生成 `runEnemyOrder`，每幕按数量切片。
- 解锁数量为 `3, 5, 7, 9, 11, 12`；常规池种类数为 `3, 4, 5, 6, 7, 8`，第 7-12 幕保持 8。
- 第 7-12 幕的杂兵差异化**不靠新敌人**，靠两点：
  1. 蚀醒 Boss 的**强化召唤池**（加入 `burrower` / `splitter` / `warden` 等后期机制敌人）。
  2. **觉醒 profile shuffle cycle**：第 7-12 幕每局从 6 个 profile 中不重复使用，让蚀醒幕的杂兵组合每幕不同。
- 第 13 幕排除基础三件套 `chaser` / `crawler` / `runner`，其余 9 种非基础敌人全部进入终幕池。
- 常规刷怪池第 1-12 幕始终 ≤ 8 种，靠数量、profile、降权、`spawnCost` 和 `maxActive` 控制。详见 [../numeric-system/enemy-archetypes.md](../numeric-system/enemy-archetypes.md)。

## 与其他文档的关系

| 主题 | 权威文档 |
|---|---|
| 幕表、Boss/敌人解锁节奏、目标时长 | 本文 |
| 威胁值、平台/奖励分段曲线 | [../numeric-system/act-and-threat.md](../numeric-system/act-and-threat.md) |
| Boss 注册表、蚀醒形态、终幕换相、血量曲线 | [../numeric-system/boss-archetypes.md](../numeric-system/boss-archetypes.md) |
| 敌人生成池、轮换 profile、同屏限制 | [../numeric-system/enemy-archetypes.md](../numeric-system/enemy-archetypes.md) |
| 单局节奏、教学、失败体验、终盘形态 | [run-loop.md](run-loop.md) |
| 通关后进阶难度（血月试炼） | [../numeric-system/endgame-ascension.md](../numeric-system/endgame-ascension.md) |
| 验收指标与逐幕目标击杀率 | [balance-acceptance.md](balance-acceptance.md) |

## Consistency Checklist

- 13 幕、13 个 Boss 遭遇（6 基础 + 6 蚀醒 + 1 终极）必须同时出现在本表、`boss-archetypes.md` 和 `content-roadmap.md`。
- 蚀醒幕顺序固定为基础幕顺序（7=蚀醒蛛弦 … 12=蚀醒枯铃）。
- 12 种敌人在第 1-6 幕解锁完毕，第 7-12 幕不引入新敌人素材。
- 单幕目标时长与目标击杀率必须与 `balance-acceptance.md` 一致。
- 任何文档修改幕结构时，先改本表，再同步其余文档。
