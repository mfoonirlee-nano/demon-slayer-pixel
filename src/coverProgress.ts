const COVER_KILLS_STORAGE_KEY = "demon-slayer-cover-kills";
const COVER_PROGRESS_TARGET_KILLS = 50;
const ENEMY_KILL_WEIGHT = 1;
const BOSS_KILL_WEIGHT = 10;

function getStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCoverKills() {
  const storage = getStorage();
  if (!storage) return 0;

  let stored: number;
  try {
    stored = Number(storage.getItem(COVER_KILLS_STORAGE_KEY));
  } catch {
    return 0;
  }
  return Number.isFinite(stored) ? Math.max(0, stored) : 0;
}

export function addCoverKills(amount: number) {
  if (amount <= 0) return readCoverKills();

  const nextKills = readCoverKills() + amount;
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(COVER_KILLS_STORAGE_KEY, String(nextKills));
    } catch {
      return nextKills;
    }
  }
  return nextKills;
}

export function getCoverProgress(kills = readCoverKills()) {
  return Math.min(1, Math.sqrt(Math.max(0, kills) / COVER_PROGRESS_TARGET_KILLS));
}

export function recordEnemyCoverKill() {
  addCoverKills(ENEMY_KILL_WEIGHT);
}

export function recordBossCoverKill() {
  addCoverKills(BOSS_KILL_WEIGHT);
}
