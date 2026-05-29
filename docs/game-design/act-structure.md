# 13 幕闯关阶梯总表

> 实现状态：目标设计，未实现。本文是全项目唯一权威幕表；当前源码仍是单例 Boss、按 `elapsed` 线性推进难度，没有 `bossKills` 幕数、Boss 注册表或终幕。其余设计文档的幕数、Boss 解锁、敌人解锁和威胁值都以本表为准。

## Purpose

把原「第 4 幕后无限轮换」框架重铺为一条**有明确终点的 13 幕 Boss 闯关阶梯**，作为「约 10 小时差异化体验」的内容骨架：

- 第 1-6 幕：每幕引入一个**基础 Boss**，同时逐幕解锁全部 12 种敌人。
- 第 7-12 幕：1:1 出现 6 个基础 Boss 的**加强版（觉醒形态）**。
- 第 13 幕：**终极 Boss 万相血月**，5 阶段换相，是单局通关终点。

幕数仍由 Boss 击杀驱动：

```ts
act = bossKills + 1   // 上限 13
actBand =
  act <= 6   ? "intro"      // 1-6 基础 Boss
  : act <= 12 ? "awakened"  // 7-12 觉醒 Boss
  : "final"                 // 13 万相血月
```

## Master Act Table

| 幕 | Boss | 类型 | 核心新体验 | 新解锁敌人 | 目标单幕时长 | 熟练玩家目标击杀率 |
|---:|---|---|---|---|---:|---:|
| 1 | 蛛弦 Spider String | 基础 | 教学：横穿/低位/冲刺 + 追猎召唤 | `chaser`、`crawler`、`runner` | 60-90s | 60-75% |
| 2 | 雾骨 Mist Bone | 基础 | 区域封锁 + 骨刺弹幕（延迟爆发） | `duelist`、`leaper` | 70-100s | 55-70% |
| 3 | 镜魇 Mirror Dream | 基础 | 分身干扰 + 反射投射物 | `brute`、`caster` | 70-100s | 50-65% |
| 4 | 牙岚 Fang Gale | 基础 | 高速冲刺 + 近身连击 | `glider` | 70-100s | 50-65% |
| 5 | 灯烬 Lantern Ember | 基础 | 召唤强化 + 火线封路 | `burrower`、`splitter` | 80-110s | 45-60% |
| 6 | 枯铃 Dead Bell | 基础 | 节奏压迫 + 声波环 + 停拍窗口 | `binder`、`warden` | 80-110s | 40-55% |
| 7 | 蛛弦·觉醒 | 加强 | + 全屏蛛网收束「千丝牢笼」 | 全敌人池开放 + 轮换 profile | 90-120s | 35-50% |
| 8 | 雾骨·觉醒 | 加强 | + 视野遮蔽 + 多点延迟骨爆 | 轮换 profile | 90-120s | 30-45% |
| 9 | 镜魇·觉醒 | 加强 | + 真假身每阶段互换 + 同步反击 | 轮换 profile | 90-120s | 30-45% |
| 10 | 牙岚·觉醒 | 加强 | + 三段跨场冲刺连段 | 轮换 profile | 90-120s | 25-40% |
| 11 | 灯烬·觉醒 | 加强 | + 火线成移动网格 + 灰烬叠加 | 轮换 profile | 100-130s | 25-40% |
| 12 | 枯铃·觉醒 | 加强 | + 双频错相声波 + 强制停拍反震 | 轮换 profile | 100-130s | 20-35% |
| 13 | 万相血月 Blood Moon | 终极 | 5 阶段换相，每阶段借一名下弦之鬼的招式 | 终盘限定池（额外召唤 ≤ 4） | 150-240s | 15-30% |

**清版一次（1→13 全通）目标时长：约 18-22 分钟**（含 Boss 间小怪波次）。大多数尝试会在中途阵亡，长期时长来自反复挑战、局内构筑差异和通关后进阶难度（见 [balance-acceptance.md](balance-acceptance.md) 与 [../numeric-system/endgame-ascension.md](../numeric-system/endgame-ascension.md)）。

## Boss 形态对应

第 7-12 幕觉醒顺序 = 第 1-6 幕基础顺序，保证「先学基础形态，再面对觉醒形态」的教学闭环：

| 基础幕 | 基础 Boss | 觉醒幕 | 觉醒 Boss |
|---:|---|---:|---|
| 1 | 蛛弦 | 7 | 蛛弦·觉醒 |
| 2 | 雾骨 | 8 | 雾骨·觉醒 |
| 3 | 镜魇 | 9 | 镜魇·觉醒 |
| 4 | 牙岚 | 10 | 牙岚·觉醒 |
| 5 | 灯烬 | 11 | 灯烬·觉醒 |
| 6 | 枯铃 | 12 | 枯铃·觉醒 |
| — | — | 13 | 万相血月（终极） |

觉醒形态的定义、招式和数值见 [../numeric-system/boss-archetypes.md](../numeric-system/boss-archetypes.md)；终幕换相借招见同文档与 [../art/bosses/blood-moon-many-faces.md](../art/bosses/blood-moon-many-faces.md)。

## 敌人解锁与差异化

- 12 种敌人**全部在第 1-6 幕解锁完毕**，逐幕 +1~2 种，不新增敌人素材。
- 第 7-12 幕的杂兵差异化**不靠新敌人**，靠两点：
  1. 觉醒 Boss 的**强化召唤池**（加入 `burrower` / `splitter` / `warden` 等后期机制敌人）。
  2. **轮换 profile 逐幕切换**（低位 / 快攻 / 垂直 / 重型压力），让觉醒幕的杂兵组合每幕不同。
- 常规刷怪池始终 ≤ 8 种，靠退池 + 降权 + 轮换控制。详见 [../numeric-system/enemy-archetypes.md](../numeric-system/enemy-archetypes.md)。

## 与其他文档的关系

| 主题 | 权威文档 |
|---|---|
| 幕表、Boss/敌人解锁节奏、目标时长 | 本文 |
| 威胁值、平台/奖励分段曲线 | [../numeric-system/act-and-threat.md](../numeric-system/act-and-threat.md) |
| Boss 注册表、觉醒形态、终幕换相、血量曲线 | [../numeric-system/boss-archetypes.md](../numeric-system/boss-archetypes.md) |
| 敌人生成池、轮换 profile、同屏限制 | [../numeric-system/enemy-archetypes.md](../numeric-system/enemy-archetypes.md) |
| 单局节奏、教学、失败体验、终盘形态 | [run-loop.md](run-loop.md) |
| 通关后进阶难度（血月试炼） | [../numeric-system/endgame-ascension.md](../numeric-system/endgame-ascension.md) |
| 验收指标与逐幕目标击杀率 | [balance-acceptance.md](balance-acceptance.md) |

## Consistency Checklist

- 13 幕、13 个 Boss 遭遇（6 基础 + 6 觉醒 + 1 终极）必须同时出现在本表、`boss-archetypes.md` 和 `content-roadmap.md`。
- 觉醒幕顺序固定为基础幕顺序（7=觉醒蛛弦 … 12=觉醒枯铃）。
- 12 种敌人在第 1-6 幕解锁完毕，第 7-12 幕不引入新敌人素材。
- 单幕目标时长与目标击杀率必须与 `balance-acceptance.md` 一致。
- 任何文档修改幕结构时，先改本表，再同步其余文档。
