# 待办

> 本文是项目待办的统一入口。`docs/game-design/`、`docs/numeric-system/`、`docs/art/`、`docs/music-direction.md` 等文档中的“部分实现 / 目标设计未实现 / 后续需求”需要最终收敛到这里，避免同时维护多个互相冲突的未完成清单。

## 已完成

* 完成目录结构拆分，增加如 types、constants 目录，使 src 目录更加清晰
* 完成对 magic number 的抽象，以及字符串字面量的常量抽象
* 更新项目规则，增加如代码规范、注释、命名规范等，禁止any类型、禁止使用 magic number 等
  * [x] 补充 `docs/CODE_RULES.md`，统一说明命名、注释、TypeScript 与 magic number 规则
  * [x] 在 `README.md` 与 `CLAUDE.md` 增加规则入口，方便开发和协作时直接引用
  * [x] 增加 ESLint 规则与校验脚本，落地禁止 `any` 与 magic number 的自动检查
  * [x] 整理角色状态与快照字段，统一生命、攻击、技能资源的状态来源
  * [x] 清理 `player` / `platform` / `runtime` / `input` / `App` / `gameStore` 等核心模块中的一批存量不规范写法
  * [x] 继续按模块清理其余存量代码中的不规范写法
* 技能类型优化，去除无效字段：frameRanges、frameWidths，以及其在仓库里的响应逻辑
  * [x] 从 `Skill` 类型中移除 `frameRanges`、`frameWidths` 两个无效字段
  * [x] 保留 `frameW` / `frameH` / `frameCount` 作为技能图集切片的唯一尺寸来源
  * [x] 删除 `detectVariableFrameRanges` 及相关常量（IMAGE_ANALYSIS、IMAGE_PIXEL_DATA）
  * [x] `drawVariableSheetFrame`、`player.ts`、`particle.ts` 同步更新调用方式
* 完成游戏 UI 更新，常驻UI尽量精简，只显示必要的信息
  * [x] 收敛常驻 HUD，只保留生命、当前技能、技能资源与 Boss 血条
  * [x] 给技能条也增加上血条那样逐渐消失的效果
  * [x] 云移动得有点快，透明度有点低
  * [x] 前景的图层不对，应该在最上方，现在的重叠得也很厉害，优化一下生成算法
  * [x] 将前景绘制从 `drawBackground()` 提取到 `drawForeground()`，并在 `runtime.ts` 主循环末尾（所有游戏实体之后）调用
  * [x] 减少前景元素数量（patches 8→6，decor 16→9），改用 seeded 随机分布
  * [x] 增加 `buildForegroundItems()` 生成器，带水平重叠检测，重叠时自动重试新位置（最多 200 次）
* [x] 优化地面逻辑
* [x] 优化背景逻辑
* [x] 增加Boss技能
* [x] 更新暂停面板UI
* [x] 更新技能3效果
* [x] 更新状态条效果
* [x] 增加新资产和压缩逻辑
* [x] 优化资产文件夹结构
* [x] 优化资产大小
* [x] 更新天空效果
* [x] 更新月效果
* [x] 更新技能效果
* [x] 增加tinypng压缩
* [x] 更新精灵
* [x] 重构绘制逻辑
* [x] 方向性技能伤害和随机命中粒子
* [x] 技能2效果淡出
* [x] 增加HP效果
* [x] 添加地图文档
* [x] 更新攻击帧
* [x] 增加角色大招
* [x] 增加场景贴图（云、前景、地面、山、塔、树等）
* [x] 增加技能1效果弹道
* [x] 增加技能2效果弹道
* [x] 增加技能效果系统
* [x] 更新游戏逻辑
* [x] 优化大招帧
* [x] 更新技能帧速和位置
* [x] 增加技能描述
* [x] 更新技能配置
* [x] 移除硬编码burst尺寸并增加drawOffset字段
* [x] 统一HUD状态
* [x] 分离游戏配置和运行时类型
* [x] 迁移游戏运行时到React和TypeScript
* [x] 生命周期条的衰减不对，和数值对不上g
* [x] 技能条默认应该是空的，击杀敌人回复
* [x] boss的被攻击判断范围太窄了，攻击boss的头他甚至都不会受到伤害
* [x] 移除现有的纯代码实现得灯笼、远景等内容
* [x] 优化平台生成逻辑，增加第一层平台回落恢复机制，避免上层平台长期缺少入口
* [x] 重构云渲染逻辑，移除旧云图集，改用 `assets/sprites/cloud/` 下的大云/小云精灵图
* [x] 云层支持夜晚灰色滤镜与血月红色染色，大云慢速、小云快速移动
* [x] 根据当前项目结构同步更新 docs 文档
* [x] 移动平台碰撞优化，现在人像是踩在草尖上
* [x] 优化下落攻击的帧速和位置
* [x] 攻击产生的伤害效果应该在攻击发生的区域周围
* [x] 游戏开始 UI 后续打磨

## 未完成

### P0：发布与项目口径

* [ ] 去除外部 IP 指向、角色名和阵营名等直接指向，统一替换成完全原创命名和表现。
  * 来源：旧 `docs/TODO.md`；`docs/music-direction.md` 已要求音乐保持原创，不直接模仿现成动漫/游戏配乐。
  * 验收：README、页面标题、Canvas aria-label、HUD/暂停面板、文档、素材目录和文件名都不再出现需要避开的第三方 IP 表述。
* [ ] 统一“当前已实现”和“目标设计未实现”的描述口径。
  * 来源：`docs/game-design/README.md`、`docs/game-design/system-status.md`。
  * 验收：README 和对外介绍只写当前可玩内容；XP、装备、13 幕、蚀醒 Boss、终幕等未接入内容只能作为后续计划。
* [ ] 建立发布前质量门禁。
  * 来源：项目已有 `typecheck`、`lint`、`build` 脚本，但缺少统一发布验收记录。
  * 验收：每次发布前跑通 `npm run typecheck`、`npm run lint`、`npm run build`，并记录浏览器试玩结果。

### P1：第一个可构建里程碑 Boss 击杀推进第 2 幕

* [ ] 新增统一 Boss 死亡入口 `defeatBoss()`，替换所有分散的 Boss 死亡结算分支。
  * 来源：`docs/game-design/system-status.md`、`docs/numeric-system/implementation-order.md`、`docs/game-design/content-roadmap.md`。
  * 验收：所有 Boss 死亡路径只结算一次，不重复加分、掉落、推进或重生。
* [ ] 增加 `bossKills` 状态，以及 `getAct()`、`getThreatScalar()`、`getBossRespawnDelay()` helper。
  * 来源：`docs/numeric-system/implementation-order.md`。
  * 验收：`act = bossKills + 1`，Boss 重生间隔和难度可以按击杀数派生。
* [ ] 新增 `ACT_CONFIGS`，让平台、敌人、Boss 重生和奖励先读取当前幕配置。
  * 来源：`docs/numeric-system/implementation-order.md`、`docs/game-design/content-roadmap.md`。
  * 验收：击败第 1 个 Boss 后进入第 2 幕，即使不接新素材，敌人权重、平台权重或节奏也有可感知变化。
* [ ] HUD 显示当前幕。
  * 来源：`docs/game-design/content-roadmap.md`、`docs/game-design/ui-feedback.md`。
  * 验收：玩家能在常驻 UI 或短提示中明确看到当前处于第几幕。
* [ ] Boss 击杀后出现清晰反馈。
  * 来源：旧 `docs/TODO.md`、`docs/game-design/ui-feedback.md`、`docs/game-design/balance-acceptance.md`。
  * 验收：击杀 Boss 后有击败提示、短暂喘息、天空/血月变化或进入下一幕提示；后续再接 Boss 挑战选项。

### P2：敌人、Boss、地图与奖励基础配置化

* [ ] 新增 `ENEMY_ARCHETYPES` 和 `ACT_ENEMY_POOLS`，把现有敌人从时间随机生成整理成按幕生成池。
  * 来源：`docs/game-design/system-status.md`、`docs/game-design/content-roadmap.md`、`docs/numeric-system/implementation-order.md`。
  * 验收：第 1-4 幕敌人池逐步扩展，第 5 幕和第 6 幕+ 通过轮换进入后期敌人，而不是 12 种敌人同时常规刷怪。
* [ ] 用 `enemySpawnBudget` 和 active cap 替代单纯敌人数量上限。
  * 来源：`docs/numeric-system/implementation-order.md`、`docs/game-design/balance-acceptance.md`。
  * 验收：高复杂敌人不会同屏机制过载，低端设备不会因刷怪失控明显掉帧。
* [ ] 补齐或整理未完成敌人：`burrower`、`splitter`、`warden`。
  * 来源：`docs/game-design/content-roadmap.md`。
  * 验收：新敌人有正式状态机、可读前摇、active cap、碰撞盒和奖励规则；未完成前不进入实际生成池。
* [ ] 新增 `BOSS_ARCHETYPES` 和 Boss 注册表。
  * 来源：`docs/game-design/system-status.md`、`docs/numeric-system/implementation-order.md`。
  * 验收：`spawnBoss()` 按当前幕和配置选择 Boss；当前 Boss 首轮体验不回退；未完成 Boss 不进入池。
* [ ] 完成基础 Boss、蚀醒 Boss 与终幕 Boss 的内容骨架。
  * 来源：`docs/game-design/content-roadmap.md`、`docs/game-design/act-structure.md`。
  * 验收：6 个基础 Boss、6 个蚀醒形态、终幕万相血月都有注册表占位、状态说明、素材接入计划和不进入池的保护规则。
* [ ] 平台生成接入 `act` / `threatScalar`，继续调整“逐渐变多但不重叠”。
  * 来源：旧 `docs/TODO.md`、`docs/game-design/content-roadmap.md`、`docs/game-design/balance-acceptance.md`。
  * 验收：连续 5 个片段内不出现明显不可达主路线；高压片段后有喘息片段；Boss 战期间平台压力降低。
* [ ] 水晶和宝箱按幕调整数值、风险路线收益和刷新频率。
  * 来源：`docs/game-design/content-roadmap.md`。
  * 验收：治疗、攻击、宝箱不会让早期强度失控，也不会让 Boss 装备价值被稀释。

### P3：局内成长、装备、技能与大招

* [ ] 实现 XP、角色等级和升级三选一。
  * 来源：旧 `docs/TODO.md`、`docs/game-design/system-status.md`、`docs/numeric-system/implementation-order.md`、`docs/game-design/ui-feedback.md`。
  * 验收：首次升级在目标时间窗内出现；升级 overlay 暂停战斗；支持鼠标、触屏和 `1/2/3` 选择。
* [ ] 实现 Boss 装备三选一和三槽位装备系统。
  * 来源：旧 `docs/TODO.md`、`docs/game-design/system-status.md`、`docs/numeric-system/implementation-order.md`。
  * 验收：Boss 击杀后出现装备选择，替换同槽装备时生命、攻击和派生属性边界正确夹取，重开后清空局内成长。
* [ ] 确保升级三选一和装备三选一不会同时覆盖。
  * 来源：`docs/game-design/ui-feedback.md`、`docs/game-design/balance-acceptance.md`。
  * 验收：同一时间只允许一个选择 overlay，另一个进入队列；Death 优先级最高。
* [ ] 将当前 `SKILLS` 和技能特效配置逐步整理到 `SKILL_DEFS`。
  * 来源：`docs/game-design/content-roadmap.md`、`docs/numeric-system/implementation-order.md`。
  * 验收：当前三招默认 Lv1，可通过局内奖励提升到 Lv3；未解锁技能不出现在 HUD 或升级候选里。
* [ ] 修复 `line_projectile`、`close_arc` 在游戏里的帧数 / 播放节奏问题。
  * 来源：旧 `docs/TODO.md`。
  * 验收：技能释放、命中、消散和图集帧切片一致，不出现错帧、跳帧或持续时间与伤害窗口不一致。
* [ ] 把大招从瞬时范围爆发改为有限持续时间强化状态，并接入 `ultimateLevel`。
  * 来源：旧 `docs/TODO.md`、`docs/game-design/content-roadmap.md`、`docs/game-design/balance-acceptance.md`。
  * 验收：大招持续时间、移动、跳跃、攻速、伤害和残影潮刃读取等级；大招期间不是长期无敌，不遮挡 Boss 前摇。

### P4：UI / 反馈 / 移动端体验

* [ ] 继续完善暂停 UI、状态 UI、技能/状态选择 UI。
  * 来源：旧 `docs/TODO.md`、`docs/game-design/ui-feedback.md`。
  * 验收：Pause、Upgrade choice、Equipment choice、Act prompt、Boss intro、Death 的层级和输入规则一致。
* [ ] 补 Boss intro 和 Act prompt。
  * 来源：`docs/game-design/ui-feedback.md`。
  * 验收：Boss 出场前后有名称、短暂停拍和音效 sting；Boss 击杀后短暂显示“第 N 幕”和核心压力变化。
* [ ] 死亡结算增加主要死亡原因和一条复盘提示。
  * 来源：`docs/game-design/system-status.md`、`docs/game-design/ui-feedback.md`、`docs/game-design/balance-acceptance.md`。
  * 验收：死亡界面不只显示生存时间，玩家能知道主要失败原因。
* [ ] 移动端 HUD 和 overlay 补齐等价信息密度。
  * 来源：`docs/game-design/system-status.md`、`docs/game-design/ui-feedback.md`。
  * 验收：移动端也能读到生命、技能能量、大招、Boss 血条、选择卡片；触屏按钮不遮挡核心提示。
* [ ] 增加全屏模式或移动端横屏提示。
  * 来源：旧 `docs/TODO.md`。
  * 验收：移动端进入游戏前能明确知道最佳操作方向；全屏入口不会影响键盘和触屏输入。

### P5：音频、素材与美术一致性

* [ ] 增加 BGM，并区分开始界面、普通战斗、Boss 战、死亡、胜利等场景。
  * 来源：旧 `docs/TODO.md`、`docs/music-direction.md`、`docs/game-design/content-roadmap.md`。
  * 验收：所有 BGM 是原创、可循环、无爆音和断点，并且不盖过战斗 SFX。
* [ ] 补齐核心 SFX。
  * 来源：旧 `docs/TODO.md`、`docs/game-design/ui-feedback.md`、`docs/game-design/content-roadmap.md`。
  * 验收：普攻、命中、受伤、死亡、拾取、技能、大招、Boss 入场、阶段变化、Boss 击杀都有清晰反馈。
* [ ] 完成 Boss 序列帧、敌人序列帧和 Boss 技能素材。
  * 来源：旧 `docs/TODO.md`、`docs/game-design/content-roadmap.md`、`docs/art/README.md`、`docs/SPRITES.md`。
  * 验收：移动、攻击、受击、死亡、技能前摇、技能效果的帧宽/帧高/偏移量与碰撞盒一致；临时占位图不进入发布包。
* [ ] 继续补充场景素材。
  * 来源：旧 `docs/TODO.md`、`docs/game-design/content-roadmap.md`。
  * 验收：新增场景素材遵循像素密度、描边、透明边缘和图层规则，不回退现有地图可读性。
* [ ] Boss 击杀后天空逐步亮起星星，最终 Boss 击杀后月亮完整显现。
  * 来源：旧 `docs/TODO.md`。
  * 验收：每次 Boss 击杀带来可见但不遮挡战斗的天空变化；终幕胜利有完整场景反馈。

### P6：完整内容与长期目标

* [ ] 完成 13 幕主线：1-6 基础 Boss、7-12 蚀醒形态、13 终幕万相血月。
  * 来源：`docs/game-design/system-status.md`、`docs/game-design/content-roadmap.md`、`docs/game-design/balance-acceptance.md`。
  * 验收：每幕新机制可识别，一次完整 1→13 清版目标时长约 18-22 分钟。
* [ ] 完成通关胜利结算。
  * 来源：`docs/game-design/system-status.md`、`docs/game-design/balance-acceptance.md`。
  * 验收：击败终幕 Boss 后进入胜利结算，不继续普通 Boss 轮换。
* [ ] 设计并实现通关后血月试炼进阶难度。
  * 来源：`docs/game-design/system-status.md`、`docs/game-design/content-roadmap.md`、`docs/numeric-system/endgame-ascension.md`。
  * 验收：进阶难度是横向解锁，不提供局外永久战力。
* [ ] 击杀完 Boss 后出现 Boss 挑战 / 下一幕挑战选项。
  * 来源：旧 `docs/TODO.md`。
  * 验收：选项不会和装备、升级 overlay 冲突；可以明确进入下一幕或挑战内容。

## 手动验收记录模板

每次大调参或发布前至少记录 5 局：

```text
版本/提交：
局数：
生存时间：
到达最高幕（1-13）：
是否通关（击败万相血月）：
Boss 击杀数：
首 Boss 出场时间：
首 Boss 是否击杀：
升级次数：
装备件数 / 最高品质：
技能释放次数：
大招释放次数：
主要死亡原因：
最不公平时刻：
最有效策略：
备注：
```
