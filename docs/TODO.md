# 待办

## 已完成
* 完成目录结构拆分，增加如 types、constants 目录，使 src 目录更加清晰
* 完成对 magic number 的抽象，以及字符串字面量的常量抽象
* 更新项目规则，增加如代码规范、注释、命名规范等，禁止any类型、禁止使用 magic number 等
  * [x] 补充 `docs/CODE_RULES.md`，统一说明命名、注释、TypeScript 与 magic number 规则
  * [x] 在 `README.md` 与 `CLAUDE.md` 增加规则入口，方便开发和协作时直接引用
  * [x] 增加 ESLint 规则与校验脚本，落地禁止 `any` 与 magic number 的自动检查
  * [x] 整理角色状态与快照字段，统一生命、攻击、技能资源的状态来源
  * [x] 清理 `player` / `platform` / `runtime` / `input` / `App` / `gameStore` 等核心模块中的一批存量不规范写法
  * [x] 继续按模块清理其余存量代码中的不规范写法
* 技能类型优化，去除无效字段：frameRanges、frameWidths、frameW，以及其在仓库里的响应逻辑
  * [x] 从 `Skill` 类型中移除 `frameRanges`、`frameWidths`、`frameW` 三个无效字段
  * [x] 运行时 frameRanges 改由 `assets.ts` 的 Map 管理，提供 `getSkillFrameRanges()` 接口
  * [x] 删除 `detectVariableFrameRanges` 及相关常量（IMAGE_ANALYSIS、IMAGE_PIXEL_DATA）
  * [x] `drawVariableSheetFrame`、`player.ts`、`particle.ts` 同步更新调用方式
* 完成游戏 UI 更新，常驻UI尽量精简，只显示必要的信息
  * [x] 收敛常驻 HUD，只保留生命、当前技能、技能资源与 Boss 血条
  * [x] 给技能条也增加上血条那样逐渐消失的效果
  * [x] 云移动得有点快，透明度有点低
  * [x] 前景的图层不对，应该在最上方，现在的重叠得也很厉害，优化一下生成算法
  * [x] 将前景绘制从 `drawBackground()` 提取到 `drawForeground()`，并在 `runtime.ts` 主循环末尾（所有游戏实体之后）调用
  * [x] 减少前景元素数量（patches 8→6，decor 16→9），改用 seeded 随机分布
  * [x] 增加 `buildForegroundItems()` 生成器，带水平重叠检测，重叠时自动重试新位置（最多 200 次）
* [x] 优化地面逻辑
* [x] 优化背景逻辑
* [x] 增加Boss技能
* [x] 更新暂停面板UI
* [x] 更新技能3效果
* [x] 更新状态条效果
* [x] 增加新资产和压缩逻辑
* [x] 优化资产文件夹结构
* [x] 优化资产大小
* [x] 更新天空效果
* [x] 更新月效果
* [x] 更新技能效果
* [x] 增加tinypng压缩
* [x] 更新精灵
* [x] 重构绘制逻辑
* [x] 方向性技能伤害和随机命中粒子
* [x] 技能2效果淡出
* [x] 增加HP效果
* [x] 添加地图文档
* [x] 更新攻击帧
* [x] 增加角色大招
* [x] 增加场景贴图（云、前景、地面、山、塔、树等）
* [x] 增加技能1效果弹道
* [x] 增加技能2效果弹道
* [x] 增加技能效果系统
* [x] 更新游戏逻辑
* [x] 优化大招帧
* [x] 更新技能帧速和位置
* [x] 增加技能描述
* [x] 更新技能配置
* [x] 移除硬编码burst尺寸并增加drawOffset字段
* [x] 统一HUD状态
* [x] 分离游戏配置和运行时类型
* [x] 迁移游戏运行时到React和TypeScript
* [x] 生命周期条的衰减不对，和数值对不上
* [x] 技能条默认应该是空的，击杀敌人回复
* [x] boss的被攻击判断范围太窄了，攻击boss的头他甚至都不会受到伤害

## 未完成
* 增加角色的大招，静态资源为 assets/sprites/skills/ultimate_skill.png assets/sprites/skills/ultimate_skill_effect.png
* 增加装备系统，装备仅影响角色的攻击和生命，强化技能，不会影响角色外观
* 前景逻辑重构，包括地面、草丛、树木、石塔、鸟居、石头、竹子、木桥
* 移动平台素材替换及生成逻辑重构
* 移除现有的纯代码实现得灯笼、远景等内容
