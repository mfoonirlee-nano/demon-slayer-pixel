import { existsSync } from "node:fs";
import { expect, it } from "vitest";
import { spriteImageLoadTargets } from "./manifest";

it("has a repository file for every preloaded image", () => {
  const missing = spriteImageLoadTargets().map((target) => target.src)
    .filter((src) => !existsSync(src));
  expect(missing).toEqual([]);
});
