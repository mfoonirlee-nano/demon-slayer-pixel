# 素材处理指南 (Sprite Processing)

本项目的运行时素材集中在 `assets/sprites/`，由 `src/assets.ts` 统一异步加载，并在 `src/constants/assets.ts` 中维护帧尺寸、帧数、绘制缩放、锚点和特效参数。

新增或替换 sprite sheet 时，优先保持已有切片规格不变。只有总尺寸、单帧尺寸、帧数或运行时用途发生变化时，才同步修改 `src/constants/assets.ts`。

## 图片生成基础原则

- 新增、重绘或编辑 sprite 图片内容时，必须使用 Codex 的 Image Gen skill (`imagegen`) 生成或编辑位图素材。
- 禁止使用 Python 代码生成、绘制、重绘或合成图片内容，也不要新增这类 Python 生成脚本。
- Python 仅可用于确定性的后处理或检查，例如绿幕抠透明、压缩、尺寸校验；这些步骤不能改变图片创作内容。
- 项目用素材生成后必须落到 `assets/sprites/` 对应目录中，不能只保留在 Image Gen 的默认输出目录。
- 使用内置 `imagegen` 后必须检查工具返回本身，不要假设一定会写入 `~/.codex/generated_images/`。可信产物来源包括当前调用的 `image_generation_call.result` PNG base64，或当前 imagegen 工具/开发者输出明确给出的 `~/.codex/generated_images/...` 精确文件路径；必须先解码或复制到 `tmp/imagegen/` 或目标工作区路径，再继续后处理。不要扫描 `~/.codex/generated_images/` 查找最新生成图。
- 生成结果进入 `assets/sprites/` 前必须做素材规格校验：确认宽高、文件格式、alpha 通道、四边透明像素、可见内容 bbox、帧数/单帧尺寸和运行时常量仍匹配现有使用方式。
- `imagegen` 可能输出大尺寸 RGB 图、棋盘格伪透明背景或轻微风格漂移。允许做确定性的透明恢复、裁切、缩放和压缩；不允许用脚本补画、重绘或创作缺失的视觉内容。
- 如果需要精确替换已有 UI/sprite，先记录原素材的尺寸和 alpha bbox，后处理时把生成图对齐回这些运行时约束，避免透明边界、碰撞/布局尺寸或卡片锚点漂移。
- 使用 Image Gen CLI fallback 前先确认 `OPENAI_API_KEY` 是否可用；如果缺失，不要继续走 CLI 路径，也不要把内置预览误报为已落盘素材。

## 当前资源目录

- `assets/sprites/player/`: 玩家待机、跑动、跳跃、普通攻击和下落攻击序列帧。
- `assets/sprites/enemies/`: 小怪、Boss、Boss 技能和 Boss 技能效果。
- `assets/sprites/skills/`: 每个技能一个目录，目录内放 `skill.png`、`effect.png` 和已有的 `icon.png`。
- `assets/sprites/background/`: 天空、山脉、石塔、鸟居等背景/近景素材。
- `assets/sprites/scenery/boss-landmarks/`: 第 1-13 幕按 Boss 特征区分的中景地标。
- `assets/sprites/cloud/`: 大云和小云图集。
- `assets/sprites/tree/`: 树木图集。
- `assets/sprites/ground/`: 草地和石地瓦片。
- `assets/sprites/platform/`: 平台图集。
- `assets/sprites/ui/`: 状态条、开始/暂停/结束界面、大招能量球等 UI 素材。

## 关键运行时规格

### 逐幕 Boss 地标

`scenery/boss-landmarks/` 保存 13 张互不复用的 `256x256` RGBA 单图，四边保留透明 gutter，底部可见 bbox 作为地面锚点。`ACT_LANDMARK_SPRITES` 以 `act` 为主键记录 Boss、形态、URL、绘制高度和 alpha，并由 `spriteImageLoadTargets()` 预加载；`drawActLandmarks()` 只选择当前 `enemyDirector.act` 的素材，在树线之后、通用杂物之前绘制，不加入敌人出生遮挡物或碰撞数据。基础幕绘制高 `136px` / alpha `0.84`，蚀醒幕为 `154px` / `0.9`，终幕为 `184px` / `0.96`。

| 幕 | Boss / 形态 | 文件 |
| ---: | --- | --- |
| 1 | 蛛弦 / 基础 | `act-01-spider-string.png` |
| 2 | 雾骨 / 基础 | `act-02-mist-bone.png` |
| 3 | 镜魇 / 基础 | `act-03-mirror-dream.png` |
| 4 | 牙岚 / 基础 | `act-04-fang-gale.png` |
| 5 | 灯烬 / 基础 | `act-05-lantern-ember.png` |
| 6 | 枯铃 / 基础 | `act-06-dead-bell.png` |
| 7 | 蛛弦 / 蚀醒 | `act-07-spider-string-awakened.png` |
| 8 | 雾骨 / 蚀醒 | `act-08-mist-bone-awakened.png` |
| 9 | 镜魇 / 蚀醒 | `act-09-mirror-dream-awakened.png` |
| 10 | 牙岚 / 蚀醒 | `act-10-fang-gale-awakened.png` |
| 11 | 灯烬 / 蚀醒 | `act-11-lantern-ember-awakened.png` |
| 12 | 枯铃 / 蚀醒 | `act-12-dead-bell-awakened.png` |
| 13 | 万相血月 / 终幕 | `act-13-blood-moon-many-faces.png` |

### UI 素材

| 文件 | 总尺寸 | 用途 | 常量 |
| --- | ---: | --- | --- |
| `ui/system/{hud,slots,pause,controls,rewards}/*.png` | 独立 PNG | 角色 HUD 框体、暂停页、奖励面板、卡片、槽位和按钮状态 | `UI_SPRITES` |
| `ui/ultimate_orb_sheet.png` | `512x64` | 大招满能量动画 | `UltimateOrb` |
| `ui/ultimate_orb_charge_sheet.png` | `256x512` | 8 个充能阶段 × 每阶段 4 帧循环动画 | `UltimateOrb` |

充能图集按 `4 列动画相位 × 8 行充能阶段` 排列，单格 `64x64`。能量百分比选择对应行；非零充能且未释放时，以每帧 `200ms` 循环该行的潮流、泡沫和高光。零能量与大招释放倒计时保持该阶段第 1 帧静止；满能量仍切换到 `ultimate_orb_sheet.png` 的 8 帧 / `1600ms` 循环。UI 框体素材按用途放在 `ui/system/` 的子目录中，便于逐个微调。角色 HUD 使用 `ui/system/hud/` 下的模块化素材：`ultimate-frame.png` 是大招圆框，`current-skill-frame.png` 是当前技能圆框，生命条和技能条各由 `left/mid/right` 三段式外框组成。角色状态 HUD 这组素材以 3x 源尺寸保存，例如大招圆框源图为 `216x216`、运行时显示为 `72x72`；`UI_SPRITES` 通过 `displayW/displayH` 记录显示尺寸。运行时只从单图绘制外框和暗轨道，当前值、滞后值和文字由 React/CSS 动态叠加，保证状态条可随等级横向增长。

### 玩家动画

| 文件 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `player_idle.png` | `3072x480` | 8 | `384x480` | `idle` | 右向待机，轻微呼吸、衣摆和发束摆动 |
| `player_run.png` | `3584x420` | 8 | `448x420` | `run` | 右向低身前冲，不再依赖 `flipX: true` |
| `player_jump.png` | `2688x420` | 6 | `448x420` | `jump` | 起跳、滞空、下落和落地准备 |
| `player_attack.png` | `6144x480` | 8 | `768x480` | `attack` | 普攻按 `BASIC_ATTACK.frames` 线性播放完整 8 帧 |
| `player_fall_attack.png` | `5120x560` | 8 | `640x560` | `fallAttack` | 前 5 帧为空中下刺，后 3 帧为落地恢复 |

玩家运行时图集以 `assets/art/player-concept.png` 为角色身份基准：深蓝短披风、潮纹衣摆、金属护具、月形腰饰和蓝白潮流刀光。所有玩家运行时图集源方向统一朝右；朝左由 `drawSheetFrame()` 根据玩家 `facing` 镜像绘制。普攻帧由 `attackTimer` 映射到完整 `attack` 图集，不使用全局 elapsed 循环；下落攻击由 `fallAttackTimer` 映射到 0-4 帧，由 `fallAttackRecoveryTimer` 映射到 5-7 帧。

### 技能和技能特效

| 文件 | 总尺寸 | 帧数 | 单帧 | 常量 |
| --- | ---: | ---: | ---: | --- |
| `line_projectile/skill.png` | `4000x420` | 5 | `800x420` | `SKILLS.line_projectile` |
| `close_arc/skill.png` | `3000x500` | 6 | `500x500` | `SKILLS.close_arc` |
| `guard_counter/skill.png` | `2700x470` | 5 | `540x470` | `SKILLS.guard_counter` |
| `dash_reposition/skill.png` | `2400x360` | 5 | `480x360` | `SKILLS.dash_reposition` |
| `vortex_control/skill.png` | `1800x360` | 5 | `360x360` | `SKILLS.vortex_control` |
| `armor_break/skill.png` | `1800x360` | 5 | `360x360` | `SKILLS.armor_break` |
| `anti_air_multi/skill.png` | `3200x420` | 5 | `640x420` | `SKILLS.anti_air_multi` |
| `returning_blade/skill.png` | `1800x360` | 5 | `360x360` | `SKILLS.returning_blade` |
| `vertical_wave/skill.png` | `2880x420` | 6 | `480x420` | `SKILLS.vertical_wave` |
| `line_projectile/effect.png` | `3840x160` | 8 | `480x160` | `LINE_PROJECTILE_EFFECT_SHEET` |
| `line_projectile/effect_lv2.png` | `5760x160` | 8 | `720x160` | `LINE_PROJECTILE_EFFECT_LEVEL_TWO_SHEET` |
| `line_projectile/effect_lv3.png` | `6720x160` | 8 | `840x160` | `LINE_PROJECTILE_EFFECT_LEVEL_THREE_SHEET` |
| `close_arc/effect.png` | `3240x420` | 6 | `540x420` | `CLOSE_ARC_EFFECT_SHEET` |
| `close_arc/basic_crescent.png` | `384x128` | 2 | `192x128` | `CLOSE_ARC_BASIC_CRESCENT_SHEET` |
| `guard_counter/effect.png` | `2520x320` | 6 | `420x320` | `GUARD_COUNTER_EFFECT_SHEET` |
| `dash_reposition/effect.png` | `1440x120` | 4 | `360x120` | `PLAYER_SKILL_EFFECT_SHEETS.dash_reposition` |
| `vortex_control/effect.png` | `1536x160` | 6 | `256x160` | `PLAYER_SKILL_EFFECT_SHEETS.vortex_control` |
| `armor_break/effect.png` | `880x160` | 4 | `220x160` | `PLAYER_SKILL_EFFECT_SHEETS.armor_break` |
| `anti_air_multi/effect.png` | `1440x320` | 4 | `360x320` | `PLAYER_SKILL_EFFECT_SHEETS.anti_air_multi` |
| `returning_blade/effect.png` | `960x120` | 4 | `240x120` | `PLAYER_SKILL_EFFECT_SHEETS.returning_blade` |
| `vertical_wave/effect.png` | `3360x520` | 7 | `480x520` | `PLAYER_SKILL_EFFECT_SHEETS.vertical_wave` |
| `ultimate_skill/icon.png` | `256x256` | 1 | `256x256` | 大招图标 |
| `ultimate_skill/skill.png` | `2880x480` | 6 | `480x480` | `ULTIMATE_SKILL_SHEET` |
| `ultimate_skill/effect.png` | `3840x360` | 8 | `480x360` | `ULTIMATE_SKILL_EFFECT_SHEET` |

玩家技能特效以 `assets/art/player-concept.png`、`assets/art/player-skills-concept.png`、`assets/art/player-skills-implementation-source.png` 和 `assets/art/player-ultimate-concept.png` 为视觉基准：深蓝月潮流、银白浪尖、泡沫碎点和月形水纹。`line_projectile/effect.png`、`line_projectile/effect_lv2.png` 和 `line_projectile/effect_lv3.png` 分别是 `潮龙·破阵` Lv1/Lv2/Lv3 的 8 帧右向潮龙投射物，等级越高使用越长的真实序列帧；每一帧都保留完整的龙头、龙身和龙尾，前 6 帧以刀锋附近的水流起点为锚，保持龙头和龙尾尺寸不变，通过逐帧增加中段龙身的水浪卷数自然变长，并叠加投射物前移；随后从第 6 帧开始循环最后 3 帧，龙头的高度和朝向保持稳定，同一道浪身波峰从颈后向中段、后段和龙尾逐段传递，鬃鳍和泡沫滞后跟随；不得复用同一龙体仅做整体位移或同相摆动。运行时同时负责让投射物直接冲出屏幕，命中间隔保持不变。`close_arc/effect.png` 是 6 帧贴身半月潮刃，对应 `弦月·潮刃` 的 6 帧动作，运行时按技能等级缩放到最高等级的 50% / 75% / 100%；`close_arc/basic_crescent.png` 是 Lv3 普攻追加的 2 帧小型水波纹月牙剑气，只覆盖基础普攻刀尖外侧的小范围。`guard_counter/effect.png` 是 6 帧环身防反潮幕，对应 `镜潮·护返`。六个新增技能的图标、施法图和特效图以 `player-skills-implementation-source.png` 的绿幕源图为初版基础；其中 `雨线·穿针` 已按原画设定重新生成更大的施放动作和单束斜落针雨运行时序列帧，`回涡·引潮` 已重新生成 5 帧贴地引潮施法动作和 6 帧低位地面潮涡特效，`升浪·托月` 已重新生成 6 帧施放动作、7 帧前向弧形上挑浪柱特效和无角色图标；其他新增技能仍从源图裁切、抠像并重排为运行时透明 PNG：`流步·潮闪` 为短潮线收刀斩，`断浪·裂甲` 为裂纹压缩斩，`回刃·归潮` 为往返月牙潮刃。`ultimate_skill/effect.png` 是 8 帧月蓝半月潮环，按 `PLAYER_COMBAT.ultimateEffectFrameDuration` 播放。以上透明 PNG 均由运行时根据玩家 `facing` 或中心点绘制。

### 敌人和 Boss

敌人图集按敌人拆分在 `assets/sprites/enemies/<enemy>/` 下；Boss 图集按 Boss 拆分在 `assets/sprites/boss/<boss>/` 下。

| 路径 | 总尺寸 | 帧数 | 单帧 | 常量 |
| --- | ---: | ---: | ---: | --- |
| `enemies/chaser/chaser.png` | `1722x282` | 6 | `287x282` | `ENEMY_SHEETS[0]` |
| `enemies/crawler/crawler.png` | `1256x145` | 4 | `314x145` | `ENEMY_SHEETS[1]` |
| `enemies/runner/runner_approach.png` | `1500x250` | 6 | `250x250` | `ENEMY_SHEETS[2]` |
| `enemies/caster/caster_move.png` | `1152x360` | 4 | `288x360` | `ENEMY_SHEETS[3]` |
| `enemies/duelist/duelist.png` | `1280x360` | 4 | `320x360` | `ENEMY_SHEETS[4]` |
| `enemies/brute/brute_advance.png` | `1920x360` | 6 | `320x360` | `ENEMY_SHEETS[5]` |
| `enemies/binder/binder_move.png` | `1040x320` | 4 | `260x320` | `ENEMY_SHEETS[6]` |
| `enemies/glider/glider_hover.png` | `2160x240` | 6 | `360x240` | `ENEMY_SHEETS[7]` |
| `enemies/leaper/leaper_stalk.png` | `1920x320` | 6 | `320x320` | `ENEMY_SHEETS[8]` |
| `enemies/splitter/splitter_move.png` | `1728x320` | 6 | `288x320` | `ENEMY_SHEETS[9]` |
| `enemies/warden/warden_move.png` | `1280x360` | 4 | `320x360` | `ENEMY_SHEETS[10]` |
| `enemies/burrower/burrower_move.png` | `1884x180` | 6 | `314x180` | `ENEMY_SHEETS[11]` |
| `enemies/warden/warden_aura_effect.png` | `1920x120` | 8 | `240x120` | `WARDEN_AURA_EFFECT_SHEET` |
| `boss/spider-string/boss.png` | `1400x419` | 4 | `350x419` | `BOSS_SHEET` |
| `boss/spider-string/boss_skill1.png` | `2400x400` | 6 | `400x400` | `BOSS_SKILL1_SHEET` |
| `boss/spider-string/boss_skill1_effect.png` | `2400x350` | 6 | `400x350` | `BOSS_SKILL1_EFFECT_SHEET` |
| `boss/spider-string/boss_ultimate_cast.png` | `3200x400` | 8 | `400x400` | `SPIDER_STRING_ULTIMATE_CAST_SHEET` |
| `boss/spider-string/boss_ultimate_web.png` | `3840x220` | 8 | `480x220` | `SPIDER_STRING_ULTIMATE_WEB_SHEET` |
| `boss/dead_bell/dead_bell.png` | `1400x419` | 4 | `350x419` | `DEAD_BELL_SHEET` |
| `boss/dead_bell/dead_bell_cast.png` | `2400x400` | 6 | `400x400` | `DEAD_BELL_CAST_SHEET` |
| `boss/dead_bell/dead_bell_wave.png` | `2400x350` | 6 | `400x350` | `DEAD_BELL_WAVE_SHEET` |
| `boss/dead_bell/dead_bell_blade.png` | `2520x180` | 6 | `420x180` | `DEAD_BELL_BLADE_SHEET` |
| `boss/mirror-dream/mirror_dream.png` | `1400x419` | 4 | `350x419` | `MIRROR_DREAM_SHEET` |
| `boss/mirror-dream/mirror_dream_cast.png` | `2400x400` | 6 | `400x400` | `MIRROR_DREAM_CAST_SHEET` |
| `boss/mirror-dream/mirror_shard.png` | `2400x350` | 6 | `400x350` | `MIRROR_SHARD_SHEET` |
| `boss/mirror-dream/mirror_afterimage.png` | `2400x400` | 6 | `400x400` | `MIRROR_AFTERIMAGE_SHEET` |
| `boss/mirror-dream/mirror_nightmare.png` | `2400x350` | 6 | `400x350` | `MIRROR_NIGHTMARE_SHEET` |
| `boss/fang-gale/fang_gale_move.png` | `1400x419` | 4 | `350x419` | `FANG_GALE_SHEET` |
| `boss/fang-gale/fang_gale_windup.png` | `2400x400` | 6 | `400x400` | `FANG_GALE_WINDUP_SHEET` |
| `boss/fang-gale/fang_gale_bite.png` | `2400x400` | 6 | `400x400` | `FANG_GALE_BITE_SHEET` |
| `boss/fang-gale/fang_gale_wave.png` | `2400x350` | 6 | `400x350` | `FANG_GALE_WAVE_SHEET` |
| `boss/lantern-ember/lantern_ember_move.png` | `1400x419` | 4 | `350x419` | `LANTERN_EMBER_SHEET` |
| `boss/lantern-ember/lantern_ember_summon.png` | `2400x400` | 6 | `400x400` | `LANTERN_EMBER_SUMMON_SHEET` |
| `boss/lantern-ember/lantern_ember_fireline_cast.png` | `2400x400` | 6 | `400x400` | `LANTERN_EMBER_FIRELINE_CAST_SHEET` |
| `boss/lantern-ember/lantern_ember_buff_cast.png` | `2400x400` | 6 | `400x400` | `LANTERN_EMBER_BUFF_CAST_SHEET` |
| `boss/lantern-ember/lantern_ember_death.png` | `2400x400` | 6 | `400x400` | `LANTERN_EMBER_DEATH_SHEET` |
| `boss/lantern-ember/lantern_ember_lure_effect.png` | `2400x350` | 6 | `400x350` | `LANTERN_EMBER_LURE_EFFECT_SHEET` |
| `boss/lantern-ember/lantern_ember_fireline.png` | `3840x120` | 8 | `480x120` | `LANTERN_EMBER_FIRELINE_SHEET` |
| `boss/lantern-ember/lantern_ember_buff_tether.png` | `2400x350` | 6 | `400x350` | `LANTERN_EMBER_BUFF_TETHER_SHEET` |
| `boss/lantern-ember/lantern_ember_awakened_grid.png` | `3840x180` | 8 | `480x180` | `LANTERN_EMBER_AWAKENED_GRID_SHEET` |
| `boss/lantern-ember/lantern_ember_ash_zone.png` | `2880x140` | 8 | `360x140` | `LANTERN_EMBER_ASH_ZONE_SHEET` |
| `boss/blood-moon-many-faces/blood_moon.png` | `1400x419` | 4 | `350x419` | `BLOOD_MOON_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_phase_shift.png` | `2400x400` | 6 | `400x400` | `BLOOD_MOON_PHASE_SHIFT_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_recover.png` | `1200x400` | 3 | `400x400` | `BLOOD_MOON_RECOVER_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_death.png` | `2400x419` | 6 | `400x419` | `BLOOD_MOON_DEATH_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_spider_mist_cast.png` | `2400x400` | 6 | `400x400` | `BLOOD_MOON_SPIDER_MIST_CAST_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_mirror_fang_cast.png` | `2400x400` | 6 | `400x400` | `BLOOD_MOON_MIRROR_FANG_CAST_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_lantern_bell_cast.png` | `2400x400` | 6 | `400x400` | `BLOOD_MOON_LANTERN_BELL_CAST_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_sixfold_cast.png` | `2400x400` | 6 | `400x400` | `BLOOD_MOON_SIXFOLD_CAST_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_many_faces_cast.png` | `2400x400` | 6 | `400x400` | `BLOOD_MOON_MANY_FACES_CAST_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_spider_mist_effect.png` | `3360x220` | 8 | `420x220` | `BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_mirror_fang_effect.png` | `2880x260` | 6 | `480x260` | `BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_lantern_bell_effect.png` | `3360x350` | 8 | `420x350` | `BLOOD_MOON_LANTERN_BELL_EFFECT_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_sixfold_effect.png` | `3360x350` | 8 | `420x350` | `BLOOD_MOON_SIXFOLD_EFFECT_SHEET` |
| `boss/blood-moon-many-faces/blood_moon_many_faces_effect.png` | `5760x420` | 12 | `480x420` | `BLOOD_MOON_MANY_FACES_EFFECT_SHEET` |

Boss 当前普通运行时轮换为 `蛛弦 -> 雾骨 -> 镜魇 -> 牙岚 -> 灯烬 -> 枯铃`，`bossKills >= 12` 后进入终幕 `万相血月`。`蛛弦` 使用 `spider-string/` 下的本体、蛛丝弹施法/特效、千丝牢笼施法和蛛网线特效图集；`镜魇` 使用 `mirror-dream/` 下的本体、共用施法、月镜碎片、假身留影和镜中噩梦图集；`牙岚` 使用 `fang-gale/` 下的本体移动、蓄力、扑咬冲刺和风牙裂波图集；`灯烬` 使用 `lantern-ember/` 下的本体、三张施法、召唤牵引、贴地火线、强化连线、蚀醒火线网格、灰烬减速区和死亡预留图集；`枯铃` 使用 `dead_bell/` 下的本体、摇铃施法、声波环和横向音刃图集。`mirror_shard.png` 用于可左右边界折返一次的反射弹；`mirror_afterimage.png` 用于不造成接触伤害的假身；`mirror_nightmare.png` 用于镜影破碎后朝玩家方向发射的碎光。`灯烬` 的蚀醒形态复用基础本体，运行时增加移动火线网格和灰烬减速区；当前击败流程仍沿用全局 Boss 即时结算，`lantern_ember_death.png` 和 `blood_moon_death.png` 作为后续死亡状态机素材预留。`万相血月` 使用 `blood-moon-many-faces/` 下的换相、恢复、五招施法和五招特效图集；击败后停止 Boss 重生，胜利结算 UI 尚未接入。以上 Boss 素材不提交 `*_source.png` 绿幕制作源图；运行时只加载透明 PNG。

Crawler 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/crawler/crawler.png` | `1256x145` | 4 | `314x145` | `move` | 低矮贴地移动，腿部交替但主体稳定 |
| `enemies/crawler/crawler_windup.png` | `1256x145` | 4 | `314x145` | `windup` | 停住压低，前肢张开，红眼和前爪作为读招 |
| `enemies/crawler/crawler_lunge.png` | `1570x145` | 5 | `314x145` | `lunge` | 短距离贴地前扑，前爪和少量尘迹/气弧烘进图集 |
| `enemies/crawler/crawler_spin_lunge.png` | `2512x145` | 8 | `314x145` | `leap` | 蚀醒/终幕跳跃旋转前冲，旋转姿态烘进序列帧，不靠运行时旋转整图 |
| `enemies/crawler/crawler_recover.png` | `942x145` | 3 | `314x145` | `recover` | 扑击后停顿，腿部回收，给玩家反打窗口 |

Crawler 动作素材不提交 `*_source.png` 绿幕制作源图；运行时只加载以上透明 PNG。

Caster 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/caster/caster_move.png` | `1152x360` | 4 | `288x360` | `move` | 慢速前行，提灯暖橙光和面具红眼清晰 |
| `enemies/caster/caster_windup.png` | `1152x360` | 4 | `288x360` | `windup` | 提灯逐帧抬高，灯芯增强，手势准备施法 |
| `enemies/caster/caster_cast.png` | `1152x360` | 4 | `288x360` | `cast` | 提灯前伸并内置局部符点/火光释放提示，不包含飞行幽火 |
| `enemies/caster/caster_recover.png` | `864x360` | 3 | `288x360` | `recover` | 施法后手臂回落，灯光变弱，读出硬直 |
| `enemies/caster/caster_hit.png` | `864x360` | 3 | `288x360` | `hit` | 面具后仰、提灯闪烁，读出打断感 |
| `enemies/caster/caster_wisp.png` | `384x96` | 4 | `96x96` | `projectile` | 独立暖橙幽火投射物，运行时轻微追踪玩家 |

以上 caster 专属动作素材均有对应 `*_source.png` 绿幕制作源图；动作素材由 `CASTER_SHEETS` 暴露并预加载，幽火由 `CASTER_WISP_SHEET` 暴露并预加载。`caster_move` 现在使用专属远程状态机，幽火不再作为 `caster_cast` 帧的一部分。

Runner 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/runner/runner_approach.png` | `1500x250` | 6 | `250x250` | `approach` | 低身急跑，角前指 |
| `enemies/runner/runner_windup.png` | `1000x250` | 4 | `250x250` | `windup` | 静止压低，角对准玩家 |
| `enemies/runner/runner_dash.png` | `1250x250` | 5 | `250x250` | `dash` | 身体拉成长斜线，带少量尘迹 |
| `enemies/runner/runner_recover.png` | `750x250` | 3 | `250x250` | `recover` | 冲过后刹停，露出反打窗口 |

以上 runner 专属动作素材均有对应 `*_source.png` 绿幕制作源图。

Duelist 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/duelist/duelist.png` | `1280x360` | 4 | `320x360` | `approach` | 双刃低位推进，黑红破布和骨刃轮廓清晰 |
| `enemies/duelist/duelist_windup.png` | `1280x360` | 4 | `320x360` | `windup` | 停步压低，双刃外展，暗红刃缘作为读招 |
| `enemies/duelist/duelist_slash.png` | `1600x360` | 5 | `320x360` | `slash` | 短距离双刃斩击，关键帧弧形斩线已烘进图集 |
| `enemies/duelist/duelist_spin.png` | `1920x360` | 6 | `320x360` | `spin` | 觉醒/最终空中旋转双刀斩，紫红环形刀轨烘进图集 |
| `enemies/duelist/duelist_recover.png` | `960x360` | 3 | `320x360` | `recover` | 斩后收刀硬直，胸口和肩线暴露形成反打窗口 |

Duelist 动作素材不提交 `*_source.png` 绿幕制作源图；运行时只加载以上透明 PNG。斩击读招、双刃弧线、觉醒/最终旋转轨迹和恢复硬直姿态已烘进图集，运行时只负责状态切换和关键帧斩击盒。

Brute 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/brute/brute_advance.png` | `1920x360` | 6 | `320x360` | `advance` | 完整盾牌小步推进，首尾为相邻步态 |
| `enemies/brute/brute_guard.png` | `1280x360` | 4 | `320x360` | `guard` | 举盾防御，盾面裂纹和符钉读招烘入图集 |
| `enemies/brute/brute_shield_bash.png` | `1600x360` | 5 | `320x360` | `shieldBash` | 短距离盾击，命中盒只触发一次 |
| `enemies/brute/brute_recover.png` | `960x360` | 3 | `320x360` | `recover` | 持盾攻击后硬直，盾牌仍完整 |
| `enemies/brute/brute_shield_break.png` | `1280x360` | 4 | `320x360` | `shieldBreak` | 盾牌碎裂、碎片飞出并暴露胸腹 |
| `enemies/brute/brute_broken_advance.png` | `1920x360` | 6 | `320x360` | `brokenAdvance` | 无盾沉重推进，轮廓明显变窄 |
| `enemies/brute/brute_cleave.png` | `1600x360` | 5 | `320x360` | `cleave` | 破盾后慢速横扫，挥臂弧线烘入图集 |
| `enemies/brute/brute_broken_recover.png` | `960x360` | 3 | `320x360` | `brokenRecover` | 无盾攻击后硬直，胸腹持续暴露 |
| `enemies/brute/brute_fireball_launch.png` | `384x96` | 4 | `96x96` | `launch` | 盾缘点燃、喷出火舌并凝成右向火球 |
| `enemies/brute/brute_fireball_roll.png` | `576x96` | 6 | `96x96` | `roll` | 暗红橙金火球贴地自转，可无缝循环 |
| `enemies/brute/brute_fireball_explosion.png` | `1120x160` | 7 | `160x160` | `explode` | 地面火星扩张到峰值爆焰后收缩熄灭，第三帧判定伤害 |

Brute 运行时由 `BRUTE_SHEETS` 与 `BRUTE_FIREBALL_*_SHEET` 暴露并预加载。完整盾牌先承受普通攻击、普通技能和大招伤害，盾牌归零后进入 `shieldBreak -> brokenRecover -> brokenAdvance`；`armor_break` 命中完整盾牌时直接触发破盾，但这一击不打本体。觉醒/终幕火球复用盾击第三帧释放门，运行时按 `launch -> roll -> explode` 推进；滚动阶段不造成接触伤害，爆炸只在关键帧结算一次。以上运行时只加载透明 PNG，不提交 `*_source.png` 绿幕制作源图。

Binder 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/binder/binder_move.png` | `1040x320` | 4 | `260x320` | `move` | 瘦高灰黑长袍、符纸和暗红咒线的后期控场敌人 |
| `enemies/binder/binder_windup.png` | `1040x320` | 4 | `260x320` | `windup` | 拉紧咒线并指向地面，读出施法前摇 |
| `enemies/binder/binder_cast.png` | `1040x320` | 4 | `260x320` | `cast` | 咒线甩向身前，在自身前方生成发射符纸的法阵 |
| `enemies/binder/binder_recover.png` | `780x320` | 3 | `260x320` | `recover` | 咒线回收，符纸下落，给玩家反打窗口 |
| `enemies/binder/binder_hit.png` | `780x320` | 3 | `260x320` | `hit` | 正式受击素材预留，v1 不改变通用受击状态机 |
| `enemies/binder/binder_magic_circle.png` | `1920x120` | 8 | `240x120` | `bindingCircle` | 身前短时暗红/紫色侧视法阵，中心脉冲后释放符纸 |
| `enemies/binder/binder_talisman.png` | `256x64` | 4 | `64x64` | `binderTalisman` | 飞行/贴附用旧黄符纸，带暗红咒线和紫色诅咒边 |
| `enemies/binder/binder_talisman_key_scramble_effect.png` | `480x80` | 6 | `80x80` | `binderTalismanKeyScrambleEffect` | 贴附后在角色头顶悬浮的紫色圆环箭头反转提示 |
| `enemies/binder/binder_talisman_stun_effect.png` | `480x80` | 6 | `80x80` | `binderTalismanStunEffect` | 贴附后眩晕状态的金色星爆/电弧反馈 |

Binder 运行时由 `BINDER_SHEETS`、`BINDER_MAGIC_CIRCLE_SHEET`、`BINDER_TALISMAN_SHEET`、`BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET` 和 `BINDER_TALISMAN_STUN_EFFECT_SHEET` 暴露并预加载。普通刷怪在 `elapsed >= 90s` 后才会抽取 binder；同屏最多 `1` 个 binder，主法阵最多 `1` 个，飞行符纸最多 `2` 个。法阵生成在 binder 自身身前，随后符纸飞向玩家；符纸命中后贴在玩家身上并施加负面效果。普通状态施加减速和持续掉血；觉醒状态施加左右键位错乱和突发眩晕；终幕状态从四种效果中随机施加两种。左右键位错乱在角色头顶额外绘制圆环箭头状态特效，眩晕额外绘制附着在符纸中心的状态特效序列帧，强化读法但不改变控制数值。

Glider 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/glider/glider_hover.png` | `2160x240` | 6 | `360x240` | `hover` | 低空翼膜拍动循环；可见内容已按固定底部中心锚点放大，体量与其它状态一致 |
| `enemies/glider/glider_windup.png` | `1440x240` | 4 | `360x240` | `windup` | 收翼停顿，眼点和翼膜裂缝烘入暗橙红前摇读招 |
| `enemies/glider/glider_dive.png` | `1800x240` | 5 | `360x240` | `dive` / `pass` | 窄身爪前伸俯冲，少量风痕烘入图集；`pass` 复用末帧掠过姿态 |
| `enemies/glider/glider_recover.png` | `1080x240` | 3 | `360x240` | `recover` | 掠过后翼膜重新打开，身体上抬形成反击窗口 |

Glider 运行时由 `GLIDER_SHEETS` 暴露并预加载。普通刷怪在 `elapsed >= 70s` 后才会抽取 glider，作为第 4 幕解锁的当前时间近似；同屏最多 `2` 个 glider，同时处于 `windup` / `dive` / `pass` 压力状态的 glider 最多 `1` 个。普通状态只使用俯冲；觉醒和终幕状态会在悬停拍翼时发射单枚横向音波刃，复用已预加载的 `DEAD_BELL_BLADE_SHEET` 并施加紫色效果，终幕版本更大、更快。俯冲预警仍只依赖 windup 图集内的眼点和翼膜裂缝。

Leaper 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/leaper/leaper_stalk.png` | `1920x320` | 6 | `320x320` | `stalk` | 低伏跟踪循环，长反折腿和分裂钩足是主要轮廓 |
| `enemies/leaper/leaper_windup.png` | `1280x320` | 4 | `320x320` | `windup` | 压低蓄力，膝盖和脚爪赤红裂纹作为起跳读招 |
| `enemies/leaper/leaper_leap.png` | `1600x320` | 5 | `320x320` | `leap` / `skyRise` / `skyFall` | 固定落点的抛物线跳跃姿态；终幕复用该图集升出屏幕并沿预警线坠落 |
| `enemies/leaper/leaper_impact.png` | `1280x320` | 4 | `320x320` | `impact` | 落地深蹲，低矮尘土半环和红褐裂纹已烘进图集 |
| `enemies/leaper/leaper_recover.png` | `960x320` | 3 | `320x320` | `recover` | 拔出脚爪并重新压低，形成落地后的反打窗口 |

Leaper 运行时由 `LEAPER_SHEETS` 暴露并预加载。普通刷怪在 `elapsed >= 35s` 后才会抽取 leaper，作为第 2 幕解锁的当前时间近似；同屏最多 `2` 个 leaper，同时处于锁定落点、空中或重击阶段的 leaper 最多 `1` 个。三种成长阶段都能锁定玩家所在平台。觉醒跳跃会生成一轮运行时骨刺投射物；终幕复用 `leap` 图集完成离屏升降，`skyWait` 隐藏本体，并用运行时红线和旋转飞石增强预警与落地反馈。现有 PNG 的尺寸、帧数、透明边界和锚点均未改变。

Splitter 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/splitter/splitter_move.png` | `1728x320` | 6 | `288x320` | `move` | 本体慢速追踪，双半脸面具和胸腹中线裂缝是主要读法 |
| `enemies/splitter/splitter_hit.png` | `864x320` | 3 | `288x320` | `hit` | 受击短暂后仰，裂缝用暗紫红增强但不接近玩家水蓝 |
| `enemies/splitter/splitter_attack.png` | `1728x320` | 6 | `288x320` | `attack` | 本体贴近玩家时短暂停步挥爪/骨刃，接触伤害仍走通用碰撞检测 |
| `enemies/splitter/splitter_split.png` | `1728x320` | 6 | `288x320` | `split` | 本体死亡后从中线撕开，散出黑紫烟并生成两个分裂体 |
| `enemies/splitter/splitling_birth.png` | `1440x240` | 6 | `240x240` | `birth` | 分裂体短暂半透明出生，期间不造成接触伤害 |
| `enemies/splitter/splitling_move.png` | `1440x240` | 6 | `240x240` | `splitlingMove` | 低矮残缺半身快速追踪，死亡不再分裂 |

Splitter 运行时由 `SPLITTER_SHEETS` 暴露并预加载。普通刷怪在 `elapsed >= 90s` 后才会抽取 splitter；同屏本体最多 `2` 个。本体碰撞玩家时进入短攻击动画，并继续通过通用接触伤害扣血。本体死亡时先进入短分裂状态并禁用接触伤害，动画结束后生成两个更小更快的 splitling。splitling 击杀不给分数，仅给少量能量，避免刷分。

Warden 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/warden/warden_move.png` | `1280x360` | 4 | `320x360` | `move` | 稳重缓慢的后排 reposition，背架和提灯保持高轮廓 |
| `enemies/warden/warden_aura.png` | `1280x360` | 4 | `320x360` | `aura` | 双手抬起维持仪式，背架与灯芯出现低饱和金绿读法 |
| `enemies/warden/warden_aura_effect.png` | `1920x120` | 8 | `240x120` | `auraEffect` | 低透明金绿仪式环技能序列帧，由运行时按 warden 脚底绘制 |
| `enemies/warden/warden_blood_moon_buff.png` | `432x72` | 6 | `72x72` | `buffEffect` | 被光环强化的敌人头顶出现小型血月序列帧 |
| `enemies/warden/warden_hit.png` | `960x360` | 3 | `320x360` | `hit` | 被击中时阵架倾斜、铃杖下落，光环短暂失效 |

Warden 运行时由 `WARDEN_SHEETS`、`WARDEN_AURA_EFFECT_SHEET` 和 `WARDEN_BLOOD_MOON_BUFF_SHEET` 暴露并预加载。普通刷怪在 `elapsed >= 120s` 后才会抽取 warden；同屏最多 `1` 个。`warden` 不发射投射物，主要威胁是分阶段强化其他敌人：普通半径约 `300px`，提供 `+15%` 移速与攻击力；觉醒半径约 `600px`，提供 `+30%` 移速与攻击力；最终阶段全战场生效，使其他敌人免伤并获得 `+50%` 移速与攻击力。被击中进入 `hit` 时会中断光环。光环本体使用独立技能效果序列帧，被强化敌人的头顶小血月标记使用独立序列帧绘制，不影响 Boss。

Burrower 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/burrower/burrower_move.png` | `1884x180` | `6` | `314x180` | `move` | 低矮铲爪贴地移动，甲壳和头甲保持主要轮廓 |
| `enemies/burrower/burrower_sink.png` | `1256x180` | `4` | `314x180` | `sink` | 铲爪抬起、头甲下压，进入潜行前摇 |
| `enemies/burrower/burrower_burrow.png` | `1884x180` | `6` | `314x180` | `burrow` | 只显示土包、裂缝和少量背刺，不显示完整身体 |
| `enemies/burrower/burrower_emerge.png` | `1570x180` | `5` | `314x180` | `emerge` | 铲爪破土、头甲顶出，关键伤害帧读法烘入图集 |
| `enemies/burrower/burrower_recover.png` | `942x180` | `3` | `314x180` | `recover` | 钻出后抖落泥土，暴露反打窗口 |

Burrower 运行时由 `BURROWER_SHEETS` 暴露并预加载。普通刷怪在 `elapsed >= 90s` 后才会抽取 burrower；同屏最多 `1` 个。潜行时接触伤害关闭，使用 `burrower_burrow.png` 显示地面轨迹；钻出点锁定在玩家附近约半个身位偏移，不直接覆盖玩家中心，`emerge` 期间只触发一次钻出伤害。

地面瓦片分层资源：

| 路径 | 总尺寸 | 单帧 | 运行时用途 |
| --- | ---: | ---: | --- |
| `ground/moon_forest_ground_base.png` | `1200x150` | `150x150` | 月林湿土地面主体层 |
| `ground/moon_forest_ground_occlusion.png` | `1200x150` | `150x150` | 月林低矮脚边遮挡层 |
| `ground/moon_shrine_stone_base.png` | `1200x150` | `150x150` | 破神社石地主体层 |
| `ground/moon_shrine_stone_occlusion.png` | `1050x150` | `150x150` | 神社石地低矮脚边遮挡层 |
| `ground/moon_forest_to_shrine_transition_base.png` | `600x150` | `150x150` | 月林到神社石地过渡主体层 |
| `ground/moon_forest_to_shrine_transition_occlusion.png` | `600x150` | `150x150` | 月林到神社石地过渡遮挡层 |
| `ground/moon_shrine_to_forest_transition_base.png` | `600x150` | `150x150` | 神社石地到月林过渡主体层 |
| `ground/moon_shrine_to_forest_transition_occlusion.png` | `600x150` | `150x150` | 神社石地到月林过渡遮挡层 |

运行时绘制顺序为 `drawGroundTileBase()`、`drawBindingZonesBack()`、角色/敌人/技能主体、`drawGroundTileOcclusion()`、`drawBindingZonesFront()`，让低矮法阵/地面特效与地面遮挡保持前后穿插。地面 pattern 由 Boss 阶段驱动：普通战斗使用月林，Boss prelude 使用月林到神社石地过渡，Boss 战中保持神社石地，Boss 击败后使用神社石地到月林过渡。所有地面阶段都保持 `GROUND_TILE_SPRITES.scrollSpeed` 匀速滚动；Boss 战石地滚动从过渡完成位置继续，避免入场帧跳动。base 与 occlusion 共用同一横向偏移；两组过渡资源在 pattern 中显式按 `0→1→2→3` 帧序绘制，避免列号取模导致过渡帧错位。月林进入神社时，后三格过渡图还会按 `20%→50%→85%` 混入与后续序列对齐的石板变体，消除过渡末帧与石板首帧之间的硬分界，同时保持原有滚动速度和 Boss 前摇时长。

## 资源更新流程

1. 生成或编辑图片内容时，使用 Image Gen skill (`imagegen`)，优先输出为透明 PNG。
2. 内置 `imagegen` 返回时，先检查 `image_generation_call.result`；也可以使用当前 imagegen 工具/开发者输出明确给出的 `~/.codex/generated_images/...` 精确文件路径。当前规范或用户明确允许时，可以扫描 `~/.codex/generated_images/` 下的当前会话目录定位生成产物。将对应文件保存为源图后再处理。
3. 如果使用绿幕源图，先保存 `*_source.png`，再通过确定性后处理抠成运行时透明资源。
4. 对横向序列帧，确保总宽度等于 `frameW * count`，总高度等于 `frameH`。
5. 替换已有运行时素材时，如果切片规格不变，只需要覆盖 PNG。
6. 如果切片规格变化，必须同步更新 `src/constants/assets.ts` 中的 `frameW`、`frameH`、`count`，并检查绘制缩放和碰撞范围。
7. 运行时需要加载的新资源，必须在 `src/constants/assets.ts` 中暴露，并由 `src/assets.ts` 加入加载任务。
8. 不参与运行时的制作源图需要在文件名中标注 `source`，避免误接入。

## 脚本说明

### `scripts/compress-assets.js`

通过 TinyPNG 压缩传入的 `.png` 文件。需要项目根目录 `.env` 中配置 `TINYPNG_API_KEY=...`。

`package.json` 已将 `*.png` 的 lint-staged 钩子指向该脚本。`npm run compress` 不会自动扫描所有图片，需要显式传入文件，或由 lint-staged 在提交时传入变更 PNG。

## 常用命令

```bash
node scripts/compress-assets.js assets/sprites/skills/close_arc/effect.png
```

## 约定

- 运行时只直接加载 `assets/sprites/` 下的 `.png`。
- 图集元数据集中放在 `src/constants/assets.ts`，不要在实体绘制逻辑中硬编码切片尺寸。
- 技能、Boss、平台、背景等素材的碰撞或命中范围由运行时状态和常量控制，不应从图片尺寸临时推断。
- 透明 PNG 提交前需要确认四角 alpha 为 0，避免绿幕或黑底残留。
- 如果本地存在 `assets/origin/` 或备份目录，它们只作为工作素材来源，不参与 Vite 运行时加载。
