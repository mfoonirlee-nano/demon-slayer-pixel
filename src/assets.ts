import { spriteImageLoadTargets } from "./assetManifest";
import { loadImage } from "./utils";
import { state } from "./state";
import { markSpritesReady } from "./systems/runLifecycle";

let loadTask: Promise<void> | null = null;

export function loadSprites(): Promise<void> {
  if (loadTask) return loadTask;

  const jobs = spriteImageLoadTargets().map((target) => (
    loadImage(target.src).then((image) => {
      target.setImage(image);
    })
  ));

  loadTask = Promise.all(jobs).then(() => {
    console.log('[assets] all sprites loaded, setting spritesReady=true');
    markSpritesReady(state);
  });
  return loadTask;
}
