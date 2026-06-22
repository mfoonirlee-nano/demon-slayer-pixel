# 敌人类型与生成导演

> 实现状态：目标设计，未完全实现。运行时已有多种敌人 archetype 或专属状态机；本文定义下一阶段 enemy director 的目标规则：用 `bossKills -> act` 作为主进度轴，每局生成稳定敌人解锁顺序，每幕只控制敌人种类数量、profile 和预算，不写死每幕具体敌人名单。

## Purpose

定义普通敌人 archetype、生成权重、解锁顺序、每幕常规池、波次节拍、Boss 召唤池、同屏预算和素材接入边界。本文主要描述后续目标；当前已经接入的行为以 [enemies.md](enemies.md) 为准。

## Target Design

敌人设计先解决两个问题：

- 当前已有多种敌人状态机，但普通刷怪还没有按幕数组织敌人池和预算。
- 幕数推进后，需要用敌人组合改变战斗问题，而不是只提高血量和速度。

普通敌人进入注册表：

```ts
ENEMY_ARCHETYPES
```

每局开局生成一条稳定敌人解锁顺序：

```ts
runEnemyOrder = buildRunEnemyOrder(runSeed)
```

设计原则：

- 每种敌人只承担一个主要压力，不把高速、高血、高伤、远程都堆在同一个单位上。
- 所有高伤行为必须有可读前摇，避免只靠接触伤害制造难度。
- `bossKills -> act` 是唯一长期进度轴；`elapsedInAct` 只做幕内压力微调，不决定解锁哪种敌人。
- 第一幕常规敌人池固定为 3 种压力槽：基础横穿、低矮贴地、短前摇冲刺。
- 第 1-6 幕按数量解锁敌人：`3, 5, 7, 9, 11, 12`。第 6 幕解锁全部 12 种敌人。
- 每幕常规池只控制种类数量，不指定具体敌人：`3, 4, 5, 6, 7, 8`，第 6-12 幕维持 `8` 种。
- 第 13 幕排除基础三件套 `chaser` / `crawler` / `runner`，其余 9 种非基础敌人全部进入终幕池。
- 第 1-3 幕使用固定教学 profile；第 4-6 幕开始随机 profile，但优先覆盖本局还未重点出现过的机制标签；第 7-12 幕使用不重复的觉醒 profile shuffle cycle。
- 第 6-12 幕基础怪仍可入池，但入池权重乘 `0.75`、刷怪权重乘 `0.65`；终幕完全排除基础怪。
- 生成系统使用 seed RNG；敌人 AI 内部随机第一阶段不强制迁移。
- 通过 `spawnCost` 同屏预算、单怪 `maxActive`、波次节拍和安全阀控压；第一版不做显式 `forbiddenPairs`、不做单怪 `minWavesBetweenAppearances`。
- 现有正式敌人素材可以被赋予不同 archetype；新增敌人第一版等待正式素材接入，不使用临时图形占位。

`k` 统一表示：

```ts
k = bossKills = act - 1
```

`chaser`、`crawler`、`runner` 组成基础三件套。它们承担前期教学和中期填充角色，第 6 幕后降权，第 13 幕退出现常规池。

## Enemy Index

生成系统必须使用稳定 `EnemyId`；`sheetIndex` 只作为素材适配字段。

| EnemyId | 素材建议 | Tags | Tier | Spawn cost | Base weight | Max active | 定位 |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| `chaser` | `chaser.png` | `baseline` | `1` | `1.0` | `1.4` | 按预算 | 基础横穿追击 |
| `crawler` | `crawler.png` | `low`, `melee` | `1` | `1.0` | `1.2` | `5` | 低矮贴地穿插 |
| `runner` | `runner_approach.png` | `fast` | `1` | `1.2` | `1.1` | `3` | 短前摇冲刺 |
| `duelist` | `duelist.png` | `melee_burst` | `2` | `1.5` | `1.0` | `3` | 近战斩击精英 |
| `caster` | `caster_move.png` | `ranged` | `2` | `1.6` | `0.9` | `2` | 远程幽火施压 |
| `leaper` | `leaper_stalk.png` | `vertical`, `burst` | `2` | `1.6` | `0.85` | `2` | 跳跃落点压力 |
| `glider` | `glider_hover.png` | `vertical`, `aerial` | `2` | `1.7` | `0.8` | `2` | 低空俯冲压力 |
| `splitter` | `splitter_move.png` | `swarm` | `3` | `2.0` | `0.75` | `2` | 分裂清场顺序 |
| `brute` | `brute_advance.png` | `heavy` | `3` | `2.2` | `0.65` | `2` | 持盾重型阻挡 |
| `burrower` | `burrower_move.png` | `ambush` | `3` | `2.2` | `0.65` | `1` | 潜行包抄 |
| `binder` | `binder_move.png` | `control` | `4` | `2.6` | `0.5` | `1` | 地面控场 |
| `warden` | `warden_move.png` | `support` | `4` | `2.8` | `0.45` | `1` | 光环支援核心 |

现有素材改造目标：

| 当前素材 | 视觉特征 | 当前问题 | 目标改造 |
| --- | --- | --- | --- |
| `chaser.png` | 裸身奔跑夜妖 | 已接入基础追踪；目标横穿/重入场规则未实现 | 作为默认 `chaser`，承担横穿追击的基础怪规则 |
| `crawler.png` | 低矮蛛形 | 已接入低伏前扑玩法 | 作为 `crawler`，低血高速，短前摇前扑后有恢复硬直；普攻必须稳定可命中 |
| `runner_approach.png` | 角突夜妖奔跑/挥臂 | 已接入前摇冲刺状态机 | 作为 `runner`，由 enemy director 控制快攻压力和同时冲刺数量 |
| `caster_move.png` | 提灯面具夜妖 | 已接入远程幽火状态机 | 作为 `caster`，由 enemy director 控制生成权重和投射物密度 |
| `duelist.png` | 双刃夜妖 | 已接入近战斩击状态机 | 作为 `duelist`，由 enemy director 控制近身压力和同时威胁数量 |
| `brute_advance.png` | 站立持盾重妖 | 已接入盾牌耐久、盾击、破盾硬直和无盾横扫状态机 | 作为 `brute`，由 enemy director 控制正面阻挡压力和生成预算 |
| `glider_hover.png` | 膜翼巡妖 | 已接入低空悬停/俯冲状态机，当前按 `elapsed >= 70s` 进入随机候选 | 作为 `glider`，目标设计中改为由 `tier 2` 和 `runEnemyOrder` 控制解锁并纳入预算 |
| `binder_move.png` | 符咒长袍夜妖 | 已接入控场咒圈状态机 | 作为 `binder`，目标设计中改为由 `tier 4`、`runEnemyOrder` 和 profile 控制解锁与权重 |
| `burrower_move.png` | 铲爪土潜夜妖 | 已接入潜入、地面轨迹、钻出和恢复状态机，当前按 `elapsed >= 90s` 进入随机候选 | 作为 `burrower`，目标设计中改为由 `tier 3` 和 `runEnemyOrder` 控制解锁并纳入预算 |

新增敌人面向原画师的形象说明见 [../art/enemies/README.md](../art/enemies/README.md)。仍未接入的新增敌人等待正式素材、前摇动画和命中特效准备好后再进入生成池。

## Future Interfaces

推荐配置形态：

```ts
type EnemyId =
  | "chaser"
  | "crawler"
  | "runner"
  | "caster"
  | "duelist"
  | "brute"
  | "glider"
  | "leaper"
  | "splitter"
  | "burrower"
  | "binder"
  | "warden";

type EnemyTag =
  | "baseline"
  | "low"
  | "melee"
  | "fast"
  | "melee_burst"
  | "ranged"
  | "vertical"
  | "burst"
  | "aerial"
  | "heavy"
  | "swarm"
  | "ambush"
  | "control"
  | "support";

type EnemyArchetypeConfig = {
  id: EnemyId;
  displayName: string;
  sheetId: string;
  tags: EnemyTag[];
  complexityTier: 1 | 2 | 3 | 4;
  spawnCost: number;
  baseWeight: number;
  maxActive: number | "budget";
  scoreValue: number;
  skillEnergyGain: number;
  ultimateEnergyGain: number;
};
```

`EnemyState` 建议扩展：

```ts
id: EnemyId;
sheetIndex: number; // material adapter only
spawnSource: "regular" | "boss" | "debug";
aiState: "spawn" | "move" | "windup" | "attack" | "recover" | "dead";
aiTimer: number;
targetX?: number;
targetY?: number;
attackCd?: number;
```

特色行为可额外增加：

```ts
hasSplit?: boolean;
auraRadius?: number;
projectilesActive?: number;
```

Enemy director 运行时状态进入 `GameState`：

```ts
type EnemyDirectorState = {
  runSeed: number;
  act: number;
  elapsedInAct: number;
  runEnemyOrder: EnemyId[];
  unlockedEnemyIds: EnemyId[];
  currentProfile: EnemyProfileId;
  currentPool: EnemyPoolEntry[];
  featuredTags: EnemyTag[];
  recentEnemyIds: EnemyId[];
  wavesCleared: number;
  bossPrelude: null | {
    elapsed: number;
  };
  wave: null | {
    phase: "prepare" | "spawning" | "breather";
    timer: number;
    entries: WaveEntryRuntime[];
    nextEntryIndex: number;
    activeBudget: number;
  };
};
```

核心逻辑先做纯函数，再接运行时：

```ts
buildRunEnemyOrder(seed, enemyDefs)
unlockedEnemiesForAct(order, act)
selectActProfile(act, seed, featuredTags)
buildCurrentEnemyPool(act, order, profile, recentEnemies)
pickWavePlan(pool, budget, profile, rng)
```

运行时只把 `WavePlan` 转换为按 delay 的 `spawnEnemyById(enemyId, spawnPattern, source)`。

## Key Formulas

基础成长：

```ts
enemyHp = round((baseHp + k * hpPerBossKill) * threatScalar)
enemyDamage = min(damageCap, baseDamage + k * damagePerBossKill)
enemySpeed = baseSpeed + k * speedPerBossKill + random(0, randomSpeed)
```

生成节奏：

```ts
maxActiveSpawnCost =
  actBaseBudget[act]
  + Math.min(2, Math.floor(elapsedInAct / 45))

activeSpawnCost = sum(activeRegularEnemies.map(enemy.spawnCost))
waveBudget = maxActiveSpawnCost * waveBudgetRatio
```

`actBaseBudget` 初值：

| 幕 | Max active spawn cost |
| ---: | ---: |
| 1 | `6` |
| 2 | `7` |
| 3 | `8` |
| 4 | `9` |
| 5 | `10` |
| 6 | `11` |
| 7-9 | `12` |
| 10-12 | `13` |
| 13 | `11` |

`waveBudgetRatio` 初值：

| 波次类型 | Ratio |
| --- | ---: |
| light / breather | `0.45` |
| normal | `0.65` |
| hard | `0.85` |

用 `spawnCost` 替代单纯数量上限。这样 `brute`、`caster`、`binder`、`warden` 可以占更高预算，避免后期同时刷出过多高压单位。`waveBudget` 和 `maxActiveSpawnCost` 分离：前者控制本波计划投放量，后者控制场上压力上限。

## Numeric Baseline

表格是目标基准，实际实现时需要用试玩数据微调。HP 会进入 `threatScalar` 计算；伤害必须保留上限，避免长时间局内成长把普通敌人接触伤害推到不可解。

| Archetype | HP | 伤害 | 速度 | 预算 | 击杀分 | 技能能量 | 大招能量 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `chaser` | `16 + k*2.0` | `3 + k*0.35`，cap `12` | `2.20 + k*0.12 + rand(0.25)` | `1` | `10` | `10` | `2.7` |
| `crawler` | `10 + k*1.4` | `3 + k*0.25`，cap `10` | `1.05 + k*0.06 + rand(0.95)` | `1` | `9` | `8` | `2.0` |
| `runner` | `12 + k*1.5` | `3 + k*0.35`，cap `12` | `1.25 + k*0.08 + rand(0.85)` | `1.2` | `11` | `9` | `2.4` |
| `duelist` | `22 + k*2.6` | `5 + k*0.55`，cap `16` | `0.84 + k*0.05 + rand(0.72)` | `1.5` | `14` | `12` | `3.2` |
| `leaper` | `18 + k*2.2` | `5 + k*0.45`，cap `15` | `0.72 + k*0.04 + rand(0.50)` | `1.6` | `15` | `12` | `3.2` |
| `brute` | `38 + k*5.5` | `8 + k*0.80`，cap `20` | `0.42 + k*0.03 + rand(0.45)` | `2.2` | `22` | `16` | `4.5` |
| `caster` | `20 + k*2.2` | `4 + k*0.45`，cap `14` | `0.48 + k*0.03 + rand(0.42)` | `1.6` | `18` | `14` | `4.0` |
| `glider` | `16 + k*1.9` | `4 + k*0.40`，cap `13` | `0.92 + k*0.05 + rand(0.45)` | `1.7` | `16` | `12` | `3.4` |
| `burrower` | `16 + k*2.0` | `6 + k*0.50`，cap `16` | `0.58 + k*0.04 + rand(0.45)` | `2.2` | `16` | `12` | `3.4` |
| `splitter` | `28 + k*3.2` | `4 + k*0.35`，cap `13` | `0.62 + k*0.04 + rand(0.50)` | `2` | `16` | `12` | `3.0` |
| `binder` | `18 + k*2.0` | `3 + k*0.25`，cap `10` | `0.42 + k*0.02 + rand(0.35)` | `2.6` | `18` | `14` | `4.0` |
| `warden` | `26 + k*3.0` | `2 + k*0.20`，cap `8` | `0.38 + k*0.02 + rand(0.30)` | `2.8` | `24` | `18` | `5.0` |

`splitter` 分裂体建议使用独立 `splitling` 配置：`6 + k*0.8` HP、`2 + k*0.2` 伤害、预算 `0.5`。分裂体不再继续分裂，奖励只给少量能量或不给分数，避免刷分。

## Act Enemy Pools

每局用 seed 生成一条 `runEnemyOrder`，幕内只按数量切片，不按幕写死具体敌人名单。

```ts
unlockedEnemyIds = runEnemyOrder.slice(0, unlockedEnemyCountByAct[act])
```

解锁数量和常规池种类数量：

| 幕 | 解锁数量 | 常规池种类数 | Profile 规则 |
| ---: | ---: | ---: | --- |
| 1 | `3` | `3` | 固定 `basic_intro` |
| 2 | `5` | `4` | 固定 `technique_intro` |
| 3 | `7` | `5` | 固定 `vertical_intro` |
| 4 | `9` | `6` | 从第 4-6 幕候选 profile 随机，优先补未出现机制 |
| 5 | `11` | `7` | 从第 4-6 幕候选 profile 随机，优先补未出现机制 |
| 6 | `12` | `8` | 从第 4-6 幕候选 profile 随机，优先补未出现机制 |
| 7-12 | `12` | `8` | 觉醒 profile shuffle cycle，每幕不重复 |
| 13 | `12` | `9` | 排除 `tier 1` 基础怪，其余非基础怪全进 |

`runEnemyOrder` 约束：

- 前 3 位必须覆盖 `baseline`、`low`、`fast` 三个压力槽。
- 第 1 幕只允许 `tier 1`。
- 第 2-3 幕最多解锁到 `tier 2`。
- 第 4-5 幕最多解锁到 `tier 3`。
- 第 6 幕解锁到 `tier 4`，并完成全部 12 种敌人解锁。
- 规则控制的是标签和复杂度，不是具体 EnemyId；当前素材下第 1 幕自然会落到 `chaser`、`crawler`、`runner`。

基础怪降权：

```ts
if (act >= 6 && act <= 12) {
  tier1SelectionWeight *= 0.75;
  tier1SpawnWeight *= 0.65;
}

if (act === 13) {
  excludeTier1();
}
```

## Profiles

第 1-3 幕固定教学 profile：

| Profile | Required tags | Preferred tags | 用途 |
| --- | --- | --- | --- |
| `basic_intro` | `baseline`, `low`, `fast` | 无 | 教横穿、低位和冲刺 |
| `technique_intro` | `melee_burst`, `ranged` | `baseline`, `fast` | 教近战前摇和远程骚扰 |
| `vertical_intro` | `vertical` | `ranged`, `melee_burst`, `fast` | 教纵向和落点处理 |

第 4-6 幕随机候选 profile：

| Profile | Required tags | Preferred tags | 用途 |
| --- | --- | --- | --- |
| `heavy_wall` | `heavy` | `baseline`, `melee_burst`, `ranged` | 正面阻挡和破盾目标优先级 |
| `ambush_swarm` | `ambush`, `swarm` | `fast`, `vertical` | 包抄与清场顺序 |
| `control_support` | `control`, `support` | `baseline`, `ranged` | 控场和后排优先级 |
| `mixed_pressure` | 无 | `fast`, `vertical`, `melee_burst`, `ranged` | 混合压力补位 |

第 4-6 幕 profile 选择优先覆盖 `featuredTags` 里尚未重点出现过的机制，并避免连续重复上一幕 profile。

第 7-12 幕觉醒 profile 候选：

| Profile | Required tags | Preferred tags |
| --- | --- | --- |
| `fast_mix` | `fast` | `baseline`, `melee_burst`, `ambush` |
| `vertical_pressure` | `vertical` | `ranged`, `fast` |
| `heavy_wall` | `heavy` | `support`, `melee_burst` |
| `ambush_swarm` | `ambush`, `swarm` | `fast`, `vertical` |
| `control_support` | `control`, `support` | `ranged`, `heavy` |
| `chaos_mixed` | 无 | `vertical`, `ambush`, `ranged`, `heavy`, `control` |

第 7-12 幕每局 shuffle 一次上述 6 个 profile，不重复使用。第 13 幕不再随机 profile，而是固定使用非基础 9 种敌人并套用终幕权重修正：

| EnemyId | Final weight multiplier |
| --- | ---: |
| `duelist` | `1.1` |
| `caster` | `1.0` |
| `leaper` | `1.0` |
| `glider` | `1.0` |
| `splitter` | `0.9` |
| `brute` | `0.85` |
| `burrower` | `0.85` |
| `binder` | `0.65` |
| `warden` | `0.6` |

同屏限制建议：

| Archetype | 常规 active cap | 额外限制 |
| --- | ---: | --- |
| `chaser` | 按预算 | 同侧重入场时间错开 |
| `crawler` | `5` | 第 1 幕建议最多 `3`；同时前扑最多 `2` |
| `runner` | `3` | 同时冲刺中的 `runner` 最多 `2` |
| `duelist` | `3` | 斩击前摇不要完全同步 |
| `leaper` | `2` | 同一时刻只能有 `1` 个锁定落点 |
| `brute` | `2` | 首次进入当前池时最多 `1` |
| `caster` | `2` | 每个 `caster` 投射物最多 `2` 个 |
| `glider` | `2` | 同时俯冲最多 `1` 个 |
| `burrower` | `1` | 同时潜行最多 `1` 个，钻出点不能重叠玩家中心 |
| `splitter` | `2` | 分裂体总数进入预算，分裂体不能继续分裂 |
| `binder` | `1` | 束缚区域同时最多 `1` 个主区域 |
| `warden` | `1` | 光环不影响 Boss，同场最多 `1` 个 |

## Wave Director

常规刷怪不再用单个计时器均匀滴灌，而是用轻量波次节拍：

```ts
prepare -> spawning -> breather
```

一波由有战术顺序的 `WaveEntry` 组成：

```ts
type WaveEntry = {
  enemyId: EnemyId;
  role: "opener" | "pressure" | "support" | "reinforce";
  count: number;
  spawnPattern: SpawnPattern;
  delayAfterPrevious: number;
};
```

规则：

- `opener` 先给玩家读波次入口，通常使用基础或低复杂压力。
- `pressure` 投放当前 profile 的核心压力。
- `support` 延迟投放 `caster` / `binder` / `warden` 等后排或控场单位。
- `reinforce` 用低复杂单位补足节奏。
- `delayAfterPrevious` 从前一个 entry 成功生成后开始计时；如果当前 entry 因预算不足延迟，后续 entry 不会提前排队。
- `count > 1` 默认只给低复杂敌人；高复杂敌人默认 `count = 1`。`splitter` 可在 `swarm` 语境下作为例外。
- 如果 `activeSpawnCost + entry.spawnCost > maxActiveSpawnCost`，entry 持续延迟，不跳过。只有 Boss 最长时间兜底可以取消剩余常规 entry。
- 当前波所有 entry 成功投放完并进入 `breather` 时，`wavesCleared += 1`；不要求波内敌人全灭。
- 玩家清怪很快时，可以在最短 `1.2s` 喘息后提前进入下一波；否则按波次压力给 `2.0-4.5s` 喘息，并可按剩余场上压力延长。

安全阀第一版只降压，不做完整动态难度：

1. 玩家血量低或近期受伤高时，下一波优先替换高复杂 role。
2. 其次延长 breather。
3. 最后才降低下一波预算 `15-25%`。
4. 不删除当前场上普通敌人。

最近出现敌人只降权不禁用：

```ts
if (enemy appeared in recent 2-3 waves) weight *= 0.55;
if (enemy appeared in previous wave && !required) weight *= 0.35;
```

## Spawn Patterns

所有敌人初始 spawn 必须在屏幕外，避免屏内突然出现。屏内出现只能来自敌人自身状态机，例如 `burrower` 潜行后钻出。

```ts
type SpawnLane = "ground" | "air";
type SpawnPattern =
  | "left"
  | "right"
  | "random_edge"
  | "opposite_pair"
  | "same_edge_cluster"
  | "pincer";
```

规则：

- 地面敌人使用 `ground` 屏外 lane。
- `glider` 使用 `air` 屏外 lane。
- `caster`、`binder`、`warden` 仍从屏外进入，随后由自身 AI 找后排位置。
- 第一版怪物生成不读取平台布局；平台相关公平性后续作为安全阀扩展。
- Debug 模式下自动 enemy director 关闭，手动 spawn 不受 director 限制。
- 暂停、升级选择、Boss 装备选择期间，enemy director 计时暂停。

## Boss Gate And Summons

Boss 出现由“完成若干常规波 + 最短时间”触发，并有最长时间兜底：

| 幕段 | Min waves | Min elapsed in act | Max elapsed in act |
| --- | ---: | ---: | ---: |
| 1 | `3` | `45s` | `75s` |
| 2-3 | `4` | `55s` | `90s` |
| 4-6 | `5` | `65s` | `105s` |
| 7-12 | `5` | `75s` | `120s` |
| 13 | `3` | `45s` | `75s` |

Boss 条件满足后进入 prelude：不再开新常规波，但保留场上普通残敌。等待时间随幕数线性递减：

```ts
function bossPreludeWaitSeconds(act: number) {
  const clampedAct = Math.max(1, Math.min(13, act));
  return Math.max(0, 3 * (13 - clampedAct) / 12);
}
```

Boss 前降压目标使用普通敌人的 active spawn cost：

```ts
function bossPreludeTargetCost(act: number) {
  return Math.max(2, 5 - act * 0.25);
}
```

Boss 出现时：

- 清掉剩余常规 wave plan。
- 保留 `spawnSource: "regular"` 的场上敌人。
- 暂停常规 enemy director。
- Boss 战只允许 Boss 自己的召唤逻辑刷怪。

Boss 召唤池从当前幕池派生，但独立收窄和限压：

```ts
bossSummonPool = deriveBossSummonPool({
  act,
  bossId,
  currentEnemyPool,
  bossPhase,
});
```

Boss 召唤使用独立预算，并给召唤物标记：

```ts
spawnSource: "boss"
```

建议初值：

| Boss 阶段 | 召唤预算 |
| --- | ---: |
| 阶段 1 | `0-1` 小怪 |
| 阶段 2 | `2-3` cost |
| 阶段 3 | `3-4` cost |
| 蚀醒阶段 4 | `4-5` cost |
| 终幕万相血月 | 在场 Boss 召唤物最多 `4` |

Boss 死亡时清理 `spawnSource: "boss"` 的召唤怪，保留普通残敌。

## Behavior Design

逐敌人的状态机、反制窗口和可读性约束见 [enemy-behavior-design.md](enemy-behavior-design.md)。

## Skill Counter Matrix

| 玩家手段 | 擅长处理 | 不擅长处理 |
| --- | --- | --- |
| 普通攻击 | `chaser`、落单 `crawler`、钻出后的 `burrower`、恢复中的 `glider` | 多个 `runner`、远处 `caster` / `binder`、被前排保护的 `warden` |
| 下落攻击 | `crawler`、聚团敌人、`brute`、`splitter` 分裂体、落地后的 `leaper` | 分散远程单位、悬停或俯冲前的 `glider` |
| 潮龙·破阵 | `runner`、`caster`、`binder`、`warden`、直线清场 | 身后敌人、贴脸包围、已潜行的 `burrower` |
| 弦月·潮刃 | `duelist`、`brute`、`splitter`、混怪 | 极远距离目标、空中 `glider`、已潜行的 `burrower` |
| 镜潮·护返 | `runner`、`duelist`、投射物压力、`burrower` 钻出 | 高血单位的主动击杀、后排 `warden` |
| 大招 | 危机清场、重型单位、`warden` 光环波次、分裂波次 | 常规小波次不应强迫使用 |

## Code Sources

目标落地点：

- `src/constants/assets.ts`
- `src/constants/combat.ts`
- `src/constants/runtime.ts`
- `src/types/game-state.ts`
- `src/entities/enemy.ts`
- `src/systems/enemyDirector.ts`
- `src/entities/projectile.ts`
- `src/game/runtime.ts`

## Implementation Notes

- 本文档只定义目标设计；当前已实现敌人数值见 [enemies.md](enemies.md)。
- 第一阶段已建立 `sheetIndex -> archetype` 映射；后续需要把它升级为显式 `EnemyId -> ENEMY_ARCHETYPES`，`sheetIndex` 只作为素材适配字段。
- 先实现纯函数 enemy director：`buildRunEnemyOrder`、`unlockedEnemiesForAct`、`selectActProfile`、`buildCurrentEnemyPool`、`pickWavePlan`。
- 第一幕常规池必须覆盖 `baseline`、`low`、`fast` 三个压力槽；当前素材下对应 `chaser`、`crawler`、`runner`。
- 第 1-6 幕解锁数量为 `3,5,7,9,11,12`；常规池种类数为 `3,4,5,6,7,8`；第 7-12 幕保持 8 种。
- 第 13 幕排除基础三件套，非基础 9 种敌人全部进入终幕池。
- 常规刷怪使用 `WavePlan`，不要继续用单个计时器等间隔刷 1 只怪。
- Boss 出现时暂停常规 wave，保留普通残敌；Boss 死亡只清 `spawnSource: "boss"` 的召唤怪。
- `caster` 的远程行为已接入；后续重点是接入 enemy director 权重、投射物密度和 active cap。
- 击杀奖励应从 archetype 读取，不再由所有敌人共享同一套固定奖励。
- `brute`、`caster`、`glider`、`burrower`、`splitter`、`binder`、`warden` 需要 active cap 或 spawn budget，避免组合不可解。
- `leaper`、`glider`、`burrower`、`binder` 必须有清晰落点、俯冲线、钻出点或区域预警。
- `splitter` 的分裂体不能继续分裂，也不能给完整击杀奖励。
- `warden` 光环不影响 Boss，且同场最多一个。
- 所有新增行为先以前摇、攻击、恢复三个阶段描述清楚，再写代码。

## Consistency Checklist

- 12 种敌人必须同时出现在索引、数值表、生成池、行为设计和反制矩阵中。
- `runEnemyOrder` 前 3 位必须覆盖 `baseline`、`low`、`fast`。
- 第 1-6 幕解锁数量必须为 `3,5,7,9,11,12`，第 6 幕解锁全部 12 种敌人。
- 第 1-12 幕常规池种类数不得超过 8；第 13 幕必须排除 `chaser`、`crawler`、`runner`，并纳入其他 9 种。
- 第 1-3 幕 profile 固定；第 4-6 幕随机 profile 必须优先补未出现机制；第 7-12 幕必须使用不重复 awakened profile cycle。
- 第 6-12 幕基础怪必须降权；第 13 幕基础怪必须退池。
- 高复杂敌人必须有 active cap，不允许多个控场、潜行、分裂、支援机制同屏无上限叠加。
