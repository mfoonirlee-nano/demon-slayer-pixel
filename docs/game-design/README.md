# 游戏原案总入口

> 实现状态：设计文档。本文只整理原案、状态和后续落地顺序，不表示新增玩法已经接入源码。

## Purpose

这个目录作为游戏设计方案的统一入口，用来把当前项目已有玩法、数值、美术、音乐和 TODO 信息整理成一份可执行原案。所有条目都要区分“当前已实现”和“目标设计未实现”，避免把规划误读成线上功能。

## Assumptions

- 游戏继续保持单局制 2D 横版像素动作生存定位。
- 本阶段不修改运行时代码、不生成新素材、不接入新功能。
- 经验、装备、幕数和 Boss 轮换都属于目标设计；接入前不作为当前功能描述。
- 不规划局外永久属性、复杂剧情分支、商业化系统或抽卡式成长。
- 当前 `coverProgress` 的本地击杀计数只服务开始界面视觉进度，不作为玩法成长系统。

## Recommended Directory Structure

```text
docs/
├── game-design/
│   ├── README.md
│   ├── game-overview.md
│   ├── act-structure.md
│   ├── run-loop.md
│   ├── system-status.md
│   ├── content-roadmap.md
│   ├── ui-feedback.md
│   └── balance-acceptance.md
├── numeric-system/
│   ├── README.md
│   ├── player.md
│   ├── enemies.md
│   ├── boss.md
│   ├── rewards.md
│   ├── runtime-scaling.md
│   ├── act-and-threat.md
│   ├── enemy-archetypes.md
│   ├── boss-archetypes.md
│   ├── progression.md
│   ├── equipment.md
│   ├── endgame-ascension.md
│   └── implementation-order.md
├── art/
│   ├── README.md
│   ├── player.md
│   ├── enemies/
│   └── bosses/
├── map-generation.md
├── music-direction.md
├── ARCHITECTURE.md
├── SPRITES.md
└── TODO.md
```

## Documents

| 文档 | 内容 | 主要用途 |
| --- | --- | --- |
| [game-overview.md](game-overview.md) | 游戏定位、核心体验、目标玩家、设计支柱、不可做边界 | 给所有后续设计定方向 |
| [act-structure.md](act-structure.md) | 13 幕闯关阶梯总表、Boss/敌人逐幕解锁、目标时长与击杀率 | 全项目唯一权威幕表 |
| [run-loop.md](run-loop.md) | 核心循环、单局节奏、幕数推进、失败体验、教学节奏 | 定义“一局应该怎么玩” |
| [system-status.md](system-status.md) | 当前实现状态、目标状态、优先级、源码/文档依据 | 防止实现状态混淆 |
| [content-roadmap.md](content-roadmap.md) | 敌人、Boss、技能、地图、奖励、音乐内容扩展优先级 | 安排内容制作和系统接入 |
| [ui-feedback.md](ui-feedback.md) | UI 状态流、overlay 暂停规则、输入、反馈清单 | 指导 UI/UX 和手感反馈 |
| [balance-acceptance.md](balance-acceptance.md) | 平衡测试指标、验收口径、试玩记录格式 | 判断原案是否成立 |

## Source Documents

- 当前架构与运行时：[../ARCHITECTURE.md](../ARCHITECTURE.md)
- 当前数值入口：[../numeric-system/README.md](../numeric-system/README.md)
- 幕数与威胁值目标设计：[../numeric-system/act-and-threat.md](../numeric-system/act-and-threat.md)
- 经验目标设计：[../numeric-system/progression.md](../numeric-system/progression.md)
- 装备目标设计：[../numeric-system/equipment.md](../numeric-system/equipment.md)
- 敌人目标设计：[../numeric-system/enemy-archetypes.md](../numeric-system/enemy-archetypes.md)
- Boss 目标设计：[../numeric-system/boss-archetypes.md](../numeric-system/boss-archetypes.md)
- 地图生成：[../map-generation.md](../map-generation.md)
- 美术设定：[../art/README.md](../art/README.md)
- 音乐方向：[../music-direction.md](../music-direction.md)
- 待办记录：[../TODO.md](../TODO.md)

## Status Terms

| 状态 | 定义 |
| --- | --- |
| 已实现 | 源码已经接入，可在当前运行时体验到 |
| 部分实现 | 核心能力存在，但缺少目标设计中的配置化、轮换、UI 或完整内容 |
| 目标设计，未实现 | 已有设计文档或本目录定义了目标，但源码没有接入 |
| 未设计 | 暂无可执行设计，需要先补方案再实现 |
