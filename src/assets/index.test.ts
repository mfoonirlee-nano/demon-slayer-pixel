// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";

const { targets, markReady, loadImage, prepareSprite } = vi.hoisted(() => {
  const totalImages = 8;
  return {
    targets: Array.from({ length: totalImages }, (_, index) => ({ src: `assets/${index}.png`, setImage: vi.fn() })),
    markReady: vi.fn(),
    loadImage: vi.fn<(src: string) => Promise<HTMLImageElement>>(),
    prepareSprite: vi.fn<(src: string) => Promise<void> | undefined>(() => undefined),
  };
});
const TOTAL_IMAGES = targets.length;
const CONCURRENT_REQUESTS = 6;
const SUCCESSFUL_FIRST_ATTEMPT = 7;
vi.mock("./manifest", () => ({ spriteImageLoadTargets: () => targets }));
vi.mock("../game/utils", () => ({ loadImage }));
vi.mock("../systems/runLifecycle", () => ({ markSpritesReady: markReady }));
vi.mock("../game/state", () => ({ state: {} }));
vi.mock("../rendering/moonTidePreparation", () => ({ prepareMoonTideSprite: prepareSprite }));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  prepareSprite.mockReset();
});

it("holds readiness and completed-image progress until filter preparation finishes", async () => {
  let finishPreparation = () => {};
  const preparation = new Promise<void>((resolve) => { finishPreparation = resolve; });
  prepareSprite.mockImplementation((src) => src === targets[0].src ? preparation : undefined);
  loadImage.mockResolvedValue(document.createElement("img"));
  const { loadSprites, getSpriteLoadProgress } = await import("./index");
  const task = loadSprites();
  await vi.waitFor(() => expect(getSpriteLoadProgress().loaded).toBe(SUCCESSFUL_FIRST_ATTEMPT));
  expect(markReady).not.toHaveBeenCalled();
  expect(getSpriteLoadProgress().status).toBe("loading");
  finishPreparation();
  await task;
  expect(markReady).toHaveBeenCalledOnce();
  expect(getSpriteLoadProgress().status).toBe("ready");
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
