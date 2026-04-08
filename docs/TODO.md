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
* 完成游戏 UI 更新，常驻UI尽量精简，只显示必要的信息
  * [x] 收敛常驻 HUD，只保留生命、当前技能、技能资源与 Boss 血条

## 未完成
* 增加装备系统，装备仅影响角色的攻击和生命，强化技能，不会影响角色外观
* 增加暂停面板，用于显示角色的生命、攻击、技能等数值

