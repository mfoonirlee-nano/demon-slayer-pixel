# 音乐风格与生成 Prompt

## Assumptions

- 游戏是 2D 像素横版生存战，核心场景是夜色山林、鸟居、血月、平台移动和高频战斗。
- 玩家攻击气质来自原创“月潮流”剑术：清亮、流动、带白色浪尖和蓝色卷线的英雄感。
- 敌人与 Boss 是原创夜妖变体。音乐也应保持原创，不直接模仿任何现成动漫、电影或游戏配乐。
- 当前 `src/game/audio.ts` 已接入首批敌人采样音效，并保留简单音调作为加载失败回退；本文继续聚焦 BGM、Boss 音乐和短音乐反馈的生成 prompt。

## Enemy SFX Runtime

- `npm run generate:sfx` 会用固定 seed 生成 `assets/audio/sfx/enemies/` 下的 23 个原创短音效，格式统一为 48 kHz、16-bit、mono WAV。
- 音效覆盖攻击前摇、冲刺/斩击、灯焰与纸符施法、诅咒伤害、盾击/破盾、俯冲/落地、分裂/出生、光环、潜地/钻出、受伤和击败。
- `src/game/audioSamples.ts` 负责样本路径、预载、解码与播放；现有 `playSfx(sfx, pitch)` 调用点和全局防连发间隔保持不变。
- 样本尚未加载或解码失败时，运行时自动使用 `src/game/audio.ts` 内的振荡器音型，不阻塞开局。

## Core Direction

整体音乐定位：

> 原创暗色日式夜妖像素动作配乐。用尺八、篠笛、三味线、琵琶/筝、太鼓、木鱼、裂铃等日式音色建立山林夜战气质，再叠加少量 16-bit / FM synth / square lead / noise percussion，让它属于像素生存游戏，而不是纯影视配乐。

音乐需要保持三条线：

| 线索 | 音乐表现 | 用途 |
| --- | --- | --- |
| 玩家月潮 | 清亮尺八、筝拨弦、square lead、上行五声音阶短句 | 技能、大招、胜利、反击窗口 |
| 夜妖压迫 | 低太鼓、失谐 FM bass、刮弦、低音半音下行 | 敌潮、Boss 阶段、血月 |
| 夜路空间 | 稀疏风声感 pad、远处铃声、低混响木质打击 | 菜单、幕间、低强度战斗 |

全局生成约束：

- Instrumental only, no vocals, no lyrics.
- Seamless loop, 60-120 seconds for BGM; 4-10 seconds for stingers.
- Leave room for SFX: avoid constant full-range percussion, avoid over-compressed loudness.
- Prefer short motifs and readable rhythm over long cinematic melodies.
- Do not reference or imitate existing anime/game OSTs.
- Avoid modern trap, dubstep drops, pop vocals, orchestral brass fanfare, happy major-key chorus.

## Motifs

| Motif | 设计 | 建议音色 |
| --- | --- | --- |
| 月潮反击 | 4-5 个音的上行短句，结尾轻微回落，像浪花收束 | 尺八、筝、明亮 square lead、轻铃 |
| 血月 | 低音持续音 + 半音下行，偶尔出现低沉鼓击 | 低 taiko、FM bass、暗红色 pad |
| 夜妖追击 | 重复 3 音 ostinato，第二拍或第四拍带切分 | 三味线低弦、木鱼、低合成器 |
| Boss 前摇 | 短暂停拍后单次强打，给读招空间 | 大太鼓、裂铃、刮弦 |
| 终幕换相 | 每个 Boss 元素只露 1 个音色，不同相按顺序进入 | 蛛丝高弦、骨片木击、镜片钟声、兽性低鼓、血月灯火星、枯铃 |

## Master Prompt Template

把下面模板作为所有 BGM 的基础，然后替换 `{track_purpose}`、`{tempo}`、`{mood}` 和 `{special_motif}`。

```text
Instrumental seamless loop for an original 2D pixel action survival game. Dark Japanese fantasy, moonlit mountain road, blood moon tension, fast readable combat rhythm. Hybrid soundtrack: shakuhachi, shinobue flute, shamisen, koto or biwa plucks, taiko drums, wooden percussion, cracked temple bell, subtle 16-bit square lead, FM bass, and noise percussion. {track_purpose}

Tempo: {tempo}. Mood: {mood}. Use short pentatonic motifs, minor mode, clear ostinato, and dynamic percussion that leaves space for sword hits and tide-blade skill SFX. {special_motif}

Seamless 90 second game loop, final bar should naturally lead back into the first bar. No vocals, no lyrics, no modern trap, no dubstep drop, no pop structure, no copyrighted melody, no direct anime OST imitation, no long cinematic intro.
```

## Track Prompts

### 1. Start Screen - Blood Moon Gate

用途：标题页、开始菜单。让玩家一进来就看到“夜路、鸟居、血月、夜妖将至”，但不要进入满强度战斗。

```text
Instrumental seamless loop for the title screen of an original 2D pixel action survival game. Dark Japanese fantasy at a moonlit mountain gate, distant torii silhouettes, drifting clouds, red moon slowly rising. Hybrid palette: soft shakuhachi breath, sparse koto harmonics, low taiko heartbeat, distant cracked bell, subtle 16-bit pad shimmer, very light noise texture.

Tempo: 78 BPM. Mood: ominous, lonely, restrained, heroic under the surface. Introduce a clean 4-note rising tide motif once every 16 bars, answered by a low blood moon drone. Keep the arrangement spacious and mysterious, not battle-heavy.

Seamless 75 second loop, final bar returns naturally to the opening drone. No vocals, no lyrics, no modern drums, no direct anime OST imitation, no cinematic brass, no abrupt ending.
```

### 2. Act 1 Field Battle - Night Road

用途：第一幕，基础追击和低认知负担。节奏要能支撑横版生存战，但不要太满。

```text
Instrumental seamless loop for early-stage combat in an original 2D pixel action survival game. Moonlit Japanese mountain road, simple nightfiend chasers crossing the screen, agile sword movement, tide-blade hero energy. Use shamisen ostinato, light taiko, wooden percussion, koto plucks, small 16-bit square lead accents, and a soft shakuhachi counter-melody.

Tempo: 104 BPM. Mood: tense but readable, agile, focused, adventurous. The main rhythm should feel like running across platforms at night. Add a clear rising tide motif for heroic moments, but keep nightfiend pressure light and sparse.

Seamless 90 second game loop, no big intro, final bar loops cleanly. No vocals, no lyrics, no pop chorus, no heavy EDM, no copyrighted melody, no direct anime OST imitation.
```

### 3. Act 2 Field Battle - Speed Pressure

用途：第二幕，runner / duelist / leaper 让玩家开始处理速度、跳跃路线和近战窗口。

```text
Instrumental seamless loop for mid-stage combat in an original 2D pixel action survival game. Fast nightfiend runners, duelists, and leaping ambushes pressure the player across platforms. Dark Japanese fantasy mixed with crisp 16-bit action energy: driving shamisen riffs, tighter taiko pattern, short shinobue cuts, FM bass pulses, square lead stabs, and dry wooden percussion.

Tempo: 118 BPM. Mood: urgent, agile, sharp, dangerous but still controllable. Use syncopated rhythms to suggest dash windups and sudden lunges. The heroic tide motif should appear as brief bright answers after darker nightfiend phrases.

Seamless 90 second loop for gameplay, final bar should snap back into the opening rhythm. No vocals, no lyrics, no modern trap, no dubstep drop, no direct anime OST imitation, no long cinematic intro.
```

### 4. Act 3 Field Battle - Encirclement

用途：第三幕，brute / caster / binder / splitter 开始形成空间压迫、远程和控场。

```text
Instrumental seamless loop for late-stage combat in an original 2D pixel action survival game. The battlefield is crowded with heavy nightfiends, lantern casters, binding circles, and splitting shadows. Dark Japanese horror action with pixel game clarity: low taiko, tense shamisen ostinato, muted koto strikes, ember-like bell hits, detuned FM bass, narrow noise hi-hats, and occasional shakuhachi warning calls.

Tempo: 126 BPM. Mood: claustrophobic, tactical, relentless, supernatural. Build pressure through layered ostinatos, not through a wall of sound. Include warm ember accents for caster threats and low drum pauses for heavy brute impacts.

Seamless 90 second game loop, strong rhythm but enough empty space for attack SFX. No vocals, no lyrics, no pop structure, no EDM drop, no copyrighted melody, no direct anime OST imitation.
```

### 5. Act 4+ Endless Battle - Full Nightfiend Pool

用途：第四幕及无限挑战，全敌人池轮换，强度最高但仍要可循环长时间听。

```text
Instrumental seamless loop for high-intensity endless combat in an original 2D pixel action survival game. Full nightfiend enemy pool, blood moon sky, fast platform survival, constant but readable threat. Hybrid Japanese dark fantasy and 16-bit arcade action: aggressive shamisen, layered taiko, tight wooden percussion, FM bass ostinato, square lead counter-rhythm, cracked bell hits, and short shakuhachi cries.

Tempo: 132 BPM. Mood: relentless, dangerous, focused, late-night survival. Use a repeating nightfiend ostinato under a brighter tide counter-motif. Add brief breakdowns every 32 bars so the loop can breathe before returning to full intensity.

Seamless 100 second loop, final 2 bars must lead back into the opening groove. No vocals, no lyrics, no trap beat, no dubstep drop, no heroic brass fanfare, no copyrighted melody, no direct anime OST imitation.
```

## Boss Prompts

### Boss Intro Sting

用途：Boss 入场、血条出现。短、狠、有停顿。

```text
Short instrumental boss intro sting for an original 2D pixel action survival game. Dark Japanese fantasy, blood moon flash, nightfiend reveal. Use one huge taiko hit, a cracked bell, scraped shamisen strings, low FM bass swell, and a short shakuhachi fall.

Duration: 6 seconds. Mood: sudden, ritualistic, threatening. Include a half-second silence before the final impact so the boss title can appear clearly.

No vocals, no lyrics, no melody quote, no long trailer riser, no modern EDM impact.
```

### Spider String - 血月眷属 · 蛛弦

用途：当前已接入 Boss，追猎、蛛丝、召唤、蛛网投射物。

```text
Instrumental seamless boss battle loop for an original 2D pixel action survival game. Theme: spider-string nightfiend hunting the player under a moonlit torii road. Use high tension string-like shamisen tremolo to suggest spider silk, sharp koto plucks like web cuts, low taiko chase rhythm, detuned FM bass, dry wooden clicks, and brief cracked bell accents.

Tempo: 138 BPM. Mood: predatory, tightening, agile, dangerous. The rhythm should feel like a web slowly closing: repeated high plucked motifs, sudden pauses before taiko strikes, and short bursts of 16-bit lead for projectile volleys. Add a bright tide motif only as a small counterattack answer.

Seamless 95 second boss loop with a phase-3 intensity lift after the midpoint. No vocals, no lyrics, no pop chorus, no direct anime OST imitation, no copyrighted melody, no excessive full-screen cinematic sound.
```

### Mist Bone - 血月眷属 · 雾骨

用途：区域封锁、白雾、骨刺、延迟爆发。

```text
Instrumental seamless boss battle loop for an original 2D pixel action survival game. Theme: mist-bone nightfiend controlling the ground with white fog and bone spikes. Use breathy shakuhachi, low taiko pulses, dry bone-like wooden percussion, muted biwa plucks, cold FM bass drone, and thin 16-bit noise textures.

Tempo: 116 BPM with occasional half-time weight. Mood: suffocating, patient, eerie, tactical. Create delayed-impact tension: quiet fog sections, small warning clicks, then sudden bone-spike percussion bursts. Keep the melody sparse and cold, with a faint tide motif trying to cut through the fog.

Seamless 95 second loop, final bar returns to the opening fog drone. No vocals, no lyrics, no lush romantic strings, no modern trap, no direct anime OST imitation, no copyrighted melody.
```

### Mirror Dream - 血月眷属 · 镜魇

用途：分身、反射弹、真假身位。

```text
Instrumental seamless boss battle loop for an original 2D pixel action survival game. Theme: mirror-dream nightfiend creating false reflections under cracked moonlight. Use glassy koto harmonics, reversed bell swells, stereo square lead echoes, light taiko, off-beat shamisen phrases, FM bass pulses, and small chime-like mirror hits.

Tempo: 124 BPM. Mood: deceptive, shimmering, tense, disorienting but playable. Use call-and-response motifs where the echo answers from the wrong side, suggesting mirror clones and reflected projectiles. Avoid making the rhythm too chaotic; the beat must still guide player dodging.

Seamless 90 second boss loop, final bar reflects back into the first phrase. No vocals, no lyrics, no ambient-only track, no direct anime OST imitation, no copyrighted melody, no EDM drop.
```

### Fang Gale - 血月眷属 · 牙岚

用途：高速冲刺、近身压迫、兽性。

```text
Instrumental seamless boss battle loop for an original 2D pixel action survival game. Theme: fang-gale nightfiend, a low beast-like hunter charging through the night wind. Use aggressive low shamisen riffs, fast taiko rolls, wooden clacks, short shinobue screams, FM bass growls, and 16-bit square lead slashes.

Tempo: 146 BPM. Mood: feral, fast, close-range, breathless. The groove should feel like repeated dash windups: brief pullbacks, explosive forward hits, and quick recovery windows. Use wind-like noise sweeps only as short accents, not constant ambience.

Seamless 90 second boss loop with clear 8-bar combat phrases. No vocals, no lyrics, no metal guitars, no trap beat, no direct anime OST imitation, no copyrighted melody.
```

### Lantern Ember - 血月眷属 · 灯烬

用途：召唤强化、血月灯、灰烬、火线封路。

```text
Instrumental seamless boss battle loop for an original 2D pixel action survival game. Theme: lantern-ember nightfiend summoning servants with a cursed red lantern. Use warm low koto plucks, ember-like small bells, restrained taiko, smoky shakuhachi, muted shamisen rhythm, FM bass, and subtle 16-bit crackle percussion.

Tempo: 122 BPM. Mood: smoldering, ritualistic, controlling, sinister. The music should pulse like a lantern brightening before a summon: soft ember motifs, then tighter percussion when minions arrive. Include short fire-line accents with dry bell and noise bursts, but avoid bright cheerful fire sounds.

Seamless 95 second loop, final bar dims back into the opening lantern pulse. No vocals, no lyrics, no modern pop beat, no direct anime OST imitation, no copyrighted melody, no big orchestral swell.
```

### Dead Bell - 血月眷属 · 枯铃

用途：节奏压迫、声波环、停拍反击窗口。

```text
Instrumental seamless boss battle loop for an original 2D pixel action survival game. Theme: dead-bell nightfiend turning cracked bell rhythms into blades. Use a broken temple bell as the central motif, low taiko, sparse shamisen, dry wooden percussion, dark FM bass, and thin square lead blade accents.

Tempo: 108 BPM with strict rhythmic pulse. Mood: ritual, oppressive, measured, dangerous. Build the track around repeated bell patterns, deliberate silence, and delayed second hits. Include short stop-time moments that feel like attack windows before the bell rhythm returns harder.

Seamless 90 second boss loop, final bell resonance should lead back to the first downbeat. No vocals, no lyrics, no freeform ambient drift, no direct anime OST imitation, no copyrighted melody, no dance drop.
```

### Final Boss - 终幕之妖 · 万相血月

用途：终盘复合 Boss，换相、血月、六术轮转。

```text
Instrumental seamless final boss loop for an original 2D pixel action survival game. Theme: many-faced blood moon nightfiend combining spider strings, white mist, mirror shards, fang charges, cursed lantern embers, and dead bell rhythm. Hybrid dark Japanese fantasy and 16-bit arcade intensity: layered taiko, aggressive shamisen, cracked bell motif, cold koto harmonics, breathy shakuhachi, FM bass drone, square lead counter-melody, and noise percussion.

Tempo: 140 BPM. Mood: final, supernatural, changing forms, dangerous but readable. Structure the loop in rotating 16-bar phases: web-like high plucks, foggy low drone, mirror chimes, feral dash drums, ember bells, then dead-bell stop-time. The blood moon motif should bind everything together with a low descending bass line. Let the heroic tide motif appear briefly before the strongest return.

Seamless 120 second final boss loop with a natural return to the opening blood moon pulse. No vocals, no lyrics, no choir lyrics, no direct anime OST imitation, no copyrighted melody, no trailer brass, no EDM drop.
```

## Short Feedback Prompts

### Victory

```text
Short instrumental victory sting for an original 2D pixel action game. Bright tide motif on shakuhachi and koto, one clean taiko hit, small 16-bit sparkle, night tension briefly clears.

Duration: 5 seconds. Mood: relieved, heroic, clean. No vocals, no lyrics, no fanfare brass, no copyrighted melody.
```

### Game Over

```text
Short instrumental game over sting for an original dark Japanese pixel action game. Low taiko fades, cracked bell bends downward, breathy shakuhachi fall, distant blood moon drone.

Duration: 7 seconds. Mood: tragic, quiet, ominous. No vocals, no lyrics, no dramatic choir, no copyrighted melody.
```

### Low Health Warning Loop

```text
Very short instrumental low-health warning loop for an original 2D pixel action survival game. Subtle heartbeat taiko, quiet cracked bell pulse, low FM bass throb, minimal and not annoying.

Duration: 4 seconds, seamless micro-loop. Mood: urgent but restrained. No vocals, no melody, no harsh alarm, no modern electronic siren.
```

## Generation Workflow

1. 修改敌人音效配方后运行 `npm run generate:sfx`，再检查格式、峰值、削波和重复生成哈希。
2. BGM 先生成 `Start Screen`、`Act 1`、`Spider String` 三首，验证整体音色是否贴合游戏。
3. 每个 BGM prompt 至少生成 3 个版本，筛掉不能自然循环、音效空间太满、旋律过像现成动画配乐的版本。
4. 确认可用后，再批量生成 Act 2/3/4 与其他 Boss 主题。
5. BGM 导入游戏前优先裁剪成 `ogg` 或 `mp3` 循环段，并检查 loop seam 是否有爆音或断点。
