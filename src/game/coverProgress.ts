export const COVER_KILLS_STORAGE_KEY = "moonlit-tide-cover-kills";
export const COVER_LAST_SEEN_KILLS_STORAGE_KEY = "moonlit-tide-cover-last-seen-kills";
export const COVER_PROGRESS_TARGET_KILLS = 5000;
export const COVER_MOON_PHASE_COUNT = 8;
const ENEMY_KILL_WEIGHT = 1;
const BOSS_KILL_WEIGHT = 10;

export type CoverProgressStorage = Pick<Storage, "getItem" | "setItem">;

function getStorage(): CoverProgressStorage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredKills(key: string, storage = getStorage()) {
  if (!storage) return 0;

  let stored: number;
  try {
    stored = Number(storage.getItem(key));
  } catch {
    return 0;
  }
  return Number.isFinite(stored) ? Math.max(0, stored) : 0;
}

function writeStoredKills(key: string, value: number, storage = getStorage()) {
  const nextKills = Math.max(0, Math.floor(value));
  if (!storage) return nextKills;

  try {
    storage.setItem(key, String(nextKills));
  } catch {
    return nextKills;
  }
  return nextKills;
}

export function readCoverKills(storage = getStorage()) {
  return readStoredKills(COVER_KILLS_STORAGE_KEY, storage);
}

export function readLastSeenCoverKills(storage = getStorage()) {
  return readStoredKills(COVER_LAST_SEEN_KILLS_STORAGE_KEY, storage);
}

export function writeLastSeenCoverKills(kills: number, storage = getStorage()) {
  return writeStoredKills(COVER_LAST_SEEN_KILLS_STORAGE_KEY, kills, storage);
}

export function addCoverKills(amount: number, storage = getStorage()) {
  if (amount <= 0) return readCoverKills(storage);

  const nextKills = readCoverKills(storage) + amount;
  return writeStoredKills(COVER_KILLS_STORAGE_KEY, nextKills, storage);
}

export function getCoverProgress(kills = readCoverKills()) {
  return Math.min(1, Math.sqrt(Math.max(0, kills) / COVER_PROGRESS_TARGET_KILLS));
}

export function getCoverMoonPhaseIndex(progress: number, phaseCount = COVER_MOON_PHASE_COUNT) {
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  return Math.min(phaseCount - 1, Math.floor(normalizedProgress * phaseCount));
}

export function recordEnemyCoverKill() {
  addCoverKills(ENEMY_KILL_WEIGHT);
}

export function recordBossCoverKill() {
  addCoverKills(BOSS_KILL_WEIGHT);
}
