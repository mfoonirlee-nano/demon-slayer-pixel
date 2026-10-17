import { spriteImageLoadTargets } from "./manifest";
import { loadImage } from "../game/utils";
import { state } from "../game/state";
import { markSpritesReady } from "../systems/runLifecycle";

let loadTask: Promise<void> | null = null;
const MAX_CONCURRENT_IMAGES = 6;
const loadedSources = new Set<string>();
const listeners = new Set<() => void>();

export type SpriteLoadProgress = {
  status: "idle" | "loading" | "error" | "ready";
  loaded: number;
  total: number;
  failed: readonly string[];
};

let progress: SpriteLoadProgress = { status: "idle", loaded: 0, total: 0, failed: [] };
export const getSpriteLoadProgress = () => progress;
export function subscribeSpriteLoadProgress(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(next: SpriteLoadProgress) {
  progress = next;
  listeners.forEach((listener) => listener());
}

export function loadSprites(): Promise<void> {
  if (loadTask) return loadTask;
  if (progress.status === "ready") return Promise.resolve();

  const targets = spriteImageLoadTargets();
  const sources = [...new Set(targets.map((target) => target.src))];
  const pending = sources.filter((src) => !loadedSources.has(src));
  const failed: string[] = [];
  let cursor = 0;
  publish({ status: "loading", loaded: loadedSources.size, total: sources.length, failed: [] });

  async function worker() {
    while (cursor < pending.length) {
      const src = pending[cursor++];
      try {
        const image = await loadImage(src);
        targets.filter((target) => target.src === src).forEach((target) => target.setImage(image));
        loadedSources.add(src);
      } catch {
        failed.push(src);
      }
      publish({ status: "loading", loaded: loadedSources.size, total: sources.length, failed: [...failed] });
    }
  }

  loadTask = Promise.all(Array.from({ length: MAX_CONCURRENT_IMAGES }, worker)).then(() => {
    if (failed.length > 0) {
      publish({ ...progress, status: "error" });
      throw new Error(`Failed to load ${failed.length} sprites: ${failed.join(", ")}`);
    }
    markSpritesReady(state);
    publish({ ...progress, status: "ready" });
  }).finally(() => {
    // Keep successful images; a subsequent attempt only requests failed sources.
    loadTask = null;
  });
  return loadTask;
}
