# 鬼灭之刃：炭治郎生存战（Pixel Survival）

一个基于 `React 19 + Jotai + Tailwind CSS + TypeScript` 的 2D 像素风生存小游戏。  
玩家扮演炭治郎，在不断刷新的小怪与阶段式 Boss 战中尽可能生存并提高分数。

## 游戏特性

- **Canvas 渲染内核**：保留原有像素风游戏渲染与玩法循环。
- **React 外壳 + 状态桥接**：使用 React 19、Jotai、Tailwind CSS、TypeScript 与 Vite 承载界面与 HUD。
- **双端支持**：适配键盘操作与移动端触控/虚拟按键。
- **丰富系统**：包含招式系统、平台掉落、分阶段 Boss 战。
- **动态特效**：基于粒子的战斗视觉反馈。

## 操作说明

- `A` / `D`：左右移动
- `W` / `Space`：跳跃
- `J`：普通攻击
- `K`：释放技能（水车/其他招式，需有可用充能）
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

## 项目结构与文档

详细的文档位于 `docs/` 目录下：

- [📂 项目架构 (ARCHITECTURE.md)](docs/ARCHITECTURE.md)：深入了解代码模块设计与游戏循环逻辑。
- [🎨 素材处理 (SPRITES.md)](docs/SPRITES.md)：说明如何使用 Python 脚本生成和优化像素精灵图。

### 代码目录概览
```text
demon-slayer-pixel/
├── docs/                # 项目详细文档
├── src/                 # 源代码目录
│   ├── entities/        # 游戏实体实现（玩家、敌人、Boss等）
│   ├── App.tsx          # React 外壳、HUD 与触控按钮
│   ├── main.tsx         # React 入口
│   ├── runtime.ts       # 游戏运行时与主循环
│   ├── gameStore.ts     # Jotai HUD 状态桥
│   └── state.ts         # 运行时全局状态
├── assets/              # 静态资源（图片、音频）
├── index.html           # 页面入口
└── package.json         # 项目配置文件与依赖
```

## 致谢
- 代码构建：codex3
- 像素素材：nanobanana2

