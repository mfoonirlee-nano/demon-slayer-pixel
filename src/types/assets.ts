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
  // 因此如果新图上下有不对称的留白，都会直接导致游戏内播放技能的“释放位置”偏上或偏下。
  frameH: number;
  // 【极大影响施放时附在主角身上的动画大小】
  // 控制技能附着在人物身上时的整体放大/缩小比例。
  // 它会将最终展示的高度变为 `frameH * drawScale`，并由此按切片比例同等拉伸宽度。
  drawScale: number;
  // 角色在帧宽度内的水平锚点（0~1，默认 0.5 即帧中心）。
  // 当角色不在帧中心时（如偏左），调整此值让角色对齐玩家位置，
  // 引擎会在朝左/朝右两个方向均正确对齐。
  drawAnchorX?: number;
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
};

export type SpriteSheet = {
  src: string;
  frameW: number;
  frameH: number;
  count: number;
  image: HTMLImageElement | null;
};
