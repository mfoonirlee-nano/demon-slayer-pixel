# 地图生成算法文档

> 对应代码：`src/entities/platform.ts`、`src/constants/platform.ts`、`src/constants/assets.ts`、`src/game/runtime.ts`

## 概览

地图仍然是无限横向卷轴，但生成入口已经从“普通平台 / 链式平台二选一”改为“片段 Pattern 生成”。每次触发会选择一个带玩法意图的片段，再生成 1 到 3 个平台。当前实现的地图生成器不投放奖励物；残灵由玩家击杀敌人后独立掉落。每幕高台秘藏使用独立预算和控制器，地图侧只提供承载平台和专用路线，见 [numeric-system/high-platform-treasure.md](numeric-system/high-platform-treasure.md)。

核心目标：

- 保持随机性，但避免连续重复和不可达跳跃。
- 用片段制造节奏：喘息、上升、下降、折返、悬浮平台与高风险支路。
- 难度随时间增加，同时用张力值防止高压片段连续出现。
- 平台视觉由通用图集 `assets/sprites/platform/platform.png` 与当前幕的 Boss 主题图集共同提供，逻辑宽度会贴近所选 sprite 的实际宽度。

## 触发机制

每帧递减 `platformSpawnTimer`，归零后调用：

```ts
spawnNextMapSegment();
state.platformSpawnTimer = nextMapSpawnInterval();
```

生成间隔由游戏时间动态调整：

```ts
difficulty = clamp(elapsed / 120, 0, 1)
base = lerp(2.4, 1.45, difficulty)
variance = lerp(1.2, 0.55, difficulty)
interval = base + random * variance
```

Boss 存在时会额外增加 `0.25s`，避免 Boss 战和极端地形同时过载。

## 生成器状态

生成器维护以下状态：

- `lastLayer`：上一个片段出口所在层级。
- `sameLayerStreak`：连续停留在同一层的次数，用于强制拉开高度变化。
- `tension`：近期片段压力值。
- `lowLayerDrought`：连续没有生成第一层平台的片段数，达到阈值后会强制生成逐级回落到底层的片段。
- `recentKinds`：最近出现过的片段类型，用于降低重复概率。

游戏重开时由 `resetMapGenerator()` 重置。

## 层级定义

平台层级按角色能力推导，而不是按屏幕底部窄区间随意切分。角色身高为 `90px`，跳跃最大高度约 `131px`，所以相邻层级的高度差控制在约 `95-115px`：

| 层级 | Y 范围 | 相对地面高度 |
| ---- | ---- | ---- |
| `low` | 366-367 | 93-94px |
| `mid` | 274-275 | 185-186px |
| `high` | 182-183 | 277-278px |
| `top` | 90-91 | 369-370px |

生成器只在相邻层之间跳转：`low <-> mid <-> high <-> top`。上升片段、下降片段、链式片段都会先选目标层，再在该层范围内随机 Y，避免平台落在层级缝隙里。

为了避免上层路线长期缺少入口，连续多个片段没有 `low` 层平台时，生成器会插入一个从当前层逐级回落到 `low` 的恢复片段。普通层级转移也更偏向保留或返回第一层，让玩家能重新接上上升路线。

## 片段类型

当前实现的片段：

| 类型 | 作用 |
| ---- | ---- |
| `breather` | 宽平台，低到中风险，用于恢复节奏 |
| `safeBridge` | 单个平台，保留旧普通平台的基础体验 |
| `stairUp` | 2 到 3 个平台逐步上升 |
| `stairDown` | 2 到 3 个平台逐步下降 |
| `zigzag` | 3 个平台上下折返 |
| `gapJump` | 旧链式平台的升级版，按相邻层上下交替 |
| `hoverPair` | 两个错相位悬浮平台 |
| `riskFork` | 安全主路加一个高风险支路平台 |

当前代码没有地面柱子片段，旧文档里的 `groundHazard` 已移除。

片段选择由权重决定。随着 `difficulty` 增加，`zigzag`、`gapJump`、`hoverPair`、`riskFork` 权重上升。`tension` 过高时，`breather` 和 `safeBridge` 权重上升，高风险片段权重下降。最近出现过的片段权重会衰减到 `45%`，避免短时间连续重复。连续同层时，下一次层级选择会显著降低当前层权重，避免平台长期堆在同一个高度带。

## 可达性约束

片段内部生成小平台时会检查跳跃可达性：

- 最大上升高度：`118px`
- 最大下降高度：`172px`
- 基础最大水平间距：`126px`
- 高上升跳会收紧到 `88px`
- 中等上升跳会收紧到 `108px`
- 窄平台和悬浮平台会进一步降低最大间距

这不是完整物理模拟，但能避免随机生成明显不公平的组合。

## 与奖励系统的当前边界

地图生成器只负责路线节奏、可达性和平台风险，不再维护奖励预算或生成攻击/生命奖励物。`riskFork` 的高风险支路是可选的移动挑战，不保证或提高奖励。

残灵掉落、拾取和储存由 `src/entities/residualSpirit.ts`、`src/entities/enemies/defeat.ts` 和 `src/systems/residualSpirit.ts` 负责。它们不参与片段选择，不会反向改写平台权重。

## 高台秘藏地图边界

高台秘藏不会恢复“每个平台独立掷奖励概率”的旧路径。地图侧边界是：

- 宝藏控制器按每幕预算决定何时需要奖励路线。
- `spawnNextMapSegment()` 和显式片段入口返回本次生成结果，供宝藏控制器检查新平台。
- 地图生成器只返回或生成满足可达性、层级、宽度和静止约束的承载平台。
- 普通片段只从 `stairUp`、`zigzag` 或 `gapJump` 的高点选择宿主；普通 `riskFork` 不直接附着宝藏。
- 常规等待超限时，`spawnTreasureRouteSegment()` 生成一次带显式 `treasureHost` 标记的受约束路线：安全主路加 `high / top` 的静止宽平台奖励支路。
- 专用路线按既有跳跃约束选择每一级间距，并将整组平台避让已有平台，避免避让过程把内部跳距拉长到不可达。
- 奖励宿主宽度至少为 `120px`，生成后会标记为宝藏保留平台，不参与普通敌人的平台出生选择。
- 宝藏类别、动态数值、玩家状态权重、保底和三选一均不属于地图模块。

完整状态机、动态公式和验收口径见 [高台秘藏](numeric-system/high-platform-treasure.md)。

## 仍可调的参数

主要调参集中在 `MAP_GENERATION_CONFIG`：

- `difficultyRampSeconds`
- `spawnInterval`
- `tension`
- `reachability`
- `segment`
- `themedSpriteChance`

平台尺寸、层级、悬浮与视觉参数保留在同一个常量文件中。通用平台贴图区域和候选池由 `PLATFORM_SPRITES` 维护，13 幕主题图集由 `ACT_PLATFORM_SPRITES` 维护；每幕图集各提供 `chain`、`normal`、`wide` 一个切片。

## 平台绘制

平台逻辑仍保留 `x/y/w/h/vx/baseY/kind` 等碰撞字段。生成时根据 `enemyDirector.act` 取得当前幕主题池：`40%` 从主题池选图，`60%` 保留通用池；`spriteAct` 会把所选图集身份保存在平台状态上，绘制时再与 `spriteIndex` 一起解析实际区域。已经生成的平台不会在推进下一幕时突然换皮。

主题池以逐幕 Boss 地标为视觉母题：第 1-6 幕使用蛛丝、枯骨、碎镜、尖牙、灯烬和裂铃；第 7-12 幕沿用同 Boss 材质语法并强化血色、密度或关键物件；第 13 幕使用统一的黑红血月祭坛语法。每张主题图集都提供：

- `chain`：较窄的踏脚石平台，主要用于连续跳跃和高风险支路。
- `normal`：常规平台。
- `wide`：宽平台，主要用于喘息片段。

悬浮平台会在逻辑 `y` 上叠加正弦位移，并在绘制时加一条弱蓝色顶部光带。残灵使用独立的透明拾取物素材和程序化浮动/光晕，跟随敌人死亡位置生成，不绑定平台 sprite 或绘制参数。

平台按玩家落台状态动态分层：普通平台先于玩家绘制；`player.onPlatform` 指向的当前承载平台改在玩家之后完整绘制。玩家起跳或走出边缘后，该平台随 `onPlatform` 清空恢复到玩家下层；失效平台不再绘制。
