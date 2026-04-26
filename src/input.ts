import { ensureAudio } from "./audio";

const PREVENT_DEFAULT_KEYS = ["a", "d", "w", " ", "j", "k", "1", "2", "3", "r", "p", "escape", "arrowleft", "arrowright", "arrowup"] as const;
const SKILL_SWITCH_KEYS = ["1", "2", "3"] as const;
const SKILL_KEY_OFFSET = 1;

type InputHandlers = {
  onJump?: () => void;
  onAttack?: () => void;
  onSkill?: () => void;
  onSwitchSkill?: (index: number) => void;
  onRestart?: () => void;
  onPause?: () => void;
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
  keys.add(k);
  ensureAudio();

  if (handlers.onJump && (k === "w" || k === " ")) handlers.onJump();
  if (handlers.onAttack && k === "j") handlers.onAttack();
  if (handlers.onSkill && k === "k") handlers.onSkill();
  if (handlers.onSwitchSkill && SKILL_SWITCH_KEYS.includes(k as (typeof SKILL_SWITCH_KEYS)[number])) {
    handlers.onSwitchSkill(Number(k) - SKILL_KEY_OFFSET);
  }
  if (handlers.onRestart && k === "r") handlers.onRestart();
  if (handlers.onPause && (k === "escape" || k === "p")) handlers.onPause();
}

function handleInputRelease(key: string) {
  keys.delete(key.toLowerCase());
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
