import { ensureAudio } from "./audio";
import {
  COLLISION_DEBUG_CONTROL_KEY,
  PLAYER_CONTROL_KEYS,
  REWARD_CONTROL_KEYS,
} from "../constants";

const PREVENT_DEFAULT_KEYS = [
  PLAYER_CONTROL_KEYS.moveLeft,
  PLAYER_CONTROL_KEYS.moveRight,
  ...PLAYER_CONTROL_KEYS.fallAttackModifier,
  ...PLAYER_CONTROL_KEYS.jump,
  PLAYER_CONTROL_KEYS.attack,
  PLAYER_CONTROL_KEYS.skill,
  PLAYER_CONTROL_KEYS.ultimate,
  PLAYER_CONTROL_KEYS.heal,
  ...PLAYER_CONTROL_KEYS.switchSkill,
  PLAYER_CONTROL_KEYS.restart,
  ...PLAYER_CONTROL_KEYS.pause,
  REWARD_CONTROL_KEYS.previous,
  REWARD_CONTROL_KEYS.next,
  "arrowup",
] as const;

type InputHandlers = {
  onJump?: () => void;
  onAttack?: () => void;
  onSkill?: () => void;
  onUltimate?: () => void;
  onHeal?: () => void;
  onSwitchSkill?: (index: number) => void;
  onRestart?: () => void;
  onPause?: () => void;
  onToggleCollisionDebug?: () => void;
};

export const keys = new Set<string>();
let handlers: InputHandlers = {};
let cleanupInput: (() => void) | null = null;

export function setupInput(callbacks: InputHandlers) {
  teardownInput();
  handlers = callbacks;

  const disposers: Array<() => void> = [];
  const releaseTouchControls = setupTouchControls();
  if (releaseTouchControls) {
    disposers.push(releaseTouchControls);
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const raw = e.key === " " ? " " : e.key.toLowerCase();

    if (e.metaKey && raw === COLLISION_DEBUG_CONTROL_KEY) {
      e.preventDefault();
      if (!e.repeat) handlers.onToggleCollisionDebug?.();
      return;
    }

    if (PREVENT_DEFAULT_KEYS.includes(raw as (typeof PREVENT_DEFAULT_KEYS)[number])) {
      e.preventDefault();
    }
    handleInputPress(raw);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const raw = e.key === " " ? " " : e.key.toLowerCase();
    handleInputRelease(raw);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  disposers.push(() => window.removeEventListener("keydown", onKeyDown));
  disposers.push(() => window.removeEventListener("keyup", onKeyUp));

  cleanupInput = () => {
    for (const dispose of [...disposers].reverse()) {
      dispose();
    }
    keys.clear();
  };

  return cleanupInput;
}

export function teardownInput() {
  if (cleanupInput) {
    cleanupInput();
    cleanupInput = null;
  }
}

function handleInputPress(key: string) {
  const k = key.toLowerCase();
  const alreadyPressed = keys.has(k);
  keys.add(k);
  ensureAudio();

  if (handlers.onJump && !alreadyPressed && matchesKey(k, PLAYER_CONTROL_KEYS.jump)) {
    handlers.onJump();
  }
  if (handlers.onAttack && k === PLAYER_CONTROL_KEYS.attack) handlers.onAttack();
  if (handlers.onSkill && k === PLAYER_CONTROL_KEYS.skill) handlers.onSkill();
  if (handlers.onUltimate && k === PLAYER_CONTROL_KEYS.ultimate) handlers.onUltimate();
  if (handlers.onHeal && !alreadyPressed && k === PLAYER_CONTROL_KEYS.heal) handlers.onHeal();

  const skillIndex = PLAYER_CONTROL_KEYS.switchSkill.findIndex((skillKey) => skillKey === k);
  if (handlers.onSwitchSkill && skillIndex >= 0) handlers.onSwitchSkill(skillIndex);

  if (handlers.onRestart && k === PLAYER_CONTROL_KEYS.restart) handlers.onRestart();
  if (handlers.onPause && matchesKey(k, PLAYER_CONTROL_KEYS.pause)) handlers.onPause();
}

function handleInputRelease(key: string) {
  keys.delete(key.toLowerCase());
}

function matchesKey(key: string, bindings: readonly string[]) {
  return bindings.some((binding) => binding === key);
}

function setupTouchControls() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".touch-btn"));
  if (!buttons.length) return null;

  const pointerToKey = new Map<number, string>();
  const disposers: Array<() => void> = [];

  function releaseAllTouchKeys() {
    for (const key of pointerToKey.values()) {
      handleInputRelease(key);
    }
    pointerToKey.clear();
    for (const btn of buttons) btn.classList.remove("pressed");
  }

  for (const btn of buttons) {
    const key = btn.dataset.key;
    const isHold = btn.dataset.hold === "true";
    if (!key) continue;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      btn.classList.add("pressed");
      if (isHold) {
        handleInputPress(key);
        pointerToKey.set(e.pointerId, key);
      } else {
        handleInputPress(key);
      }
    };

    const release = (e: PointerEvent) => {
      btn.classList.remove("pressed");
      if (!isHold) {
        handleInputRelease(key);
        return;
      }
      const mapped = pointerToKey.get(e.pointerId);
      if (!mapped) return;
      handleInputRelease(mapped);
      pointerToKey.delete(e.pointerId);
    };

    btn.addEventListener("pointerdown", onPointerDown);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", release);

    disposers.push(() => btn.removeEventListener("pointerdown", onPointerDown));
    disposers.push(() => btn.removeEventListener("pointerup", release));
    disposers.push(() => btn.removeEventListener("pointercancel", release));
    disposers.push(() => btn.removeEventListener("lostpointercapture", release));
  }

  window.addEventListener("blur", releaseAllTouchKeys);
  disposers.push(() => window.removeEventListener("blur", releaseAllTouchKeys));

  return () => {
    releaseAllTouchKeys();
    for (const dispose of [...disposers].reverse()) {
      dispose();
    }
  };
}
