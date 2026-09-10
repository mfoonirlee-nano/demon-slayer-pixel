/* eslint-disable no-magic-numbers */
/* global Buffer */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { deflateSync, inflateSync } from "node:zlib";

import { actors } from "./sprite-audit-actors.mjs";
import { runtimeLayout } from "./sprite-audit-layout.mjs";
import { spriteCatalog } from "./sprite-audit-catalog.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "tmp/character-state-audit");
const DIAG_DIR = path.join(OUT_DIR, "diagnostics");
const CONTACT_DIR = path.join(OUT_DIR, "contact-sheets");
const THUMB_MAX_W = 168;
const THUMB_MAX_H = 132;
const CELL_PAD = 8;
const ALPHA_THRESHOLD = 0;

function ensureDirs() {
  for (const dir of [OUT_DIR, DIAG_DIR, CONTACT_DIR]) mkdirSync(dir, { recursive: true });
}

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function abs(filePath) {
  return path.join(ROOT, filePath);
}

function readPng(filePath) {
  const buf = readFileSync(filePath);
  const sig = "89504e470d0a1a0a";
  if (buf.subarray(0, 8).toString("hex") !== sig) throw new Error(`Not a PNG: ${filePath}`);
  const chunks = [];
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buf.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 12 + length;
    if (type === "IEND") break;
  }
  const ihdr = chunks.find((chunk) => chunk.type === "IHDR").data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (bitDepth !== 8 && !([1, 2, 4].includes(bitDepth) && [0, 3].includes(colorType))) {
    throw new Error(`Unsupported PNG bit depth ${bitDepth}: ${filePath}`);
  }
  if (interlace !== 0) throw new Error(`Unsupported interlaced PNG: ${filePath}`);
  const palette = chunks.find((chunk) => chunk.type === "PLTE")?.data ?? null;
  const transparency = chunks.find((chunk) => chunk.type === "tRNS")?.data ?? null;
  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data));
  const raw = inflateSync(idat);
  return { width, height, rgba: toRgba(raw, width, height, colorType, palette, transparency, bitDepth), colorType };
}

function toRgba(raw, width, height, colorType, palette, transparency, bitDepth) {
  const channels = channelCount(colorType);
  const stride = Math.ceil(width * channels * bitDepth / 8);
  const bytesPerPixel = Math.ceil(channels * bitDepth / 8);
  const unfiltered = Buffer.alloc(stride * height);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = raw.subarray(rawOffset, rawOffset + stride);
    rawOffset += stride;
    const outOffset = y * stride;
    unfilter(filter, row, unfiltered, outOffset, stride, bytesPerPixel, y === 0 ? null : outOffset - stride);
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i += 1, p += channels) {
    const out = i * 4;
    if (bitDepth < 8) {
      const x = i % width;
      const packed = unfiltered[Math.floor(i / width) * stride + Math.floor(x * bitDepth / 8)];
      const index = (packed >> (8 - bitDepth - x * bitDepth % 8)) & ((1 << bitDepth) - 1);
      const gray = Math.round(index * 255 / ((1 << bitDepth) - 1));
      rgba[out] = colorType === 3 ? palette[index * 3] : gray;
      rgba[out + 1] = colorType === 3 ? palette[index * 3 + 1] : gray;
      rgba[out + 2] = colorType === 3 ? palette[index * 3 + 2] : gray;
      rgba[out + 3] = colorType === 3 ? (transparency?.[index] ?? 255) : (transparency?.readUInt16BE(0) === index ? 0 : 255);
      continue;
    }
    if (colorType === 6) {
      rgba[out] = unfiltered[p];
      rgba[out + 1] = unfiltered[p + 1];
      rgba[out + 2] = unfiltered[p + 2];
      rgba[out + 3] = unfiltered[p + 3];
    } else if (colorType === 2) {
      rgba[out] = unfiltered[p];
      rgba[out + 1] = unfiltered[p + 1];
      rgba[out + 2] = unfiltered[p + 2];
      rgba[out + 3] = 255;
    } else if (colorType === 4) {
      rgba[out] = unfiltered[p];
      rgba[out + 1] = unfiltered[p];
      rgba[out + 2] = unfiltered[p];
      rgba[out + 3] = unfiltered[p + 1];
    } else if (colorType === 0) {
      rgba[out] = unfiltered[p];
      rgba[out + 1] = unfiltered[p];
      rgba[out + 2] = unfiltered[p];
      rgba[out + 3] = 255;
    } else if (colorType === 3) {
      const index = unfiltered[p];
      rgba[out] = palette[index * 3] ?? 0;
      rgba[out + 1] = palette[index * 3 + 1] ?? 0;
      rgba[out + 2] = palette[index * 3 + 2] ?? 0;
      rgba[out + 3] = transparency?.[index] ?? 255;
    }
  }
  return rgba;
}

function channelCount(colorType) {
  if (colorType === 6) return 4;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 0 || colorType === 3) return 1;
  throw new Error(`Unsupported PNG color type ${colorType}`);
}

function unfilter(filter, row, out, outOffset, stride, bpp, prevOffset) {
  for (let x = 0; x < stride; x += 1) {
    const left = x >= bpp ? out[outOffset + x - bpp] : 0;
    const up = prevOffset === null ? 0 : out[prevOffset + x];
    const upLeft = prevOffset !== null && x >= bpp ? out[prevOffset + x - bpp] : 0;
    let value = row[x];
    if (filter === 1) value += left;
    else if (filter === 2) value += up;
    else if (filter === 3) value += Math.floor((left + up) / 2);
    else if (filter === 4) value += paeth(left, up, upLeft);
    else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
    out[outOffset + x] = value & 255;
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function frameBbox(png, frame, spec) {
  const left = frame * spec.frameW;
  const right = Math.min(left + spec.frameW, png.width);
  const bottom = Math.min(spec.frameH, png.height);
  let minX = spec.frameW;
  let minY = spec.frameH;
  let maxX = -1;
  let maxY = -1;
  let pixels = 0;
  for (let y = 0; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const alpha = png.rgba[(y * png.width + x) * 4 + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;
      const localX = x - left;
      minX = Math.min(minX, localX);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, localX);
      maxY = Math.max(maxY, y);
      pixels += 1;
    }
  }
  if (maxX < 0) return { empty: true, pixels: 0 };
  return {
    empty: false,
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
    touchesEdge: minX === 0 || minY === 0 || maxX === spec.frameW - 1 || maxY === spec.frameH - 1,
    pixels,
  };
}

function analyzeSheet(spec) {
  const png = readPng(abs(spec.src));
  const expectedW = spec.frameW * spec.count;
  const expectedH = spec.frameH;
  const frames = Array.from({ length: spec.count }, (_, index) => frameBbox(png, index, spec));
  const signatures = Array.from({ length: spec.count }, (_, frame) => {
    const rows = Array.from({ length: spec.frameH }, (_, y) => {
      const start = (y * png.width + frame * spec.frameW) * 4;
      return png.rgba.subarray(start, start + spec.frameW * 4);
    });
    return crc32(Buffer.concat(rows));
  });
  return {
    ...spec,
    actualW: png.width,
    actualH: png.height,
    colorType: png.colorType,
    expectedW,
    expectedH,
    dimensionMatch: png.width === expectedW && png.height === expectedH,
    emptyFrames: frames.flatMap((bbox, index) => (bbox.empty ? [index] : [])),
    edgeTouchFrames: frames.flatMap((bbox, index) => (!bbox.empty && bbox.touchesEdge ? [index] : [])),
    duplicateFrames: signatures.flatMap((signature, index) => {
      const previous = signatures.indexOf(signature);
      return previous < index ? [{ frame: index, sameAs: previous }] : [];
    }),
    frames,
  };
}

function makeContactSheet(actor, diagnostics, runtime = false) {
  const decoded = diagnostics.map((diag) => ({ diag, png: readPng(abs(diag.src)) }));
  const scale = runtime ? 1 : Math.min(
    1,
    THUMB_MAX_W / Math.max(...diagnostics.map((diag) => diag.frameW)),
    THUMB_MAX_H / Math.max(...diagnostics.map((diag) => diag.frameH)),
  );
  const maxCount = Math.max(...diagnostics.map((diag) => diag.count));
  const left = Math.max(...diagnostics.map((diag) => (diag.runtime?.drawW ?? 0) * (diag.runtime?.anchorX ?? 0)));
  const above = Math.max(...diagnostics.map((diag) => (diag.runtime?.drawH ?? 0) * (diag.runtime?.anchorY ?? 0)));
  const right = Math.max(...diagnostics.map((diag) => (diag.runtime?.drawW ?? 0) * (1 - (diag.runtime?.anchorX ?? 1))));
  const below = Math.max(...diagnostics.map((diag) => (diag.runtime?.drawH ?? 0) * (1 - (diag.runtime?.anchorY ?? 1))));
  const cellW = Math.ceil(runtime ? left + right : Math.max(...diagnostics.map((diag) => diag.frameW)) * scale) + CELL_PAD * 2;
  const cellH = Math.ceil(runtime ? above + below : Math.max(...diagnostics.map((diag) => diag.frameH)) * scale) + CELL_PAD * 2;
  const out = newImage(cellW * maxCount, cellH * diagnostics.length, [30, 34, 40, 255]);
  for (let row = 0; row < decoded.length; row += 1) {
    const { diag, png } = decoded[row];
    for (let frame = 0; frame < diag.count; frame += 1) {
      const x = frame * cellW;
      const y = row * cellH;
      checker(out, x, y, cellW, cellH);
      const draw = runtime ? diag.runtime : { drawW: diag.frameW * scale, drawH: diag.frameH * scale };
      const dx = runtime ? x + CELL_PAD + left - draw.drawW * draw.anchorX : x + CELL_PAD;
      const dy = runtime ? y + CELL_PAD + above - draw.drawH * draw.anchorY : y + CELL_PAD;
      drawFrame(out, png, diag, frame, Math.round(dx), Math.round(dy), draw.drawW / diag.frameW, draw.drawH / diag.frameH);
    }
  }
  const filePath = path.join(CONTACT_DIR, `${actor.id}${runtime ? "-runtime" : ""}.png`);
  writePng(filePath, out.width, out.height, out.rgba);
  return rel(filePath);
}

function newImage(width, height, color) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) rgba.set(color, i * 4);
  return { width, height, rgba };
}

function checker(img, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const tone = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 66 : 86;
      const i = (y * img.width + x) * 4;
      img.rgba[i] = tone;
      img.rgba[i + 1] = tone;
      img.rgba[i + 2] = tone;
      img.rgba[i + 3] = 255;
    }
  }
}

function drawFrame(out, src, spec, frame, dstX, dstY, scale, scaleY = scale) {
  const srcX0 = frame * spec.frameW;
  const drawW = Math.max(1, Math.round(spec.frameW * scale));
  const drawH = Math.max(1, Math.round(spec.frameH * scaleY));
  for (let y = 0; y < drawH; y += 1) {
    const sy = Math.min(spec.frameH - 1, Math.floor(y / scaleY));
    for (let x = 0; x < drawW; x += 1) {
      const sx = srcX0 + Math.min(spec.frameW - 1, Math.floor(x / scale));
      if (sx >= src.width || sy >= src.height) continue;
      const si = (sy * src.width + sx) * 4;
      const di = ((dstY + y) * out.width + dstX + x) * 4;
      alphaBlend(out.rgba, di, src.rgba, si);
    }
  }
}

function alphaBlend(dst, di, src, si) {
  const a = src[si + 3] / 255;
  if (a <= 0) return;
  const inv = 1 - a;
  dst[di] = Math.round(src[si] * a + dst[di] * inv);
  dst[di + 1] = Math.round(src[si + 1] * a + dst[di + 1] * inv);
  dst[di + 2] = Math.round(src[si + 2] * a + dst[di + 2] * inv);
  dst[di + 3] = 255;
}

function writePng(filePath, width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const chunks = [
    chunk("IHDR", ihdr(width, height)),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ];
  writeFileSync(filePath, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), ...chunks]));
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  return data;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function baselineStatus(actor) {
  const existing = actor.baseline.filter((item) => existsSync(abs(item)));
  if (existing.length === 0) return { status: "baseline missing", existing };
  return { status: "requires visual review", existing };
}

function run() {
  ensureDirs();
  const inventory = [];
  for (const actor of actors) {
    const diagnostics = actor.sheets.map((spec) => ({ ...analyzeSheet(spec), runtime: runtimeLayout(actor, spec) }));
    const contactSheet = makeContactSheet(actor, diagnostics);
    const runtimeContactSheet = makeContactSheet(actor, diagnostics, true);
    const baseline = baselineStatus(actor);
    const record = { ...actor, baselineStatus: baseline.status, existingBaseline: baseline.existing, contactSheet, runtimeContactSheet, diagnostics };
    inventory.push(record);
    writeFileSync(path.join(DIAG_DIR, `${actor.id}.json`), `${JSON.stringify(record)}\n`);
  }
  writeFileSync(path.join(OUT_DIR, "inventory.json"), `${JSON.stringify(inventory)}\n`);
  writeFileSync(path.join(OUT_DIR, "inventory.md"), renderMarkdown(inventory));
  const bodyPaths = new Set(actors.flatMap((actor) => actor.sheets.map((sheet) => sheet.src)));
  const groups = new Map();
  for (const sheet of spriteCatalog().values()) {
    if (bodyPaths.has(sheet.src)) continue;
    const group = path.dirname(sheet.src).split("/").slice(2).join("-");
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(analyzeSheet({ ...sheet, state: path.basename(sheet.src, ".png") }));
  }
  const otherSequences = [...groups].map(([group, diagnostics]) => ({
    group,
    contactSheet: makeContactSheet({ id: `sequence-${group}` }, diagnostics),
    diagnostics,
  }));
  writeFileSync(path.join(OUT_DIR, "other-sequences.json"), `${JSON.stringify(otherSequences)}\n`);
  process.stdout.write(`Wrote ${inventory.length} actor audits to ${rel(OUT_DIR)}\n`);
  const contractIssues = [...inventory, ...otherSequences].flatMap((actor) => actor.diagnostics)
    .filter((sheet) => !sheet.dimensionMatch || sheet.emptyFrames.length > 0);
  if (contractIssues.length > 0) {
    process.stderr.write(`Sprite contract failures: ${contractIssues.map((sheet) => sheet.src).join(", ")}\n`);
    process.exitCode = 1;
  }
}

function renderMarkdown(inventory) {
  const lines = [
    "# Character Sprite Audit Inventory",
    "",
    `Generated from ${actors.length} actor definitions.`,
    "",
    "| Actor | Category | Baseline | Sheets | Contact Sheet | Contract Issues |",
    "| --- | --- | --- | ---: | --- | --- |",
  ];
  for (const actor of inventory) {
    const issues = actor.diagnostics
      .filter((diag) => !diag.dimensionMatch || diag.emptyFrames.length > 0)
      .map((diag) => `${diag.state}${diag.dimensionMatch ? "" : " dimension"}${diag.emptyFrames.length ? " empty" : ""}`);
    lines.push(`| ${actor.id} | ${actor.category} | ${actor.baselineStatus} | ${actor.diagnostics.length} | ${actor.contactSheet} | ${issues.join("<br>") || "none"} |`);
  }
  lines.push("", "## Sheet Order", "");
  for (const actor of inventory) {
    lines.push(`### ${actor.id}`, "");
    actor.diagnostics.forEach((diag, index) => {
      lines.push(`${index + 1}. ${diag.state}: \`${diag.src}\` (${diag.frameW}x${diag.frameH} x ${diag.count})`);
    });
    if (actor.outOfScope.length > 0) lines.push(`- Out of scope: ${actor.outOfScope.map((item) => `\`${item}\``).join(", ")}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

run();
