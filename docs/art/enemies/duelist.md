# Duelist - 双刃裂妖

## Implementation Status

- 素材状态：已重做并接入，当前 `assets/sprites/enemies/duelist/duelist.png` 是 `approach`，另有 `duelist_windup.png`、`duelist_slash.png`、`duelist_recover.png`。
- 玩法状态：已接入专属 `duelist` archetype，当前实现为 `approach -> windup -> slash -> recover` 的近战精英循环。
- 代码入口：`src/entities/enemies/duelist.ts`；资源入口：`src/constants/assets.ts` 的 `DUELIST_SHEET_INDEX` / `DUELIST_SHEETS`。

## Role

近战精英敌人。靠近后短前摇斩击，比基础追击敌人更强调攻击范围和处理顺序。

## Target Size

宽 `100-125px`，高 `115-140px`。双刃外扩但不要过宽。

## Visual Identity

- 双刃近战威胁，外轮廓由两把外扩骨刃决定。
- 瘦长妖面，角或骨刺向后，避免挡住双刃轮廓。
- 直立偏前倾，胸腹紧实，动作更像精英近战。
- 双臂骨刃或持刃外扩，刃口呈月牙形。
- 腰部可有骨饰、残布、绳结，增强精英感。

## Color And Materials

- 主色：灰肉色、黑红破布、暗骨白刃口。
- 强调色：刃口受击时可闪浅色，攻击前有暗红边缘。
- 材质：骨刃、硬质肩甲、破布。

## Animation Notes

| 状态 | 原画要点 |
| --- | --- |
| 移动 | 双刃低位摆动，保持攻击范围可读 |
| 斩击前摇 | 双刃向两侧展开，胸口前压 |
| 斩击 | 形成短弧形斩线，攻击帧清楚 |
| 恢复 | 双臂交叉或下垂，停顿给玩家反击 |
| 死亡 | 双刃断裂或脱手后化烟 |

## Avoid

- 不要让刃口过长，否则小怪攻击范围会被误读为 Boss 技能。
- 不要加入远程元素，它应专注近战压迫。
