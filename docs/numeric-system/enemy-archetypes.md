# 敌人类型与生成权重

> 实现状态：分阶段实现中。`chaser`、`crawler`、`runner`、`caster`、`duelist`、`brute`、`glider`、`binder`、`burrower` 已接入运行时 archetype 或专属状态机；按幕生成池、预算模型和其余敌人仍是目标设计。

## Purpose

定义普通敌人 archetype、生成权重、技能随进度解锁、同屏限制和素材接入边界。本文主要描述后续目标；当前已经接入的行为以 [enemies.md](enemies.md) 为准。

## Target Design

敌人设计先解决两个问题：

- 当前已有多种敌人状态机，但普通刷怪还没有按幕数组织敌人池和预算。
- 幕数推进后，需要用敌人组合改变战斗问题，而不是只提高血量和速度。

普通敌人进入注册表：

```ts
ENEMY_ARCHETYPES
```

每幕常规敌人池进入显式配置：

```ts
ACT_ENEMY_POOLS
```

设计原则：

- 每种敌人只承担一个主要压力，不把高速、高血、高伤、远程都堆在同一个单位上。
- 所有高伤行为必须有可读前摇，避免只靠接触伤害制造难度。
- 第一幕常规敌人池固定为 3 种：基础横穿、低矮贴地、短前摇冲刺。
- 后续每幕持续增加 `1-2` 种新敌人，但同一幕常规刷怪池上限控制在约 `8` 种。
- 超过 `8` 种后用老敌人降权或退池轮换，不让 12 种敌人同时进入常规刷怪。
- 第三幕以后允许混合压力，但通过生成权重和 active cap 控制同时存在数量。
- 现有正式敌人素材可以被赋予不同 archetype；新增敌人第一版等待正式素材接入，不使用临时图形占位。

`k` 统一表示：

```ts
k = bossKills = act - 1
```

`chaser` 从第 1 幕开始保留为基础怪，后续幕数只提升生命、攻击和速度，不增加额外技能。

## Enemy Index

| Archetype | 素材建议 | 定位 | 行为核心 | 解锁幕数 | 常规池角色 |
| --- | --- | --- | --- | ---: | --- |
| `chaser` | `chaser.png` | 基础追击 | 从屏幕一侧横穿到另一侧，未击杀则折返重复 | `1` | 基础核心，后期降权 |
| `crawler` | `crawler.png` | 低矮穿插 | 低血贴地追踪，短前摇后低伏前扑 | `1` | 前期核心，后期轮换 |
| `runner` | `runner_approach.png` | 快攻压力 | 短前摇后冲刺，迫使跳跃或远程处理 | `1` | 前中期核心，后期轮换 |
| `duelist` | `duelist.png` | 近战精英 | 接近后短距离斩击 | `2` | 中期近战压力 |
| `leaper` | `leaper_stalk.png` | 跳跃突袭 | 蓄力后抛物线跳向玩家落点 | `2` | 平台和落点压力 |
| `brute` | `brute_advance.png` | 持盾重型 | 慢速站立推进，盾牌被击破后防御下降 | `3` | 中期正面阻挡压力 |
| `caster` | `caster_move.png` | 远程施压 | 保持距离，周期性发射投射物或召唤标记 | `3` | 中后期远程压力 |
| `glider` | `glider_hover.png` | 低空飞行 | 低空悬停，前摇后俯冲掠过 | `4` | 空中和平台边缘压力 |
| `burrower` | `burrower_move.png` | 潜行包抄 | 短暂潜入，地面标记后从玩家附近钻出 | `5` | 后期反风筝压力 |
| `splitter` | 待制作 | 分裂压迫 | 死亡后分裂为两个低血残影 | `5` | 后期清场顺序压力 |
| `binder` | `binder_move.png` | 控场干扰 | 前摇后生成短时束缚或减速区域 | `6` | 后期控场压力 |
| `warden` | 待制作 | 支援核心 | 给附近敌人提供小幅加速或减伤光环 | `6` | 后期目标优先级压力 |

现有素材改造目标：

| 当前素材 | 视觉特征 | 当前问题 | 目标改造 |
| --- | --- | --- | --- |
| `chaser.png` | 裸身奔跑鬼 | 已接入基础追踪；目标横穿/重入场规则未实现 | 作为默认 `chaser`，承担横穿追击的基础怪规则 |
| `crawler.png` | 低矮蛛形 | 已接入低伏前扑玩法 | 作为 `crawler`，低血高速，短前摇前扑后有恢复硬直；普攻必须稳定可命中 |
| `runner_approach.png` | 角鬼奔跑/挥臂 | 已接入前摇冲刺状态机 | 作为 `runner`，按幕数控制快攻压力和同时冲刺数量 |
| `caster_move.png` | 提灯面具鬼 | 已接入远程鬼火状态机 | 作为 `caster`，按幕数控制生成权重和投射物密度 |
| `duelist.png` | 双刃鬼 | 已接入近战斩击状态机 | 作为 `duelist`，按幕数控制近身压力和同时威胁数量 |
| `brute_advance.png` | 站立持盾重鬼 | 已接入盾牌耐久、盾击、破盾硬直和无盾横扫状态机 | 作为 `brute`，后续按幕数控制正面阻挡压力和生成预算 |
| `glider_hover.png` | 膜翼巡鬼 | 已接入低空悬停/俯冲状态机，当前按 `elapsed >= 70s` 进入随机候选 | 作为 `glider`，目标设计中改为第 4 幕解锁并纳入预算 |
| `binder_move.png` | 符咒长袍鬼 | 已接入控场咒圈状态机 | 作为 `binder`，目标设计中改为后期幕数或轮换 profile 解锁 |
| `burrower_move.png` | 铲爪土潜鬼 | 已接入潜入、地面轨迹、钻出和恢复状态机，当前按 `elapsed >= 90s` 进入随机候选 | 作为 `burrower`，目标设计中改为第 5 幕解锁并纳入预算 |

新增敌人面向原画师的形象说明见 [../art/enemies/README.md](../art/enemies/README.md)。仍未接入的新增敌人等待正式素材、前摇动画和命中特效准备好后再进入生成池。

## Future Interfaces

推荐配置形态：

```ts
{
  id: "runner",
  displayName: "快攻鬼",
  sheetId: "runner_approach",
  role: "speed",
  unlockAct: 1,
  aiType: "windupDash",
  baseHp: 12,
  hpPerBossKill: 1.5,
  baseDamage: 3,
  damagePerBossKill: 0.35,
  damageCap: 12,
  baseSpeed: 1.25,
  randomSpeed: 0.85,
  maxAbsVelocity: 4.4,
  steeringForce: 0.04,
  spawnCost: 1,
  activeCap: 3,
  scoreValue: 11,
  skillEnergyGain: 9,
  ultimateEnergyGain: 2.4,
}
```

`EnemyState` 建议扩展：

```ts
archetypeId: string;
aiState: "spawn" | "move" | "windup" | "attack" | "recover" | "dead";
aiTimer: number;
targetX?: number;
targetY?: number;
attackCd?: number;
```

特色行为可额外增加：

```ts
hasSplit?: boolean;
zoneId?: string;
auraRadius?: number;
projectilesActive?: number;
```

`ACT_ENEMY_POOLS` 建议显式配置每幕常规池，避免所有已解锁敌人自动进入同一幕：

```ts
{
  act: 5,
  core: ["chaser", "duelist", "caster"],
  newEnemies: ["burrower", "splitter"],
  rotation: ["runner", "brute", "glider"],
  retiredOrLowWeight: ["crawler", "leaper"],
  maxRegularTypes: 8,
}
```

## Key Formulas

基础成长：

```ts
enemyHp = round((baseHp + k * hpPerBossKill) * threatScalar)
enemyDamage = min(damageCap, baseDamage + k * damagePerBossKill)
enemySpeed = baseSpeed + k * speedPerBossKill + random(0, randomSpeed)
```

生成节奏：

```ts
enemySpawnInterval = clamp(1.15 - k * 0.08 - elapsed * 0.0015, 0.42, 1.15)
enemySpawnBudget = Math.min(10 + k * 2, 24)
enemyActiveCost = sum(enemy.archetype.spawnCost)
```

用 `spawnBudget` 替代单纯数量上限。这样 `brute`、`caster`、`binder`、`warden` 可以占更高预算，避免后期同时刷出过多高压单位。

## Numeric Baseline

表格是目标基准，实际实现时需要用试玩数据微调。HP 会进入 `threatScalar` 计算；伤害必须保留上限，避免长时间局内成长把普通敌人接触伤害推到不可解。

| Archetype | HP | 伤害 | 速度 | 预算 | 击杀分 | 技能能量 | 大招能量 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `chaser` | `16 + k*2.0` | `3 + k*0.35`，cap `12` | `2.20 + k*0.12 + rand(0.25)` | `1` | `10` | `10` | `2.7` |
| `crawler` | `10 + k*1.4` | `3 + k*0.25`，cap `10` | `1.05 + k*0.06 + rand(0.95)` | `1` | `9` | `8` | `2.0` |
| `runner` | `12 + k*1.5` | `3 + k*0.35`，cap `12` | `1.25 + k*0.08 + rand(0.85)` | `1` | `11` | `9` | `2.4` |
| `duelist` | `22 + k*2.6` | `5 + k*0.55`，cap `16` | `0.84 + k*0.05 + rand(0.72)` | `2` | `14` | `12` | `3.2` |
| `leaper` | `18 + k*2.2` | `5 + k*0.45`，cap `15` | `0.72 + k*0.04 + rand(0.50)` | `2` | `15` | `12` | `3.2` |
| `brute` | `38 + k*5.5` | `8 + k*0.80`，cap `20` | `0.42 + k*0.03 + rand(0.45)` | `3` | `22` | `16` | `4.5` |
| `caster` | `20 + k*2.2` | `4 + k*0.45`，cap `14` | `0.48 + k*0.03 + rand(0.42)` | `2` | `18` | `14` | `4.0` |
| `glider` | `16 + k*1.9` | `4 + k*0.40`，cap `13` | `0.92 + k*0.05 + rand(0.45)` | `2` | `16` | `12` | `3.4` |
| `burrower` | `16 + k*2.0` | `6 + k*0.50`，cap `16` | `0.58 + k*0.04 + rand(0.45)` | `2` | `16` | `12` | `3.4` |
| `splitter` | `28 + k*3.2` | `4 + k*0.35`，cap `13` | `0.62 + k*0.04 + rand(0.50)` | `2` | `16` | `12` | `3.0` |
| `binder` | `18 + k*2.0` | `3 + k*0.25`，cap `10` | `0.42 + k*0.02 + rand(0.35)` | `2` | `18` | `14` | `4.0` |
| `warden` | `26 + k*3.0` | `2 + k*0.20`，cap `8` | `0.38 + k*0.02 + rand(0.30)` | `3` | `24` | `18` | `5.0` |

`splitter` 分裂体建议使用独立 `splitling` 配置：`6 + k*0.8` HP、`2 + k*0.2` 伤害、预算 `0.5`。分裂体不再继续分裂，奖励只给少量能量或不给分数，避免刷分。

## Act Enemy Pools

逐幕解锁节奏：

| 幕 | 新增敌人 | 常规刷怪池 | 常规池数量 | 轮换或降权 |
| --- | --- | --- | ---: | --- |
| 第 1 幕 | `chaser`、`crawler`、`runner` | `chaser`、`crawler`、`runner` | `3` | 无 |
| 第 2 幕 | `duelist`、`leaper` | `chaser`、`crawler`、`runner`、`duelist`、`leaper` | `5` | 无 |
| 第 3 幕 | `brute`、`caster` | `chaser`、`crawler`、`runner`、`duelist`、`leaper`、`brute`、`caster` | `7` | 无 |
| 第 4 幕 | `glider` | `chaser`、`crawler`、`runner`、`duelist`、`leaper`、`brute`、`caster`、`glider` | `8` | 无 |
| 第 5 幕 | `burrower`、`splitter` | `chaser`、`runner`、`duelist`、`brute`、`caster`、`glider`、`burrower`、`splitter` | `8` | `crawler` 退池，`leaper` 进入轮换 |
| 第 6 幕+ | `binder`、`warden` | `chaser`、`duelist`、`caster`、`glider`、`burrower`、`splitter`、`binder`、`warden` | `8` | `crawler`、`runner`、`leaper`、`brute` 按波次轮换 |

轮换规则：

- `chaser` 永远保留为基础怪，但第 4 幕后逐步降权，避免基础怪挤掉新机制。
- `crawler` 和 `runner` 是前期教学压力，后期可以按幕、按波次或按 Boss 召唤池轮换，不必每幕同时存在。
- `leaper` 与 `glider` 都占用垂直注意力，后期同池时需要低权重或互斥波次。
- `brute`、`splitter` 都制造清场顺序压力，第 6 幕后可以二选一进入常规池。
- `burrower`、`splitter`、`binder`、`warden` 使用 active cap，避免同屏机制过载。
- 每幕权重结构按“核心敌人 + 新增敌人 + 轮换敌人”组织，保证随机性但不失控。

推荐常规池权重：

| 幕 | chaser | crawler | runner | duelist | leaper | brute | caster | glider | burrower | splitter | binder | warden |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | `0.45` | `0.25` | `0.30` | `0` | `0` | `0` | `0` | `0` | `0` | `0` | `0` | `0` |
| 2 | `0.34` | `0.17` | `0.20` | `0.16` | `0.13` | `0` | `0` | `0` | `0` | `0` | `0` | `0` |
| 3 | `0.24` | `0.12` | `0.16` | `0.13` | `0.10` | `0.12` | `0.13` | `0` | `0` | `0` | `0` | `0` |
| 4 | `0.19` | `0.09` | `0.13` | `0.12` | `0.09` | `0.12` | `0.13` | `0.13` | `0` | `0` | `0` | `0` |
| 5 | `0.15` | `0` | `0.13` | `0.14` | `0` | `0.11` | `0.14` | `0.12` | `0.10` | `0.11` | `0` | `0` |
| 6+ | `0.11` | `0` | `0` | `0.13` | `0` | `0` | `0.13` | `0.12` | `0.12` | `0.12` | `0.14` | `0.13` |

轮换 profile（第 6 幕首次启用，第 7-12 觉醒幕逐幕切换主导 profile）：

| Profile | 替入 | 替出 | 用途 |
| --- | --- | --- | --- |
| 低位压力 | `crawler` | `splitter` | 让地面贴身和潜行形成双低位压力 |
| 快攻压力 | `runner` | `burrower` | 让冲刺、近战、远程形成更直接的反应测试 |
| 垂直压力 | `leaper` | `glider` | 切换跳跃落点与低空俯冲，不同时堆满 |
| 重型压力 | `brute` | `splitter` | 降低分裂复杂度，改为高血阻挡 |

## 觉醒幕敌人差异化（第 7-12 幕）

12 种敌人**全部在第 1-6 幕解锁完毕**，第 7-12 幕**不引入任何新敌人素材**。觉醒幕的杂兵差异化只靠两点（权威约束见 [../game-design/act-structure.md](../game-design/act-structure.md)）：

1. **觉醒 Boss 的强化召唤池**：召唤池加入 `burrower` / `splitter` / `warden` 等后期机制敌人（见下方表）。
2. **逐幕切换主导 profile**：每个觉醒幕由一个主导 profile 决定常规池组合，让觉醒段每幕杂兵手感不同，而非堆同一组：

| 觉醒幕 | 觉醒 Boss | 主导 profile | 常规池侧重 |
| ---: | --- | --- | --- |
| 7 | 蛛弦·觉醒 | 低位压力 | `crawler`/`burrower` 贴地与潜行，配合全屏蛛网 |
| 8 | 雾骨·觉醒 | 垂直压力 | `leaper`/`glider` 占垂直空间，配合视野遮蔽 |
| 9 | 镜魇·觉醒 | 快攻压力 | `runner`/`duelist` 逼近，配合分身干扰 |
| 10 | 牙岚·觉醒 | 快攻压力 | `runner`/`burrower` 反应测试，呼应三段冲刺 |
| 11 | 灯烬·觉醒 | 重型压力 | `brute`/`splitter` 阻塞，配合火线网格走位 |
| 12 | 枯铃·觉醒 | 低位 + 重型 | `binder`/`warden` 控场支援，配合停拍反震 |

常规刷怪池始终 ≤ 8 种，靠退池 + 降权 + 轮换控制；觉醒幕不放开 12 种同屏。终幕（第 13 幕）用终盘限定池，额外召唤 ≤ 4（见 act-structure.md）。

同屏限制建议：

| Archetype | 常规 active cap | 额外限制 |
| --- | ---: | --- |
| `chaser` | 按预算 | 同侧重入场时间错开 |
| `crawler` | `5` | 第 1 幕建议最多 `3`；同时前扑最多 `2` |
| `runner` | `3` | 同时冲刺中的 `runner` 最多 `2` |
| `duelist` | `3` | 斩击前摇不要完全同步 |
| `leaper` | `2` | 同一时刻只能有 `1` 个锁定落点 |
| `brute` | `2` | 第 3 幕初次出现最多 `1` |
| `caster` | `2` | 每个 `caster` 投射物最多 `2` 个 |
| `glider` | `2` | 同时俯冲最多 `1` 个 |
| `burrower` | `1` | 同时潜行最多 `1` 个，钻出点不能重叠玩家中心 |
| `splitter` | `2` | 分裂体总数进入预算，分裂体不能继续分裂 |
| `binder` | `1` | 束缚区域同时最多 `1` 个主区域 |
| `warden` | `1` | 光环不影响 Boss，同场最多 `1` 个 |

Boss 召唤池建议：

| Boss 阶段 | 召唤池 |
| --- | --- |
| 阶段 1 | `chaser`、少量 `crawler` |
| 阶段 2 | `chaser`、`runner`、`duelist`、少量 `leaper` |
| 阶段 3 | `runner`、`duelist`、少量 `brute` 或 `caster` |
| 基础 Boss（1-6 幕） | 当前幕常规池里抽取 `3-5` 种，排除 `warden` 或给 `warden` 强 cap |
| 觉醒 Boss（7-12 幕） | 在基础召唤池上加入 `burrower` / `splitter` / `warden`，同屏召唤上限不变 |
| 终幕万相血月（13 幕） | 终盘限定池，在场额外召唤物 ≤ `4` |

## Behavior Design

### `chaser`

基础追击单位，第一幕开始出现，并在后续幕数里持续保留。它不是持续贴身转向的追踪怪，而是从屏幕一侧直接横穿到另一侧；如果横穿过程中没有被击杀，就从抵达的屏幕边缘再次发起横穿，重复这个过程。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 1 幕开始；后期保留但降权 |
| 主要压力 | 逼迫玩家移动和普攻 |
| 状态机 | `spawn -> charge -> reenter -> charge`，死亡进入 `dead` |
| 攻击窗口 | `charge` 期间按接触伤害结算，方向稳定，不持续急转 |
| 恢复窗口 | 离开屏幕后有短暂 `reenter` 等待，重入场前给玩家读方向 |
| 玩家反制 | 普攻 `1-2` 次、任意技能、大招清场 |
| 不可做边界 | 不瞬移到玩家脚下，不贴脸突然反向，不增加后期额外技能 |
| 同屏限制 | 按预算生成；多个 `chaser` 的重入场时间错开 |
| 可读性约束 | 使用最清楚的奔跑轮廓，不携带施法、冲刺、重型等机制暗示 |

幕数成长：

```ts
actIndex = Math.max(0, act - 1)
chaserHp = round((16 + actIndex * 2) * threatScalar)
chaserDamage = min(12, 3 + actIndex * 0.35)
chaserDashSpeed = 2.20 + actIndex * 0.12 + random(0, 0.25)
```

### `crawler`

低血高速穿插单位，用来打破只看站立敌人的节奏。当前实现为“低伏前扑”：先贴地接近，进入触发距离后停住读招，再短距离前扑，最后进入恢复硬直。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 1 幕开始；第 5 幕后退池或轮换 |
| 主要压力 | 地面空间和跳跃落点 |
| 状态机 | `move -> windup -> lunge -> recover -> move` |
| 攻击窗口 | 接近后停顿约 `14` 帧，锁定朝向并短距离前扑约 `14` 帧；前扑攻击盒首次命中造成略高于接触的伤害 |
| 恢复窗口 | 前扑结束后约 `22` 帧硬直，不移动 |
| 玩家反制 | 下落攻击、壹之型直线清理、普攻 |
| 不可做边界 | 碰撞体不能低到普攻打不到；不能潜行、绕背或瞬移，否则和 `burrower` 混淆 |
| 同屏限制 | 第 1 幕最多 `3`，后续最多 `5`；同时前扑最多 `2` |
| 可读性约束 | 前摇必须从压低姿态、前肢张开和眼点增强读出；贴地轮廓区别于站立敌人 |

### `runner`

快攻单位，核心是“可预判的突然靠近”。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 1 幕开始；第 6 幕后进入轮换 |
| 主要压力 | 反应和站位 |
| 状态机 | `move -> windup -> dash -> recover -> move` |
| 攻击窗口 | 距离玩家一定范围时停顿 `14-18` 帧，然后冲刺 `42-52` 帧 |
| 恢复窗口 | 冲刺结束后 `16-22` 帧硬直，允许玩家反打 |
| 玩家反制 | 提前跳跃、壹之型、叁之型反击 |
| 不可做边界 | 不能连续无缝冲刺，不能在冲刺中无限修正方向 |
| 同屏限制 | 同时存在最多 `3`，同时冲刺最多 `2` |
| 可读性约束 | 冲刺前摇不看速度也能从姿态读出 |

### `duelist`

近战精英单位，提供比 `chaser` 更明确的近身危险。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 2 幕开始 |
| 主要压力 | 近距离处理顺序 |
| 状态机 | `approach -> windup -> slash -> recover -> approach` |
| 攻击窗口 | 接近后短前摇斩击，斩击盒比接触盒更危险 |
| 恢复窗口 | 斩击后 `18-26` 帧收刀，不能立刻再次斩击 |
| 玩家反制 | 贰之型群体压制、叁之型反击、拉开距离 |
| 不可做边界 | 斩击伤害高于接触伤害，但必须有前摇和命中关键帧 |
| 同屏限制 | 最多 `3`，多个 `duelist` 前摇需要错开 |
| 可读性约束 | 双刃范围明确，但不能像 Boss 级大招 |

### `leaper`

跳跃突袭单位，专门惩罚玩家长期站在平台边缘或只向一个方向风筝。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 2 幕开始；第 5 幕后可轮换 |
| 主要压力 | 平台落点和垂直空间 |
| 状态机 | `stalk -> windup -> leap -> impact -> recover` |
| 攻击窗口 | 进入范围后停顿 `18-24` 帧，锁定玩家当前位置附近，抛物线跳跃并落地冲击 |
| 恢复窗口 | 落地后 `20-30` 帧拔出脚爪或起身 |
| 玩家反制 | 看前摇离开落点、下落攻击反打、壹之型在起跳前击杀 |
| 不可做边界 | 落点必须有地面标记；空中不能无限修正目标 |
| 同屏限制 | 最多 `2`，同一时刻只能有 `1` 个锁定落点 |
| 可读性约束 | 长腿和压低姿态是核心，不加翅膀，避免和 `glider` 混淆 |

### `brute`

站立持盾重型单位，用于制造正面空间阻塞和破盾目标优先级，而不是靠速度追杀。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 3 幕开始；第 6 幕后可与 `splitter` 轮换 |
| 主要压力 | 盾牌耐久、持续占位和破盾目标优先级 |
| 状态机 | `advance -> guard -> shieldBash -> recover`；盾牌耐久归零后进入 `shieldBreak`，再改用 `brokenAdvance -> cleave -> brokenRecover` |
| 攻击窗口 | 盾牌完整时短前摇盾击；破盾后用更慢的拳击、骨槌或残盾横扫 |
| 恢复窗口 | 攻击后 `24-34` 帧停顿；破盾瞬间额外 `28-40` 帧硬直 |
| 玩家反制 | 集火破盾、贰之型群体压制、下落攻击、大招 |
| 不可做边界 | 盾牌不能免疫大招；不能潜行、钻地、绕背或高速追击玩家 |
| 同屏限制 | 第 3 幕初次出现最多 `1`，后续最多 `2` |
| 可读性约束 | 靠站立体量、前置盾牌、盾裂/破盾状态读出高防重型定位 |

### `caster`

远程单位，用来迫使玩家离开安全站位。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 3 幕开始 |
| 主要压力 | 远程弹幕和平台路线干扰 |
| 状态机 | `seekRange -> windup -> cast -> recover -> seekRange` |
| 攻击窗口 | 保持 `220-280px` 距离，前摇后发射低速投射物或短时标记 |
| 恢复窗口 | 每次施法后进入 `attackCd`，期间缓慢 reposition |
| 玩家反制 | 壹之型远程清线、叁之型防守反击、快速接近 |
| 不可做边界 | 投射物不能过快；单个 `caster` 同时投射物最多 `2` 个 |
| 同屏限制 | 最多 `2` |
| 可读性约束 | 提灯必须始终是最亮识别点，和 `binder` 的地面控制区分 |

### `glider`

低空飞行单位，负责占用玩家头顶和平台边缘空间。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 4 幕开始 |
| 主要压力 | 空中路线、平台边缘和头顶空间 |
| 状态机 | `hover -> windup -> dive -> pass -> recover -> hover` |
| 攻击窗口 | 低空悬停后收翼前摇，沿斜线俯冲掠过玩家附近 |
| 恢复窗口 | 俯冲后重新展开翼膜上抬，`18-28` 帧可被反击 |
| 玩家反制 | 跳跃普攻、壹之型、提前离开俯冲线 |
| 不可做边界 | 不能高到玩家无法命中；不能发射弹幕，否则和 `caster` 混淆 |
| 同屏限制 | 最多 `2`，同时俯冲最多 `1` |
| 可读性约束 | 低空翼膜和收翼俯冲是核心，保持小怪级别，不做 Boss 翅膀 |

### `burrower`

潜行包抄单位，用来打破玩家贴边站位和单方向清线。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 5 幕开始 |
| 主要压力 | 身后威胁和站位变化 |
| 状态机 | `move -> sink -> burrow -> emerge -> recover` |
| 攻击窗口 | 潜入与地面轨迹合计约 `28-32` 帧预警，随后从玩家附近半身偏移点钻出 |
| 恢复窗口 | 钻出后约 `24-31` 帧抖落泥土，给普攻窗口 |
| 玩家反制 | 离开标记区域、叁之型防守、钻出后的恢复帧普攻 |
| 不可做边界 | 潜行期间不完全隐形；钻出点不能直接覆盖玩家中心 |
| 同屏限制 | 最多 `1` |
| 可读性约束 | 地面隆起线和裂纹必须可追踪，和 `crawler` 的贴地移动区分 |

### `splitter`

分裂单位，用来让玩家判断“先清小怪还是先打本体”。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 5 幕开始 |
| 主要压力 | 清场顺序和技能价值 |
| 状态机 | `advance -> damaged -> splitOnDeath -> splitlingMove` |
| 攻击窗口 | 本体以低中速接触压迫，死亡时生成两个低血 `splitling` |
| 恢复窗口 | 分裂体出生后短暂半透明 `6-10` 帧，再实体化 |
| 玩家反制 | 贰之型、大招、下落攻击，或先清周围敌人再击杀本体 |
| 不可做边界 | 只能分裂一次；分裂体不能继续掉落完整奖励 |
| 同屏限制 | 本体最多 `2`，分裂体总数计入预算 |
| 可读性约束 | 活着时就能看出身体中线裂缝，死亡分裂不能像两个完整本体 |

### `binder`

控场干扰单位，不靠高伤害，而是制造玩家不想站的位置。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 6 幕开始 |
| 主要压力 | 安全区压缩和平台路线干扰 |
| 状态机 | `seekLine -> windup -> bindZone -> recover -> seekLine` |
| 攻击窗口 | 前摇后在玩家脚下或前进方向生成 `2-3s` 减速区域 |
| 恢复窗口 | 施法后 `attackCd` 较长，期间直接威胁低 |
| 玩家反制 | 提前移动、壹之型远程击杀、叁之型抵挡后续压力 |
| 不可做边界 | 束缚区域只减速或短暂锁跳，不直接造成高额伤害 |
| 同屏限制 | 同场最多 `1` 个主区域，`binder` 最多 `1` |
| 可读性约束 | 地面咒圈边缘清晰，不用实心大色块遮挡平台 |

### `warden`

支援核心单位，用低直接威胁换取高目标优先级。

| 项 | 目标 |
| --- | --- |
| 出现幕数 | 第 6 幕开始 |
| 主要压力 | 后排优先级和混怪处理 |
| 状态机 | `enter -> maintainAura -> reposition -> maintainAura` |
| 攻击窗口 | 直接攻击弱；核心威胁是给半径 `180px` 内敌人提供 `+12%` 移速或 `-15%` 受伤倍率光环 |
| 恢复窗口 | 被击中时光环短暂抖动或失效 `10-16` 帧 |
| 玩家反制 | 壹之型远程点杀、绕过前排、用大招清掉整波 |
| 不可做边界 | 光环不影响 Boss；不能同时给高移速和高减伤两种强 buff |
| 同屏限制 | 同场最多 `1` 个 |
| 可读性约束 | 光环来源明确，低透明环形边界不遮挡战斗 |

## Skill Counter Matrix

| 玩家手段 | 擅长处理 | 不擅长处理 |
| --- | --- | --- |
| 普通攻击 | `chaser`、落单 `crawler`、钻出后的 `burrower`、恢复中的 `glider` | 多个 `runner`、远处 `caster` / `binder`、被前排保护的 `warden` |
| 下落攻击 | `crawler`、聚团敌人、`brute`、`splitter` 分裂体、落地后的 `leaper` | 分散远程单位、悬停或俯冲前的 `glider` |
| 壹之型 | `runner`、`caster`、`binder`、`warden`、直线清场 | 身后敌人、贴脸包围、已潜行的 `burrower` |
| 贰之型 | `duelist`、`brute`、`splitter`、混怪 | 极远距离目标、空中 `glider`、已潜行的 `burrower` |
| 叁之型 | `runner`、`duelist`、投射物压力、`burrower` 钻出 | 高血单位的主动击杀、后排 `warden` |
| 大招 | 危机清场、重型单位、`warden` 光环波次、分裂波次 | 常规小波次不应强迫使用 |

## Code Sources

目标落地点：

- `src/constants/assets.ts`
- `src/constants/combat.ts`
- `src/constants/runtime.ts`
- `src/types/game-state.ts`
- `src/entities/enemy.ts`
- `src/entities/projectile.ts`
- `src/runtime.ts`

## Implementation Notes

- 本文档只定义目标设计；当前已实现敌人数值见 [enemies.md](enemies.md)。
- 第一阶段已建立 `sheetIndex -> archetype` 映射；后续需要把它升级为显式 `ENEMY_ARCHETYPES` 和 `ACT_ENEMY_POOLS`。
- 先实现 `ACT_ENEMY_POOLS`，不要让所有已解锁 archetype 自动加入当前幕常规刷怪。
- 第一幕常规池必须只包含 `chaser`、`crawler`、`runner` 三种。
- 第 4 幕后常规池最多约 `8` 种；新增敌人通过替换、降权和退池轮换进入。
- `caster` 的远程行为已接入；后续重点是按幕数控制生成权重、投射物密度和 active cap。
- 击杀奖励应从 archetype 读取，不再由所有敌人共享同一套固定奖励。
- `brute`、`caster`、`glider`、`burrower`、`splitter`、`binder`、`warden` 需要 active cap 或 spawn budget，避免组合不可解。
- `leaper`、`glider`、`burrower`、`binder` 必须有清晰落点、俯冲线、钻出点或区域预警。
- `splitter` 的分裂体不能继续分裂，也不能给完整击杀奖励。
- `warden` 光环不影响 Boss，且同场最多一个。
- 所有新增行为先以前摇、攻击、恢复三个阶段描述清楚，再写代码。

## Consistency Checklist

- 12 种敌人必须同时出现在索引、数值表、生成池、行为设计和反制矩阵中。
- 第 1 幕常规池固定为 `chaser`、`crawler`、`runner`。
- 第 2-4 幕分别增加 `2`、`2`、`1` 种，常规池从 `5` 到 `8`。
- 第 5 幕和第 6 幕+ 通过老敌人退池或轮换保持常规池约 `8` 种。
- 12 种敌人在第 1-6 幕解锁完毕，第 7-12 觉醒幕不引入新敌人素材，只靠强化召唤池 + 逐幕切换主导 profile 差异化。
- 觉醒幕主导 profile（7-12 幕）必须与 [../game-design/act-structure.md](../game-design/act-structure.md) 的觉醒顺序一致。
- 高复杂敌人必须有 active cap，不允许多个控场、潜行、分裂、支援机制同屏无上限叠加。
