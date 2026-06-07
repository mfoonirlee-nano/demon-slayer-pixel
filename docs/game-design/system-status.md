# 系统实现状态矩阵

> 实现状态：设计文档。本文按当前源码和现有文档整理系统状态，优先级只表示后续设计/实现顺序。

## Priority Legend

| 优先级 | 含义 |
| --- | --- |
| P0 | 文档和状态口径必须先统一 |
| P1 | 其他目标系统依赖的基础能力 |
| P2 | 单局循环闭环必需能力 |
| P3 | 内容扩展和体验增强 |
| P4 | 打磨、表现和后续扩展 |
| P5 | 通关后循环，依赖 13 幕主线先成立 |

## Matrix

| 系统 | 当前实现状态 | 目标设计状态 | 状态 | 优先级 | 依据 |
| --- | --- | --- | --- | --- | --- |
| 应用架构 | React 外壳 + Canvas runtime + Jotai 快照已接入 | 保持当前分层，新增系统继续通过 runtime 状态和 React overlay 协作 | 已实现 | P0 | `src/App.tsx`、`src/runtime.ts`、`src/state.ts` |
| 开始界面 | 封面、加载状态、任意键/点击开始、本地击杀视觉进度已实现 | 补首次游玩提示和未来模式入口，不加入复杂菜单 | 已实现 | P4 | `src/startScreen.tsx`、`src/coverProgress.ts` |
| 玩家移动 | 左右移动、跳跃、平台承载、移动端触控已实现 | 保持当前手感，后续只围绕敌人与地图调参 | 已实现 | P0 | `src/entities/player.ts`、`src/input.ts` |
| 普攻与下落攻击 | 普攻、下落攻击、命中、击退、粒子和音效已实现 | 补更明确的命中/击杀反馈规范 | 已实现 | P4 | `src/entities/player.ts`、`docs/numeric-system/player.md` |
| 技能与大招 | 三个技能、大招、技能能量、大招能量已实现 | 建立 `SKILL_DEFS` 注册表、`skillLevels`、`ultimateLevel` 和解锁/升级读取方式 | 部分实现 | P3 | `src/constants/assets.ts`、`src/entities/player.ts` |
| 普通敌人 | `chaser`、`crawler`、`runner`、`caster`、`duelist`、`brute`、`glider`、`binder` 已有运行时 archetype/state machine；生成仍主要按时间和随机 sheet | 显式 `ENEMY_ARCHETYPES`、`ACT_ENEMY_POOLS`、预算、同屏 cap、按幕轮换 | 部分实现 | P1 | `src/entities/enemies/`、`src/entities/enemy.ts` |
| Boss | 当前单例 Boss 已实现入场、阶段、追踪、弹幕、召唤和 Boss 技能 1；原案定位为 `下弦之鬼 · 蛛弦` | `BOSS_ARCHETYPES`、Boss 池、Boss 轮换、统一死亡入口 `defeatBoss()` | 部分实现 | P1 | `src/entities/boss.ts`、`docs/art/bosses/spider-string.md` |
| Boss 击杀推进 | Boss 死亡奖励分散在玩家多个伤害分支；无 `bossKills` | 所有 Boss 死亡路径统一调用 `defeatBoss()`，推进 `bossKills`、装备掉落和重生节奏 | 目标设计，未实现 | P1 | `src/entities/player.ts`、`docs/numeric-system/boss-archetypes.md` |
| 幕数与威胁值 | 当前难度主要读取 `elapsed`，没有幕数和统一威胁值 | `act = bossKills + 1`（上限 13），分段 `threatScalar` 协调敌人、Boss、平台和奖励 | 目标设计，未实现 | P1 | `docs/numeric-system/act-and-threat.md` |
| 13 幕闯关阶梯 | 当前是单例 Boss 按时间重复出场，无幕结构 | 固定 13 幕：1-6 基础 Boss、7-12 觉醒形态、13 终幕，击败即通关 | 目标设计，未实现 | P4 | [act-structure.md](act-structure.md) |
| 觉醒形态 Boss | 未实现 | 第 7-12 幕同序觉醒：基础 Boss + 一招觉醒血鬼术 + 多一阶段 + 强化召唤，复用基础精灵 | 目标设计，未实现 | P4 | `docs/numeric-system/boss-archetypes.md` |
| 终幕万相血月 | 未实现 | 第 13 幕 5 阶段换相借招，击败出胜利结算，不进任何轮换池 | 目标设计，未实现 | P4 | `docs/art/bosses/blood-moon-many-faces.md` |
| 通关后进阶难度 | 未实现 | 血月试炼可叠加难度层（横向解锁，不给局外永久战力） | 目标设计，未实现 | P5 | `docs/numeric-system/endgame-ascension.md` |
| 地图生成 | 片段式平台生成、张力、奖励预算、低层恢复和防重叠已实现 | 按幕数调整片段权重和平台速度，保留喘息片段 | 部分实现 | P2 | `src/entities/platform.ts`、`docs/map-generation.md` |
| 奖励拾取 | 分数、技能能量、大招能量、攻击水晶、治疗水晶、宝箱已实现 | 加入 XP、升级三选一、Boss 装备三选一，奖励队列互斥 | 部分实现 | P2 | `src/entities/platform.ts`、`docs/numeric-system/rewards.md` |
| 经验升级 | 当前无 XP、角色等级、普通技能等级、大招强化等级或升级选择 | 单局 XP、角色等级、普通技能等级、大招强化等级、升级三选一，overlay 暂停战斗 | 目标设计，未实现 | P2 | `docs/numeric-system/progression.md` |
| 装备系统 | 当前无装备槽、装备掉落或装备属性派生 | Boss 击杀后三选一，`weapon/haori/charm` 三槽位，单局内构筑 | 目标设计，未实现 | P2 | `docs/numeric-system/equipment.md` |
| HUD | 常驻生命、技能图标/能量、大招球、Boss 血条已实现 | 补角色等级、当前技能等级、XP、幕数、选择队列状态；移动端也要有等价信息密度 | 部分实现 | P2 | `src/App.tsx`、`src/gameStore.ts` |
| Pause overlay | 暂停面板、技能说明、关键数值已实现 | 统一 overlay 规范、输入规则和移动端布局 | 部分实现 | P3 | `src/App.tsx` |
| Death overlay | 死亡动画、生存时间、`R` 重开已实现 | 增加主要死亡原因和简短复盘提示 | 部分实现 | P3 | `src/App.tsx` |
| 移动端触控 | 移动、跳跃、攻击、技能、大招、暂停按钮已实现 | 增加选择 overlay 的触屏输入规范 | 部分实现 | P3 | `src/App.tsx`、`src/input.ts` |
| 音效 | Web Audio 简单 tone 用于攻击、命中、受伤、拾取、Boss 等事件 | 完整 SFX 清单、音量层级、BGM 和 Boss 音乐接入 | 部分实现 | P4 | `src/audio.ts`、`docs/music-direction.md` |
| 美术素材 | 玩家、技能、多个敌人、当前 Boss、地图、UI 素材已接入 | 未实现敌人和 Boss 继续按 art brief 制作，禁止临时图形占位 | 部分实现 | P3 | `assets/sprites/`、`docs/art/README.md`、`docs/SPRITES.md` |
| 平衡验收 | 当前主要靠人工试玩和文档公式 | 建立首 Boss 时间、升级频率、死亡原因、Boss 击杀率等验收指标 | 目标设计，未实现 | P0 | [balance-acceptance.md](balance-acceptance.md) |

## Critical Gaps

1. Boss 死亡入口分散，阻塞 `bossKills`、装备掉落、幕数推进和 Boss 轮换。
2. 敌人已有多个状态机，但生成池仍缺少按幕配置和预算模型。
3. 地图生成已经比较完整，但还没有读取幕数/威胁值。
4. XP 和装备都还只是目标设计，缺少运行时状态、选择队列和 overlay。
5. UI overlay 之间缺少统一队列规则；升级三选一和装备三选一不能同时覆盖。
6. 13 幕骨架（6 基础 + 6 觉醒 + 终幕）只有设计文档，没有 Boss 注册表、觉醒叠加逻辑或终幕换相；通关后进阶难度尚未设计落地点。

## Status Source Rule

当源码和历史文档不一致时，以源码为当前实现依据，以 `docs/numeric-system/` 和本目录作为目标设计依据。修改实现后必须同步更新本矩阵和对应主题文档。
