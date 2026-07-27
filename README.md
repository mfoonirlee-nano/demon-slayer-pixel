# 月潮夜行（Moonlit Tide Survivor）

一个基于 `React 19 + Jotai + Tailwind CSS + TypeScript` 的 2D 像素风动作生存小游戏。  
玩家扮演原创潮刃者，在不断刷新的夜妖与阶段式 Boss 战中尽可能生存并提高分数。

## 游戏特性

- **Canvas 渲染内核**：保留原有像素风游戏渲染与玩法循环。
- **React 外壳 + 状态桥接**：使用 React 19、Jotai、Tailwind CSS、TypeScript 与 Vite 承载界面与 HUD。
- **双端支持**：适配键盘操作与移动端触控/虚拟按键。
- **丰富系统**：包含剑式系统、平台掉落、分阶段 Boss 战。
- **动态特效**：基于粒子的战斗视觉反馈。

## 操作说明

- `A` / `D`：左右移动
- `W` / `Space`：跳跃
- `J`：普通攻击
- `K`：释放技能（潮刃剑式，需有可用充能）
- `R`：游戏结束后重开

## 开发与本地运行

项目已接入 Vite，推荐使用以下方式运行以获得最佳开发体验：

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```
访问控制台输出的链接（通常是 `http://localhost:5173`）即可。

### 3. 构建发布版本
```bash
npm run build
```

构建后的 `dist/` 只包含 HTML、JavaScript 和 CSS。图片、音频等运行时素材继续保留在
仓库根目录的 `assets/`；发布时需要让 `dist/` 与 `assets/` 保持同级，并以二者的共同父目录
作为静态服务根目录，入口为 `dist/index.html`。

## 项目结构与文档

详细的文档位于 `docs/` 目录下：

- [游戏原案总入口 (game-design/README.md)](docs/game-design/README.md)：游戏定位、核心循环、系统状态、内容优先级、UI/反馈和验收指标。
- [📂 项目架构 (ARCHITECTURE.md)](docs/ARCHITECTURE.md)：深入了解代码模块设计与游戏循环逻辑。
- [🎨 素材处理 (SPRITES.md)](docs/SPRITES.md)：说明如何使用 Image Gen 生成、处理和接入像素精灵图。
- [📏 项目规则 (CODE_RULES.md)](docs/CODE_RULES.md)：统一约束命名、注释、TypeScript 与 magic number 的处理方式。

### 代码目录概览
```text
moonlit-tide-survivor/
├── docs/                # 项目详细文档
├── src/                 # 源代码目录
│   ├── entities/        # 游戏实体实现（玩家、敌人、Boss等）
│   ├── app/             # React 应用外壳
│   │   └── App.tsx      # Canvas 容器、HUD 挂载与开始流程
│   ├── game/            # 运行时、输入、状态与 Jotai 状态桥
│   │   ├── runtime.ts   # 游戏运行时与主循环
│   │   ├── gameStore.ts # Jotai HUD 状态桥
│   │   └── state.ts     # 运行时全局状态
│   ├── rendering/       # Canvas 背景、前景与绘图上下文
│   ├── main.tsx         # React 入口
├── assets/              # 静态资源（图片、音频）
├── index.html           # 页面入口
└── package.json         # 项目配置文件与依赖
```

## 致谢
- 代码构建：codex3
- 像素素材：nanobanana2
