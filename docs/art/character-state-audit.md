# Character-State Visual Audit

审计日期：2026-06-27

## Summary

本次按 [Character-State Visual Unification Workflow](../../workflows/character-state-visual-unification.md) 审查玩家、普通敌人、Boss，以及带身体代理的分身/召唤/残影状态图集。

脚本证据：

- 审计脚本：`scripts/audit-character-sprites.mjs`
- 机器清单：`tmp/character-state-audit/inventory.json`
- 人读清单：`tmp/character-state-audit/inventory.md`
- contact sheets：`tmp/character-state-audit/contact-sheets/*.png`
- 单 actor 诊断：`tmp/character-state-audit/diagnostics/*.json`

范围统计：

| 项 | 数量 | 说明 |
| --- | ---: | --- |
| Actor groups | 20 | 1 player, 12 enemies, 7 Boss groups |
| In-scope sheets | 95 | 只含角色身体、施法身体、clone/proxy 身体 |
| Contract failures | 0 | 图集尺寸、帧数、空帧检查均通过 |
| Out-of-scope effects | 多个 | `effect.png`、投射物、咒圈、声波、火线、UI icon 等未做身份审计 |

严重度：

| Severity | Count | Notes |
| --- | ---: | --- |
| `blocker` | 0 | 未发现严重身份断裂 |
| `major` | 0 | 未发现必须优先重做的 actor |
| `minor` | 2 | `glider`、`fang-gale` 有轻微 state scale/style drift |
| `ok` | 18 | 身份基准、状态图集和运行时规格整体一致 |

## Priority Queue

| Priority | Actor | Severity | Repair Type | Recommended Action |
| ---: | --- | --- | --- | --- |
| 1 | `glider` | `minor` | `asset-only repair` | 统一 `hover` 与 `windup` / `dive` / `recover` 的可见体量；优先放大或重排 `hover` 内容，不改行为。 |
| 2 | `fang-gale` | `minor` | `asset-only repair` | 统一 `move` 与 `windup` 的色值、饱和度和体量；保持低伏牙兽身份，不扩大成新 Boss 设计。 |
| 3 | art docs status | docs-only | documentation repair | 更新过期实现状态：enemy README、Boss README、`dead-bell.md` 顶部状态说明。 |

## Audit Notes

- 所有 in-scope sheet 均通过尺寸和空帧检查；没有因为规格错误导致的直接阻塞。
- 很多帧 bbox 触边，这是现有图集的紧切片/底部锚定特征，不等于本次身份 drift。
- `mirror-dream` 的 `nightmare`、`splitter` 的 `splitling*` 按 body-like proxy 审计；它们不要求保持完整本体姿态，只要求身份来源可读。
- `blood-moon-many-faces` 的 cast 状态引入蛛、镜、灯、铃等物件，这是设定要求的“万相”换相，不按 drift 处理。
- 本次没有启动浏览器或游戏进程。

## State-Pair Drift Queue

下表只列需要整改或额外说明的状态对；未列出的同 actor 状态组合在人工 contact-sheet 审查中没有发现身份 drift。

| Actor | State Pair | Severity | Finding | Action |
| --- | --- | --- | --- | --- |
| `glider` | `hover` vs `windup` / `dive` / `recover` | `minor` | `hover` 可见体量显著更小，状态切换时像缩放跳变。 | 以后修 `glider` 时优先重排或重绘 `hover`。 |
| `fang-gale` | `move` vs `windup` | `minor` | 两者都是低伏牙兽，但 `windup` 更红、更长、更饱和。 | 统一色值、牙爪亮点和可见体量。 |
| `mirror-dream` | `move` / `cast` vs `nightmare` | note | `nightmare` 后半段是碎光 proxy，不是完整身体状态。 | 保持当前归类；不要按完整本体重做。 |

## Documentation Remediation

这些不是 sprite 资产问题，但会影响后续审计的 baseline 判断：

| File | Issue | Recommended Action |
| --- | --- | --- |
| `docs/art/enemies/README.md` | `brute` 仍写“运行时仍待重做”，`splitter` 仍写“未实现”，但单体文档和运行时图集已经接入。 | 更新 Enemy Index 的实现状态。 |
| `docs/art/bosses/README.md` | `mist-bone`、`mirror-dream`、`fang-gale`、`lantern-ember` 仍写“未实现”，但对应单体文档/资源显示已接入。 | 更新 Boss Index 的实现状态，避免后续误判 baseline missing。 |
| `docs/art/bosses/dead-bell.md` | 顶部写“素材状态：未实现 / 玩法状态：未实现”，但 README、运行时资源和本次 contact sheet 均显示已接入。 | 同步顶部 Implementation Status。 |

## Actor Findings

| Actor | Category | Baseline Status | Sheets | Severity | Repair Type | Finding | Evidence |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `player` | player | baseline clear | 15 | `ok` | none | 本体、普攻、下落攻击、普通技能施法和大招施法均保留深蓝披风、水蓝刀光和修长剑士轮廓；技能施法缩放不同但身份未断裂。 | `contact-sheets/player.png` |
| `chaser` | enemy | baseline clear | 1 | `ok` | none | 单状态追击循环，赤褐身体、黑发和灰裤布稳定。 | `contact-sheets/chaser.png` |
| `crawler` | enemy | baseline clear | 4 | `ok` | none | `move` / `windup` / `lunge` / `recover` 都保持低伏甲壳蛛形，动作变化清楚。 | `contact-sheets/crawler.png` |
| `runner` | enemy | baseline clear | 4 | `ok` | none | 角、黑发、赤褐肌肉和冲刺姿态贯穿全状态。 | `contact-sheets/runner.png` |
| `caster` | enemy | baseline clear | 5 | `ok` | none | 面具、长袍、提灯三项识别点稳定；`caster_wisp` 正确排除为投射物。 | `contact-sheets/caster.png` |
| `duelist` | enemy | baseline clear | 4 | `ok` | none | 双刃、黑红破布和瘦长妖面在 approach/windup/slash/recover 中一致。 | `contact-sheets/duelist.png` |
| `brute` | enemy | baseline clear; docs status stale | 8 | `ok` | none | 完整盾与破盾后体型变化符合单体文档；黑铁重甲、红绑带和盾牌/残盾身份连续。 | `contact-sheets/brute.png` |
| `binder` | enemy | baseline clear | 5 | `ok` | none | 灰黑长袍、符纸、暗红咒线在移动、施法、受击中稳定。 | `contact-sheets/binder.png` |
| `glider` | enemy | baseline clear | 4 | `minor` | `asset-only repair` | 身份点一致，但 `hover` 可见体量明显小于 `windup` / `dive` / `recover`，运行时可能产生状态切换缩放跳变。 | `contact-sheets/glider.png` |
| `leaper` | enemy | baseline clear | 5 | `ok` | none | 长腿、背刺、低伏跳跃姿态稳定。 | `contact-sheets/leaper.png` |
| `splitter` | enemy | baseline clear; docs status stale | 6 | `ok` | none | 本体裂缝、双面半脸和 splitling 小型代理身份清楚；splitling 是代理体，不按完整本体尺寸要求。 | `contact-sheets/splitter.png` |
| `warden` | enemy | baseline clear | 3 | `ok` | none | 背架、祭祀面具、金绿 aura 读法稳定。 | `contact-sheets/warden.png` |
| `burrower` | enemy | baseline clear | 5 | `ok` | none | 土潜/钻出/恢复状态保留湿土甲壳和低矮钻地怪身份。 | `contact-sheets/burrower.png` |
| `spider-string` | boss | baseline clear | 3 | `ok` | none | 白发、红袍和蛛足在 move/cast/ultimateCast 中一致。 | `contact-sheets/spider-string.png` |
| `mist-bone` | boss | baseline clear; README status stale | 2 | `ok` | none | 白骨、雾蓝身体和骨刺轮廓在 move/cast 中一致。 | `contact-sheets/mist-bone.png` |
| `mirror-dream` | boss | baseline clear; README status stale | 4 | `ok` | none | 真身、cast 和 afterimage 保持碎镜/冷色身份；`nightmare` 后半段是碎光 proxy，符合代理审计。 | `contact-sheets/mirror-dream.png` |
| `fang-gale` | boss | baseline clear; README status stale | 2 | `minor` | `asset-only repair` | `move` 与 `windup` 都是低伏牙兽，但 windup 更红、更长、更饱和；建议统一色值和可见体量。 | `contact-sheets/fang-gale.png` |
| `lantern-ember` | boss | baseline clear; README status stale | 5 | `ok` | none | 面具、黑袍、血月灯和余烬色贯穿 move/summon/fireline/buff/death。 | `contact-sheets/lantern-ember.png` |
| `dead-bell` | boss | baseline clear; doc status stale | 2 | `ok` | none | 枯铃、金黑袍和停拍姿态在 move/cast 中一致。 | `contact-sheets/dead-bell.png` |
| `blood-moon-many-faces` | boss | baseline clear | 9 | `ok` | none | 血月背光、黑红破袍和多 Boss 残相统一；五招 cast 的外来物件符合“万相”设定。 | `contact-sheets/blood-moon-many-faces.png` |

## Next Repair Briefs

### 1. `glider`

- Proposed change: 只处理 `assets/sprites/enemies/glider/glider_hover.png`，让 hover 的可见翼膜和中心身体体量接近 windup/recover。
- Keep: `360x240` 单帧、6 帧、低空翼膜、破裂翼边和暗橙红眼点。
- Avoid: 改成 Boss 级大翼展、改行为、改 hitbox。
- Recommended approval: approve an `asset-only repair` when entering sprite generation work.

### 2. `fang-gale`

- Proposed change: 统一 `fang_gale_move.png` 与 `fang_gale_windup.png` 的暗红/深灰主体色、牙爪亮点和可见体量。
- Keep: `move` 为 4 帧 `350x419`，`windup` 为 6 帧 `400x400`，低伏高速牙兽身份。
- Avoid: 加入复杂施法道具、扩大成站立 Boss、让风刃残影遮住真身方向。
- Recommended approval: approve an `asset-only repair`;只有后处理无法维持体量时再考虑 `sprite-contract repair`。

## Validation State

- Generated inventory/contact sheets: done.
- Manual visual audit: done.
- Runtime asset replacement: not started.
- Required before any actor repair completion: `npm run typecheck`, `npm run lint`, `git diff --check`.
