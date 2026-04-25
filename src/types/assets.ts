export type SkillId = "skill1" | "skill2" | "skill3";

export type PlayerAnimationState = "idle" | "run" | "jump" | "attack";

export type Skill = {
  // 技能的唯一标识符
  id: SkillId;
  // 技能的名称，通常用于展示
  name: string;
  // 技能序列图（SpriteSheet）的相对路径
  src: string;
  // 动画的帧数
  frameCount: number;
  // 每一帧切片的宽度（像素），等于图片总宽度 / frameCount
  frameW: number;
  // 引擎加载后的图片对象
  image: HTMLImageElement | null;
  // 【最重要：决定了动画的物理重心和裁剪高度】
  // 原始切片高度。游戏引擎默认会将图片区域的中心点绑定在主角的中心点上。
  // 因此如果新图上下有不对称的留白，都会直接导致游戏内播放技能的"释放位置"偏上或偏下。
  frameH: number;
  // 【极大影响施放时附在主角身上的动画大小】
  // 控制技能附着在人物身上时的整体放大/缩小比例。
  // 它会将最终展示的高度变为 `frameH * drawScale`，并由此按切片比例同等拉伸宽度。
  drawScale: number;
  // 技能范围的逻辑判定半径（与视觉素材大小没有直接关联）
  radius: number;
  // 基础敌人伤害
  enemyBase: number;
  // 距敌人中心远近对伤害的额外乘区
  enemyScale: number;
  // Boss基础伤害
  bossBase: number;
  // 技能主色调，用于伤害粒子、爆点、地面反光等系统特效
  color: string;
  // 水平锚点（0~1）：帧内玩家中心所在位置，0.5 = 帧中心（默认）。
  // 朝左时引擎自动镜像为 1 - anchorX。
  anchorX?: number;
  // 垂直锚点（0~1）：帧内脚部所在位置，1.0 = 精灵底边（默认）。
  // 参考点为 feetY - yOffset；anchorY < 1 时精灵底边低于参考点。
  anchorY?: number;
};

export type SpriteSheet = {
  src: string;
  frameW: number;
  frameH: number;
  count: number;
  image: HTMLImageElement | null;
};

// Player animation sheet: sprite data + per-state draw parameters.
// Draw formula: drawX = refX - drawW * anchorX, drawY = refY - drawH * anchorY
// where refX = centerX, refY = feetY - PLAYER_DRAW.yOffset.
export type PlayerSheet = SpriteSheet & {
  // rendered draw size in canvas pixels
  drawW: number;
  drawH: number;
  // game-frames per animation frame (higher = slower)
  animSpeed: number;
  // horizontal anchor (0–1): where the player center sits in the frame, default 0.5
  anchorX?: number;
  // vertical anchor (0–1): where the player feet sit in the frame, default 1.0 = sprite bottom
  anchorY?: number;
  // set true when the source sprite faces left instead of the default right
  flipX?: boolean;
};
