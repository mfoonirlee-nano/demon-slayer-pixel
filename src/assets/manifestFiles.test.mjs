import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { spriteImageLoadTargets } from "./manifest";
import { MOON_TIDE_PLAYER_SHEETS, PLAYER_SHEETS } from "../constants";

const PNG_HEADER = { signatureLength: 8, widthOffset: 16, heightOffset: 20 };

it("has a repository file for every preloaded image", () => {
  const missing = spriteImageLoadTargets().map((target) => target.src)
    .filter((src) => !existsSync(src));
  expect(missing).toEqual([]);
});

it("matches every player sheet slicing contract to its actual PNG dimensions", () => {
  for (const sheet of [...Object.values(PLAYER_SHEETS), ...Object.values(MOON_TIDE_PLAYER_SHEETS)]) {
    const png = readFileSync(sheet.src);
    expect(png.toString("hex", 0, PNG_HEADER.signatureLength), sheet.src).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(PNG_HEADER.widthOffset), sheet.src).toBe(sheet.frameW * sheet.count);
    expect(png.readUInt32BE(PNG_HEADER.heightOffset), sheet.src).toBe(sheet.frameH);
  }
});
