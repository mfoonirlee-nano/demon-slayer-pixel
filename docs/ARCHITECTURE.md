# 游戏架构说明 (Game Architecture)

本项目是一个基于 **React 19 + TypeScript + Vite** 的 2D 横版像素风生存游戏。React 负责页面外壳、HUD 与移动端控件，核心战斗与世界渲染仍由原生 Canvas runtime 驱动。

## 核心设计模式

### 1. 游戏循环 (Game Loop)
`src/runtime.ts` 中的 `loop()` 是游戏的核心。它使用 `requestAnimationFrame` 推进 update / draw 管线，并根据时间差 (`dt`) 更新逻辑，保证不同帧率下的表现稳定。

### 2. 状态管理 (State Management)
`src/state.ts` 维护运行时的全局可变状态，保存玩家、敌人、Boss、平台、粒子与战斗进度等实时数据。`src/gameStore.ts` 则把运行时快照桥接到 Jotai，供 React HUD 读取显示。

### 3. React 外壳 + Canvas 渲染
`src/App.tsx` 负责应用壳、HUD、Game Over 遮罩和移动端触控按钮。`src/context.ts` 提供当前 canvas/context 引用，`src/runtime.ts` 负责启动资源加载、输入绑定、主循环与绘制。

### 4. 基于实体的逻辑 (Entity Logic)
`src/entities/` 目录下的每个模块代表一种游戏实体（玩家、敌人、Boss、平台等）。每个模块负责该类实体的生成 (`spawn`)、更新 (`update`) 和绘制 (`draw`)。

### 5. 配置与类型分层
重构后，仓库把常量配置与类型定义从运行时逻辑中拆出：
- `src/constants/` 负责游戏配置、资源元数据、运行时调参与领域标识。
- `src/types/` 负责资源类型与游戏运行态类型。

## 代码目录结构

- `src/main.tsx`: React 入口，挂载应用。
- `src/App.tsx`: 页面外壳、HUD、移动端按钮与 canvas 容器。
- `src/runtime.ts`: 游戏运行时，初始化输入、加载资源、启动主循环。
- `src/state.ts`: 维护游戏全局运行时状态，并提供重置与快照方法。
- `src/gameStore.ts`: 将运行时快照桥接到 Jotai。
- `src/constants/`:
  - `world.ts`: 画布尺寸、地面位置、重力等世界常量。
  - `assets.ts`: 技能、玩家/敌人/Boss 精灵图元数据。
  - `combat.ts`: 战斗伤害、玩家默认值、Boss/敌人数值参数。
  - `runtime.ts`: 主循环节奏、刷新间隔、加载文案。
  - `platform.ts`: 平台和晶体生成参数。
  - `visual.ts`: 技能闪屏、爆发特效等视觉参数。
  - `ids.ts`: 动作、技能、平台、晶体等领域标识。
  - `index.ts`: 对外统一导出。
- `src/types/`:
  - `assets.ts`: `Skill`、`SpriteSheet`、`FrameRange` 等资源类型。
  - `game-state.ts`: 玩家、敌人、Boss、平台、粒子等运行时状态类型。
- `src/context.ts`: 管理 canvas 与 2D context 引用。
- `src/assets.ts`: 异步加载图片资源，并根据图片内容推导技能帧范围。
- `src/input.ts`: 处理键盘输入和移动端虚拟按键逻辑。
- `src/background.ts`: 实现动态背景渲染。
- `src/utils.ts`: 通用工具函数。
- `src/entities/`:
  - `player.ts`: 玩家控制、重力、碰撞检测、技能释放逻辑。
  - `enemy.ts`: 小怪生成与 AI。
  - `boss.ts`: 阶段式 Boss 逻辑与招式。
  - `platform.ts`: 可跳跃平台与掉落物晶体。
  - `particle.ts`: 战斗特效粒子系统。
  - `projectile.ts`: 处理投射物。
