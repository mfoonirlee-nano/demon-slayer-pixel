# 鬼灭之刃：炭治郎生存战（Pixel Survival）

一个基于原生 `HTML + CSS + JavaScript` 的 2D 像素风生存小游戏。  
玩家扮演炭治郎，在不断刷新的小怪与阶段式 Boss 战中尽可能生存并提高分数。

## 游戏特性

- 原生 Canvas 渲染（无第三方框架）
- 键盘与移动端虚拟按键双端支持
- 近战普攻 + 招式系统（`贰之型 水车`）
- 平台、掉落晶体、分阶段 Boss 战
- 像素风角色与特效贴图（`assets/sprites`）

## 操作说明

- `A` / `D`：左右移动
- `W` / `Space`：跳跃
- `J`：普通攻击
- `K`：释放技能（水车，需有可用充能）
- `R`：游戏结束后重开

## 本地运行

### 方式 1：直接打开

直接双击 `index.html` 可运行。

### 方式 2：本地静态服务器（推荐）

在项目根目录启动：

```bash
python3 -m http.server 8000
```

然后访问：`http://localhost:8000`

## 项目结构

```text
demon-slayer-pixel/
├── index.html
├── style.css
├── game.js
├── assets/
│   ├── origin/                  # 原始素材
│   ├── sprites/                 # 游戏使用的精灵图
│   └── sprites_backup_transparent/
├── scripts_redraw_sprites.py    # 重绘/生成像素素材脚本
└── scripts_make_sprites_transparent.py
```

## 素材脚本说明

- `scripts_redraw_sprites.py`：生成/重绘角色、敌人、Boss 与特效贴图
- `scripts_make_sprites_transparent.py`：去除精灵图背景（透明化处理）

注意：两个脚本内当前写死了绝对路径（`/Users/bytedance/Work/demon-slayer/...`）。  
如果要在当前仓库直接使用，建议先改为当前项目路径（`/Users/bytedance/Work/demon-slayer-pixel/...`）或改成相对路径。

## 目标与玩法

- 生存更久，累计更高击杀分
- 利用普攻积攒技能能量并获取技能充能
- 在 Boss 阶段切换时把握输出与走位节奏

## project infomation
- All code built by codex3
- All spritesheet built by nanobanana2
- No code by human

