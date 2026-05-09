# 地图生成算法文档

> 对应代码：`src/entities/platform.ts`、`src/constants/platform.ts`、`src/runtime.ts`

## 概览

地图仍然是无限横向卷轴，但生成入口已经从“普通平台 / 链式平台二选一”改为“片段 Pattern 生成”。每次触发会选择一个带玩法意图的片段，再生成 1 到 3 个平台以及可选的柱子、宝箱、水晶。

核心目标：

- 保持随机性，但避免连续重复和不可达跳跃。
- 用片段制造节奏：喘息、上升、下降、折返、冒险奖励、地面障碍。
- 难度随时间增加，同时用张力值防止高压片段连续出现。

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
- `rewardDebt`：奖励预算。
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
| `rewardRisk` | 安全主路加一个高风险奖励平台 |
| `groundHazard` | 普通平台加地面柱子 |

片段选择由权重决定。随着 `difficulty` 增加，`zigzag`、`gapJump`、`hoverPair`、`rewardRisk`、`groundHazard` 权重上升。`tension` 过高时，`breather` 和 `safeBridge` 权重上升，高风险片段权重下降。连续同层时，下一次层级选择会显著降低当前层权重，避免平台长期堆在同一个高度带。

## 可达性约束

片段内部生成小平台时会检查跳跃可达性：

- 最大上升高度：`118px`
- 最大下降高度：`172px`
- 基础最大水平间距：`126px`
- 高上升跳会收紧到 `88px`
- 中等上升跳会收紧到 `108px`
- 窄平台和悬浮平台会进一步降低最大间距

这不是完整物理模拟，但能避免随机生成明显不公平的组合。

## 奖励逻辑

旧逻辑是全局宝箱倒计时。新逻辑改为 `rewardDebt`：

- 每个片段增加奖励预算。
- 高风险奖励片段额外增加预算。
- 达到宝箱阈值时生成宝箱并清空预算。
- 未达到宝箱阈值时，根据预算和平台风险生成水晶。

高层、窄平台、悬浮平台更容易承载奖励，让奖励变成路线选择，而不是纯掉落。

## 仍可调的参数

主要调参集中在 `MAP_GENERATION_CONFIG`：

- `difficultyRampSeconds`
- `spawnInterval`
- `tension`
- `reward`
- `reachability`
- `segment`

旧平台尺寸、层级、悬浮、柱子、道具视觉参数仍保留在同一个常量文件中。
