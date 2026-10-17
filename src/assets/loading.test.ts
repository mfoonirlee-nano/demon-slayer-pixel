import { afterEach, expect, it, vi } from "vitest";
import { loadImage } from "../game/utils";

const STALLED_REQUEST_WAIT_MS = 30000;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("ends a stalled image request instead of blocking entry forever", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("Image", class {
    onload = null;
    onerror = null;
    src = "";
  });
  const failed = vi.fn();
  void loadImage("assets/stalled.png").catch(failed);
  await vi.advanceTimersByTimeAsync(STALLED_REQUEST_WAIT_MS);
  expect(failed).toHaveBeenCalledOnce();
});
