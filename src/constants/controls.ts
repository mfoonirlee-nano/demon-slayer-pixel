export const PLAYER_CONTROL_KEYS = {
  moveLeft: "a",
  moveRight: "d",
  jump: ["w", " "] as const,
  fallAttackModifier: ["s", "arrowdown"] as const,
  attack: "j",
  skill: "k",
  ultimate: "l",
  heal: "h",
  switchSkill: ["1", "2", "3"] as const,
  restart: "r",
  pause: ["escape", "p"] as const,
} as const;

export const REWARD_CONTROL_KEYS = {
  previous: "arrowleft",
  next: "arrowright",
  confirm: "enter",
  directChoice: PLAYER_CONTROL_KEYS.switchSkill,
} as const;

export const MENU_CONTROL_KEYS = {
  close: PLAYER_CONTROL_KEYS.pause[0],
} as const;

export const TOUCH_CONTROL_KEYS = {
  moveLeft: PLAYER_CONTROL_KEYS.moveLeft,
  moveRight: PLAYER_CONTROL_KEYS.moveRight,
  jump: PLAYER_CONTROL_KEYS.jump[0],
  fallAttackModifier: PLAYER_CONTROL_KEYS.fallAttackModifier[0],
  attack: PLAYER_CONTROL_KEYS.attack,
  skill: PLAYER_CONTROL_KEYS.skill,
  ultimate: PLAYER_CONTROL_KEYS.ultimate,
  heal: PLAYER_CONTROL_KEYS.heal,
  pause: PLAYER_CONTROL_KEYS.pause[1],
} as const;

export const COLLISION_DEBUG_CONTROL_KEY = PLAYER_CONTROL_KEYS.moveRight;

type ValueOf<T> = T[keyof T];
type KeyFromValue<T> = T extends string
  ? T
  : T extends readonly string[]
    ? T[number]
    : never;

export type ControlKey = KeyFromValue<
  ValueOf<typeof PLAYER_CONTROL_KEYS> | ValueOf<typeof REWARD_CONTROL_KEYS>
>;

const CONTROL_KEY_LABELS = {
  [PLAYER_CONTROL_KEYS.moveLeft]: "A",
  [PLAYER_CONTROL_KEYS.moveRight]: "D",
  [PLAYER_CONTROL_KEYS.jump[0]]: "W",
  [PLAYER_CONTROL_KEYS.jump[1]]: "Space",
  [PLAYER_CONTROL_KEYS.fallAttackModifier[0]]: "S",
  [PLAYER_CONTROL_KEYS.fallAttackModifier[1]]: "↓",
  [PLAYER_CONTROL_KEYS.attack]: "J",
  [PLAYER_CONTROL_KEYS.skill]: "K",
  [PLAYER_CONTROL_KEYS.ultimate]: "L",
  [PLAYER_CONTROL_KEYS.heal]: "H",
  [PLAYER_CONTROL_KEYS.switchSkill[0]]: "1",
  [PLAYER_CONTROL_KEYS.switchSkill[1]]: "2",
  [PLAYER_CONTROL_KEYS.switchSkill[2]]: "3",
  [PLAYER_CONTROL_KEYS.restart]: "R",
  [PLAYER_CONTROL_KEYS.pause[0]]: "Esc",
  [PLAYER_CONTROL_KEYS.pause[1]]: "P",
  [REWARD_CONTROL_KEYS.previous]: "←",
  [REWARD_CONTROL_KEYS.next]: "→",
  [REWARD_CONTROL_KEYS.confirm]: "Enter",
} satisfies Record<ControlKey, string>;

export function controlKeyLabel(key: ControlKey): string {
  return CONTROL_KEY_LABELS[key];
}
