# Boss 原画设定

## Purpose

这个目录按 Boss 拆分原画和文案设定。每个 Boss 一个文件，数值、公式和运行时行为仍在 `../../numeric-system/` 中维护。

## Shared Art Direction

Boss 需要保持比普通敌人更强的轮廓识别和阶段变化。设计重点不是单张立绘复杂度，而是玩家在 `960 x 540` 横版画面内能快速读出当前威胁。

通用要求：

- 轮廓必须能和普通敌人区分，Boss 的主体、武器或术式物件要有明确大形。
- 每个 Boss 至少有 1 个稳定识别点，例如蛛足、骨雾、镜片、尖牙、妖灯、枯铃或血月残相。
- 阶段变化优先体现在姿态、特效密度和关键物件状态，不只依赖换色。
- 前摇必须可画，尤其是冲刺、召唤、区域封锁、分身和组合技。
- 特效不能长期遮挡玩家、Boss 血条、平台边缘和拾取物。
- 不直接照搬现有具体动漫角色或知名怪物造型，以原创夜妖变体为准。

## Boss Index

13 幕 = 6 基础 Boss（1-6 幕）+ 6 蚀醒形态（7-12 幕，复用基础精灵 + 蚀醒视觉态）+ 1 终极 Boss（13 幕）。幕表见 [../../game-design/act-structure.md](../../game-design/act-structure.md)。每个基础 Boss 文件内含「蚀醒形态」一节。

| Boss | 工作名 | 基础幕 | 蚀醒幕 | 实现状态 | 文件 |
| --- | --- | ---: | ---: | --- | --- |
| `moonbound_spider_string` | 血月眷属 · 蛛弦 | 1 | 7 | 当前 Boss 素材、玩法、HUD 名称已接入 | [spider-string.md](spider-string.md) |
| `moonbound_mist_bone` | 血月眷属 · 雾骨 | 2 | 8 | 薄雾减速、普攻/地刺、P3 锁向追击、蚀醒浓雾葬/支援召唤与程序化死亡效果已接入 | [mist-bone.md](mist-bone.md) |
| `moonbound_mirror_dream` | 血月眷属 · 镜魇 | 3 | 9 | 碎镜、假身、P3 真身突进/落地恢复、逐阶段错位反射、`splitter` 支援和蚀醒逐帧裂纹已接入 | [mirror-dream.md](mirror-dream.md) |
| `moonbound_fang_gale` | 血月眷属 · 牙岚 | 4 | 10 | 后撤、连闪、终段扑咬、恢复和风牙裂行为/素材已接入 | [fang-gale.md](fang-gale.md) |
| `moonbound_lantern_ember` | 血月眷属 · 灯烬 | 5 | 11 | 素材和注册表已接入；召唤、火线、强化和蚀醒区域行为已接入 | [lantern-ember.md](lantern-ember.md) |
| `moonbound_dead_bell` | 血月眷属 · 枯铃 | 6 | 12 | 确定性节拍、双频停拍、恢复/第二裂铃素材、预算内支援、专属音效与死亡收尾已接入；设定短句 UI 未接 | [dead-bell.md](dead-bell.md) |
| `grand_boss_blood_moon_many_faces` | 终幕之妖 · 万相血月 | 13 | — | 素材和注册表已接入；`bossKills >= 12` 触发，胜利 UI 未接 | [blood-moon-many-faces.md](blood-moon-many-faces.md) |

蚀醒形态优先复用基础 Boss 精灵 + 蚀醒视觉态（变色 / 特效密度提升 / 关键物件状态变化），只有蚀醒招新特效需要少量新素材。

## Readability Checklist

- `蛛弦` 通过白发、红袍和蛛足读出追猎与蛛网。
- `雾骨` 通过白雾、瘦长骨形和地面骨刺读出区域封锁。
- `镜魇` 通过碎镜、倒影和真假身位读出分身干扰。
- `牙岚` 通过低伏兽形、尖牙和蓄力姿态读出高速冲刺。
- `灯烬` 通过妖灯、灰烬和召唤物牵引读出召唤强化。
- `枯铃` 通过裂铃、声波环和停拍姿态读出节奏压迫。
- `万相血月` 必须能读出换相，不能只是把所有 Boss 元素堆在同一帧里。

## Handoff Notes

- 每个 Boss 先出黑白 silhouette 小稿，至少 3 个方案。
- 通过 silhouette 后再细化主色、特效色和阶段差异。
- 动画师需要优先拿到待机、移动、受击、死亡、核心技能前摇和核心技能命中帧。
- 当前 Boss 素材已覆盖基础轮换和终幕 Boss；后续优先补 Boss intro、死亡状态机、胜利结算和蚀醒视觉增强。
- 视觉一致性审计中 `牙岚` 的 `move` / `windup` 只有轻微体量和色值漂移，后续可作为 asset-only 打磨项处理。
