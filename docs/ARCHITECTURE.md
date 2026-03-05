# 游戏架构说明 (Game Architecture)

本项目是一个基于原生 Canvas API 开发的 2D 横版像素风生存游戏。它采用了模块化的代码结构，通过 Vite 进行开发和构建。

## 核心设计模式

### 1. 游戏循环 (Game Loop)
位于 `src/main.js` 中的 `loop` 函数是游戏的核心。它使用 `requestAnimationFrame` 进行渲染，并根据时间差 (`dt`) 更新游戏逻辑，确保在不同帧率下表现一致。

### 2. 状态管理 (State Management)
`src/state.js` 定义了全局的 `state` 对象。该对象存储了玩家属性、敌人列表、粒子特效、项目进度的所有实时数据。这种中心化的状态管理方式使得数据在不同模块间传递变得简单。

### 3. 基于实体的逻辑 (Entity Logic)
位于 `src/entities/` 目录下的每个文件代表一种游戏实体（玩家、敌人、Boss、平台等）。每个模块负责该类实体的生成 (`spawn`)、更新 (`update`) 和绘制 (`draw`)。

## 代码目录结构

- `src/main.js`: 游戏入口，初始化输入、加载资源、启动主循环。
- `src/state.js`: 维护游戏全局状态。
- `src/constants.js`: 存放游戏平衡性参数、技能配置、精灵图尺寸等常量。
- `src/context.js`: 初始化 Canvas 上下文。
- `src/assets.js`: 异步加载所有的图片资源并生成精灵图对象。
- `src/input.js`: 处理键盘输入和移动端虚拟按键逻辑。
- `src/ui.js`: 绘制游戏界面，如血条、分数、技能冷却等。
- `src/background.js`: 实现动态背景渲染。
- `src/utils.js`: 通用工具函数。
- `src/entities/`:
  - `player.js`: 玩家控制、重力、碰撞检测、技能释放逻辑。
  - `enemy.js`: 小怪生成与 AI。
  - `boss.js`: 阶段式 Boss 逻辑与招式。
  - `platform.js`: 可跳跃平台与掉落物晶体。
  - `particle.js`: 战斗特效粒子系统。
  - `projectile.js`: 处理 Boss 或玩家发射的投射物。
