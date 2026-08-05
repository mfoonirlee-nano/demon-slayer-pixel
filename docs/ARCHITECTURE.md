# 游戏架构说明 (Game Architecture)

本项目是一个基于 **React 19 + Jotai + Tailwind CSS + TypeScript + Vite** 的 2D 横版像素风生存游戏。React 负责页面外壳、HUD、暂停/死亡遮罩与移动端控件，核心战斗、地图、特效和世界渲染由原生 Canvas runtime 驱动。

## 核心设计模式

### 1. 游戏循环 (Game Loop)
`src/game/runtime.ts` 中的 `loop()` 是游戏的核心。它使用 `requestAnimationFrame` 推进 update / draw 管线，并根据时间差 (`dt`) 更新月亮、玩家、敌人、Boss、地图片段、掉落物、技能弹道和粒子效果。正常玩法分支通过 `updatePlayer(dt)` 把秒制时间差传入玩家装备更新，供流水共鸣和返魂符等持续恢复效果按真实时间结算；暂停、奖励选择、Boss 击杀裂身和大招施法冻结分支不推进这类效果。

运行时会在暂停时保留帧循环但停止玩法更新，确保 React 暂停面板能立即显示当前快照。游戏重开时调用 `resetState()` 和 `resetMapGenerator()`，但已加载的素材不会重复加载。

### 2. 状态管理 (State Management)
`src/game/state.ts` 维护运行时的全局可变状态，保存玩家、敌人、Boss、平台、残灵掉落物、投射物、技能效果、粒子、月亮与战斗进度等实时数据。玩家状态同时保存已收集残灵和引灵计时。`src/game/gameStore.ts` 则把运行时快照桥接到 Jotai，供 React HUD、暂停面板和死亡界面读取显示。

### 3. React 外壳 + Canvas 渲染
`src/app/App.tsx` 负责应用壳、HUD、暂停面板、死亡动画遮罩和移动端触控按钮。`src/rendering/context.ts` 提供当前 canvas/context 引用，`src/game/runtime.ts` 负责启动资源加载、输入绑定、主循环与绘制。

### 4. 基于实体的逻辑 (Entity Logic)
`src/entities/` 目录下的每个模块代表一种游戏实体或玩法对象（玩家、敌人、Boss、平台、投射物、粒子等）。每个模块负责该类对象的生成 (`spawn`)、更新 (`update`) 和绘制 (`draw`)。

玩家的常态横向移动倍率由 `src/entities/players/movementModifiers.ts` 统一汇总环境减速、装备、常驻技能被动和月潮倍率，`src/entities/player.ts` 只消费最终倍率；潮闪等固定轨迹位移仍走独立更新分支。

玩家的起跳判定、回涡 Lv3 装备后二段跳次数和地面/平台落地重置统一由 `src/entities/players/jumping.ts` 管理，`src/entities/player.ts` 只编排重力更新与落地结果。`src/game/input.ts` 以按下边沿触发跳跃，长按产生的重复 `keydown` 不会自动消耗空中追加跳跃。

### 5. 配置与类型分层
重构后，仓库把常量配置与类型定义从运行时逻辑中拆出：
- `src/constants/` 负责游戏配置、资源元数据、运行时调参与领域标识。
- `src/types/` 负责资源类型与游戏运行态类型。

## 代码目录结构

- `src/main.tsx`: React 入口，挂载应用。
- `src/app/App.tsx`: 页面外壳、HUD、移动端按钮与 canvas 容器。
- `src/game/runtime.ts`: 游戏运行时，初始化输入、加载资源、启动主循环。
- `src/game/state.ts`: 维护游戏全局运行时状态，并提供重置与快照方法。
- `src/game/gameStore.ts`: 将运行时快照桥接到 Jotai。
- `src/constants/`:
  - `world.ts`: 画布尺寸、地面位置、重力等世界常量。
  - `assets.ts`: 技能、玩家/敌人/Boss、背景、云、地面、平台等精灵图元数据。
  - `combat.ts`: 战斗伤害、玩家默认值、Boss/敌人数值参数。
  - `runtime.ts`: 主循环节奏、刷新间隔、加载文案。
  - `platform.ts`: 平台与地图片段生成参数。
  - `residualSpirit.ts`: 残灵掉落、吸附、储存和引灵治疗参数。
  - `visual.ts`: 技能闪屏、爆发特效等视觉参数。
  - `ids.ts`: 动作、技能、平台等领域标识。
  - `index.ts`: 对外统一导出。
- `src/types/`:
  - `assets.ts`: `Skill`、`SpriteSheet`、`PlayerSheet` 等资源类型。
  - `game-state.ts`: 玩家、敌人、Boss、平台、粒子等运行时状态类型。
- `src/rendering/context.ts`: 管理 canvas 与 2D context 引用。
- `src/assets/index.ts`: 异步加载图片资源，并在加载完成后更新 `spritesReady`。
- `src/assets/staticAssetUrl.ts`: 将仓库内的逻辑素材路径 `assets/...` 解析为
  `dist/` 同级目录下的 `../assets/...`；Vite 只构建 HTML、JavaScript 和 CSS，不复制运行时素材。
- `src/game/input.ts`: 处理键盘输入和移动端虚拟按键逻辑。
- `src/game/collisionDebug.ts`: 按帧收集真实碰撞判定使用的矩形、椭圆、圆环、线段和采样点，并统一绘制调试层。
- `src/rendering/background.ts`: 绘制天空、星星、月亮、云层、山脉和地面底色。
- `src/rendering/clouds.ts`: 绘制大云/小云精灵，支持夜晚灰色滤镜和血月红色染色。
- `src/rendering/actLandmarks.ts`: 按当前幕解析并绘制 Boss 专属中景地标，不参与碰撞或出生遮挡。
- `src/rendering/nearForeground.ts`: 编排近景树线、逐幕出生遮挡物、Boss 地标、石塔和鸟居，使用独立视差速度。
- `src/moon/`: 管理月亮状态、血月插值、天空配色和月亮渲染。
- `src/game/audio.ts`: 使用 Web Audio 播放 Boss、敌人与玩家采样音效，并在加载失败时回退到振荡器音型。
- `src/game/utils.ts`: 通用工具函数。
- `src/entities/`:
  - `player.ts`: 玩家控制、重力更新、战斗结算与技能释放编排。
  - `players/jumping.ts`: 玩家起跳条件、空中追加跳跃次数和地面/平台落地解析。
  - `enemy.ts`: 小怪生成与 AI。
  - `boss.ts`: 阶段式 Boss 逻辑与招式。
  - `bosses/renderBoss.ts`: 按 Boss 的施法、动作和反震计时选择本体图集及帧序；所有已注册施法模式都通过本体动作读招。
  - `bosses/*Effects.ts`: 更新并绘制各 Boss 的技能实体；已锁定的危险位置在命中前使用对应特效图集的早期帧提示。
  - `platform.ts`: 片段式地图生成与平台逻辑。
  - `residualSpirit.ts`: 敌人死亡后的残灵生成、吸附、拾取与绘制。
  - `particle.ts`: 战斗特效粒子系统。
  - `projectile.ts`: 处理投射物。

## 输入与控制

- `A` / `D` 或方向键：左右移动。
- `W` / `Space` 或方向上键：跳跃。
- `J`：普通攻击。
- `K`：释放当前技能。
- `L`：释放大招。
- `H`：消耗已储存残灵进行引灵治疗。
- `1` / `2` / `3`：切换技能。
- `Esc` / `P`：暂停或恢复。
- `R`：游戏结束后重开。
- `Meta + D`：切换碰撞区域调试显示；`?debug=1` 调试面板中的“显示碰撞盒”使用同一个开关。

移动端按钮通过 `.touch-btn` 上的 `data-key` 和 `data-hold` 绑定到同一套输入处理，不单独复制玩法逻辑。

## 渲染顺序

Canvas 每帧大致按以下顺序绘制：

1. 背景：天空、月亮、星星、云、山脉、地面底色。
2. 遮挡出生中的敌人，以及覆盖它们的近景背景：树线、当前幕出生遮挡物、Boss 地标、石塔、鸟居。
3. 地图与掉落物：未承载玩家的平台、敌人掉落的残灵。
4. 玩家技能闪屏。
5. 玩家、狩牙刃水刃、当前承载玩家的平台、技能效果、敌人、Boss 本体动作、Boss 击杀裂身快照、Boss 技能及其序列帧预警、投射物、粒子。
6. 地面瓦片覆盖层。
7. 可选碰撞区域调试层。

Boss 读招不维护第二套攻击倒计时，也不使用独立的程序化红色虚线绘制层。`renderBoss.ts` 直接读取已有的 `actionTimer`、`castTimer` 和反震计时推进本体序列：常规施法使用各招对应的 cast 图集，蛛弦突进前摇使用 `boss_attack.png` 前 3 帧，牙岚按后撤、段间转向、终段扑咬和恢复状态切换专用本体图集，枯铃停拍反震则把 `dead_bell_cast.png` 前 3 帧映射到警告窗口、后 3 帧映射到激活窗口。技能实体生成并锁定危险位置后，蛛丝柱、牢笼、地刺、风牙裂波、火线、声波、音刃和终幕技能等由各自 effect 模块在原有警告时序内播放特效图集的早期帧，再继续推进命中与消散帧；这些视觉帧不复制或改变伤害计时。

碰撞调试层在真实判定发生处记录当帧几何，因此能够保留命中后立即移除的投射物、一次性冲击盒和扫掠盒。它覆盖实体受击盒、地面与平台单向落脚面、残灵拾取区、玩家与敌方攻击，以及矩形、椭圆、圆环和分段危险带；粒子、残影、拖尾等不参与空间判定的纯视觉对象不会被记录。

`huntBladeReachEffects` 是狩牙刃强化普攻的纯视觉集合：在攻击开始时生成，绘制在玩家之后、敌人与 Boss 之前，并按强化普攻新增的实际攻击距离缩放可见水刃。攻击期间它会跟随玩家位置和朝向，保持与当帧 `attackBox()` 对齐；它不做独立碰撞，也不重复结算伤害。

平台层级由 `player.onPlatform` 动态决定：玩家落台前，平台完整绘制在玩家下层；成功落台后，只有当前承载平台会移到玩家上层；玩家离台时恢复到下层。

普通敌人选中遮挡出生后，同一个敌人先进入近景之前的低优先级绘制通道，由真实的树干、根部或岩体遮住；入场期间暂停常规攻击 AI，并以最低 `2.4px/帧` 沿玩家方向移出。运行时持续用敌人的完整视觉边界与滚动后的所选遮挡物做相交判断，完全离开后才提升回普通战斗实体通道，不重建敌人，也不局部补画或裁剪遮挡物。

Boss 被击杀时会快照其当帧本体图像和一次性随机切向，并进入 60 帧视觉冻结：普通玩法更新停止，Canvas 继续把快照裁成两半后分离淡出，装备奖励或胜利 overlay 在冻结结束后显示。该快照拥有独立计时，不修改 Boss 动作状态或预留死亡序列。

React HUD 不直接绘制到 Canvas，而是订阅 `gameSnapshotAtom` 显示生命、技能资源、大招能量、残灵储量/引灵进度、Boss 血条、暂停和死亡状态。`src/systems/playerStatuses.ts` 在运行时快照阶段把限时效果、常驻技能被动和需要即时决策的装备状态投影为 `PlayerStatusSnapshot[]`，`src/ui/playerStatusBar.tsx` 再解析对应的本地化名称与图标；掠影符、连珠符和残心免伤护盾分别通过互斥的 ready / cooldown 快照表达就绪与冷却，返魂符则只在低血持续回能时显示。角色状态 HUD 由左侧大招圆框、贴在大招右下方的当前技能圆框、两条随等级增长的生命/技能资源条、六珠灵龛式残灵储存器，以及状态图标条组成；灵龛使用充能阶段 × 动画相位图集错相播放灵珠，未满珠额外显示真实充填高度刻线。

残心 3 件套护盾在玩家统一受伤入口中先于扣血、击退和致死保护结算；缚咒师符咒的持续伤害是唯一不经过 `hurtPlayer()` 的伤害路径，因此会显式调用同一个护盾消费函数，保证“抵挡一次伤害”的语义覆盖所有玩家伤害来源。

## 相关审视

- [架构可维护性审视（2026-06-18）](architecture-review-2026-06-18.md)
- [架构可维护性审视（2026-06-19）](architecture-review-2026-06-19.html)
