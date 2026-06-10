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

玩家运行时图集以 `assets/art/player-concept.png` 为角色身份基准：深蓝羽织、水纹衣摆、金属护具、月形腰饰和蓝白水流刀光。所有玩家运行时图集源方向统一朝右；朝左由 `drawSheetFrame()` 根据玩家 `facing` 镜像绘制。普攻帧由 `attackTimer` 映射到完整 `attack` 图集，不使用全局 elapsed 循环；下落攻击由 `fallAttackTimer` 映射到 0-4 帧，由 `fallAttackRecoveryTimer` 映射到 5-7 帧。

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

玩家技能特效以 `assets/art/player-concept.png`、`assets/art/player-skills-concept.png` 和 `assets/art/player-ultimate-concept.png` 为视觉基准：深蓝水之呼吸、银白浪尖、泡沫碎点和月形水纹。`skill1_effect.png` 是 5 帧右向水龙投射物，和 `SKILLS.skill1` 的 5 帧动作对应，水龙不会进入消失帧，`loopFromFrame` 从第 2 帧开始循环并直接冲出屏幕；`skill2_effect.png` 是 6 帧贴身半月潮刃，和 `SKILLS.skill2` 的 6 帧动作对应；`skill3_effect.png` 是 6 帧环身防反水幕；`ultimate_skill_effect.png` 是 8 帧月蓝半月潮环，按 `PLAYER_COMBAT.ultimateEffectFrameDuration` 播放。以上透明 PNG 均由运行时根据玩家 `facing` 或中心点绘制，不改变技能伤害、命中冷却或玩法。

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
| `boss/dead_bell/dead_bell.png` | `1400x419` | 4 | `350x419` | `DEAD_BELL_SHEET` |
| `boss/dead_bell/dead_bell_cast.png` | `2400x400` | 6 | `400x400` | `DEAD_BELL_CAST_SHEET` |
| `boss/dead_bell/dead_bell_wave.png` | `2400x350` | 6 | `400x350` | `DEAD_BELL_WAVE_SHEET` |
| `boss/dead_bell/dead_bell_blade.png` | `2520x180` | 6 | `420x180` | `DEAD_BELL_BLADE_SHEET` |
| `boss/mirror-dream/mirror_dream.png` | `1400x419` | 4 | `350x419` | `MIRROR_DREAM_SHEET` |
| `boss/mirror-dream/mirror_dream_cast.png` | `2400x400` | 6 | `400x400` | `MIRROR_DREAM_CAST_SHEET` |
| `boss/mirror-dream/mirror_shard.png` | `2400x350` | 6 | `400x350` | `MIRROR_SHARD_SHEET` |
| `boss/mirror-dream/mirror_afterimage.png` | `2400x400` | 6 | `400x400` | `MIRROR_AFTERIMAGE_SHEET` |
| `boss/mirror-dream/mirror_nightmare.png` | `2400x350` | 6 | `400x350` | `MIRROR_NIGHTMARE_SHEET` |
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

Boss 当前运行时轮换为 `蛛弦 -> 镜魇 -> 灯烬 -> 枯铃`。`蛛弦` 使用 `spider-string/` 下的 `boss*` 三张图；`镜魇` 使用 `mirror-dream/` 下的本体、共用施法、月镜碎片、假身留影和镜中噩梦图集；`灯烬` 使用 `lantern-ember/` 下的本体、三张施法、召唤牵引、贴地火线、强化连线、觉醒火线网格、灰烬减速区和死亡预留图集；`枯铃` 使用 `dead_bell/` 下的本体、摇铃施法、声波环和横向音刃图集。`mirror_shard.png` 用于可左右边界折返一次的反射弹；`mirror_afterimage.png` 用于不造成接触伤害的假身；`mirror_nightmare.png` 用于镜影破碎后朝玩家方向发射的碎光。`灯烬` 的觉醒形态复用基础本体，运行时增加移动火线网格和灰烬减速区；当前击败流程仍沿用全局 Boss 即时结算，`lantern_ember_death.png` 作为后续死亡状态机素材预留。`万相血月` 素材已在 `blood-moon-many-faces/` 下准备并预加载，但未加入当前 Boss 轮换，也未实现第 13 幕状态机。以上 Boss 素材不提交 `*_source.png` 绿幕制作源图；运行时只加载透明 PNG。

Crawler 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/crawler/crawler.png` | `1256x145` | 4 | `314x145` | `move` | 低矮贴地移动，腿部交替但主体稳定 |
| `enemies/crawler/crawler_windup.png` | `1256x145` | 4 | `314x145` | `windup` | 停住压低，前肢张开，红眼和前爪作为读招 |
| `enemies/crawler/crawler_lunge.png` | `1570x145` | 5 | `314x145` | `lunge` | 短距离贴地前扑，前爪和少量尘迹/气弧烘进图集 |
| `enemies/crawler/crawler_recover.png` | `942x145` | 3 | `314x145` | `recover` | 扑击后停顿，腿部回收，给玩家反打窗口 |

Crawler 动作素材不提交 `*_source.png` 绿幕制作源图；运行时只加载以上透明 PNG。

Caster 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/caster/caster_move.png` | `1152x360` | 4 | `288x360` | `move` | 慢速前行，提灯暖橙光和面具红眼清晰 |
| `enemies/caster/caster_windup.png` | `1152x360` | 4 | `288x360` | `windup` | 提灯逐帧抬高，灯芯增强，手势准备施法 |
| `enemies/caster/caster_cast.png` | `1152x360` | 4 | `288x360` | `cast` | 提灯前伸并内置局部符点/火光释放提示，不包含飞行鬼火 |
| `enemies/caster/caster_recover.png` | `864x360` | 3 | `288x360` | `recover` | 施法后手臂回落，灯光变弱，读出硬直 |
| `enemies/caster/caster_hit.png` | `864x360` | 3 | `288x360` | `hit` | 面具后仰、提灯闪烁，读出打断感 |
| `enemies/caster/caster_wisp.png` | `384x96` | 4 | `96x96` | `projectile` | 独立暖橙鬼火投射物，运行时轻微追踪玩家 |

以上 caster 专属动作素材均有对应 `*_source.png` 绿幕制作源图；动作素材由 `CASTER_SHEETS` 暴露并预加载，鬼火由 `CASTER_WISP_SHEET` 暴露并预加载。`caster_move` 现在使用专属远程状态机，鬼火不再作为 `caster_cast` 帧的一部分。

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
| `enemies/duelist/duelist_recover.png` | `960x360` | 3 | `320x360` | `recover` | 斩后收刀硬直，胸口和肩线暴露形成反打窗口 |

Duelist 动作素材不提交 `*_source.png` 绿幕制作源图；运行时只加载以上透明 PNG。斩击读招、双刃弧线和恢复硬直姿态已烘进图集，运行时只负责状态切换和关键帧斩击盒。

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

Brute 运行时由 `BRUTE_SHEETS` 暴露并预加载。非大招伤害先扣盾牌耐久，盾牌归零后进入 `shieldBreak -> brokenRecover -> brokenAdvance`；大招对本体造成完整伤害，若 brute 存活且盾未破，会同步触发破盾。以上运行时只加载透明 PNG，不提交 `*_source.png` 绿幕制作源图。

Binder 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/binder/binder_move.png` | `1040x320` | 4 | `260x320` | `move` | 瘦高灰黑长袍、符纸和暗红咒线的后期控场敌人 |
| `enemies/binder/binder_windup.png` | `1040x320` | 4 | `260x320` | `windup` | 拉紧咒线并指向地面，读出施法前摇 |
| `enemies/binder/binder_cast.png` | `1040x320` | 4 | `260x320` | `cast` | 咒线甩向地面，在玩家当前位置生成减速咒圈 |
| `enemies/binder/binder_recover.png` | `780x320` | 3 | `260x320` | `recover` | 咒线回收，符纸下落，给玩家反打窗口 |
| `enemies/binder/binder_hit.png` | `780x320` | 3 | `260x320` | `hit` | 正式受击素材预留，v1 不改变通用受击状态机 |
| `enemies/binder/binder_zone.png` | `1920x120` | 8 | `240x120` | `bindingZone` | 完整暗红/紫色侧视地面咒圈源图；外环、符文、中心脉冲和短光束逐帧变化，约 `150` 帧内使玩家水平移动速度乘以 `0.45`，并随局内时间低频造成伤害 |
| `enemies/binder/binder_zone_back.png` | `1920x120` | 8 | `240x120` | `bindingZoneBack` | 咒圈上半/远端层，先于角色绘制 |
| `enemies/binder/binder_zone_front.png` | `1920x120` | 8 | `240x120` | `bindingZoneFront` | 咒圈下半/近端亮边层，在地面前景后以较低不透明度绘制 |

Binder 运行时由 `BINDER_SHEETS`、`BINDER_ZONE_SHEET`、`BINDER_ZONE_BACK_SHEET` 和 `BINDER_ZONE_FRONT_SHEET` 暴露并预加载。普通刷怪在 `elapsed >= 90s` 后才会抽取 binder；同屏最多 `1` 个 binder，主咒圈最多 `1` 个。咒圈不禁用跳跃或攻击；玩家进入咒圈时会被减速、低频受到随局内时间提升的伤害，并叠加偏红紫的减速滤镜和束缚线反馈。

Glider 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/glider/glider_hover.png` | `2160x240` | 6 | `360x240` | `hover` | 低空翼膜拍动循环，第一帧与末帧为相邻低翼姿态 |
| `enemies/glider/glider_windup.png` | `1440x240` | 4 | `360x240` | `windup` | 收翼停顿，眼点和翼膜裂缝烘入暗橙红前摇读招 |
| `enemies/glider/glider_dive.png` | `1800x240` | 5 | `360x240` | `dive` / `pass` | 窄身爪前伸俯冲，少量风痕烘入图集；`pass` 复用末帧掠过姿态 |
| `enemies/glider/glider_recover.png` | `1080x240` | 3 | `360x240` | `recover` | 掠过后翼膜重新打开，身体上抬形成反击窗口 |

Glider 运行时由 `GLIDER_SHEETS` 暴露并预加载。普通刷怪在 `elapsed >= 70s` 后才会抽取 glider，作为第 4 幕解锁的当前时间近似；同屏最多 `2` 个 glider，同时处于 `windup` / `dive` / `pass` 压力状态的 glider 最多 `1` 个。Glider 不创建投射物，俯冲预警只依赖 windup 图集内的眼点和翼膜裂缝。

Leaper 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/leaper/leaper_stalk.png` | `1920x320` | 6 | `320x320` | `stalk` | 低伏跟踪循环，长反折腿和分裂钩足是主要轮廓 |
| `enemies/leaper/leaper_windup.png` | `1280x320` | 4 | `320x320` | `windup` | 压低蓄力，膝盖和脚爪赤红裂纹作为起跳读招 |
| `enemies/leaper/leaper_leap.png` | `1600x320` | 5 | `320x320` | `leap` | 固定落点的抛物线跳跃姿态，腿部拉伸和收束读出空中轨迹 |
| `enemies/leaper/leaper_impact.png` | `1280x320` | 4 | `320x320` | `impact` | 落地深蹲，低矮尘土半环和红褐裂纹已烘进图集 |
| `enemies/leaper/leaper_recover.png` | `960x320` | 3 | `320x320` | `recover` | 拔出脚爪并重新压低，形成落地后的反打窗口 |

Leaper 运行时由 `LEAPER_SHEETS` 暴露并预加载。普通刷怪在 `elapsed >= 35s` 后才会抽取 leaper，作为第 2 幕解锁的当前时间近似；同屏最多 `2` 个 leaper，同时处于 `windup` / `leap` / `impact` 锁定落点状态的 leaper 最多 `1` 个。落点预警是运行时绘制的低调红褐地面标记，落地尘土和裂纹已烘入 `impact` 图集。

Splitter 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/splitter/splitter_move.png` | `1728x320` | 6 | `288x320` | `move` | 本体慢速追踪，双半脸面具和胸腹中线裂缝是主要读法 |
| `enemies/splitter/splitter_hit.png` | `864x320` | 3 | `288x320` | `hit` | 受击短暂后仰，裂缝用暗紫红增强但不接近玩家水蓝 |
| `enemies/splitter/splitter_split.png` | `1728x320` | 6 | `288x320` | `split` | 本体死亡后从中线撕开，散出黑紫烟并生成两个分裂体 |
| `enemies/splitter/splitling_birth.png` | `1440x240` | 6 | `240x240` | `birth` | 分裂体短暂半透明出生，期间不造成接触伤害 |
| `enemies/splitter/splitling_move.png` | `1440x240` | 6 | `240x240` | `splitlingMove` | 低矮残缺半身快速追踪，死亡不再分裂 |

Splitter 运行时由 `SPLITTER_SHEETS` 暴露并预加载。普通刷怪在 `elapsed >= 90s` 后才会抽取 splitter；同屏本体最多 `2` 个。本体死亡时先进入短分裂状态并禁用接触伤害，动画结束后生成两个更小更快的 splitling。splitling 击杀不给分数，仅给少量能量，避免刷分。

Warden 专属动作素材：

| 路径 | 总尺寸 | 帧数 | 单帧 | 运行时状态 | 备注 |
| --- | ---: | ---: | ---: | --- | --- |
| `enemies/warden/warden_move.png` | `1280x360` | 4 | `320x360` | `move` | 稳重缓慢的后排 reposition，背架和提灯保持高轮廓 |
| `enemies/warden/warden_aura.png` | `1280x360` | 4 | `320x360` | `aura` | 双手抬起维持仪式，背架与灯芯出现低饱和金绿读法 |
| `enemies/warden/warden_aura_effect.png` | `1920x120` | 8 | `240x120` | `auraEffect` | 低透明金绿仪式环技能序列帧，由运行时按 warden 脚底绘制 |
| `enemies/warden/warden_hit.png` | `960x360` | 3 | `320x360` | `hit` | 被击中时阵架倾斜、铃杖下落，光环短暂失效 |

Warden 运行时由 `WARDEN_SHEETS` 和 `WARDEN_AURA_EFFECT_SHEET` 暴露并预加载。普通刷怪在 `elapsed >= 120s` 后才会抽取 warden；同屏最多 `1` 个。`warden` 不发射投射物，主要威胁是给半径约 `180px` 内其他敌人提供 `+12%` 移速光环；被击中进入 `hit` 时会中断光环。光环本体使用独立技能效果序列帧，被强化敌人的脚下小标记仍由运行时低透明绘制，不影响 Boss。

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
| `ground/grass_ground_150_150_base.png` | `900x300` | `150x150` | 地面主体层 |
| `ground/grass_ground_150_150_front.png` | `900x300` | `150x150` | 草尖/近端遮挡层 |
| `ground/stone_ground_150_150_base.png` | `900x150` | `150x150` | 地面主体层 |
| `ground/stone_ground_150_150_front.png` | `900x150` | `150x150` | 石缘/草尖遮挡层 |

运行时绘制顺序为 `drawGroundTileBase()`、`drawBindingZonesBack()`、角色/敌人/技能主体、`drawGroundTileFront()`、`drawBindingZonesFront()`，让咒圈与草地边缘保持前后穿插。

## 资源更新流程

1. 生成或编辑图片内容时，使用 Image Gen skill (`imagegen`)，优先输出为透明 PNG。
2. 如果使用绿幕源图，先保存 `*_source.png`，再通过确定性后处理抠成运行时透明资源。
3. 对横向序列帧，确保总宽度等于 `frameW * count`，总高度等于 `frameH`。
4. 替换已有运行时素材时，如果切片规格不变，只需要覆盖 PNG。
5. 如果切片规格变化，必须同步更新 `src/constants/assets.ts` 中的 `frameW`、`frameH`、`count`，并检查绘制缩放和碰撞范围。
6. 运行时需要加载的新资源，必须在 `src/constants/assets.ts` 中暴露，并由 `src/assets.ts` 加入加载任务。
7. 不参与运行时的制作源图需要在文件名中标注 `source`，避免误接入。

## 脚本说明

### `scripts/compress-assets.js`

通过 TinyPNG 压缩传入的 `.png` 文件。需要项目根目录 `.env` 中配置 `TINYPNG_API_KEY=...`。

`package.json` 已将 `*.png` 的 lint-staged 钩子指向该脚本。`npm run compress` 不会自动扫描所有图片，需要显式传入文件，或由 lint-staged 在提交时传入变更 PNG。

## 常用命令

```bash
node scripts/compress-assets.js assets/sprites/skills/skill2_effect.png
```

## 约定

- 运行时只直接加载 `assets/sprites/` 下的 `.png`。
- 图集元数据集中放在 `src/constants/assets.ts`，不要在实体绘制逻辑中硬编码切片尺寸。
- 技能、Boss、平台、背景等素材的碰撞或命中范围由运行时状态和常量控制，不应从图片尺寸临时推断。
- 透明 PNG 提交前需要确认四角 alpha 为 0，避免绿幕或黑底残留。
- 如果本地存在 `assets/origin/` 或备份目录，它们只作为工作素材来源，不参与 Vite 运行时加载。
