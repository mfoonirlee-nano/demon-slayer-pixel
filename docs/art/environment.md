# 环境与气候美术设定

环境与气候素材服务于月夜赶路的氛围和景深，不承担伤害判定或攻击预警。它们应延续暗靛天空、蓝黑树线、冷灰石地与低饱和旧木的色彩语法，让亮白与高纯月潮蓝继续属于玩家，让鲜红和高亮黄继续优先表达危险。

## 落叶

- 参考 `assets/sprites/background/foreground_sprites.png`、`assets/sprites/tree/tree_sprites.png`、`assets/sprites/ground/moon_forest_ground_base.png` 与 `assets/sprites/scenery/act-occluders/fang-gale-windbent-pine.png` 的月夜森林明度和像素密度。
- 叶片使用低饱和铜褐、冷赭、暗酒红和暗靛轮廓，只允许极弱的月蓝边光；禁止鲜红攻击色、大面积高亮黄、青绿残边和自发光光晕。
- 翻滚序列中的八帧必须保持同一片叶子的裂片、叶柄、尺度和中心锚。薄边帧可以收窄，但不能消失；首尾姿态必须能连续循环。
- 素材只承载叶片本体和翻转，不烘入树枝、风线、阴影、地面或整屏粒子。四边保留透明 gutter，运行时再用远近两层的移动速度、密度和透明度建立景深。
