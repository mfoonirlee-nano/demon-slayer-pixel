# Character-State Visual Audit

审查日期：2026-09-10。状态：全部角色组与补充序列审查完成；修复和最终验证记录见下文。

## Summary

本轮从运行时注册表读取素材契约，覆盖 20 个角色组、121 张本体及身份代理图集。旧报告的 96 张清单已过时。全部图集尺寸匹配、无空帧；边缘接触、重复帧与身份一致性分别判断，不能用尺寸检查代替视觉验收。

| Severity | Count | Notes |
| --- | ---: | --- |
| blocker | 1 | 初次人工审查结果；修复进度见各角色记录 |
| major | 7 | 初次人工审查结果；修复进度见各角色记录 |
| minor | 5 | 初次人工审查结果；修复进度见各角色记录 |
| ok | 7 | 初次人工审查结果；修复进度见各角色记录 |

审查对照了全部角色原画、全部状态接触图，以及玩家和重点漂移角色的绘制比例预览。脚点比较使用实际绘制契约；Boss 特殊施法、强化覆盖和死亡入口已逐一核对。静态预览不能证明实际运行的完整观感。遵守仓库约束，未启动浏览器或游戏进程。

机器证据由 `node scripts/audit-character-sprites.mjs` 生成至 `tmp/character-state-audit/`。注册表共发现 173 个标准序列帧路径；其中 52 张非角色图集及额外 4 张 UI 序列也已完成审查，详见 Supplemental Sequence Review。

用户已明确要求全面修复序列帧。本轮在现有原画身份下执行局部修复；角色记录中的 repaired 表示已完成修复，skipped 表示复核后有意保留。没有新的角色重设计。

## Priority Queue

| Priority | Actor | Severity | Repair Type | Recommended Action |
| ---: | --- | --- | --- | --- |
| 1 | player | major | sprite-contract repair | 重绘裂甲、按纵向运动选跳跃姿态，并修正空中下刺的保持帧。 |
| 2 | lantern-ember | blocker | asset-only repair | 优先重绘四帧缓步循环，保证每帧灯笼完整且挂在手边。 |
| 3 | runner | major | sprite-contract repair | 以接近状态为基准校准蓄力与恢复，保留冲刺循环和读招时长。 |
| 4 | glider | major | asset-only repair | 重做六帧悬停拍翼循环，统一头胸大小并保留翼尖滞后。 |
| 5 | leaper | major | asset-only repair | 按头胸结构校准状态体量，保留蹲伏压缩与腾跃伸展。 |
| 6 | spider-string | major | sprite-contract repair | 先检查各绘制入口的身体比例和脚点，再决定必要的素材修复。 |
| 7 | mist-bone | major | asset-only repair | 统一普攻与三种施法的长背刺、头骨和身体体量，保留释放时序。 |
| 8 | blood-moon-many-faces | major | sprite-contract repair | 保留当前红色头光环身份，核对施法、踉跄和死亡的独立绘制入口。 |
| 9 | mirror-dream | minor | asset-only repair | 修正末帧过渡，并同步该帧的裂纹覆盖层。 |
| 10 | fang-gale | minor | sprite-contract repair | 校准终段扑咬体量，保留原脚底补偿和关键帧。 |
| 11 | crawler | minor | asset-only repair | 校准扑击与恢复的交接姿态，保留真正的卷身旋转。 |
| 12 | caster | minor | asset-only repair | 加强缓慢交替步态及灯的滞后，不加快施法。 |
| 13 | binder | minor | asset-only repair | 修正末尾回摆，使衣摆运动能接回首帧。 |

## Actor Findings

### player

- Display name: 潮刃者
- Category: player
- Runtime status: runtime-enabled player
- Baseline status: baseline clear
- Baseline sources: `docs/art/player.md`, `assets/art/player-concept.png`, `assets/art/player-skills-concept.png`
- In-scope sheets: `assets/sprites/player/player_idle.png`, `assets/sprites/player/player_run.png`, `assets/sprites/player/player_jump.png`, `assets/sprites/player/player_attack.png`, `assets/sprites/player/player_moving_attack.png`, `assets/sprites/player/player_fall_attack.png`, `assets/sprites/player/moon_tide/player_moon_tide_idle.png`, `assets/sprites/player/moon_tide/player_moon_tide_run.png`, `assets/sprites/player/moon_tide/player_moon_tide_jump.png`, `assets/sprites/player/moon_tide/player_moon_tide_attack.png`, `assets/sprites/player/moon_tide/player_moon_tide_moving_attack.png`, `assets/sprites/player/moon_tide/player_moon_tide_fall_attack.png`, `assets/sprites/skills/line_projectile/skill.png`, `assets/sprites/skills/close_arc/skill.png`, `assets/sprites/skills/guard_counter/skill.png`, `assets/sprites/skills/dash_reposition/skill.png`, `assets/sprites/skills/vortex_control/skill.png`, `assets/sprites/skills/armor_break/skill.png`, `assets/sprites/skills/anti_air_multi/skill.png`, `assets/sprites/skills/returning_blade/skill.png`, `assets/sprites/skills/vertical_wave/skill.png`, `assets/sprites/skills/ultimate_skill/skill.png`
- Out-of-scope related sheets: `assets/sprites/skills/*/effect.png`, `assets/sprites/skills/*/icon.png`
- Severity: major
- Repair type: sprite-contract repair
- Drift summary: 裂甲中段缩身、脚点漂移；跳跃按全局时钟循环，可能从落地姿态起跳；普通下落攻击第五帧提前出现地面冲击。
- Recommended action: 重绘裂甲、按纵向运动选跳跃姿态，并修正空中下刺的保持帧。
- Approval status: repaired
- Validation notes: 裂甲五帧已重绘并校准比例与脚点；跳跃按纵向运动选帧；常态下刺以第四帧为空中保持姿态，第五帧起仅在落地播放。跳跃、二段跳、长距离下刺及月潮形态回归测试通过。

### player — 2026-10-28 常态动作续作

- Scope: 本次只重绘玩家常态待机、跑步、跳跃、移动攻击和下落攻击；已完成的原地攻击保留，月潮形态、技能施法和其他角色不在本批替换范围。
- Baseline status: baseline clear；身份参照为玩家原设与新普攻的第 11、16 帧，用户已要求继续生成其他角色序列。
- Initial findings: 旧待机和移动类动作的身形、衣片与新普攻存在差异，需要统一；不能只按各自整帧尺寸缩放。选择自然小幅跑姿，保留跳跃与下刺的运动阶段。
- Repair type: sprite-contract repair；其余常态图采用与新普攻一致的源密度和身体参照，下刺扩大下方留白，移动攻击扩为十二帧。月潮布局已与常态图隔离。
- Approval status: approved by the user's continuation request; integrated for review。
- Validation notes: 生成前后均运行 `scripts/audit-character-sprites.mjs`，本次人工复核聚焦玩家常态五组及与原地攻击的衔接；未重新声称复核所有角色。候选稿中拥挤的移动攻击图已淘汰，采用稿第二帧缺刀已单独修正。动作接触表和左右镜像预览位于 `tmp/imagegen/player-basic-states-20261028/`；未运行游戏或无头浏览器。
- Remaining visual uncertainty: 跑步两半周期的支撑腿区别不够强，移动攻击与跑步切换仍需用户连播复核；记录为已接入待审阅，不等同用户已确认满意。月潮及技能跨状态一致性留待后续批次。

### chaser

- Display name: 裸身追妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/chaser.md`, `assets/art/chaser-concept.png`
- In-scope sheets: `assets/sprites/enemies/chaser/chaser.png`
- Out-of-scope related sheets: 无；身份代理已计入本组。
- Severity: ok
- Repair type: —
- Drift summary: 六帧步态有交替支撑和回摆，各状态身份一致。
- Recommended action: 保留现有动作。
- Approval status: skipped
- Validation notes: 已查看原画与 1 张状态接触图；尺寸匹配、无空帧。本轮保留既有素材。

### crawler

- Display name: 伏地蛛妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/crawler.md`, `assets/art/crawler-concept.png`
- In-scope sheets: `assets/sprites/enemies/crawler/crawler.png`, `assets/sprites/enemies/crawler/crawler_windup.png`, `assets/sprites/enemies/crawler/crawler_lunge.png`, `assets/sprites/enemies/crawler/crawler_spin_lunge.png`, `assets/sprites/enemies/crawler/crawler_recover.png`
- Out-of-scope related sheets: 无；身份代理已计入本组。
- Severity: minor
- Repair type: asset-only repair
- Drift summary: 初审疑似扑击与恢复体量跳变；复核后脚点均在原图 y=145，差异主要来自压低姿态和金色擦地拖尾。
- Recommended action: 保留落地压缩和卷身动作，以接地轮廓核对衔接，避免拉伸成相同高度。
- Approval status: skipped
- Validation notes: 复查五组状态，扑击落地、压低恢复和卷身旋转均为真实姿态变化；原生脚线一致，未发现头甲、节肢身份漂移。保留紧凑的原生贴底接触，不把金色擦地拖尾计入身体体量。

### runner

- Display name: 角突夜妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/runner.md`, `assets/art/runner-concept.png`
- In-scope sheets: `assets/sprites/enemies/runner/runner_approach.png`, `assets/sprites/enemies/runner/runner_windup.png`, `assets/sprites/enemies/runner/runner_dash.png`, `assets/sprites/enemies/runner/runner_recover.png`
- Out-of-scope related sheets: 无；身份代理已计入本组。
- Severity: major
- Repair type: sprite-contract repair
- Drift summary: 蓄力状态的头角和胸腔比接近、冲刺明显偏大，恢复也有体量差。
- Recommended action: 以接近状态为基准校准蓄力与恢复，保留冲刺循环和读招时长。
- Approval status: repaired
- Validation notes: 四帧前摇已按接近状态重绘；恢复三帧等比校准并重排为重新站稳的顺序，按本次硬直进度播放。三个成长阶段的真实状态更新与绘制回归测试通过。

### caster

- Display name: 提灯咒妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/caster.md`, `assets/art/caster-concept.png`
- In-scope sheets: `assets/sprites/enemies/caster/caster_move.png`, `assets/sprites/enemies/caster/caster_windup.png`, `assets/sprites/enemies/caster/caster_cast.png`, `assets/sprites/enemies/caster/caster_recover.png`, `assets/sprites/enemies/caster/caster_hit.png`
- Out-of-scope related sheets: `assets/sprites/enemies/caster/caster_wisp.png`
- Severity: minor
- Repair type: asset-only repair
- Drift summary: 身份一致，移动时腿部变化较弱，灯和袖摆承担了大部分运动。
- Recommended action: 保留仪式型缓步、灯和袖摆的滞后，不增加无关摆动。
- Approval status: skipped
- Validation notes: 复查五种状态后保留：头身、灯和手部身份稳定，缓步的弱腿部运动符合提灯施术者的迟缓定位；与角突等冲刺敌人保持不同节奏。

### duelist

- Display name: 双刃裂妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/duelist.md`, `assets/art/duelist-concept.png`
- In-scope sheets: `assets/sprites/enemies/duelist/duelist.png`, `assets/sprites/enemies/duelist/duelist_windup.png`, `assets/sprites/enemies/duelist/duelist_slash.png`, `assets/sprites/enemies/duelist/duelist_spin.png`, `assets/sprites/enemies/duelist/duelist_recover.png`
- Out-of-scope related sheets: 无；身份代理已计入本组。
- Severity: ok
- Repair type: —
- Drift summary: 步行、横斩、旋身和恢复保持相同身体与武器比例。
- Recommended action: 保留当前四步循环及真实旋身动作。
- Approval status: skipped
- Validation notes: 已查看原画与 5 张状态接触图；尺寸匹配、无空帧。本轮保留既有素材。

### brute

- Display name: 盾甲重妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/brute.md`, `assets/art/brute-concept.png`
- In-scope sheets: `assets/sprites/enemies/brute/brute_advance.png`, `assets/sprites/enemies/brute/brute_guard.png`, `assets/sprites/enemies/brute/brute_shield_bash.png`, `assets/sprites/enemies/brute/brute_recover.png`, `assets/sprites/enemies/brute/brute_shield_break.png`, `assets/sprites/enemies/brute/brute_broken_advance.png`, `assets/sprites/enemies/brute/brute_cleave.png`, `assets/sprites/enemies/brute/brute_broken_recover.png`
- Out-of-scope related sheets: 无；身份代理已计入本组。
- Severity: ok
- Repair type: —
- Drift summary: 原图尺寸差已由分状态绘制比例补偿；实际显示身体一致。
- Recommended action: 保留现有分状态补偿，不能只按原图包围盒统一缩放。
- Approval status: skipped
- Validation notes: 已查看原画与 8 张状态接触图；尺寸匹配、无空帧。本轮保留既有素材。

### binder

- Display name: 缚咒夜妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/binder.md`, `assets/art/binder-concept.png`
- In-scope sheets: `assets/sprites/enemies/binder/binder_move.png`, `assets/sprites/enemies/binder/binder_windup.png`, `assets/sprites/enemies/binder/binder_cast.png`, `assets/sprites/enemies/binder/binder_recover.png`, `assets/sprites/enemies/binder/binder_hit.png`
- Out-of-scope related sheets: `assets/sprites/enemies/binder/binder_zone*.png`
- Severity: minor
- Repair type: asset-only repair
- Drift summary: 移动末帧衣尾伸展后直接回到首帧下垂，循环接点较硬。
- Recommended action: 修正末尾回摆，使衣摆运动能接回首帧。
- Approval status: repaired
- Validation notes: 移动改为原帧索引 [0,1,2,1]，衣尾从展开经过半展开姿态回到下垂，保持四帧与原有手、足和符纸身份。保留原生贴底脚线。

### glider

- Display name: 膜翼巡妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/glider.md`, `assets/art/glider-concept.png`
- In-scope sheets: `assets/sprites/enemies/glider/glider_hover.png`, `assets/sprites/enemies/glider/glider_windup.png`, `assets/sprites/enemies/glider/glider_dive.png`, `assets/sprites/enemies/glider/glider_recover.png`
- Out-of-scope related sheets: 无；身份代理已计入本组。
- Severity: major
- Repair type: asset-only repair
- Drift summary: 悬停的头胸明显小于蓄力和恢复，翅膀展开不能解释身体尺寸差。
- Recommended action: 重做六帧悬停拍翼循环，统一头胸大小并保留翼尖滞后。
- Approval status: repaired
- Validation notes: 六帧悬停已重绘；包含完整上下拍翼，头胸不随翼展缩小。保留原切片与绘制比例，各帧非空且边距至少 5px，已复查四张状态图集。

### leaper

- Display name: 裂足跳妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/leaper.md`, `assets/art/leaper-concept.png`
- In-scope sheets: `assets/sprites/enemies/leaper/leaper_stalk.png`, `assets/sprites/enemies/leaper/leaper_windup.png`, `assets/sprites/enemies/leaper/leaper_leap.png`, `assets/sprites/enemies/leaper/leaper_impact.png`, `assets/sprites/enemies/leaper/leaper_recover.png`
- Out-of-scope related sheets: 无；身份代理已计入本组。
- Severity: major
- Repair type: asset-only repair
- Drift summary: 蓄力、恢复的头胸和背刺比潜行偏大。
- Recommended action: 按头胸结构校准状态体量，保留蹲伏压缩与腾跃伸展。
- Approval status: repaired
- Validation notes: 蓄力与恢复按头胸比例等比校准为原图的 82%、84%，保持屈膝/伸展区别，未改变任何运行时常量；已复查潜行、蓄力、腾跃、落地与恢复的实际绘制体量，头胸与背刺比例相近；保留蓄力压缩和跃起伸展。

### splitter

- Display name: 裂影夜妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/splitter.md`, `assets/art/splitter-concept.png`
- In-scope sheets: `assets/sprites/enemies/splitter/splitter_move.png`, `assets/sprites/enemies/splitter/splitter_hit.png`, `assets/sprites/enemies/splitter/splitter_attack.png`, `assets/sprites/enemies/splitter/splitter_split.png`, `assets/sprites/enemies/splitter/splitling_birth.png`, `assets/sprites/enemies/splitter/splitling_move.png`
- Out-of-scope related sheets: 无；身份代理已计入本组。
- Severity: ok
- Repair type: —
- Drift summary: 本体与分裂代理身份一致，子体变小属于明确的玩法表现。
- Recommended action: 保留有意的体量差。
- Approval status: skipped
- Validation notes: 已查看原画与 6 张状态接触图；尺寸匹配、无空帧。本轮保留既有素材。

### warden

- Display name: 御阵夜妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/warden.md`, `assets/art/warden-concept.png`
- In-scope sheets: `assets/sprites/enemies/warden/warden_move.png`, `assets/sprites/enemies/warden/warden_aura.png`, `assets/sprites/enemies/warden/warden_hit.png`
- Out-of-scope related sheets: `assets/sprites/enemies/warden/warden_aura_effect.png`, `assets/sprites/enemies/warden/warden_blood_moon_buff.png`
- Severity: ok
- Repair type: —
- Drift summary: 正面施法与侧面移动身份一致，缓慢仪式感符合定位。
- Recommended action: 保留停顿节奏。
- Approval status: skipped
- Validation notes: 已查看原画与 3 张状态接触图；尺寸匹配、无空帧。本轮保留既有素材。

### burrower

- Display name: 土潜夜妖
- Category: enemy
- Runtime status: runtime-enabled enemy
- Baseline status: baseline clear
- Baseline sources: `docs/art/enemies/burrower.md`, `assets/art/burrower-concept.png`
- In-scope sheets: `assets/sprites/enemies/burrower/burrower_move.png`, `assets/sprites/enemies/burrower/burrower_sink.png`, `assets/sprites/enemies/burrower/burrower_burrow.png`, `assets/sprites/enemies/burrower/burrower_emerge.png`, `assets/sprites/enemies/burrower/burrower_recover.png`
- Out-of-scope related sheets: 无；身份代理已计入本组。
- Severity: ok
- Repair type: —
- Drift summary: 铲爪、甲壳、土丘和出土状态保持同一身份。
- Recommended action: 保留土丘隐藏身体的设计。
- Approval status: skipped
- Validation notes: 已查看原画与 5 张状态接触图；尺寸匹配、无空帧。本轮保留既有素材。

### spider-string

- Display name: 血月眷属 · 蛛弦
- Category: boss
- Runtime status: runtime-enabled or registered boss
- Baseline status: baseline clear
- Baseline sources: `docs/art/bosses/spider-string.md`, `assets/art/boss-spider-string-concept.png`
- In-scope sheets: `assets/sprites/boss/spider-string/boss.png`, `assets/sprites/boss/spider-string/boss_attack.png`, `assets/sprites/boss/spider-string/boss_skill1.png`, `assets/sprites/boss/spider-string/boss_pillar_cast.png`, `assets/sprites/boss/spider-string/boss_ultimate_cast.png`
- Out-of-scope related sheets: `assets/sprites/boss/spider-string/boss_skill1_effect.png`, `assets/sprites/boss/spider-string/boss_pillar_effect.png`, `assets/sprites/boss/spider-string/boss_ultimate_pillar.png`
- Severity: major
- Repair type: sprite-contract repair
- Drift summary: 实际绘制下近身攻击与柱阵施法明显小于蛛网施法，终式又偏大。
- Recommended action: 先检查各绘制入口的身体比例和脚点，再决定必要的素材修复。
- Approval status: repaired
- Validation notes: 已修复近战、柱阵和大招的独立绘制比例与脚点；完整五张状态图集复查通过，三个状态的实际脚点回归测试及原有施法、柱阵测试通过。PNG、攻击时刻和碰撞体未变。

### mist-bone

- Display name: 血月眷属 · 雾骨
- Category: boss
- Runtime status: runtime-enabled or registered boss
- Baseline status: baseline clear
- Baseline sources: `docs/art/bosses/mist-bone.md`, `assets/art/boss-mist-bone-concept.png`
- In-scope sheets: `assets/sprites/boss/mist-bone/mist_bone_move.png`, `assets/sprites/boss/mist-bone/mist_bone_attack.png`, `assets/sprites/boss/mist-bone/mist_bone_cast.png`, `assets/sprites/boss/mist-bone/mist_bone_line_cast.png`, `assets/sprites/boss/mist-bone/mist_bone_cage_cast.png`
- Out-of-scope related sheets: `assets/sprites/boss/mist-bone/mist_bone_spikes.png`, `assets/sprites/boss/mist-bone/mist_bone_dart.png`
- Severity: major
- Repair type: asset-only repair
- Drift summary: 近战攻击圆头、短背刺和粗肋骨与移动及其他施法状态差异明显。
- Recommended action: 按移动的长背刺与头骨轮廓统一普攻和三种施法，保留读招、释放和回收顺序。
- Approval status: repaired
- Validation notes: 普攻、单点、成列与合围共四张六帧图集已按移动的长头骨与高背刺重绘；逐帧修正多余前臂。五张状态图集运行时对照通过，保留 400×400 切片、施法时序及 304×304 绘制，所有替换帧保留透明边距。

### mirror-dream

- Display name: 血月眷属 · 镜魇
- Category: boss
- Runtime status: runtime-enabled or registered boss
- Baseline status: baseline clear
- Baseline sources: `docs/art/bosses/mirror-dream.md`, `assets/art/boss-mirror-dream-concept.png`
- In-scope sheets: `assets/sprites/boss/mirror-dream/mirror_dream.png`, `assets/sprites/boss/mirror-dream/mirror_dream_cast.png`, `assets/sprites/boss/mirror-dream/mirror_dream_recover.png`, `assets/sprites/boss/mirror-dream/mirror_dream_awakened_cracks.png`, `assets/sprites/boss/mirror-dream/mirror_dream_cast_awakened_cracks.png`, `assets/sprites/boss/mirror-dream/mirror_dream_recover_awakened_cracks.png`, `assets/sprites/boss/mirror-dream/mirror_afterimage.png`, `assets/sprites/boss/mirror-dream/mirror_nightmare.png`
- Out-of-scope related sheets: `assets/sprites/boss/mirror-dream/mirror_shard.png`
- Severity: minor
- Repair type: asset-only repair
- Drift summary: 移动第四帧与第一帧完全相同，循环出现额外停顿；裂纹覆盖层必须与身体同步。
- Recommended action: 修正末帧过渡，并同步该帧的裂纹覆盖层。
- Approval status: repaired
- Validation notes: 移动本体和对应蚀醒裂纹同步采用原帧索引 [0,1,2,1]，经过中间姿态回摆，消除首尾连续双倍待机停顿。保留四帧、原节拍与原生脚线；其他状态和假身保持原图。

### fang-gale

- Display name: 血月眷属 · 牙岚
- Category: boss
- Runtime status: runtime-enabled or registered boss
- Baseline status: baseline clear
- Baseline sources: `docs/art/bosses/fang-gale.md`, `assets/art/boss-fang-gale-concept.png`
- In-scope sheets: `assets/sprites/boss/fang-gale/fang_gale_move.png`, `assets/sprites/boss/fang-gale/fang_gale_windup.png`, `assets/sprites/boss/fang-gale/fang_gale_bite.png`, `assets/sprites/boss/fang-gale/fang_gale_retreat.png`, `assets/sprites/boss/fang-gale/fang_gale_turn.png`, `assets/sprites/boss/fang-gale/fang_gale_final_bite.png`, `assets/sprites/boss/fang-gale/fang_gale_recover.png`
- Out-of-scope related sheets: `assets/sprites/boss/fang-gale/fang_gale_wave.png`
- Severity: minor
- Repair type: sprite-contract repair
- Drift summary: 七种状态间头部大小和红灰配色略有漂移。
- Recommended action: 校准整个连招的头部比例与配色，保持前摇及咬合关键帧。
- Approval status: repaired
- Validation notes: 终段扑咬绘制尺寸等比增加 20%，与前一段扑咬的身体高度差收敛至约 4%；保留原有 24px 基值脚底补偿并随比例缩放。其他状态的俯身、腾空、卷身和红灰阴影保留。

### lantern-ember

- Display name: 血月眷属 · 灯烬
- Category: boss
- Runtime status: runtime-enabled or registered boss
- Baseline status: baseline clear
- Baseline sources: `docs/art/bosses/lantern-ember.md`, `assets/art/boss-lantern-ember-concept.png`
- In-scope sheets: `assets/sprites/boss/lantern-ember/lantern_ember_move.png`, `assets/sprites/boss/lantern-ember/lantern_ember_summon.png`, `assets/sprites/boss/lantern-ember/lantern_ember_fireline_cast.png`, `assets/sprites/boss/lantern-ember/lantern_ember_buff_cast.png`, `assets/sprites/boss/lantern-ember/lantern_ember_death.png`
- Out-of-scope related sheets: `assets/sprites/boss/lantern-ember/*effect*.png`, `assets/sprites/boss/lantern-ember/lantern_ember_fireline.png`, `assets/sprites/boss/lantern-ember/lantern_ember_*zone.png`, `assets/sprites/boss/lantern-ember/lantern_ember_buff_tether.png`
- Severity: blocker
- Repair type: asset-only repair
- Drift summary: 移动第三帧手边灯笼缺失，帧左缘残留相邻灯笼碎片，破坏最亮身份识别点。
- Recommended action: 优先重绘四帧缓步循环，保证每帧灯笼完整且挂在手边。
- Approval status: repaired
- Validation notes: 四帧移动已重绘；每帧灯笼、链条、穗尾完整，脚点 y=411，边距至少 7px。已复查全部五张状态图集，施法及预留死亡身份一致。

### dead-bell

- Display name: 血月眷属 · 枯铃
- Category: boss
- Runtime status: runtime-enabled or registered boss
- Baseline status: baseline clear
- Baseline sources: `docs/art/bosses/dead-bell.md`, `assets/art/boss-dead-bell-concept.png`
- In-scope sheets: `assets/sprites/boss/dead_bell/dead_bell.png`, `assets/sprites/boss/dead_bell/dead_bell_cast.png`, `assets/sprites/boss/dead_bell/dead_bell_recover.png`
- Out-of-scope related sheets: `assets/sprites/boss/dead_bell/dead_bell_awakened_echo_bell.png`, `assets/sprites/boss/dead_bell/dead_bell_wave.png`, `assets/sprites/boss/dead_bell/dead_bell_blade.png`
- Severity: ok
- Repair type: —
- Drift summary: 缓慢、僵直和停顿是仪式型角色定位；各状态外形保持一致。
- Recommended action: 保留读招停顿，不强行改成持续摆动。
- Approval status: skipped
- Validation notes: 已查看原画与 3 张状态接触图；尺寸匹配、无空帧。本轮保留既有素材。

### blood-moon-many-faces

- Display name: 终幕之妖 · 万相血月
- Category: boss
- Runtime status: runtime-enabled or registered boss
- Baseline status: baseline clear
- Baseline sources: `docs/art/bosses/blood-moon-many-faces.md`, `assets/art/boss-blood-moon-many-faces-concept.png`
- In-scope sheets: `assets/sprites/boss/blood-moon-many-faces/blood_moon.png`, `assets/sprites/boss/blood-moon-many-faces/blood_moon_phase_shift.png`, `assets/sprites/boss/blood-moon-many-faces/blood_moon_recover.png`, `assets/sprites/boss/blood-moon-many-faces/blood_moon_death.png`, `assets/sprites/boss/blood-moon-many-faces/blood_moon_final_stagger.png`, `assets/sprites/boss/blood-moon-many-faces/blood_moon_spider_mist_cast.png`, `assets/sprites/boss/blood-moon-many-faces/blood_moon_mirror_fang_cast.png`, `assets/sprites/boss/blood-moon-many-faces/blood_moon_lantern_bell_cast.png`, `assets/sprites/boss/blood-moon-many-faces/blood_moon_sixfold_cast.png`, `assets/sprites/boss/blood-moon-many-faces/blood_moon_many_faces_cast.png`
- Out-of-scope related sheets: `assets/sprites/boss/blood-moon-many-faces/*effect.png`
- Severity: major
- Repair type: sprite-contract repair
- Drift summary: 换相及借相身体大小不一，施法旧脚底补偿将贴底内容下移；死亡绘制入口也需与移动体量对齐。
- Recommended action: 保留当前红色头光环身份，核对施法、踉跄和死亡的独立绘制入口。
- Approval status: repaired
- Validation notes: 保留十张图集；换相、恢复、破月与五种借相按各自身体大小校准绘制比例，去除错误的 26px 基值脚底补偿。死亡图按移动高度等比绘制。全部状态对照及换相、施法、死亡相关 22 项测试通过。

## Repair Log

### 玩家：裂甲、跳跃与下落攻击（已修复）

- `armor_break/skill.png` 已替换为五帧同体量的收刀、回腕、前刺、随动、回收动作，消除中段缩身。保留 5 × 360×360 契约。
- 裂甲绘制比例从 0.34 改为 0.45，锚点改为 `(0.4, 0.96)`；命中、释放时刻和特效契约不变。
- 跳跃改用相对起跳速度选择上升、滞空、下降姿态，避免全局动画时钟导致随机起帧和空中循环落地动作；相关单测已通过。
- 制作源图、提示词、透明中间图、打包参数和前后对照位于 `tmp/imagegen/sequence-repair-20260909/`。
- 普通下落攻击改为前四帧空中下刺、后四帧落地冲击与恢复；月潮保持原有 5+3 分段。恢复时长与伤害不变。

### 灯烬、膜翼巡妖、角突夜妖与裂足跳妖

- 制作记录位于 `tmp/imagegen/sequence-repair-20260910/`，包括提示词、工具源图、透明中间图、原图备份、打包参数和状态对照。
- 灯烬移动、膜翼巡妖悬停和角突前摇采用内置 imagegen；角突恢复和裂足体量修复只做确定性裁切、等比缩放与重排。
- 各张图集保留原帧数与尺寸；角突只调整恢复选帧方式，其余敌人与 Boss 运行时行为未改。

### 后续角色修复与对照

- 雾骨普通攻击、单点、成列与合围共 24 帧统一为移动图的长头骨、高背刺和细肋；保留四种不同动作读法。内置 imagegen 生成主体，局部修正多余前臂，再裁切、去绿幕和等比打包。
- 血月八种施法/恢复身体按头光环和站立体量校准，死亡入口匹配移动高度；蛛弦与牙岚只调整各自所需绘制配置。全部攻击判定、释放时刻和碰撞尺寸保持原值。
- 镜魇移动与裂纹、缚咒移动以原帧 `0,1,2,1` 回摆，重复中间帧是有意的往返动作；禁止因重复帧诊断再次合并。
- `tmp/character-state-audit/review.html` 提供 17 组前后动画对照，按实际显示尺寸与脚点合成；为方便比较，每张原画统一预览 150ms，不能当作实机时序录像。
- `repair-validation.json` 保存 14 张 PNG 的逐帧检查；源图、完整提示词、被替换原图和打包参数保存在两次 `tmp/imagegen/sequence-repair-*` 制作目录中。
- 最终路径沿用已有目录和名称，未新增需要预加载的运行时图集；已核对 `assets.ts`、manifest、loader 和角色说明。

### 当前验证记录

- 14 张替换或重排 PNG 共 65 帧，尺寸、非空帧、透明四角和绿幕残色检查通过。11 张重绘/校准图集共 53 帧四边留白；镜魇本体/裂纹和缚咒移动三张只重排原帧，保留原生贴底脚线和完整像素。
- `pnpm test`：143 个文件、1,068 项测试通过。
- `pnpm run typecheck`、`pnpm run lint`、`pnpm run build`、`git diff HEAD --check` 通过。
- 构建保留既有的大包提示；未启动浏览器或游戏进程。
- 已修复 11 个角色组；7 个原本正常的角色组以及复核后保留的爬行、提灯咒妖共 9 组不重绘。

## Supplemental Sequence Review

- `other-sequences.json` 记录标准目录中剩余 52 张图集；尺寸、非空帧和完全重复帧检查通过，已查看全部 24 组接触图。
- 玩家特效：引灵、潮龙三个等级、贴身月牙、防反潮幕、回刃/合痕、潮闪、回涡、裂甲、针雨、升浪/下柱与月潮环均保持各自动作家族；回刃的 0-3 与 4-7 是不同用途，不能当作一个循环重排。
- 敌人特效：灯火、火球三阶段、符阵/符纸/状态图标、守望者光环与血月强化图均保持中心和可读轮廓。火球滚动与爆炸属于不同播放阶段。
- Boss 特效：蛛丝弹和两种丝柱、钟波/钟刃/回声钟、灯烬牵引/火线/束线/网格/灰区、血月符纹与三组借相、雾骨钉/地刺/三层雾、牙岚波与镜片均完成静态连续性检查；起止和循环区间已与各自运行时核对。
- 环境与道具：四种落叶各 8 帧为真实翻转姿态，宝箱四帧为封闭、蓄光、揭示与开启状态；不将宝箱误作循环动画。
- UI：`end.png` 按 6×4 格与 `(92,88)` 裁片偏移检查；死亡文字从浅色染红，最后一行循环。大招充能按 8 个等级逐行、每行 4 帧检查；就绪月珠为 8 帧循环；灵珠按 4 档逐行、每行 4 帧检查。四张均无空帧，参见 `ui-sequences.json` 与 `contact-sheets/ui-*.png`。
- 消费代码复核：牙岚波先播放两帧预警、再增长并保持飞行末帧；镜片增长、转向和反弹后保持完整末帧；潮闪按单程选帧并随寿命降低透明度。均没有把消散尾帧当作整段循环；保留既有素材。

## Completion Gates

- [x] 审查剩余特效、UI、环境及道具序列帧。
- [x] 完成所有 major/blocker 修复，并记录 minor 的处理或保留理由。
- [x] 验证每组循环接点、状态切换、普通与强化形态的一致性。
- [x] 核对新素材的透明边距、体量、脚点和运行时契约。
- [x] 同步目录、加载清单、精灵文档与角色说明。
- [x] 相关单测、类型检查、lint、全量测试、构建及 diff 检查通过。
