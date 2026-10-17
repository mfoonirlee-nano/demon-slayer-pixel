// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

const { targets, markReady, loadImage } = vi.hoisted(() => {
  const totalImages = 8;
  return {
    targets: Array.from({ length: totalImages }, (_, index) => ({ src: `assets/${index}.png`, setImage: vi.fn() })),
    markReady: vi.fn(),
    loadImage: vi.fn<(src: string) => Promise<HTMLImageElement>>(),
  };
});
const TOTAL_IMAGES = targets.length;
const CONCURRENT_REQUESTS = 6;
const SUCCESSFUL_FIRST_ATTEMPT = 7;
vi.mock("./manifest", () => ({ spriteImageLoadTargets: () => targets }));
vi.mock("../game/utils", () => ({ loadImage }));
vi.mock("../systems/runLifecycle", () => ({ markSpritesReady: markReady }));
vi.mock("../game/state", () => ({ state: {} }));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

it("publishes partial progress, bounds requests and shares concurrent preload calls", async () => {
  const image = document.createElement("img");
  const pending: (() => void)[] = [];
  loadImage.mockImplementation(() => new Promise((resolve) => pending.push(() => resolve(image))));
  const { loadSprites, getSpriteLoadProgress, subscribeSpriteLoadProgress } = await import("./index");
  const update = vi.fn();
  const unsubscribe = subscribeSpriteLoadProgress(update);
  const task = loadSprites();
  expect(loadSprites()).toBe(task);
  expect(loadImage).toHaveBeenCalledTimes(CONCURRENT_REQUESTS);
  pending.shift()?.();
  await Promise.resolve();
  expect(getSpriteLoadProgress().loaded).toBe(1);
  expect(markReady).not.toHaveBeenCalled();
  while (pending.length) {
    pending.shift()?.();
    await Promise.resolve();
  }
  await task;
  expect(getSpriteLoadProgress()).toMatchObject({ status: "ready", loaded: TOTAL_IMAGES, total: TOTAL_IMAGES });
  expect(update).toHaveBeenCalled();
  expect(markReady).toHaveBeenCalledOnce();
  unsubscribe();
});

it("keeps entry blocked on failure and retries only failed images", async () => {
  const image = document.createElement("img");
  loadImage.mockImplementation(async (src) => {
    if (src === targets[0].src) throw new Error("network failed");
    return image;
  });
  const { loadSprites, getSpriteLoadProgress } = await import("./index");
  await expect(loadSprites()).rejects.toThrow("Failed to load 1 sprites");
  expect(getSpriteLoadProgress()).toMatchObject({ status: "error", loaded: SUCCESSFUL_FIRST_ATTEMPT, failed: [targets[0].src] });
  expect(markReady).not.toHaveBeenCalled();
  loadImage.mockClear().mockResolvedValue(image);
  await loadSprites();
  expect(loadImage).toHaveBeenCalledOnce();
  expect(loadImage).toHaveBeenCalledWith(targets[0].src);
  expect(getSpriteLoadProgress().status).toBe("ready");
  expect(markReady).toHaveBeenCalledOnce();
  await loadSprites();
  expect(loadImage).toHaveBeenCalledOnce();
});
