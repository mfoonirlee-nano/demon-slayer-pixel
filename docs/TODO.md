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

## 未完成
* 释放技能时，技能动画的播放位置不正确，缩放比例也不正确，和角色的大小和位置不匹配  
* 增加装备系统，装备仅影响角色的攻击和生命，强化技能，不会影响角色外观
* 增加暂停面板，用于显示角色的生命、攻击、技能等数值

