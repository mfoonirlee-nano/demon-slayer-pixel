# 数值系统总览

> 实现状态：已实现。本文记录当前源码中已经生效的数值边界、单位约定和关键状态来源。

## Purpose

说明当前运行时已经生效的数值边界、单位约定和关键状态来源。幕数与威胁值设计见 [act-and-threat.md](act-and-threat.md)，经验成长见 [progression.md](progression.md)。

## Current State

当前游戏使用单局内时间、幕数与角色等级混合成长：

- `elapsed` 是当前局已进行时间，单位为秒。
- `bossKills` 推进 13 幕结构，敌人和 Boss 同时读取幕数、击杀数与时间压力。
- 玩家最终攻击力为 `baseAttack + attackBonus`。
- 经验、角色等级和升级三选一只属于单局内成长，正常每幕由普通战斗和 Boss 各提升 1 级。
- 当前没有提供永久战力的局外成长。

运行时单位约定：

| 系统 | 单位 |
| --- | --- |
| 敌人刷怪间隔 | 秒 |
| Boss 出场计时 | 秒 |
| 平台生成间隔 | 秒 |
| 普攻持续、技能动画、命中冷却、Boss AI 冷却 | 游戏帧 |
| `elapsed` | 秒 |

## Key Formulas

世界基础数值：

| 项 | 当前值 |
| --- | ---: |
| 画布宽度 | `960` |
| 画布高度 | `540` |
| 地面 Y | `460` |
| 重力 | `0.75` |

核心状态：

| 状态 | 说明 |
| --- | --- |
| `state.player` | 玩家生命、攻击、技能能量、大招能量、动作计时器 |
| `state.enemies` | 当前普通敌人列表 |
| `state.boss` | 当前 Boss；不存在时为 `null` |
| `state.spawnTimer` | 普通敌人刷怪计时器 |
| `state.bossSpawnTimer` | Boss 出场或重生计时器 |
| `state.platformSpawnTimer` | 下一个地图片段生成计时器 |
| `state.residualSpirits` | 敌人死亡后尚未拾取的残灵列表 |
| `state.residualSpiritPickupFlights` | 已结算拾取、正在飞向 HUD 灵龛的纯视觉光粒 |

React HUD 通过 `getStateSnapshot()` 暴露：

- 玩家生命、分数、基础攻击、攻击加成、总攻击。
- 当前残灵储量、储存上限、引灵剩余时间和完整引灵时长。
- 技能能量、技能格数、当前技能索引。
- 大招能量、是否就绪。
- Boss 当前生命、最大生命、阶段。

## Code Sources

- `src/constants/world.ts`
- `src/constants/runtime.ts`
- `src/constants/residualSpirit.ts`
- `src/types/game-state.ts`
- `src/state.ts`
- `src/runtime.ts`
