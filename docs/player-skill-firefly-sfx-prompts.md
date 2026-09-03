# Adobe Firefly 角色技能音效 Prompt

## 目标与取向

本文为 Adobe Firefly 的音效生成功能准备角色技能 prompt，并按当前运行时的采样键命名导出目标。
这些 prompt 只用于生成候选素材，不表示已经替换 `assets/audio/sfx/players/` 中的现有 WAV。

制作方向比较：

- **写实水浪电影感**：水体厚重、空间感强，但容易拖尾过长，遮住敌人前摇和连续攻击反馈。
- **战斗可读的月潮混合音色**：用水流、刀锋、木质拨弦、轻太鼓和少量 16-bit 音色建立统一身份，
  同时让起手、命中、转向和收势各自清楚。

采用第二种方向。它更符合高频横版战斗，也能让玩家仅凭声音分辨“现在可以行动”“技能命中”或“回刃即将返回”。

## 使用方式

1. 在 Firefly 中选择生成音效，不要选择音乐或带对白的模型。
2. 每条 prompt 单独生成至少 3 个版本；不要把多个 cue 写进一次生成任务。
3. 优先选择瞬态清楚、无背景底噪、无旋律引用的版本，再按“导出目标”裁剪。
4. 导出为 WAV 后统一转换为 **48 kHz、16-bit、mono WAV**，文件名必须与采样键完全一致。
5. 裁剪时保留刀锋或水流的自然短尾音，但移除开头静音；除特别说明外不要做循环。
6. 试听时同时播放战斗 BGM，确认音效不会遮盖 Boss 前摇、敌人攻击警告或连续普攻。

Firefly 对时长描述可能只做近似处理，因此 prompt 中的时长是声音结构目标，最终仍以裁剪后的文件为准。

## 全局声音语言

所有生成结果应保持同一套“月潮流”身份：英雄侧清亮、流动、克制，夜妖侧的失谐裂铃与粗粝噪声不应成为主角。

每条 prompt 已包含必要约束。若生成结果仍像音乐片段，可在末尾追加：

```text
Isolated game sound effect, not music. Dry close perspective, immediate transient, transparent tail, no ambience bed, no melody, no vocals, no dialogue, no footsteps, no environmental background, no cinematic trailer boom, no distortion, no clipping.
```

## 通用施法起手

### `playerSkillCast.wav` — 普通技能聚潮

用途：九种普通技能共用的起手层；它必须比各技能的释放声更轻，提示玩家“承诺已经开始”而不抢占命中反馈。

导出目标：约 `0.62s`，短促上行，末尾干净。

```text
Isolated fantasy action game skill-charge sound effect, about 0.62 seconds. A close, clean breath of water gathers upward around a sword, followed by three tiny ascending dry koto-like plucks and one faint clear temple-bell sparkle. Agile moonlit Japanese-fantasy hero energy, restrained and readable, with a soft rising pitch and a very short transparent echo. The cue prepares an attack but does not release or impact. No music, no melody phrase, no vocals, no dialogue, no heavy hit, no thunder, no ocean ambience, no long reverb, no distortion.
```

## 九种普通技能

### `playerSkillLine.wav` — 潮龙·破阵

玩家读感：窄、远、向前贯穿；低沉水脊与刀线应让它区别于轻快的弦月斩。

导出目标：约 `0.75s`，第一帧即起，单次向前释放。

```text
Isolated fantasy game projectile sound effect, about 0.75 seconds. A compressed tide erupts straight forward from a sword as one narrow water-dragon rush: immediate low taiko pulse, dense pressurized water rasp, sharp blade core, and a descending low airy tail that travels away. Powerful but focused, moonlit Japanese-fantasy hero sound, one continuous forward motion with no explosion. No music, no roar or animal voice, no ocean ambience, no repeated hits, no huge cinematic boom, no long reverb, no distortion.
```

### `playerSkillArc.wav` — 弦月·潮刃

玩家读感：最快、最亮的贴身解围；重点是半月刀弧，不是重击。

导出目标：约 `0.44s`，明亮瞬态，短尾音。

```text
Isolated fantasy sword-skill sound effect, about 0.44 seconds. One fast close-range crescent slash made of a crisp steel blade whoosh wrapped in a thin bright sheet of water, with a tiny dry koto pluck and delicate high bell glint at the apex. Clean semicircular motion, agile and heroic, bright moon-tide identity, sharp readable start and quick decay. No impact, no multiple swings, no music, no vocals, no wind ambience, no bass boom, no long reverb, no distortion.
```

### `playerSkillGuard.wav` — 镜潮·护返

玩家读感：潮幕刚刚闭合，防护窗口成立；保持声响而非反击命中。

导出目标：约 `0.58s`，上行包覆后稳定收束。

```text
Isolated fantasy game guard-activation sound effect, about 0.58 seconds. A circular veil of water rises and seals around the hero like a polished tide mirror: soft inward water sweep, rounded resonant metal tone, muted low taiko touch, then a clear but gentle bell shimmer confirming the guard is active. Protective, poised, reflective, and readable, not explosive. No sword hit, no shattering glass, no counterattack, no music, no vocals, no shield clang cliché, no long reverb, no distortion.
```

### `playerCounter.wav` — 镜潮·护返反击

玩家读感：格挡成功后的确定性奖励；比护盾成立声更硬、更亮。

导出目标：约 `0.46s`，格开与回斩几乎连成一个动作。

```text
Isolated fantasy game perfect-counter sound effect, about 0.46 seconds. A compact dull-metal parry click instantly redirects into one bright upward tide-blade slash, supported by a tight wooden clack, a small low taiko impact, and two very short ascending koto-like spark notes. Decisive successful defense turning into offense, crisp and heroic, with no delay and a fast clean tail. No music, no vocals, no enemy grunt, no glass break, no giant explosion, no long reverb, no distortion.
```

### `playerSkillDash.wav` — 流步·潮闪

玩家读感：踏浪启动、穿身、收刀；尾部收刀必须可辨，帮助确认位移结束。

导出目标：约 `0.44s`，约前 `0.30s` 冲刺，最后 `0.14s` 收刀。

```text
Isolated fantasy action game dash sound effect, about 0.44 seconds. A hero kicks off with a tiny wooden foot snap and surges forward through a narrow spray of water and one fast steel blade whoosh; near the final third, add a distinct higher-pitched sheathing slash and small dry pluck to mark the stop. Swift short reposition, close and controlled, moonlit tide energy, no teleport magic. No music, no vocals, no footsteps sequence, no repeated swings, no thunder, no long wind tail, no distortion.
```

### `playerSkillVortex.wav` — 回涡·引潮

玩家读感：地面潮涡形成并短暂牵引；声音可持续，但边缘与结束都应清楚。

导出目标：约 `0.98s`，中段最饱满，结束快速退去；非循环。

```text
Isolated fantasy game water-vortex sound effect, about 0.98 seconds. A low circular undertow forms on the ground from a muted taiko pulse, rotating bands of water, and a soft inward suction tone; the swirl rises slightly in pitch and density at the center, carries one restrained cracked-bell resonance, then collapses cleanly before one second. Tactical crowd-control energy, compact radius, powerful but not storm-sized. No music, no vocals, no drain sound, no ocean surf, no tornado wind, no impact, no long ambience, no distortion.
```

### `playerSkillArmorBreak.wav` — 断浪·裂甲释放

玩家读感：压缩后的硬质潮线飞出；这里是释放，命中裂甲由下一条 cue 表达。

导出目标：约 `0.50s`，紧绷上行后快速射出。

```text
Isolated fantasy action game armor-break projectile launch, about 0.50 seconds. A sword compresses water into a hard thin line, producing a tense rising metallic resonance, a narrow blade hiss, and a pressurized water snap that shoots forward. Dense, precise, armor-piercing intent with a clean moon-tide tone, but no contact or break in this cue. No music, no vocals, no impact, no cracking armor, no explosion, no gunshot character, no long reverb, no distortion.
```

### `playerSkillArmorBreakImpact.wav` — 断浪·裂甲命中

玩家读感：重目标防御被凿开；需明显强于释放声，并可和普通命中区分。

导出目标：约 `0.52s`，强瞬态后有短促裂纹扩散。

```text
Isolated fantasy game armor-rending impact sound effect, about 0.52 seconds. One heavy low taiko-backed strike lands on thick supernatural armor, followed immediately by dull iron strain, three fast ascending wooden crack details, and a compact burst of pressurized water spreading through the fracture. Weighty and conclusive but clean, readable as armor weakened rather than armor completely destroyed. No music, no vocals, no launch whoosh, no glass shatter, no rubble collapse, no cinematic sub boom, no long reverb, no clipping.
```

### `playerSkillRain.wav` — 雨线·穿针

玩家读感：五道由近及远的细潮线斜落；每一下都轻而锋利，不能成为嘈杂弹幕。

导出目标：约 `0.78s`，5 个可数的快速刀水瞬态。

```text
Isolated fantasy game multi-strike sound effect, about 0.78 seconds. Five distinct thin diagonal tide needles fall in a quick near-to-far sequence, each a short bright blade hiss with a fine water filament; pitches climb subtly across the five strikes, with only three tiny dry koto-like spark accents between them. Precise anti-air coverage, light and surgical, every strike count readable. No music, no vocals, no rainfall ambience, no thunder, no machine-gun rhythm, no heavy impacts, no long reverb, no distortion.
```

### `playerSkillReturningBlade.wav` — 回刃·归潮掷出

玩家读感：可追踪路径的旋转潮刃离手；不要在这条声音中提前表现折返。

导出目标：约 `0.52s`，单向外抛，尾部保持轻微旋转感。

```text
Isolated fantasy game returning-blade throw sound effect, about 0.52 seconds. One crescent tideblade leaves the hand with a crisp steel release, a narrow rotating water ribbon, a clean rising pitch core, and a tiny dry pluck. The motion travels outward in one direction and remains light enough to suggest it will return later; do not include the turnaround or catch. Heroic moonlit Japanese-fantasy tone, fast and controlled. No music, no vocals, no impact, no boomerang cartoon whistle, no second pass, no long reverb, no distortion.
```

### `playerSkillReturningBladeTurn.wav` — 回刃·归潮折返

玩家读感：远端刃路改变，危险线将反向扫回。

导出目标：约 `0.34s`，先制动下坠，再短促反向上扬。

```text
Isolated fantasy game projectile-turnaround sound effect, about 0.34 seconds. A spinning water blade brakes in midair with a quick descending filtered whoosh, pivots on a dry high pluck, then snaps back with a shorter rising water-and-steel breath. Clearly communicates reversal of direction, compact and precise, with no impact or catch. No music, no vocals, no full sword swing, no cartoon ricochet, no long echo, no ambience, no distortion.
```

### `playerSkillReturningBladeCatch.wav` — 回刃·归潮收回

玩家读感：路线安全结束、刀刃入手；应比掷出和折返都更轻。

导出目标：约 `0.28s`，小而明确的收束声。

```text
Isolated fantasy game returning-blade catch sound effect, about 0.28 seconds. A small incoming water hiss resolves into one neat wooden grip click, a soft dry high pluck, and a delicate clear bell sparkle as the tideblade is safely caught. Satisfying, controlled, and lighter than the throw or impact, with an immediate clean ending. No music, no vocals, no metal crash, no impact boom, no long reverb, no ambience, no distortion.
```

### `playerSkillVerticalWave.wav` — 升浪·托月

玩家读感：力量从脚下垂直顶起；上升轨迹应与潮龙的水平前冲明显不同。

导出目标：约 `0.68s`，低位起音快速爬升至明亮刀锋。

```text
Isolated fantasy game vertical wave attack sound effect, about 0.68 seconds. A compact low taiko pulse plants the force at the hero's feet, then a narrow pillar of water and steel rises sharply upward in one accelerating sweep, moving from low pressure to a bright blade crest with a faint bell glint near the top. Clear vertical lift, heroic and forceful, then a quick falloff. No music, no vocals, no horizontal projectile, no geyser ambience, no splashy rain, no repeated impacts, no long reverb, no distortion.
```

## 终式·月潮无间

终式由四条 cue 组成。开启音先建立期待，爆发音确认状态成立，残影音在强化期高频重复，结束音则明确告诉玩家强化窗口关闭。

### `playerUltimateCast.wav` — 终式蓄势

导出目标：约 `1.25s`，四级上行层次，不能提前出现最终爆发。

```text
Isolated fantasy game ultimate-charge sound effect, about 1.25 seconds. Moonlit water gathers around a sword hero in four clearly stepped rising layers: deep controlled water breath, two restrained low taiko heartbeats, four ascending dry koto-like plucks, and a growing pure bell resonance. The energy becomes bright and focused without releasing; suspenseful heroic Japanese-fantasy power, spacious enough for combat readability. No music, no vocals, no dialogue, no final impact, no choir, no thunder, no trailer riser, no long reverb, no distortion.
```

### `playerUltimateImpact.wav` — 终式开启

导出目标：约 `1.05s`，全套中最强的单次瞬态，但不做全屏爆炸。

```text
Isolated fantasy game ultimate-activation impact, about 1.05 seconds. One massive but clean low taiko strike releases a circular moon-tide surge, layered with a broad steel blade flash, dense low water pressure, resonant dull iron, a clear temple-bell bloom, and one fast rising luminous tone. Climactic heroic state activation, powerful and wide yet readable, with a controlled transparent decay. No music, no vocals, no explosion or debris, no choir, no cinematic trailer boom, no endless ocean wash, no clipping or distortion.
```

### `playerUltimateAfterimage.wav` — 强化普攻残影潮刃

导出目标：约 `0.30s`，高频使用时仍轻盈、不疲劳。

```text
Isolated fantasy game afterimage slash sound effect, about 0.30 seconds. A very fast, light secondary crescent made of bright steel and a thin high water ribbon, finished by one tiny dry koto-like sparkle. Ethereal moon-tide afterimage following another attack, airy and precise, clearly weaker and shorter than the main sword hit. No music, no vocals, no impact boom, no bass, no multiple swings, no long reverb, no harsh high-frequency whistle, no distortion.
```

### `playerUltimateEnd.wav` — 强化结束

导出目标：约 `0.80s`，从明亮高频向低处回落，柔和但不可漏听。

```text
Isolated fantasy game power-state ending sound effect, about 0.80 seconds. A bright moon-tide aura folds inward and recedes: soft high water breath descends in pitch, one restrained cracked-bell tone dims, and a faint paper-like shimmer dissolves into a low clean finish. Bittersweet and unmistakable as power expiring, not failure or damage, with a short transparent echo. No music, no vocals, no impact, no sad melody, no wind ambience, no ominous monster tone, no long reverb, no distortion.
```

## 验收清单

- 起手、释放、命中、折返、收回和结束 cue 在蒙眼试听时仍能分辨。
- `playerSkillCast` 不比对应技能释放声更重；`playerSkillArmorBreakImpact` 明显强于其释放声。
- `playerUltimateAfterimage` 连续播放不会盖过普攻命中、敌人警告或 Boss 前摇。
- 潮龙是水平低沉前冲，升浪是垂直明亮上升，二者不能只靠音高微调区分。
- 五段雨线可以被数出，但整体仍像一次技能，而不是五次枪声或机械连击。
- 所有文件开头无多余静音、末尾无硬切爆音，峰值不过载，单声道折叠后无明显相位抵消。
- 最终文件名、格式和时长与本文导出目标一致，并能通过项目现有音效校验。
