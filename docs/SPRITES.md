# 素材处理指南 (Sprite Processing)

本项目的运行时素材集中在 `assets/sprites/`，由 `src/assets.ts` 统一异步加载，并在 `src/constants/assets.ts` 中维护帧尺寸、图集区域、绘制缩放和特效参数。仓库也保留了一组 Python 脚本用于批量重绘、透明化和预处理素材，另有 TinyPNG 压缩脚本用于提交前减小 PNG 体积。

## 当前资源目录

- `assets/sprites/player/`: 玩家 `idle`、`run`、`jump`、`attack` 序列帧。
- `assets/sprites/enemies/`: 小怪、Boss、Boss 技能和 Boss 技能效果。
- `assets/sprites/skills/`: 三个普通技能、大招和对应技能效果。
- `assets/sprites/background/`: 天空图集、山脉、石塔、鸟居等背景/近景素材。
- `assets/sprites/cloud/`: 大云和小云图集。
- `assets/sprites/tree/`: 树木图集。
- `assets/sprites/ground/`: 草地和石地瓦片。
- `assets/sprites/platform/`: 平台图集。
- `assets/sprites/ui/`: 状态条、技能图标、暂停面板、死亡动画和大招能量球。

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

### 4. `scripts/compress-assets.js`
**主要功能**：通过 TinyPNG 压缩传入的 `.png` 文件。
- 需要项目根目录 `.env` 中配置 `TINYPNG_API_KEY=...`。
- `package.json` 已将 `*.png` 的 lint-staged 钩子指向该脚本。
- `npm run compress` 本身不会自动扫描所有图片；需要显式传入文件，或由 lint-staged 在提交时传入变更的 PNG。

## 如何使用

1. **环境准备**：确保本地已安装 Python 3 以及 `Pillow` (PIL) 库。
   ```bash
   pip install Pillow
   ```
2. **修改路径**：根目录下的 Python 脚本当前包含硬编码路径。在运行前，请检查并修改脚本开头的路径配置为本地项目绝对路径。
3. **运行 Python 脚本**：
   ```bash
   python3 scripts_redraw_sprites.py
   ```
4. **压缩指定 PNG**：
   ```bash
   node scripts/compress-assets.js assets/sprites/player/player_idle.png
   ```

## 资源路径约定

- 运行时只直接加载 `assets/sprites/` 下的 `.png`。
- 新增运行时素材后，需要同步更新 `src/constants/assets.ts` 的元数据，并在 `src/assets.ts` 中加入加载任务。
- 图集帧宽、帧高、帧数和绘制缩放应放在常量里，不要在实体绘制逻辑中硬编码。
- 技能、Boss、平台、背景等素材的碰撞或命中范围由运行时状态和常量控制，不应从图片尺寸临时推断。
- 如果本地存在 `assets/origin/` 或备份目录，它们只作为工作素材来源，不参与 Vite 运行时加载。
