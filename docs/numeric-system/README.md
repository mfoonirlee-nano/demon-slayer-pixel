# 数值系统文档

## Purpose

这个目录是数值系统的统一入口，用于支撑后续实现、调参和验收。原根目录旧入口已删除，内容迁移到本目录。

## Document Boundary

- `current/` 只记录当前源码中真实生效的数值、状态和公式。
- `future/` 只记录目标设计和后续落地顺序，不表示已经实现。
- `current/` 不包含装备、经验、幕数驱动进度等未实现系统。
- `future/` 中的新敌人与新 Boss 第一版等待正式素材接入，不使用临时图形占位。
- 原画、角色文案和视觉制作 brief 不在本目录维护，统一放在 [../art/README.md](../art/README.md)。

## Core Formula Entrypoints

| 主题 | 当前实现 | 目标方案 |
| --- | --- | --- |
| 总览与边界 | [current/overview.md](current/overview.md) | [future/overview.md](future/overview.md) |
| 玩家、普攻、技能、大招 | [current/player.md](current/player.md) | [future/progression.md](future/progression.md) |
| 普通敌人 | [current/enemies.md](current/enemies.md) | [future/enemy-archetypes.md](future/enemy-archetypes.md) |
| Boss | [current/boss.md](current/boss.md) | [future/boss-archetypes.md](future/boss-archetypes.md) |
| 成长 | [current/rewards.md](current/rewards.md) | [future/progression.md](future/progression.md) |
| 装备 | 未实现 | [future/equipment.md](future/equipment.md) |
| 奖励 | [current/rewards.md](current/rewards.md) | [future/equipment.md](future/equipment.md) |
| 时间缩放与刷怪节奏 | [current/runtime-scaling.md](current/runtime-scaling.md) | [future/overview.md](future/overview.md) |
| 后续落地顺序 | 不适用 | [future/implementation-order.md](future/implementation-order.md) |

## Code Sources

当前实现的主要数值来源：

- `src/constants/combat.ts`
- `src/constants/assets.ts`
- `src/constants/platform.ts`
- `src/constants/runtime.ts`
- `src/constants/world.ts`
- `src/entities/player.ts`
- `src/entities/enemy.ts`
- `src/entities/boss.ts`
- `src/entities/platform.ts`
- `src/entities/particle.ts`
- `src/runtime.ts`
- `src/state.ts`
