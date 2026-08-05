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
| 开始界面 | 封面、加载状态、任意键/点击开始、跨局累计加权击杀视觉进度已实现；`coverKills` 是权威累计值，`lastSeenCoverKills` 是已展示进度，开场只播放增长跃迁，满后停最终月相；运行时月亮复用同一进度和月相素材 | 补首次游玩提示和未来模式入口，不加入复杂菜单 | 已实现 | P4 | `src/ui/startScreen.tsx`、`src/game/coverProgress.ts`、`src/moon/` |
| 玩家移动 | 左右移动、跳跃、平台承载、移动端触控已实现；回涡 Lv3 装备后可二段跳并在落地时恢复，跳跃输入按按下边沿触发 | 保持当前手感，后续只围绕敌人与地图调参 | 已实现 | P0 | `src/entities/player.ts`、`src/entities/players/jumping.ts`、`src/game/input.ts` |
| 普攻与下落攻击 | 普攻、下落攻击、命中、击退、粒子和音效已实现 | 补更明确的命中/击杀反馈规范 | 已实现 | P4 | `src/entities/player.ts`、`docs/numeric-system/player.md` |
| 技能与大招 | 9 个普通技能、技能池装备、局内技能升级、常驻技能被动、技能能量和月潮大招已实现；回涡 Lv3 被动提供二段跳 | 继续围绕各技能 Lv3 专精形态补齐平衡与表现验收 | 已实现 | P3 | `src/constants/assetCatalog/skills.ts`、`src/entities/players/skillCasting.ts`、`src/systems/playerSkillPassives.ts` |
| 普通敌人 | `chaser`、`crawler`、`runner`、`caster`、`duelist`、`brute`、`glider`、`binder` 已有运行时 archetype/state machine；生成仍主要按时间和随机 sheet | 显式 `ENEMY_ARCHETYPES`、`ACT_ENEMY_POOLS`、预算、同屏 cap、按幕轮换 | 部分实现 | P1 | `src/entities/enemies/`、`src/entities/enemy.ts` |
| Boss | 当前单例 Boss 已实现入场、阶段、追踪、召唤和 Boss 技能 1；原案定位为 `血月眷属 · 蛛弦` | `BOSS_ARCHETYPES`、Boss 池、Boss 轮换、统一死亡入口 `defeatBoss()` | 部分实现 | P1 | `src/entities/boss.ts`、`docs/art/bosses/spider-string.md` |
| Boss 击杀推进 | Boss 死亡奖励分散在玩家多个伤害分支；无 `bossKills` | 所有 Boss 死亡路径统一调用 `defeatBoss()`，推进 `bossKills`、装备掉落和重生节奏 | 目标设计，未实现 | P1 | `src/entities/player.ts`、`docs/numeric-system/boss-archetypes.md` |
| 幕数与威胁值 | 当前难度主要读取 `elapsed`，没有幕数和统一威胁值 | `act = bossKills + 1`（上限 13），分段 `threatScalar` 协调敌人、Boss、平台和奖励 | 目标设计，未实现 | P1 | `docs/numeric-system/act-and-threat.md` |
| 13 幕闯关阶梯 | 当前是单例 Boss 按时间重复出场，无幕结构 | 固定 13 幕：1-6 基础 Boss、7-12 蚀醒形态、13 终幕，击败即通关 | 目标设计，未实现 | P4 | [act-structure.md](act-structure.md) |
| 蚀醒形态 Boss | 未实现 | 第 7-12 幕同序蚀醒：基础 Boss + 一招蚀醒妖术 + 多一阶段 + 强化召唤，复用基础精灵 | 目标设计，未实现 | P4 | `docs/numeric-system/boss-archetypes.md` |
| 终幕万相血月 | `bossKills >= 12` 后出场；5 阶段换相借招、专属施法/特效和击败后停止 Boss 重生已接入 | 第 13 幕击败出胜利结算，不进任何轮换池；死亡动画状态机和通关后进阶待接 | 部分实现 | P4 | `docs/art/bosses/blood-moon-many-faces.md` |
| 通关后进阶难度 | 未实现 | 血月试炼可叠加难度层（横向解锁，不给局外永久战力） | 目标设计，未实现 | P5 | `docs/numeric-system/endgame-ascension.md` |
| 地图生成 | 片段式平台生成、张力、低层恢复和防重叠已实现；地图不再维护奖励预算 | 按幕数调整片段权重和平台速度，保留喘息片段 | 部分实现 | P2 | `src/entities/platform.ts`、`docs/map-generation.md` |
| 奖励拾取 | 分数、技能能量、大招能量、XP、敌人残灵掉落/储存/主动治疗和 Boss 装备三选一已实现；收集残灵不直接回血 | 按试玩数据校准残灵供给与引灵决策压力，保持装备与升级覆盖层依次展示 | 已实现 | P2 | `src/entities/residualSpirit.ts`、`src/entities/enemies/defeat.ts`、`docs/numeric-system/rewards.md` |
| 经验升级 | 单局 XP、角色等级、普通技能/大招成长、升级三选一和奖励暂停已实现；正常每幕普通战斗 +1 级、Boss +1 级 | 继续用实际试玩数据校准清怪时点和候选池体验 | 已实现 | P2 | `src/systems/progression.ts`、`docs/numeric-system/progression.md` |
| 装备系统 | 18 件普通品质装备、Boss 三选一、`blade/garb/talisman` 三槽位、暂停页换装和集中属性派生已接入 | 按 `actBand` 接入精良/觉醒品质与更完整的掉落权重 | 部分实现 | P2 | `docs/numeric-system/equipment.md` |
| HUD | 生命、技能图标/能量、大招球、六珠灵龛残灵储量/引灵进度、Boss 血条、等级/XP/幕数和限时或常驻被动状态图标条已实现；回涡二段跳使用技能图标显示 | 补选择队列状态并继续校准移动端信息密度 | 部分实现 | P2 | `src/ui/gameHud.tsx`、`src/game/gameStore.ts`、`src/systems/playerStatuses.ts` |
| Pause overlay | 暂停面板、技能说明、关键数值已实现 | 统一 overlay 规范、输入规则和移动端布局 | 部分实现 | P3 | `src/App.tsx` |
| Death overlay | 死亡动画、生存时间、`R` 重开已实现 | 增加主要死亡原因和简短复盘提示 | 部分实现 | P3 | `src/App.tsx` |
| 移动端触控 | 移动、跳跃、攻击、技能、大招、引灵治疗和暂停按钮已实现 | 增加选择 overlay 的触屏输入规范 | 部分实现 | P3 | `src/App.tsx`、`src/input.ts` |
| 音效 | 1 个 Boss 击败 WAV、23 个敌人 WAV 与 29 个玩家 WAV 已接入；Web Audio tone 作为回退，主音量/音效音量已接入 | 继续补其他 Boss 采样、BGM 和 Boss 音乐 | 部分实现 | P4 | `src/game/audio.ts`、`src/game/audioSamples.ts`、`docs/music-direction.md` |
| 美术素材 | 玩家、技能、多个敌人、当前 Boss、地图、UI 素材已接入 | 未实现敌人和 Boss 继续按 art brief 制作，禁止临时图形占位 | 部分实现 | P3 | `assets/sprites/`、`docs/art/README.md`、`docs/SPRITES.md` |
| 平衡验收 | 当前主要靠人工试玩和文档公式 | 建立首 Boss 时间、升级频率、死亡原因、Boss 击杀率等验收指标 | 目标设计，未实现 | P0 | [balance-acceptance.md](balance-acceptance.md) |

## Critical Gaps

1. Boss 死亡入口分散，阻塞 `bossKills`、装备掉落、幕数推进和 Boss 轮换。
2. 敌人已有多个状态机，但生成池仍缺少按幕配置和预算模型。
3. 地图生成已经比较完整，但还没有读取幕数/威胁值。
4. XP 和装备闭环已经接入，但仍缺少实际试玩 telemetry 来校准不同清怪效率下的升级时点。
5. UI overlay 之间缺少统一队列规则；升级三选一和装备三选一不能同时覆盖。
6. 13 幕骨架（6 基础 + 6 蚀醒 + 终幕）只有设计文档，没有 Boss 注册表、蚀醒叠加逻辑或终幕换相；通关后进阶难度尚未设计落地点。

## Status Source Rule

当源码和历史文档不一致时，以源码为当前实现依据，以 `docs/numeric-system/` 和本目录作为目标设计依据。修改实现后必须同步更新本矩阵和对应主题文档。
