# 素材处理指南 (Sprite Processing)

本项目的运行时素材集中在 `assets/sprites/`，由 `src/assets.ts` 统一异步加载，并在 `src/constants/assets.ts` 中维护帧尺寸、帧数、绘制缩放、锚点和特效参数。

新增或替换 sprite sheet 时，优先保持已有切片规格不变。只有总尺寸、单帧尺寸、帧数或运行时用途发生变化时，才同步修改 `src/constants/assets.ts`。

## 图片生成基础原则

- 新增、重绘或编辑 sprite 图片内容时，必须使用 Codex 的 Image Gen skill (`imagegen`) 生成或编辑位图素材。
- 禁止使用 Python 代码生成、绘制、重绘或合成图片内容，也不要新增这类 Python 生成脚本。
- Python 仅可用于确定性的后处理或检查，例如绿幕抠透明、压缩、尺寸校验；这些步骤不能改变图片创作内容。
- 项目用素材生成后必须落到 `assets/sprites/` 对应目录中，不能只保留在 Image Gen 的默认输出目录。

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
| `player_idle.png` | `3072x480` | 8 | `384x480` | `idle` | 右向待机，轻微呼吸、衣摆和发束摆动 |
| `player_run.png` | `3584x420` | 8 | `448x420` | `run` | 右向低身前冲，不再依赖 `flipX: true` |
| `player_jump.png` | `2688x420` | 6 | `448x420` | `jump` | 起跳、滞空、下落和落地准备 |
| `player_attack.png` | `5120x480` | 8 | `640x480` | `attack` | 普攻按 `BASIC_ATTACK.frames` 线性播放完整 8 帧 |
| `player_fall_attack.png` | `5120x560` | 8 | `640x560` | `fallAttack` | 前 5 帧为空中下刺，后 3 帧为落地恢复 |

玩家运行时图集以 `assets/art/player-concept.png` 为角色身份基准：深蓝短披风、潮纹衣摆、金属护具、月形腰饰和蓝白潮流刀光。所有玩家运行时图集源方向统一朝右；朝左由 `drawSheetFrame()` 根据玩家 `facing` 镜像绘制。普攻帧由 `attackTimer` 映射到完整 `attack` 图集，不使用全局 elapsed 循环；下落攻击由 `fallAttackTimer` 映射到 0-4 帧，由 `fallAttackRecoveryTimer` 映射到 5-7 帧。

### 技能和技能特效

| 文件 | 总尺寸 | 帧数 | 单帧 | 常量 |
| --- | ---: | ---: | ---: | --- |
| `skill1.png` | `4000x420` | 5 | `800x420` | `SKILLS.skill1` |
| `skill2.png` | `3000x500` | 6 | `500x500` | `SKILLS.skill2` |
| `skill3.png` | `2700x470` | 5 | `540x470` | `SKILLS.skill3` |
| `skill1_effect.png` | `2400x160` | 5 | `480x160` | `SKILL1_EFFECT_SHEET` |
| `skill2_effect.png` | `2520x420` | 6 | `420x420` | `SKILL2_EFFECT_SHEET` |
| `skill3_effect.png` | `2520x320` | 6 | `420x320` | `SKILL3_EFFECT_SHEET` |
| `ultimate_skill.png` | `2400x496` | 6 | `400x496` | `ULTIMATE_SKILL_SHEET` |
| `ultimate_skill_effect.png` | `3840x360` | 8 | `480x360` | `ULTIMATE_SKILL_EFFECT_SHEET` |

玩家技能特效以 `assets/art/player-concept.png`、`assets/art/player-skills-concept.png` 和 `assets/art/player-ultimate-concept.png` 为视觉基准：深蓝月潮流、银白浪尖、泡沫碎点和月形水纹。`skill1_effect.png` 是 5 帧右向水龙投射物，和 `SKILLS.skill1` 的 5 帧动作对应，水龙不会进入消失帧，`loopFromFrame` 从第 2 帧开始循环并直接冲出屏幕；`skill2_effect.png` 是 6 帧贴身半月潮刃，和 `SKILLS.skill2` 的 6 帧动作对应；`skill3_effect.png` 是 6 帧环身防反水幕；`ultimate_skill_effect.png` 是 8 帧月蓝半月潮环，按 `PLAYER_COMBAT.ultimateEffectFrameDuration` 播放。以上透明 PNG 均由运行时根据玩家 `facing` 或中心点绘制，不改变技能伤害、命中冷却或玩法。

> 其余敌人、Boss、地图、UI 和运行时规格继续以 `src/constants/assets.ts` 为准。发布前需要在本文件补回完整资源表，或改为从代码生成资源规格清单，避免手工维护大表时产生过期信息。
