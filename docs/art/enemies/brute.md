# Brute - 盾甲重妖

## Implementation Status

- 设定状态：已切换为站立厚重近战敌人，核心机制是前置盾牌防御物；盾牌被打掉后防御下降并露出反打窗口。
- 素材状态：`assets/art/brute-concept.png` 是新原画基准；运行时图集已替换为 `320x360` 站立持盾/破盾动作。
- 玩法状态：当前代码实现 `advance -> guard -> shieldBash -> recover`，破盾后切换为 `shieldBreak -> brokenRecover -> brokenAdvance -> cleave`。
- 代码入口：`src/entities/enemies/brute.ts`；资源入口：`src/constants/assets.ts` 的 `BRUTE_SHEET_INDEX` / `BRUTE_SHEETS`。

## Role

站立厚重近战敌人。目标是用盾牌制造正面压迫和目标优先级，而不是靠潜行、绕背或高速追杀玩家。

## Gameplay Loop

| 状态 | 目标规则 | 设计目的 |
| --- | --- | --- |
| `advance` | 直立小步推进，盾牌始终挡在身体前侧 | 读出“正面硬、移动慢”的压力 |
| `guard` | 进入距离后举盾停顿 `24-34` 帧，盾面裂纹或暗红符钉逐帧变亮 | 给玩家读招，同时提示盾牌是可破目标 |
| `shieldBash` | 盾牌未破时短距离盾击或肩撞，只触发一次近战命中盒 | 让完整盾牌状态有正面威胁 |
| `shieldBreak` | 盾牌耐久归零时进入 `28-40` 帧破盾硬直，碎片飞出并暴露胸腹 | 奖励持续输出，明确防御下降 |
| `cleave` | 破盾后改用慢速拳击、骨槌或前臂横扫，前摇更明显 | 保留近战威胁，但不再拥有正面防御优势 |
| `recover` / `brokenRecover` | 攻击后停顿；破盾后恢复帧更低、防线更空 | 露出稳定反打窗口 |

## Target Tuning

| 参数 | 目标值 | 说明 |
| --- | ---: | --- |
| 触发距离 | `145-165px` | 进入距离后举盾或盾击 |
| 推进速度 | 低于 `duelist`，接近旧 brute | 保持重型压迫，不追求贴脸速度 |
| 本体生命 | `46 + k*6.5` | 本体仍厚，但主要耐打感来自盾牌耐久 |
| 盾牌耐久 | 本体生命的 `200%` | 独立防御物，破坏后不再恢复 |
| 完整盾牌规则 | 普通攻击、普通技能和大招都先扣盾牌，溢出才进本体 | 让盾牌读成耐打防御层 |
| `armor_break` 规则 | `断浪·裂甲` 命中完整盾牌时直接破盾，但这一击不打本体 | 让破甲技成为明确反制 |
| 破盾后防御 | 不再拥有盾牌耐久 | 让“打掉盾牌”在手感上立即变快 |
| 同屏上限 | `2` | 避免高血单位堆场 |
| 同时攻击 | `1` | 避免多个盾击叠加不可读 |

## Target Size

宽 `95-125px`，高 `105-145px`。必须是站立厚重轮廓，不能再做成低伏四足或钻地单位。

## Visual Identity

- 远看是一个宽肩、短颈、站立的重甲夜妖，盾牌是最大前景形状。
- 盾牌绑在前臂或嵌进手臂，像骨板、铁门或破损鸟居残片，边缘有缺口和裂纹。
- 身体厚重但不能像 Boss；头部藏在盾后，面具、角或牙只露出一部分。
- 腿短而粗，脚步沉，移动时上半身几乎不晃，靠盾牌推进。
- 破盾后轮廓要明显变窄，露出胸腹、肩带和断裂盾托，让玩家一眼看出防御下降。

## Color And Materials

- 主色：黑铁、深灰骨甲、暗红绑带。
- 强调色：盾面裂缝和符钉可用低亮度暗红或熄火橙；不要再使用大面积绿色囊泡。
- 材质：沉重金属、骨板、麻绳/皮带、破碎木铁混合盾。

盾牌要作为视觉和玩法共同锚点：完整时遮挡身体，受击时出现裂纹，破盾时飞出碎片，破盾后不再显示完整盾面。

## Animation Notes

| 状态 | 原画要点 |
| --- | --- |
| 移动 | 盾牌在前，脚步短而重；不要贴地爬行 |
| 举盾前摇 | 盾面抬高并盖住头胸，裂纹或符钉变亮 |
| 盾击 | 盾牌向前压出半个身位，身体重心跟上 |
| 盾牌受击 | 盾面局部裂开、碎屑掉落，本体不要大幅后仰 |
| 破盾 | 盾牌断成几块飞出，brute 短暂暴露胸腹并停顿 |
| 破盾后攻击 | 用拳、骨槌或残盾臂横扫，前摇比盾击更夸张 |
| 死亡 | 先跪倒，再让残盾和重甲坠地，暗红裂光熄灭 |

## Runtime Sprite Sheets

| 状态 | 文件 | 规格 |
| --- | --- | --- |
| `advance` | `assets/sprites/enemies/brute/brute_advance.png` | 6 帧，`320x360` |
| `guard` | `assets/sprites/enemies/brute/brute_guard.png` | 4 帧，`320x360` |
| `shieldBash` | `assets/sprites/enemies/brute/brute_shield_bash.png` | 5 帧，`320x360` |
| `recover` | `assets/sprites/enemies/brute/brute_recover.png` | 3 帧，`320x360` |
| `shieldBreak` | `assets/sprites/enemies/brute/brute_shield_break.png` | 4 帧，`320x360` |
| `brokenAdvance` | `assets/sprites/enemies/brute/brute_broken_advance.png` | 6 帧，`320x360` |
| `cleave` | `assets/sprites/enemies/brute/brute_cleave.png` | 5 帧，`320x360` |
| `brokenRecover` | `assets/sprites/enemies/brute/brute_broken_recover.png` | 3 帧，`320x360` |

以上图集均为透明 PNG，底部锚定并朝右；盾裂、碎片和横扫读法全部烘入 sprite。

## Avoid

- 不要低伏、钻地、露土包或用铲爪，否则会和 `burrower` 混淆。
- 不要四足甲虫化；旧版低矮甲壳只作为废弃方向参考。
- 不要给它高速冲刺，否则会和 `runner` 混淆。
- 不要让暗红盾光太亮，避免抢过玩家技能和奖励可读性。
