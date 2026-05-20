# 未来落地顺序

## Purpose

给出数值系统后续代码落地顺序和验证点。该文档是目标设计，不表示当前已实现。

## Target Design

按依赖从低到高落地：先统一进度状态和 Boss 死亡入口，再接入敌人、Boss、成长、装备和阶段调优。

## Key Formulas

后续实现统一复用这些核心公式：

```ts
act = Math.min(4, bossKills + 1)
threatScalar = 1 + bossKills * 0.28 + Math.min(elapsed / 240, 1.5) * 0.12
enemySpawnInterval = clamp(1.15 - bossKills * 0.08 - elapsed * 0.0015, 0.42, 1.15)
enemyMaxCount = Math.min(10 + bossKills * 2, 24)
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
- 新增 `ACT_CONFIGS`，先让平台和敌人读取当前幕。
- 新增 `defeatBoss()`，替换所有 Boss 死亡分支。

验证点：

- 所有 Boss 死亡路径只增加一次 `bossKills`。
- Boss 重生间隔按击杀数变化。
- 首轮没有新增素材依赖也能正常运行。

### 2. 敌人注册表

- 新增 `ENEMY_ARCHETYPES`。
- `spawnEnemy()` 改为按当前幕选择 archetype。
- `EnemyState` 增加 `archetypeId`。
- 第一版等待正式素材；素材未接入前只准备配置和无渲染验证，不进入实际生成池。
- 为 `caster` 增加最小远程攻击能力，复用现有 projectile 逻辑。

验证点：

- 第 1 幕只出现基础追击压力。
- 第 2 幕开始出现速度压力。
- 第 3 幕开始出现高血和远程压力。

### 3. Boss 注册表

- 新增 `BOSS_ARCHETYPES`。
- `spawnBoss()` 按当前幕和轮次选择 Boss archetype。
- Boss 血量、接触伤害、AI 冷却、召唤池读取配置。
- 当前 Boss 作为第一个 archetype，后续新增 Boss 直接加配置。

验证点：

- 当前 Boss 首轮体验基本保持。
- 召唤池能按阶段读到正确敌人类型。
- 新 Boss 没有正式素材时不会进入池。

### 4. 经验和装备

- 接入 XP 和升级三选一。
- Boss 击杀后接入装备三选一。
- 派生攻击、动态攻击上限、技能消耗、资源获取统一走 helper。

验证点：

- 经验升级和 Boss 装备选择不会同时覆盖彼此状态。
- 替换装备后生命和攻击边界被正确夹取。
- 重开后局内成长全部清空。

### 5. 技能注册表

- 将当前 `SKILLS` 和技能特效配置逐步合并到 `SKILL_DEFS`。
- 技能释放、HUD、伤害公式改为读取技能定义。
- 当前三招作为默认解锁技能。
- 后续新增技能资源只新增配置和资源元数据。

验证点：

- 当前三招伤害和表现不回退。
- 未解锁技能不会出现在 HUD 或升级候选里。

### 6. 阶段调优

- 调整每幕平台权重、敌人权重、Boss 轮换和奖励倍率。
- 每次大调参后同步更新 `current/` 或 `future/` 文档。

验证点：

- 第 1 幕不会在 30 秒内被满屏敌人压死。
- 第 2 幕能明显感到速度压力。
- 第 3 幕能明显感到高血和远程压力。
- 第 4 幕后组合持续变化，而不是只重复同一个 Boss 加血。
