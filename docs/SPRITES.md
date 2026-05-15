# 素材处理指南 (Sprite Processing)

本项目的运行时素材集中在 `assets/sprites/`，由 `src/assets.ts` 统一异步加载，并在 `src/constants/assets.ts` 中维护帧尺寸、帧数、绘制缩放、锚点和特效参数。

新增或替换 sprite sheet 时，优先保持已有切片规格不变。只有总尺寸、单帧尺寸、帧数或运行时用途发生变化时，才同步修改 `src/constants/assets.ts`。

## 当前资源目录

- `assets/sprites/player/`: 玩家待机、跑动、跳跃、普通攻击和下落攻击序列帧。
- `assets/sprites/enemies/`: 小怪、Boss、Boss 技能和 Boss 技能效果。
- `assets/sprites/skills/`: 三个普通技能、大招和对应技能效果。
- `assets/sprites/background/`: 天空、山脉、石塔、鸟居等背景/近景素材。
- `assets/sprites/cloud/`: 大云和小云图集。
- `assets/sprites/tree/`: 树木图集。
- `assets/sprites/ground/`: 草地和石地瓦片。
- `assets/sprites/platform/`: 平台图集。
- `assets/sprites/ui/`: 状态条、技能图标、开始/暂停/结束界面、大招能量球等 UI 素材。

## 关键运行时规格

### 玩家动画

| 文件 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `player_idle.png` | `1920x380` | 6 | `320x380` | `idle` | 常规待机 |
| `player_run.png` | `1920x430` | 6 | `320x430` | `run` | 运行时 `flipX: true` |
| `player_jump.png` | `1800x310` | 6 | `300x310` | `jump` | 跳跃 |
| `player_attack.png` | `2400x400` | 6 | `400x400` | `attack` | 当前普通攻击运行时资源 |
| `player_fall_attack.png` | `2400x400` | 6 | `400x400` | `fallAttack` | 下落攻击 |

辅助/参考资源：

- `player_attack_2.png`: 6 帧攻击备选图，当前未在 `PLAYER_SHEETS` 中加载。
- `player_attack_spaced.png`: 新生成的 6 帧攻击参考图，`3000x400`，单帧 `500x400`，透明背景，帧间留白更大。
- `player_attack_spaced_source.png`: `player_attack_spaced.png` 的绿幕源图，只用于制作留档，不参与运行时加载。

### 技能和技能特效

| 文件 | 总尺寸 | 帧数 | 单帧 | 常量 |
| --- | ---: | ---: | ---: | --- |
| `skill1.png` | `4000x420` | 5 | `800x420` | `SKILLS.skill1` |
| `skill2.png` | `3000x500` | 6 | `500x500` | `SKILLS.skill2` |
| `skill3.png` | `2700x470` | 5 | `540x470` | `SKILLS.skill3` |
| `skill1_effect.png` | `1920x150` | 6 | `320x150` | `SKILL1_EFFECT_SHEET` |
| `skill2_effect.png` | `2280x450` | 6 | `380x450` | `SKILL2_EFFECT_SHEET` |
| `skill3_effect.png` | `2400x300` | 6 | `400x300` | `SKILL3_EFFECT_SHEET` |
| `ultimate_skill.png` | `2400x496` | 6 | `400x496` | `ULTIMATE_SKILL_SHEET` |
| `ultimate_skill_effect.png` | `2160x496` | 5 | `432x496` | `ULTIMATE_SKILL_EFFECT_SHEET` |

`skill2_effect.png` 当前设计为三道不同角度和大小重叠的月牙状水流剑气。它是透明 PNG，6 帧从形成、增强到消散，运行时仍按 `380x450` 切片，并由 `drawSkill2Effects()` 根据玩家 `facing` 做水平翻转。

`skill2_effect_source.png` 是绿幕生成源图，只用于后续重做或回溯，不参与 `loadSprites()`。

### 敌人和 Boss

| 文件 | 总尺寸 | 帧数 | 单帧 | 常量 |
| --- | ---: | ---: | ---: | --- |
| `enemy_1.png` | `1148x282` | 4 | `287x282` | `ENEMY_SHEETS[0]` |
| `enemy_2.png` | `1256x145` | 4 | `314x145` | `ENEMY_SHEETS[1]` |
| `enemy_3.png` | `932x250` | 4 | `233x250` | `ENEMY_SHEETS[2]` |
| `enemy_4.png` | `1152x360` | 4 | `288x360` | `ENEMY_SHEETS[3]` |
| `enemy_5.png` | `1280x360` | 4 | `320x360` | `ENEMY_SHEETS[4]` |
| `enemy_6.png` | `1256x145` | 4 | `314x145` | `ENEMY_SHEETS[5]` |
| `boss.png` | `1400x419` | 4 | `350x419` | `BOSS_SHEET` |
| `boss_skill1.png` | `2400x400` | 6 | `400x400` | `BOSS_SKILL1_SHEET` |
| `boss_skill1_effect.png` | `2400x350` | 6 | `400x350` | `BOSS_SKILL1_EFFECT_SHEET` |

## 资源更新流程

1. 生成或编辑图片时，优先输出为透明 PNG。
2. 如果使用绿幕源图，先保存 `*_source.png`，再抠成运行时透明资源。
3. 对横向序列帧，确保总宽度等于 `frameW * count`，总高度等于 `frameH`。
4. 替换已有运行时素材时，如果切片规格不变，只需要覆盖 PNG。
5. 如果切片规格变化，必须同步更新 `src/constants/assets.ts` 中的 `frameW`、`frameH`、`count`，并检查绘制缩放和碰撞范围。
6. 运行时需要加载的新资源，必须在 `src/constants/assets.ts` 中暴露，并由 `src/assets.ts` 加入加载任务。
7. 不参与运行时的制作源图需要在文件名中标注 `source`，避免误接入。

## 脚本说明

### `scripts_redraw_sprites.py`

用于批量生成、重绘或调整 sprite sheet。适合批量统一尺寸、重新排帧、或从原始素材生成横向动画图集。

### `scripts_make_sprites_transparent.py`

用于移除精灵图背景色，常见输入是纯白、纯黑或绿幕背景。输出应为带 alpha 通道的 PNG。

### `scripts_optimize_origin_sprites.py`

用于优化原始素材，包含批量裁剪、尺寸调整或色彩空间处理等预处理工作。

### `scripts/compress-assets.js`

通过 TinyPNG 压缩传入的 `.png` 文件。需要项目根目录 `.env` 中配置 `TINYPNG_API_KEY=...`。

`package.json` 已将 `*.png` 的 lint-staged 钩子指向该脚本。`npm run compress` 不会自动扫描所有图片，需要显式传入文件，或由 lint-staged 在提交时传入变更 PNG。

## 常用命令

```bash
pip install Pillow
python3 scripts_redraw_sprites.py
python3 scripts_make_sprites_transparent.py
node scripts/compress-assets.js assets/sprites/skills/skill2_effect.png
```

## 约定

- 运行时只直接加载 `assets/sprites/` 下的 `.png`。
- 图集元数据集中放在 `src/constants/assets.ts`，不要在实体绘制逻辑中硬编码切片尺寸。
- 技能、Boss、平台、背景等素材的碰撞或命中范围由运行时状态和常量控制，不应从图片尺寸临时推断。
- 透明 PNG 提交前需要确认四角 alpha 为 0，避免绿幕或黑底残留。
- 如果本地存在 `assets/origin/` 或备份目录，它们只作为工作素材来源，不参与 Vite 运行时加载。
