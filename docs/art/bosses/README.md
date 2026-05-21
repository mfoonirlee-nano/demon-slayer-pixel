# Boss 原画设定

## Purpose

这个目录按 Boss 拆分原画和文案设定。每个 Boss 一个文件，数值、公式和运行时行为仍在 `../../numeric-system/` 中维护。

## Shared Art Direction

Boss 需要保持比普通敌人更强的轮廓识别和阶段变化。设计重点不是单张立绘复杂度，而是玩家在 `960 x 540` 横版画面内能快速读出当前威胁。

通用要求：

- 轮廓必须能和普通敌人区分，Boss 的主体、武器或术式物件要有明确大形。
- 每个 Boss 至少有 1 个稳定识别点，例如蛛足、骨雾、镜片、尖牙、鬼灯、枯铃或血月残相。
- 阶段变化优先体现在姿态、特效密度和关键物件状态，不只依赖换色。
- 前摇必须可画，尤其是冲刺、召唤、区域封锁、分身和组合技。
- 特效不能长期遮挡玩家、Boss 血条、平台边缘和拾取物。
- 不直接照搬现有具体动漫角色或知名怪物造型，以原创妖鬼变体为准。

## Boss Index

| Boss | 工作名 | 实现状态 | 文件 |
| --- | --- | --- | --- |
| `lower_moon_spider_string` | 下弦之鬼 · 蛛弦 | 当前 Boss 素材已接入；设定名未接入 HUD | [spider-string.md](spider-string.md) |
| `lower_moon_mist_bone` | 下弦之鬼 · 雾骨 | 未实现 | [mist-bone.md](mist-bone.md) |
| `lower_moon_mirror_dream` | 下弦之鬼 · 镜魇 | 未实现 | [mirror-dream.md](mirror-dream.md) |
| `lower_moon_fang_gale` | 下弦之鬼 · 牙岚 | 未实现 | [fang-gale.md](fang-gale.md) |
| `lower_moon_lantern_ember` | 下弦之鬼 · 灯烬 | 未实现 | [lantern-ember.md](lantern-ember.md) |
| `lower_moon_dead_bell` | 下弦之鬼 · 枯铃 | 未实现 | [dead-bell.md](dead-bell.md) |
| `grand_boss_blood_moon_many_faces` | 终幕之鬼 · 万相血月 | 未实现；终盘特殊挑战 | [blood-moon-many-faces.md](blood-moon-many-faces.md) |

## Readability Checklist

- `蛛弦` 通过白发、红袍和蛛足读出追猎与蛛网。
- `雾骨` 通过白雾、瘦长骨形和地面骨刺读出区域封锁。
- `镜魇` 通过碎镜、倒影和真假身位读出分身干扰。
- `牙岚` 通过低伏兽形、尖牙和蓄力姿态读出高速冲刺。
- `灯烬` 通过鬼灯、灰烬和召唤物牵引读出召唤强化。
- `枯铃` 通过裂铃、声波环和停拍姿态读出节奏压迫。
- `万相血月` 必须能读出换相，不能只是把所有 Boss 元素堆在同一帧里。

## Handoff Notes

- 每个 Boss 先出黑白 silhouette 小稿，至少 3 个方案。
- 通过 silhouette 后再细化主色、特效色和阶段差异。
- 动画师需要优先拿到待机、移动、受击、死亡、核心技能前摇和核心技能命中帧。
- 当前 Boss `蛛弦` 的后续工作优先补命名、登场提示和阶段视觉增强，不需要重做主体素材。
