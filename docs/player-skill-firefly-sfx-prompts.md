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

1. 在 Firefly 中选择生成音效，每次只粘贴一个英文代码块；中文说明和导出目标不粘贴。
2. 每条 prompt 单独生成至少 3 个版本；不要把多个 cue 写进一次生成任务。
3. 优先选择瞬态清楚、无背景底噪、无旋律引用的版本，再按“导出目标”裁剪。
4. 导出为 WAV 后统一转换为 **48 kHz、16-bit、mono WAV**，文件名必须与采样键完全一致。
5. 裁剪时保留刀锋或水流的自然短尾音，但移除开头静音；除特别说明外不要做循环。
6. 试听时同时播放战斗 BGM，确认音效不会遮盖 Boss 前摇、敌人攻击警告或连续普攻。

### Prompt 编写规则

依据 [Adobe 官方音效 prompt 指南](https://helpx.adobe.com/au/firefly/web/work-with-audio-and-video/work-with-audio/writing-effective-text-prompts-for-sound-effects-generation.html)，
使用简短、直接的声音描述，聚焦声源、动作和听感；复杂混合音应分别生成后叠加。

- 本文每条英文 prompt 控制在 **200 字符以内（含空格与标点）**，这是项目自定的精简预算，不是 Adobe 官方硬性上限。
- 每条只描述一个核心声音事件，保留水流、刀锋、音高走向和起落质感，省去世界观叙述、乐器清单和重复禁用词。
- 精确秒数、音量关系与文件格式由后期处理落实，不写进 prompt；“导出目标”是最终素材要求。
- 雨线的五次瞬态、终式蓄势的四级上行若数量不准，可用口技节奏引导，或生成单次声音后在音频编辑器中排列。
- 冲刺收刀、防反回斩等复合动作若生成不清楚，分别生成动作层再按导出目标拼接。

Firefly 支持用声音表演引导节奏，并在生成后裁剪、调整音量和叠加音轨；
操作见 [Adobe 生成音效说明](https://helpx.adobe.com/uk/firefly/web/work-with-audio-and-video/work-with-audio/text-to-sound-effects.html)。

## 全局声音语言

所有生成结果应保持同一套“月潮流”身份：英雄侧清亮、流动、克制，夜妖侧的失谐裂铃与粗粝噪声不应成为主角。

水流与刀锋是主音色，拨弦和铃声只作为短促质感点缀。轻太鼓或 16-bit 点缀若有需要，单独制作后少量叠加。

不要追加通用长串否定词。若结果出现旋律或环境底噪，先删去容易引出配乐的音色词，保留核心动作重新生成；
无配乐、人声、背景声、长混响和削波作为试听筛选标准。

## 通用施法起手

### `playerSkillCast.wav` — 普通技能聚潮

用途：九种普通技能共用的起手层；它必须比各技能的释放声更轻，提示玩家“承诺已经开始”而不抢占命中反馈。

导出目标：约 `0.62s`，短促上行，末尾干净。

```text
Soft magical water gathering, gently rising pitch, delicate plucked resonance, light and restrained, dry close sound, short clean tail.
```

## 九种普通技能

### `playerSkillLine.wav` — 潮龙·破阵

玩家读感：窄、远、向前贯穿；低沉水脊与刀线应让它区别于轻快的弦月斩。

导出目标：约 `0.75s`，第一帧即起，单次向前释放。

```text
One forceful water jet rushing straight forward, deep pressure pulse, sharp metallic hiss, low descending tail, immediate attack, dry and compact.
```

### `playerSkillArc.wav` — 弦月·潮刃

玩家读感：最快、最亮的贴身解围；重点是半月刀弧，不是重击。

导出目标：约 `0.44s`，明亮瞬态，短尾音。

```text
One swift crescent sword swoosh, bright steel edge, thin watery hiss, light and crisp, close dry sound, rapid decay.
```

### `playerSkillGuard.wav` — 镜潮·护返

玩家读感：潮幕刚刚闭合，防护窗口成立；保持声响而非反击命中。

导出目标：约 `0.58s`，上行包覆后稳定收束。

```text
Magical water shield closing inward, smooth rising sweep, rounded metallic resonance, gentle shimmering finish, dry and compact.
```

### `playerCounter.wav` — 镜潮·护返反击

玩家读感：格挡成功后的确定性奖励；比护盾成立声更硬、更亮。

导出目标：约 `0.46s`，格开与回斩几乎连成一个动作。

```text
One sharp metal parry snapping into an upward watery sword slash, tight woody attack, bright and decisive, quick dry decay.
```

### `playerSkillDash.wav` — 流步·潮闪

玩家读感：踏浪启动、穿身、收刀；尾部收刀必须可辨，帮助确认位移结束。

导出目标：约 `0.44s`，约前 `0.30s` 冲刺，最后 `0.14s` 收刀。

```text
One fast watery sword dash ending in a distinct high metallic sheathing snap, narrow rushing hiss, swift and controlled, short dry tail.
```

### `playerSkillVortex.wav` — 回涡·引潮

玩家读感：地面潮涡形成并短暂牵引；声音可持续，但边缘与结束都应清楚。

导出目标：约 `0.98s`，中段最饱满，结束快速退去；非循环。

```text
Compact swirling water vortex, low inward suction, rising pitch and density, full middle, quick collapse, dry close sound.
```

### `playerSkillArmorBreak.wav` — 断浪·裂甲释放

玩家读感：压缩后的硬质潮线飞出；这里是释放，命中裂甲由下一条 cue 表达。

导出目标：约 `0.50s`，紧绷上行后快速射出。

```text
One pressurized water blade launching forward, tense rising metallic hiss, narrow sharp snap, dense and precise, short dry tail, no impact.
```

### `playerSkillArmorBreakImpact.wav` — 断浪·裂甲命中

玩家读感：重目标防御被凿开；需明显强于释放声，并可和普通命中区分。

导出目标：约 `0.52s`，强瞬态后有短促裂纹扩散。

```text
One heavy armor hit, dull iron strain and tight cracking texture, deep punch, brief watery burst, dry close sound, rapid decay.
```

### `playerSkillRain.wav` — 雨线·穿针

玩家读感：五道由近及远的细潮线斜落；每一下都轻而锋利，不能成为嘈杂弹幕。

导出目标：约 `0.78s`，5 个可数的快速刀水瞬态。

```text
Five quick thin watery blade hisses, distinct near-to-far sequence, subtly rising pitch, light sharp attacks, dry short tails.
```

### `playerSkillReturningBlade.wav` — 回刃·归潮掷出

玩家读感：可追踪路径的旋转潮刃离手；不要在这条声音中提前表现折返。

导出目标：约 `0.52s`，单向外抛，尾部保持轻微旋转感。

```text
One spinning water blade thrown outward, crisp metallic release, narrow fluttering hiss, rising pitch, light dry tail, no return.
```

### `playerSkillReturningBladeTurn.wav` — 回刃·归潮折返

玩家读感：远端刃路改变，危险线将反向扫回。

导出目标：约 `0.34s`，先制动下坠，再短促反向上扬。

```text
Spinning water blade reversing direction, brief falling whoosh snapping upward, tight metallic pivot, compact and dry, no impact.
```

### `playerSkillReturningBladeCatch.wav` — 回刃·归潮收回

玩家读感：路线安全结束、刀刃入手；应比掷出和折返都更轻。

导出目标：约 `0.28s`，小而明确的收束声。

```text
Returning water blade caught softly, incoming hiss ending in a neat wooden click, faint bright resonance, light and dry, quick decay.
```

### `playerSkillVerticalWave.wav` — 升浪·托月

玩家读感：力量从脚下垂直顶起；上升轨迹应与潮龙的水平前冲明显不同。

导出目标：约 `0.68s`，低位起音快速爬升至明亮刀锋。

```text
One water blade surging vertically upward, deep pressure swelling into a bright metallic crest, accelerating rise, sharp cutoff with short natural tail.
```

## 终式·月潮无间

终式由四条 cue 组成。开启音先建立期待，爆发音确认状态成立，残影音在强化期高频重复，结束音则明确告诉玩家强化窗口关闭。

### `playerUltimateCast.wav` — 终式蓄势

导出目标：约 `1.25s`，四级上行层次，不能提前出现最终爆发。

```text
Magical water charging in four rising pulses, deep pressure building to bright metallic resonance, restrained tension, dry sound, no final impact.
```

### `playerUltimateImpact.wav` — 终式开启

导出目标：约 `1.05s`，全套中最强的单次瞬态，但不做全屏爆炸。

```text
One powerful magical water burst, deep rounded punch, broad metallic edge, bright ringing crest, immediate attack, controlled short decay.
```

### `playerUltimateAfterimage.wav` — 强化普攻残影潮刃

导出目标：约 `0.30s`，高频使用时仍轻盈、不疲劳。

```text
One tiny airy water-blade swoosh, thin bright metallic edge, delicate plucked texture, very light, soft treble, dry rapid decay.
```

### `playerUltimateEnd.wav` — 强化结束

导出目标：约 `0.80s`，从明亮高频向低处回落，柔和但不可漏听。

```text
Magical water energy receding inward, bright hiss descending into a soft low tone, fading metallic shimmer, gentle clear ending, short dry tail.
```

## 验收清单

- 起手、释放、命中、折返、收回和结束 cue 在蒙眼试听时仍能分辨。
- `playerSkillCast` 不比对应技能释放声更重；`playerSkillArmorBreakImpact` 明显强于其释放声。
- `playerUltimateAfterimage` 连续播放不会盖过普攻命中、敌人警告或 Boss 前摇。
- 潮龙是水平低沉前冲，升浪是垂直明亮上升，二者不能只靠音高微调区分。
- 五段雨线可以被数出，但整体仍像一次技能，而不是五次枪声或机械连击。
- 所有文件开头无多余静音、末尾无硬切爆音，峰值不过载，单声道折叠后无明显相位抵消。
- 最终文件名、格式和时长与本文导出目标一致，并能通过项目现有音效校验。
