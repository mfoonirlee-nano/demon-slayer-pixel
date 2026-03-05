# 素材处理指南 (Sprite Processing)

本项目包含一系列 Python 脚本，用于自动化处理像素美术素材，确保游戏内的视觉效果统一且适配。

## 脚本说明

### 1. `scripts_redraw_sprites.py`
**主要功能**：基于配置好的路径和参数，批量生成、重绘或调整精灵图（Spritesheets）。
- 用于调整原始素材的大小以适配游戏内 120px 的参考尺寸。
- 生成包含多帧动画的横向拼接图。

### 2. `scripts_make_sprites_transparent.py`
**主要功能**：移除精灵图中的背景色。
- 常用于将具有特定背景色（如纯白、纯黑或特定绿屏色）的原始像素图片转换为透明背景的 PNG。
- 确保游戏中的角色和特效不会遮挡背景。

### 3. `scripts_optimize_origin_sprites.py`
**主要功能**：优化原始素材，进行批量裁剪或色彩空间转换，减小资源包体积。

## 如何使用

1. **环境准备**：确保本地已安装 Python 3 以及 `Pillow` (PIL) 库。
   ```bash
   pip install Pillow
   ```
2. **修改路径**：脚本中当前包含硬编码的路径。在运行前，请检查并修改脚本开头的 `PATH` 变量为你的本地项目绝对路径。
3. **运行脚本**：
   ```bash
   python3 scripts_redraw_sprites.py
   ```

## 资源路径约定

- `assets/origin/`: 存放未经处理的原始素材。
- `assets/sprites/`: 存放游戏运行直接加载的、处理后的 `.png` 精灵图。
- `assets/sprites_backup_transparent/`: 自动生成的透明化素材备份。
