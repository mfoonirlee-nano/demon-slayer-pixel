# Boss 类型与技能池

> 实现状态：目标设计，未实现。当前源码仍是单例 Boss，没有 Boss 注册表或轮换池。幕表以 [../game-design/act-structure.md](../game-design/act-structure.md) 为权威，本文只展开 Boss 注册表、觉醒形态、终幕换相和血量曲线。

## Purpose

定义 Boss 注册表、血量曲线、技能池、召唤池和 Boss 击杀循环。Boss 闯关阶梯是固定 13 幕：第 1-6 幕 6 个基础 Boss，第 7-12 幕同序觉醒形态，第 13 幕终极 Boss 万相血月（见 [../game-design/act-structure.md](../game-design/act-structure.md)）。

## Target Design

每个基础 Boss 作为独立 archetype，觉醒形态通过 `awakenedOf` 复用并叠加，不另起一套精灵与数值：

```ts
{
  id: "lower_moon_spider_string",
  displayName: "下弦之鬼 · 蛛弦",
  sheetId: "boss_spider_string",
  unlockAct: 1,                       // 基础 Boss 固定出现的幕
  baseHp: 520,
  hpPerCycle: 145,
  phaseThresholds: [0.66, 0.33],      // 基础 2 阈值 = 3 阶段
  contactDamage: { base: 12, perPhase: 2, perCycle: 1 },
  skills: ["string_wave", "chase_summon"],
  awakenedSkill: "thousand_thread_cage",   // 觉醒幕追加的觉醒血鬼术
  summonPoolByPhase: {
    1: ["chaser"],
    2: ["chaser", "runner"],
    3: ["runner", "brute"]
  },
}
```

觉醒形态不是独立 archetype，而是运行时在 `act >= 7` 时对同序基础 Boss 施加的觉醒叠加（见下方「觉醒形态系统」）。`weightByAct` 已废弃：13 幕是固定遭遇序列，每幕的 Boss 由 `act` 唯一决定，不再按权重抽取。

Boss 死亡统一入口：

```ts
defeatBoss()
```

所有 Boss 死亡路径都调用它，包括普攻、下落攻击、技能瞬时伤害、技能特效、大招和防守反击。

## Key Formulas

Boss 血量（基础幕与觉醒幕共用一条曲线，靠 `bossKills` 自然抬升，不为觉醒幕另写膨胀）：

```ts
bossHp = baseHp + bossKills * hpPerCycle + elapsed * 0.35
```

终幕万相血月不走这条曲线，用独立 `baseHp` 定位到普通 Boss 的 `2.2x-2.8x`（见本文「终幕 Boss：万相血月」）。觉醒幕（`act >= 7`）的额外难度来自多一阶段 + 觉醒招 + 强化召唤，而非额外血量手写值。

Boss AI 冷却：

```ts
aiCooldown = clamp(baseCooldown - phase * phaseReduction - bossKills * 5, 42, baseCooldown)
```

Boss 出场节奏（13 幕是固定遭遇序列，Boss 在场时常规刷怪暂停，击杀后短暂幕间停顿再进入下一幕的小怪波次）：

| 幕段 | 上一幕 Boss 击杀到下一幕 Boss 出场 |
| --- | --- |
| 第 1 幕 | 开局约 `35-45s` 出场（教学窗口） |
| 第 2-6 幕 | 幕间小怪波次约 `25-35s` 后出场 |
| 第 7-12 幕 | 觉醒幕波次更密，约 `30-40s` 后出场 |
| 第 13 幕 | 终幕前给一次明确的喘息与提示，再进入万相血月 |

每个 Boss 的内部阶段行为由自身 `phaseThresholds` 与 `summonPoolByPhase` 决定，逐阶段提高召唤频率与弹幕密度；不再用「第 N 轮全局升级」描述，因为 13 幕每幕是不同 Boss。

## Boss Archetype Candidates（6 基础 Boss）

以下条目只维护玩法定位、解锁幕和实现边界。原画、角色文案、登场提示和动画 brief 见 [../art/bosses/README.md](../art/bosses/README.md)。解锁幕严格对齐权威幕表 [../game-design/act-structure.md](../game-design/act-structure.md)，每幕只出现一个 Boss。

| ID | Display Name | 玩法定位 | 基础幕 | 觉醒幕 | 美术设定 |
| --- | --- | --- | ---: | ---: | --- |
| `lower_moon_spider_string` | 下弦之鬼 · 蛛弦 | 追猎 + 召唤 + 单向蛛网技 | `1` | `7` | [spider-string.md](../art/bosses/spider-string.md) |
| `lower_moon_mist_bone` | 下弦之鬼 · 雾骨 | 区域封锁 + 骨刺弹幕（延迟爆发） | `2` | `8` | [mist-bone.md](../art/bosses/mist-bone.md) |
| `lower_moon_mirror_dream` | 下弦之鬼 · 镜魇 | 分身干扰 + 反射投射物 | `3` | `9` | [mirror-dream.md](../art/bosses/mirror-dream.md) |
| `lower_moon_fang_gale` | 下弦之鬼 · 牙岚 | 高速冲刺 + 近身连击 | `4` | `10` | [fang-gale.md](../art/bosses/fang-gale.md) |
| `lower_moon_lantern_ember` | 下弦之鬼 · 灯烬 | 召唤强化 + 火线封路 | `5` | `11` | [lantern-ember.md](../art/bosses/lantern-ember.md) |
| `lower_moon_dead_bell` | 下弦之鬼 · 枯铃 | 节奏压迫 + 声波环 + 停拍窗口 | `6` | `12` | [dead-bell.md](../art/bosses/dead-bell.md) |

## 觉醒形态系统（第 7-12 幕）

第 7-12 幕**不引入新 Boss archetype**，而是按基础幕顺序 1:1 重现觉醒形态（7=觉醒蛛弦 … 12=觉醒枯铃），保证「先学基础形态，再面对觉醒形态」的教学闭环。觉醒形态 = 同序基础 Boss + 以下叠加，**不是单纯加血**（遵守「内容轮换而非数值膨胀」设计支柱）：

1. **一个觉醒血鬼术新招**（每个 Boss 一个，见下表）——觉醒幕的主要差异来源。
2. **多一个阶段**：阶段阈值从 `[0.66, 0.33]`（3 阶段）改为 `[0.75, 0.5, 0.25]`（4 阶段）。
3. **召唤池升级**：在基础召唤池上加入后期机制敌人（`burrower` / `splitter` / `warden`），同屏召唤上限不变。
4. **AI 冷却下限更低**：施法更密，但保留最低冷却避免不可解（见 `aiCooldown` clamp 下限）。
5. **血量按 `bossKills` 曲线自然抬升**，不另写膨胀值。

```ts
// 运行时在 act >= 7 时对同序基础 Boss 施加觉醒叠加
function awakenedOverlay(base, act) {
  if (act < 7 || act > 12) return base;
  return {
    ...base,
    phaseThresholds: [0.75, 0.5, 0.25],
    skills: [...base.skills, base.awakenedSkill],
    summonPoolByPhase: enrichSummons(base.summonPoolByPhase), // + burrower/splitter/warden
    aiCooldownFloor: base.aiCooldownFloor - 6,                  // 仍 clamp 到不可解下限以上
  };
}
```

觉醒血鬼术新招与玩家应对：

| 觉醒 Boss | 幕 | 觉醒血鬼术新招 | 玩家应对 |
| --- | ---: | --- | --- |
| 蛛弦·觉醒 | 7 | 千丝牢笼：预警线后逐段收束全屏蛛网，分段封锁地面/空中 | 看预警线提前走位到安全段 |
| 雾骨·觉醒 | 8 | 浓雾葬：短时遮蔽视野 + 多点延迟骨刺连爆 | 记预警点，雾中靠落点记忆 |
| 镜魇·觉醒 | 9 | 真影错位：每阶段开始真假身随机互换 + 分身同步反射上一个技能 | 阶段切换瞬间重新辨真身，谨慎丢技能 |
| 牙岚·觉醒 | 10 | 岚牙连闪：三段跨场冲刺连段 | 连续读三次起手方向，找跳/反击窗口 |
| 灯烬·觉醒 | 11 | 燎原灯阵：火线连成移动网格 + 灰烬减速区叠加 | 走网格缝隙，避免被灰烬粘住 |
| 枯铃·觉醒 | 12 | 双调枯铃：双频错相声波环 + 强制停拍反震 | 停拍窗口内停手，否则被反震 |

> 美术成本：觉醒形态优先复用基础 Boss 精灵 + 觉醒视觉态（变色 / 特效密度提升 / 关键物件状态变化），只有新招特效需少量新素材。每 Boss 觉醒 brief 见各自 `../art/bosses/*.md`。

## 终幕 Boss：万相血月（第 13 幕）

| 项 | 建议 |
| --- | --- |
| ID | `grand_boss_blood_moon_many_faces` |
| 出现幕 | `act == 13`，固定终点，不进入任何轮换池 |
| 阶段阈值 | `[0.8, 0.6, 0.4, 0.2]`（5 阶段） |
| 生命定位 | 普通 Boss 的 `2.2x` 到 `2.8x`，但降低单次技能伤害 |
| 召唤上限 | 在场额外召唤物 ≤ `4` 只 |
| 技能间隔 | 每次复合技能后保留短暂停顿，避免和冲刺无缝衔接；每阶段只启用 1 主特性 + 1 副特性 |
| 奖励定位 | 击败即单局通关，出胜利结算；首次通关解锁血月试炼进阶（见 [endgame-ascension.md](endgame-ascension.md)） |

**换相借招**：5 个相把 6 名下弦之鬼的代表机制做一次总复习（每相只启用 1 主 + 1 副特性，避免堆叠），最终相切回血月本体终结技。相名与配对沿用 [../art/bosses/blood-moon-many-faces.md](../art/bosses/blood-moon-many-faces.md)：

| 相 | 血量带 | 名称 | 借招来源 | 主特性 |
| ---: | --- | --- | --- | --- |
| 1 | `1.0-0.8` | 蛛雾相 | 蛛弦 + 雾骨 | 蛛丝追踪标记 + 标记处延迟骨钉 |
| 2 | `0.8-0.6` | 镜牙相 | 镜魇 + 牙岚 | 镜影假冲刺方向 + 真身另一侧突进 |
| 3 | `0.6-0.4` | 灯铃相 | 灯烬 + 枯铃 | 鬼灯召唤 + 枯铃节拍决定火线/音刃时机 |
| 4 | `0.4-0.2` | 六术相 | 全 Boss 轮换 | 每次施法随机换一种代表技，同屏只留一种主危险源 |
| 5 | `0.2-0` | 血月终相 | 终结技 | 六残影依次放弱化代表技，结束后进入长硬直输出窗口 |

终幕换相视觉、相名文案和动画 brief 见 [../art/bosses/blood-moon-many-faces.md](../art/bosses/blood-moon-many-faces.md)。

## Code Sources

目标落地点：

- `src/constants/assets.ts`
- `src/constants/combat.ts`
- `src/types/game-state.ts`
- `src/entities/boss.ts`
- `src/entities/enemy.ts`
- `src/entities/player.ts`
- `src/runtime.ts`

## Implementation Notes

- 新 Boss 第一版等待正式素材接入，不使用临时图形占位。
- 当前 Boss（蛛弦）可作为第一个 archetype 迁入注册表，定位第 1 幕，保持首轮体验基本不变。
- 必须先集中 Boss 死亡逻辑，否则 `bossKills`、装备掉落、经验和幕推进容易重复或漏处理。
- Boss 技能冷却必须有最低值；觉醒幕降低冷却下限后仍须 clamp 到不可解阈值以上。
- 觉醒形态走 `awakenedOverlay` 运行时叠加，不复制一份 archetype；觉醒招的特效素材单独制作，基础精灵复用。
- 13 幕是固定遭遇序列：每幕 Boss 由 `act` 唯一决定，不按 `weightByAct` 抽取；终幕万相血月独立配置，不进任何轮换池。
