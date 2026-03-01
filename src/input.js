import { ensureAudio } from "./audio.js";

export const keys = new Set();
let handlers = {};

export function setupInput(callbacks) {
  handlers = callbacks;
  setupTouchControls();
}

function handleInputPress(key) {
  const k = key.toLowerCase();
  keys.add(k);
  ensureAudio();

  if (handlers.onJump && (k === "w" || k === " ")) {
    handlers.onJump();
  }
  if (handlers.onAttack && k === "j") {
    handlers.onAttack();
  }
  if (handlers.onSkill && k === "k") {
    handlers.onSkill();
  }
  if (handlers.onSwitchSkill && (k === "1" || k === "2" || k === "3")) {
    handlers.onSwitchSkill(Number(k) - 1);
  }
  if (handlers.onRestart && k === "r") {
    handlers.onRestart();
  }
}

function handleInputRelease(key) {
  keys.delete(key.toLowerCase());
}

window.addEventListener("keydown", (e) => {
  const raw = e.key === " " ? " " : e.key.toLowerCase();
  if (["a", "d", "w", " ", "j", "k", "1", "2", "3", "r", "arrowleft", "arrowright", "arrowup"].includes(raw)) {
    e.preventDefault();
  }
  handleInputPress(raw);
});

window.addEventListener("keyup", (e) => {
  const raw = e.key === " " ? " " : e.key.toLowerCase();
  handleInputRelease(raw);
});

function setupTouchControls() {
  const buttons = document.querySelectorAll(".touch-btn");
  if (!buttons.length) return;

  const pointerToKey = new Map();

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

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.classList.add("pressed");
      if (isHold) {
        handleInputPress(key);
        pointerToKey.set(e.pointerId, key);
      } else {
        handleInputPress(key);
      }
    });

    const release = (e) => {
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

    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", release);
  }

  window.addEventListener("blur", releaseAllTouchKeys);
}
