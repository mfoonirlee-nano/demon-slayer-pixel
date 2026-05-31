# 落地顺序

> 实现状态：目标设计，未实现。本文用于安排后续代码落地和验收。

## Purpose

给出数值系统后续代码落地顺序和验证点。

## Target Design

按依赖从低到高落地：先统一进度状态和 Boss 死亡入口，再接入敌人、Boss、成长、装备和阶段调优。敌人池需要支持第 5 幕、第 6 幕+ 的轮换，因此敌人系统读取的 `act` 不应把内容解锁硬截断在第 4 幕。

## Key Formulas

后续实现统一复用这些核心公式：

```ts
act = bossKills + 1
threatScalar = 1 + bossKills * 0.28 + Math.min(elapsed / 240, 1.5) * 0.12
enemySpawnInterval = clamp(1.15 - bossKills * 0.08 - elapsed * 0.0015, 0.42, 1.15)
enemySpawnBudget = Math.min(10 + bossKills * 2, 24)
bossHp = baseHp + bossKills * hpPerCycle + elapsed * 0.35
attackBonusCap = 24 + bossKills * 8 + equipmentCapBonus
```

## Code Sources

目标落地点：

- `src/types/game-state.ts`
- `src/state.ts`
- `src/runtime.ts`
- `src/entities/player.ts`
- `src/entities/enemy.ts`
- `src/entities/boss.ts`
- `src/entities/platform.ts`
- `src/entities/projectile.ts`
- `src/App.tsx`

## Implementation Notes

### 1. 进度和配置骨架

- 增加 `bossKills` 状态。
- 增加 `getAct()`、`getThreatScalar()`、`getBossRespawnDelay()`。
- 新增 `ACT_CONFIGS`，先让平台、敌人和 Boss 读取当前幕。
- 新增 `defeatBoss()`，替换所有 Boss 死亡分支。

验证点：

- 所有 Boss 死亡路径只增加一次 `bossKills`。
- Boss 重生间隔按击杀数变化。
- 第 5 幕和第 6 幕+ 仍能通过 `bossKills` 继续派生，不被 `Math.min(4, ...)` 截断。
- 首轮没有新增素材依赖也能正常运行。

### 2. 敌人注册表与每幕生成池

- 新增 `ENEMY_ARCHETYPES`。
- 新增 `ACT_ENEMY_POOLS`，显式配置每幕常规池和轮换池。
- `spawnEnemy()` 改为按当前幕选择 archetype。
- `EnemyState` 增加 `archetypeId`、`aiState`、`aiTimer`、`targetX`、`targetY`、`attackCd`。
- 现有运行时已通过 `sheetIndex -> archetype` 映射接入 `chaser`、`crawler`、`runner`、`duelist`、`brute`、`caster`、`binder`；后续需要整理为显式配置表。
- 新增素材未接入前只准备配置和无渲染验证，不进入实际生成池。
- 为 `caster` 增加最小远程攻击能力，复用现有 projectile 逻辑。
- 用 `enemySpawnBudget` 和 active cap 替代单纯 `enemyMaxCount`。

验证点：

- 第 1 幕只出现 `chaser`、`crawler`、`runner` 三种常规敌人。
- 第 2 幕新增 `duelist`、`leaper`，常规池为 `5` 种。
- 第 3 幕新增 `brute`、`caster`，常规池为 `7` 种。
- 第 4 幕新增 `glider`，常规池为 `8` 种。
- 第 5 幕新增 `burrower`、`splitter`，同时让低阶敌人轮换退池，常规池仍约 `8` 种。
- 第 6 幕+ 新增 `binder`、`warden`，后期常规池仍约 `8` 种。

### 3. 敌人 AI 分批落地

按复杂度分批实现，避免一次性接入所有机制：

1. `chaser`、`crawler`、`runner`
2. `duelist`、`leaper`
3. `brute`、`caster`
4. `glider`
5. `burrower`、`splitter`
6. `binder`、`warden`

验证点：

- 每个敌人都有 `windup`、`attack`、`recover` 或等价的可读状态。
- 高复杂敌人使用 active cap，不会同屏机制过载。
- `chaser` 后续幕数只提升生命、攻击和速度，不增加额外技能。

### 4. Boss 注册表

- 新增 `BOSS_ARCHETYPES`。
- `spawnBoss()` 按当前幕和轮次选择 Boss archetype。
- Boss 血量、接触伤害、AI 冷却、召唤池读取配置。
- 当前 Boss 作为第一个 archetype，后续新增 Boss 直接加配置。

验证点：

- 当前 Boss 首轮体验基本保持。
- 召唤池能按阶段读到正确敌人类型，且不会绕过敌人的 active cap。
- 新 Boss 没有正式素材时不会进入池。

### 5. 经验和装备

- 接入 XP 和升级三选一。
- 升级奖励接入大招强化等级 `ultimateLevel`，局内上限 `3`，死亡或重开清空。
- Boss 击杀后接入装备三选一。
- 派生攻击、动态攻击上限、技能消耗、资源获取统一走 helper。

验证点：

- 经验升级和 Boss 装备选择不会同时覆盖彼此状态。
- 替换装备后生命和攻击边界被正确夹取。
- 重开后局内成长全部清空。

### 6. 技能注册表

- 将当前 `SKILLS` 和技能特效配置逐步合并到 `SKILL_DEFS`。
- 技能释放、HUD、伤害公式改为读取技能定义。
- 当前三招作为默认解锁技能。
- 后续新增技能资源只新增配置和资源元数据。

验证点：

- 当前三招伤害和表现不回退。
- 未解锁技能不会出现在 HUD 或升级候选里。

### 7. 阶段调优

- 调整每幕平台权重、敌人权重、Boss 轮换和奖励倍率。
- 每次大调参后同步更新相关主题文档，并在正文标注实现状态。

验证点：

- 第 1 幕不会在 30 秒内被满屏敌人压死。
- 第 2 幕能明显感到速度压力。
- 第 3 幕能明显感到高血和远程压力。
- 第 4 幕后组合持续变化，而不是只重复同一个 Boss 加血。
- 第 5 幕和第 6 幕+ 的新增敌人通过轮换进入，不让 12 种普通敌人同时常规刷怪。
