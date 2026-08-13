import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  DEATH_SPRITE_SHEET,
  RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET,
  RESIDUAL_SPIRIT_PICKUP_SPRITE,
  UI_SPRITES,
} from "../constants";
import { HUD_SKILL_METER_FRAME } from "./gameHudLayout";

const PNG_SIGNATURE = "89504e470d0a1a0a";
const PNG_SIGNATURE_SIZE = 8;
const PNG_CHUNK_TYPE_OFFSET = 4;
const PNG_CHUNK_DATA_OFFSET = 8;
const PNG_CHUNK_OVERHEAD = 12;
const PNG_WIDTH_OFFSET = 0;
const PNG_HEIGHT_OFFSET = 4;
const PNG_BIT_DEPTH_OFFSET = 8;
const PNG_COLOR_TYPE_OFFSET = 9;
const PNG_INTERLACE_OFFSET = 12;
const PNG_BIT_DEPTH = 8;
const PNG_INDEXED_COLOR = 3;
const PNG_RGBA_COLOR = 6;
const RGBA_CHANNEL_COUNT = 4;
const ALPHA_CHANNEL_INDEX = 3;
const MAX_ALPHA = 255;
const PNG_FILTER_AVERAGE = 3;
const PNG_FILTER_PAETH = 4;
const OPAQUE_ALPHA_THRESHOLD = 128;
function readPngAlpha(src) {
  const fileUrl = new URL(`../../${src}`, import.meta.url);
  const buffer = readFileSync(fileUrl);
  expect(buffer.subarray(0, PNG_SIGNATURE_SIZE).toString("hex")).toBe(PNG_SIGNATURE);

  const chunks = [];
  let offset = PNG_SIGNATURE_SIZE;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer
      .subarray(offset + PNG_CHUNK_TYPE_OFFSET, offset + PNG_CHUNK_DATA_OFFSET)
      .toString("ascii");
    chunks.push({
      type,
      data: buffer.subarray(
        offset + PNG_CHUNK_DATA_OFFSET,
        offset + PNG_CHUNK_DATA_OFFSET + length,
      ),
    });
    offset += length + PNG_CHUNK_OVERHEAD;
    if (type === "IEND") break;
  }

  const header = chunks.find((chunk) => chunk.type === "IHDR")?.data;
  if (!header) throw new Error(`Missing PNG header: ${src}`);

  const width = header.readUInt32BE(PNG_WIDTH_OFFSET);
  const height = header.readUInt32BE(PNG_HEIGHT_OFFSET);
  const bitDepth = header[PNG_BIT_DEPTH_OFFSET];
  const colorType = header[PNG_COLOR_TYPE_OFFSET];
  const interlace = header[PNG_INTERLACE_OFFSET];
  if (
    bitDepth !== PNG_BIT_DEPTH
    || interlace !== 0
    || ![PNG_INDEXED_COLOR, PNG_RGBA_COLOR].includes(colorType)
  ) {
    throw new Error(`Unsupported PNG format: ${src}`);
  }

  const channels = colorType === PNG_RGBA_COLOR ? RGBA_CHANNEL_COUNT : 1;
  const stride = width * channels;
  const filtered = inflateSync(Buffer.concat(
    chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data),
  ));
  const pixels = Buffer.alloc(stride * height);
  let filteredOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = filtered[filteredOffset];
    filteredOffset += 1;
    const row = filtered.subarray(filteredOffset, filteredOffset + stride);
    filteredOffset += stride;
    unfilterRow(filter, row, pixels, y * stride, stride, channels);
  }

  const transparency = chunks.find((chunk) => chunk.type === "tRNS")?.data;
  const alpha = Buffer.alloc(width * height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = colorType === PNG_RGBA_COLOR
      ? pixels[index * channels + ALPHA_CHANNEL_INDEX]
      : transparency?.[pixels[index]] ?? MAX_ALPHA;
  }

  return { width, height, colorType, alpha };
}

function unfilterRow(filter, row, pixels, offset, stride, bytesPerPixel) {
  const previousOffset = offset - stride;
  for (let x = 0; x < stride; x += 1) {
    const left = x >= bytesPerPixel ? pixels[offset + x - bytesPerPixel] : 0;
    const up = offset === 0 ? 0 : pixels[previousOffset + x];
    const upLeft = offset === 0 || x < bytesPerPixel
      ? 0
      : pixels[previousOffset + x - bytesPerPixel];
    let value = row[x];
    if (filter === 1) value += left;
    else if (filter === 2) value += up;
    else if (filter === PNG_FILTER_AVERAGE) value += Math.floor((left + up) / 2);
    else if (filter === PNG_FILTER_PAETH) value += paeth(left, up, upLeft);
    else if (filter !== 0) throw new Error(`Unsupported PNG filter: ${filter}`);
    pixels[offset + x] = value & MAX_ALPHA;
  }
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  return upDistance <= upLeftDistance ? up : upLeft;
}

function renderedSeamMask(sprite, displayX, topOffset, meterHeight) {
  const png = readPngAlpha(sprite.src);
  const displayWidth = sprite.displayW ?? sprite.w;
  const displayHeight = sprite.displayH ?? sprite.h;
  expect({ width: png.width, height: png.height }).toEqual({
    width: sprite.w,
    height: sprite.h,
  });

  const sourceX = Math.floor((displayX + 0.5) * png.width / displayWidth);
  return Array.from({ length: meterHeight }, (_, meterY) => {
    const displayY = meterY - topOffset;
    if (displayY < 0 || displayY >= displayHeight) return false;
    const sourceY = Math.floor((displayY + 0.5) * png.height / displayHeight);
    return png.alpha[sourceY * png.width + sourceX] >= OPAQUE_ALPHA_THRESHOLD;
  });
}

function innerOpening(mask) {
  const rails = [];
  for (let row = 0; row < mask.length; row += 1) {
    if (!mask[row]) continue;
    const start = row;
    while (row + 1 < mask.length && mask[row + 1]) row += 1;
    rails.push({ start, end: row });
  }
  if (rails.length !== 2) throw new Error(`Expected two seam rails, got ${JSON.stringify(rails)}`);

  const top = rails[0].end + 1;
  const bottom = rails[1].start - 1;
  return { top, bottom, height: bottom - top + 1 };
}

function expectTransparentPngAsset(asset) {
  const png = readPngAlpha(asset.src);
  expect({ width: png.width, height: png.height }).toEqual({
    width: asset.w,
    height: asset.h,
  });

  const cornerIndexes = [
    0,
    png.width - 1,
    (png.height - 1) * png.width,
    png.width * png.height - 1,
  ];
  expect(cornerIndexes.map((index) => png.alpha[index])).toEqual([0, 0, 0, 0]);
  expect(png.alpha.some((alpha) => alpha > 0)).toBe(true);
}

function expectTransparentSpriteSheet(asset) {
  const png = readPngAlpha(asset.src);
  expect({ width: png.width, height: png.height }).toEqual({
    width: asset.w,
    height: asset.h,
  });
  const offsetX = asset.offsetX ?? 0;
  const offsetY = asset.offsetY ?? 0;

  for (let row = 0; row < asset.rows; row += 1) {
    for (let column = 0; column < asset.columns; column += 1) {
      let visiblePixelCount = 0;
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (let y = 0; y < asset.frameH; y += 1) {
        for (let x = 0; x < asset.frameW; x += 1) {
          const sourceX = offsetX + column * asset.frameW + x;
          const sourceY = offsetY + row * asset.frameH + y;
          if (png.alpha[sourceY * png.width + sourceX] === 0) continue;

          visiblePixelCount += 1;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }

      expect(visiblePixelCount).toBeGreaterThan(0);
      expect(minX).toBeGreaterThanOrEqual(asset.frameGutter);
      expect(maxX).toBeLessThan(asset.frameW - asset.frameGutter);
      expect(minY).toBeGreaterThanOrEqual(asset.frameGutter);
      expect(maxY).toBeLessThan(asset.frameH - asset.frameGutter);
    }
  }
}

describe("game HUD sprite geometry", () => {
  it("keeps the skill meter inner slot continuous across the middle/right join", () => {
    const frame = HUD_SKILL_METER_FRAME;
    const midSprite = UI_SPRITES[frame.mid];
    const rightSprite = UI_SPRITES[frame.right];
    const midWidth = midSprite.displayW ?? midSprite.w;
    const midMask = renderedSeamMask(midSprite, midWidth - 1, 0, frame.height);
    const rightMask = renderedSeamMask(rightSprite, 0, frame.rightTop, frame.height);

    expect(innerOpening(midMask)).toEqual({ top: 6, bottom: 12, height: 7 });
    expect(innerOpening(rightMask)).toEqual(innerOpening(midMask));
    expect(rightMask).toEqual(midMask);
  });

  it("keeps generated residual-spirit assets on their transparent PNG contracts", () => {
    expectTransparentPngAsset(UI_SPRITES.residualSpiritVesselFrame);
    expectTransparentPngAsset(RESIDUAL_SPIRIT_PICKUP_SPRITE);
    expectTransparentPngAsset(RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET);
    expectTransparentSpriteSheet(RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET);
  });

  it("keeps the death sequence on its four-times-density sprite contract", () => {
    expectTransparentSpriteSheet(DEATH_SPRITE_SHEET);
  });
});
