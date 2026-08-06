# 数值系统文档

## Purpose

这个目录是数值系统的统一入口，用于支撑后续实现、调参和验收。原根目录旧入口已删除，内容迁移到本目录。

## Document Boundary

- 本目录按主题组织，不用目录名区分已实现和未实现。
- 每篇文档在正文开头标注实现状态。
- 未实现内容只作为目标设计或落地计划，不表示源码已经接入。
- 经验系统见 [progression.md](progression.md)，当前已接入局内 XP、角色等级、技能/大招成长、升级三选一、升级暂停和每幕两级节奏。
- 新敌人与新 Boss 第一版等待正式素材接入，不使用临时图形占位。
- 原画、角色文案和视觉制作 brief 不在本目录维护，统一放在 [../art/README.md](../art/README.md)。

## Core Formula Entrypoints

| 文档 | 状态 | 内容 |
| --- | --- | --- |
| [overview.md](overview.md) | 已实现 | 当前运行时数值边界、单位约定和关键状态 |
| [player.md](player.md) | 已实现 | 玩家、普攻、下落攻击、技能、大招、受伤与无敌 |
| [enemies.md](enemies.md) | 部分实现 | 普通敌人的生成、全局成长、已接入 archetype 和仍缺少的幕数生成池 |
| [boss.md](boss.md) | 已实现 | 当前 Boss 出场、阶段、AI、召唤、投射物和专属技能 |
| [rewards.md](rewards.md) | 已实现 | 得分、技能能量、大招能量、残灵掉落/储存和主动治疗 |
| [high-platform-treasure.md](high-platform-treasure.md) | 目标设计，未实现 | 每幕高台宝藏机会、动态补给/成长三选一、奖励队列和路线验收 |
| [runtime-scaling.md](runtime-scaling.md) | 已实现 | 时间缩放、刷怪节奏、Boss 出场计时和平台生成 |
| [act-and-threat.md](act-and-threat.md) | 目标设计，未实现 | Boss 击杀驱动幕数、统一威胁值和注册表边界 |
| [enemy-archetypes.md](enemy-archetypes.md) | 目标设计，部分未实现 | 敌人类型、生成权重、技能解锁和素材接入边界 |
| [boss-archetypes.md](boss-archetypes.md) | 目标设计，未实现 | Boss 注册表、血量曲线、技能池、召唤池和击杀循环 |
| [progression.md](progression.md) | 已实现 | 经验、角色等级、普通技能等级、大招强化等级、升级三选一和每幕两级成长 |
| [equipment.md](equipment.md) | 目标设计，未实现 | 装备槽位、Boss 掉落三选一和装备属性 |
| [endgame-ascension.md](endgame-ascension.md) | 目标设计，未实现 | 通关后血月试炼进阶难度层、词条池和横向解锁约束 |
| [implementation-order.md](implementation-order.md) | 目标设计，未实现 | 后续代码落地顺序和验证点 |

## Code Sources

当前实现的主要数值来源：

- `src/constants/combat.ts`
- `src/constants/progression.ts`
- `src/constants/assets.ts`
- `src/constants/platform.ts`
- `src/constants/runtime.ts`
- `src/constants/world.ts`
- `src/entities/player.ts`
- `src/entities/enemy.ts`
- `src/entities/boss.ts`
- `src/entities/platform.ts`
- `src/entities/particle.ts`
- `src/systems/progression.ts`
- `src/runtime.ts`
- `src/state.ts`
