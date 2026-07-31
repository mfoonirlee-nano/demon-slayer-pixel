/* eslint-disable no-magic-numbers */
/* global Buffer */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { deflateSync, inflateSync } from "node:zlib";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "tmp/character-state-audit");
const DIAG_DIR = path.join(OUT_DIR, "diagnostics");
const CONTACT_DIR = path.join(OUT_DIR, "contact-sheets");
const THUMB_MAX_W = 168;
const THUMB_MAX_H = 132;
const CELL_PAD = 8;
const ALPHA_THRESHOLD = 0;

const actors = [
  {
    id: "player",
    displayName: "潮刃者",
    category: "player",
    runtimeStatus: "runtime-enabled player",
    baseline: ["docs/art/player.md", "assets/art/player-concept.png", "assets/art/player-skills-concept.png"],
    sheets: [
      sheet("idle", "assets/sprites/player/player_idle.png", 384, 480, 8, { primary: true }),
      sheet("run", "assets/sprites/player/player_run.png", 448, 420, 8),
      sheet("jump", "assets/sprites/player/player_jump.png", 448, 420, 6),
      sheet("attack", "assets/sprites/player/player_attack.png", 768, 480, 8),
      sheet("movingAttack", "assets/sprites/player/player_moving_attack.png", 768, 480, 8),
      sheet("fallAttack", "assets/sprites/player/player_fall_attack.png", 640, 560, 8),
      sheet("moonTide:idle", "assets/sprites/player/moon_tide/player_moon_tide_idle.png", 384, 480, 8),
      sheet("moonTide:run", "assets/sprites/player/moon_tide/player_moon_tide_run.png", 448, 420, 8),
      sheet("moonTide:jump", "assets/sprites/player/moon_tide/player_moon_tide_jump.png", 448, 420, 6),
      sheet("moonTide:attack", "assets/sprites/player/moon_tide/player_moon_tide_attack.png", 768, 480, 8),
      sheet("moonTide:movingAttack", "assets/sprites/player/moon_tide/player_moon_tide_moving_attack.png", 768, 480, 8),
      sheet("moonTide:fallAttack", "assets/sprites/player/moon_tide/player_moon_tide_fall_attack.png", 640, 560, 8),
      sheet("skill:line_projectile", "assets/sprites/skills/line_projectile/skill.png", 800, 420, 5),
      sheet("skill:close_arc", "assets/sprites/skills/close_arc/skill.png", 500, 500, 6),
      sheet("skill:guard_counter", "assets/sprites/skills/guard_counter/skill.png", 540, 470, 5),
      sheet("skill:dash_reposition", "assets/sprites/skills/dash_reposition/skill.png", 480, 360, 5),
      sheet("skill:vortex_control", "assets/sprites/skills/vortex_control/skill.png", 360, 360, 5),
      sheet("skill:armor_break", "assets/sprites/skills/armor_break/skill.png", 360, 360, 5),
      sheet("skill:anti_air_multi", "assets/sprites/skills/anti_air_multi/skill.png", 640, 420, 5),
      sheet("skill:returning_blade", "assets/sprites/skills/returning_blade/skill.png", 360, 360, 5),
      sheet("skill:vertical_wave", "assets/sprites/skills/vertical_wave/skill.png", 480, 420, 6),
      sheet("ultimateCast", "assets/sprites/skills/ultimate_skill/skill.png", 480, 480, 6),
    ],
    outOfScope: ["assets/sprites/skills/*/effect.png", "assets/sprites/skills/*/icon.png"],
  },
  enemy("chaser", "裸身追妖", "chaser", [sheet("move", "assets/sprites/enemies/chaser/chaser.png", 287, 282, 6, { primary: true })]),
  enemy("crawler", "伏地蛛妖", "crawler", [
    sheet("move", "assets/sprites/enemies/crawler/crawler.png", 314, 145, 4, { primary: true }),
    sheet("windup", "assets/sprites/enemies/crawler/crawler_windup.png", 314, 145, 4),
    sheet("lunge", "assets/sprites/enemies/crawler/crawler_lunge.png", 314, 145, 5),
    sheet("recover", "assets/sprites/enemies/crawler/crawler_recover.png", 314, 145, 3),
  ]),
  enemy("runner", "角突夜妖", "runner", [
    sheet("approach", "assets/sprites/enemies/runner/runner_approach.png", 250, 250, 6, { primary: true }),
    sheet("windup", "assets/sprites/enemies/runner/runner_windup.png", 250, 250, 4),
    sheet("dash", "assets/sprites/enemies/runner/runner_dash.png", 250, 250, 5),
    sheet("recover", "assets/sprites/enemies/runner/runner_recover.png", 250, 250, 3),
  ]),
  enemy("caster", "提灯咒妖", "caster", [
    sheet("move", "assets/sprites/enemies/caster/caster_move.png", 288, 360, 4, { primary: true }),
    sheet("windup", "assets/sprites/enemies/caster/caster_windup.png", 288, 360, 4),
    sheet("cast", "assets/sprites/enemies/caster/caster_cast.png", 288, 360, 4),
    sheet("recover", "assets/sprites/enemies/caster/caster_recover.png", 288, 360, 3),
    sheet("hit", "assets/sprites/enemies/caster/caster_hit.png", 288, 360, 3),
  ], ["assets/sprites/enemies/caster/caster_wisp.png"]),
  enemy("duelist", "双刃裂妖", "duelist", [
    sheet("approach", "assets/sprites/enemies/duelist/duelist.png", 320, 360, 4, { primary: true }),
    sheet("windup", "assets/sprites/enemies/duelist/duelist_windup.png", 320, 360, 4),
    sheet("slash", "assets/sprites/enemies/duelist/duelist_slash.png", 320, 360, 5),
    sheet("recover", "assets/sprites/enemies/duelist/duelist_recover.png", 320, 360, 3),
  ]),
  enemy("brute", "盾甲重妖", "brute", [
    sheet("advance", "assets/sprites/enemies/brute/brute_advance.png", 320, 360, 6, { primary: true }),
    sheet("guard", "assets/sprites/enemies/brute/brute_guard.png", 320, 360, 4),
    sheet("shieldBash", "assets/sprites/enemies/brute/brute_shield_bash.png", 320, 360, 5),
    sheet("recover", "assets/sprites/enemies/brute/brute_recover.png", 320, 360, 3),
    sheet("shieldBreak", "assets/sprites/enemies/brute/brute_shield_break.png", 320, 360, 4),
    sheet("brokenAdvance", "assets/sprites/enemies/brute/brute_broken_advance.png", 320, 360, 6),
    sheet("cleave", "assets/sprites/enemies/brute/brute_cleave.png", 320, 360, 5),
    sheet("brokenRecover", "assets/sprites/enemies/brute/brute_broken_recover.png", 320, 360, 3),
  ]),
  enemy("binder", "缚咒夜妖", "binder", [
    sheet("move", "assets/sprites/enemies/binder/binder_move.png", 260, 320, 4, { primary: true }),
    sheet("windup", "assets/sprites/enemies/binder/binder_windup.png", 260, 320, 4),
    sheet("cast", "assets/sprites/enemies/binder/binder_cast.png", 260, 320, 4),
    sheet("recover", "assets/sprites/enemies/binder/binder_recover.png", 260, 320, 3),
    sheet("hit", "assets/sprites/enemies/binder/binder_hit.png", 260, 320, 3),
  ], ["assets/sprites/enemies/binder/binder_zone*.png"]),
  enemy("glider", "膜翼巡妖", "glider", [
    sheet("hover", "assets/sprites/enemies/glider/glider_hover.png", 360, 240, 6, { primary: true }),
    sheet("windup", "assets/sprites/enemies/glider/glider_windup.png", 360, 240, 4),
    sheet("dive/pass", "assets/sprites/enemies/glider/glider_dive.png", 360, 240, 5),
    sheet("recover", "assets/sprites/enemies/glider/glider_recover.png", 360, 240, 3),
  ]),
  enemy("leaper", "裂足跳妖", "leaper", [
    sheet("stalk", "assets/sprites/enemies/leaper/leaper_stalk.png", 320, 320, 6, { primary: true }),
    sheet("windup", "assets/sprites/enemies/leaper/leaper_windup.png", 320, 320, 4),
    sheet("leap", "assets/sprites/enemies/leaper/leaper_leap.png", 320, 320, 5),
    sheet("impact", "assets/sprites/enemies/leaper/leaper_impact.png", 320, 320, 4),
    sheet("recover", "assets/sprites/enemies/leaper/leaper_recover.png", 320, 320, 3),
  ]),
  enemy("splitter", "裂影夜妖", "splitter", [
    sheet("move", "assets/sprites/enemies/splitter/splitter_move.png", 288, 320, 6, { primary: true }),
    sheet("hit", "assets/sprites/enemies/splitter/splitter_hit.png", 288, 320, 3),
    sheet("attack", "assets/sprites/enemies/splitter/splitter_attack.png", 288, 320, 6),
    sheet("split", "assets/sprites/enemies/splitter/splitter_split.png", 288, 320, 6),
    sheet("splitlingBirth", "assets/sprites/enemies/splitter/splitling_birth.png", 240, 240, 6, { proxy: true }),
    sheet("splitlingMove", "assets/sprites/enemies/splitter/splitling_move.png", 240, 240, 6, { proxy: true }),
  ]),
  enemy("warden", "御阵夜妖", "warden", [
    sheet("move", "assets/sprites/enemies/warden/warden_move.png", 320, 360, 4, { primary: true }),
    sheet("aura", "assets/sprites/enemies/warden/warden_aura.png", 320, 360, 4),
    sheet("hit", "assets/sprites/enemies/warden/warden_hit.png", 320, 360, 3),
  ], [
    "assets/sprites/enemies/warden/warden_aura_effect.png",
    "assets/sprites/enemies/warden/warden_blood_moon_buff.png",
  ]),
  enemy("burrower", "土潜夜妖", "burrower", [
    sheet("move", "assets/sprites/enemies/burrower/burrower_move.png", 314, 180, 6, { primary: true }),
    sheet("sink", "assets/sprites/enemies/burrower/burrower_sink.png", 314, 180, 4),
    sheet("burrow", "assets/sprites/enemies/burrower/burrower_burrow.png", 314, 180, 6),
    sheet("emerge", "assets/sprites/enemies/burrower/burrower_emerge.png", 314, 180, 5),
    sheet("recover", "assets/sprites/enemies/burrower/burrower_recover.png", 314, 180, 3),
  ]),
  boss("spider-string", "血月眷属 · 蛛弦", "spider-string", [
    sheet("move", "assets/sprites/boss/spider-string/boss.png", 350, 419, 4, { primary: true }),
    sheet("cast", "assets/sprites/boss/spider-string/boss_skill1.png", 400, 400, 6),
    sheet("ultimateCast", "assets/sprites/boss/spider-string/boss_ultimate_cast.png", 400, 400, 8),
  ], [
    "assets/sprites/boss/spider-string/boss_skill1_effect.png",
    "assets/sprites/boss/spider-string/boss_ultimate_web.png",
  ]),
  boss("mist-bone", "血月眷属 · 雾骨", "mist-bone", [
    sheet("move", "assets/sprites/boss/mist-bone/mist_bone_move.png", 350, 419, 4, { primary: true }),
    sheet("attack", "assets/sprites/boss/mist-bone/mist_bone_attack.png", 400, 400, 6),
    sheet("pointCast", "assets/sprites/boss/mist-bone/mist_bone_cast.png", 400, 400, 6),
    sheet("lineCast", "assets/sprites/boss/mist-bone/mist_bone_line_cast.png", 400, 400, 6),
    sheet("cageCast", "assets/sprites/boss/mist-bone/mist_bone_cage_cast.png", 400, 400, 6),
  ], [
    "assets/sprites/boss/mist-bone/mist_bone_spikes.png",
    "assets/sprites/boss/mist-bone/mist_bone_dart.png",
  ]),
  boss("mirror-dream", "血月眷属 · 镜魇", "mirror-dream", [
    sheet("move", "assets/sprites/boss/mirror-dream/mirror_dream.png", 350, 419, 4, { primary: true }),
    sheet("cast", "assets/sprites/boss/mirror-dream/mirror_dream_cast.png", 400, 400, 6),
    sheet("afterimage", "assets/sprites/boss/mirror-dream/mirror_afterimage.png", 400, 400, 6, { proxy: true }),
    sheet("nightmare", "assets/sprites/boss/mirror-dream/mirror_nightmare.png", 400, 350, 6, { proxy: true }),
  ], ["assets/sprites/boss/mirror-dream/mirror_shard.png"]),
  boss("fang-gale", "血月眷属 · 牙岚", "fang-gale", [
    sheet("move", "assets/sprites/boss/fang-gale/fang_gale_move.png", 350, 419, 4, { primary: true }),
    sheet("windup", "assets/sprites/boss/fang-gale/fang_gale_windup.png", 400, 400, 6),
    sheet("bite", "assets/sprites/boss/fang-gale/fang_gale_bite.png", 400, 400, 6),
  ], ["assets/sprites/boss/fang-gale/fang_gale_wave.png"]),
  boss("lantern-ember", "血月眷属 · 灯烬", "lantern-ember", [
    sheet("move", "assets/sprites/boss/lantern-ember/lantern_ember_move.png", 350, 419, 4, { primary: true }),
    sheet("summon", "assets/sprites/boss/lantern-ember/lantern_ember_summon.png", 400, 400, 6),
    sheet("firelineCast", "assets/sprites/boss/lantern-ember/lantern_ember_fireline_cast.png", 400, 400, 6),
    sheet("buffCast", "assets/sprites/boss/lantern-ember/lantern_ember_buff_cast.png", 400, 400, 6),
    sheet("death", "assets/sprites/boss/lantern-ember/lantern_ember_death.png", 400, 400, 6),
  ], ["assets/sprites/boss/lantern-ember/*effect*.png", "assets/sprites/boss/lantern-ember/lantern_ember_fireline.png", "assets/sprites/boss/lantern-ember/lantern_ember_*zone.png", "assets/sprites/boss/lantern-ember/lantern_ember_buff_tether.png"]),
  boss("dead-bell", "血月眷属 · 枯铃", "dead-bell", [
    sheet("move", "assets/sprites/boss/dead_bell/dead_bell.png", 350, 419, 4, { primary: true }),
    sheet("cast", "assets/sprites/boss/dead_bell/dead_bell_cast.png", 400, 400, 6),
  ], ["assets/sprites/boss/dead_bell/dead_bell_wave.png", "assets/sprites/boss/dead_bell/dead_bell_blade.png"]),
  boss("blood-moon-many-faces", "终幕之妖 · 万相血月", "blood-moon-many-faces", [
    sheet("move", "assets/sprites/boss/blood-moon-many-faces/blood_moon.png", 350, 419, 4, { primary: true }),
    sheet("phaseShift", "assets/sprites/boss/blood-moon-many-faces/blood_moon_phase_shift.png", 400, 400, 6),
    sheet("recover", "assets/sprites/boss/blood-moon-many-faces/blood_moon_recover.png", 400, 400, 3),
    sheet("death", "assets/sprites/boss/blood-moon-many-faces/blood_moon_death.png", 400, 419, 6),
    sheet("spiderMistCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_spider_mist_cast.png", 400, 400, 6),
    sheet("mirrorFangCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_mirror_fang_cast.png", 400, 400, 6),
    sheet("lanternBellCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_lantern_bell_cast.png", 400, 400, 6),
    sheet("sixfoldCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_sixfold_cast.png", 400, 400, 6),
    sheet("manyFacesCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_many_faces_cast.png", 400, 400, 6),
  ], ["assets/sprites/boss/blood-moon-many-faces/*effect.png"]),
];

function sheet(state, src, frameW, frameH, count, flags = {}) {
  return { state, src, frameW, frameH, count, ...flags };
}

function enemy(id, displayName, docSlug, sheets, outOfScope = []) {
  return {
    id,
    displayName,
    category: "enemy",
    runtimeStatus: "runtime-enabled enemy",
    baseline: [`docs/art/enemies/${docSlug}.md`, `assets/art/${docSlug}-concept.png`],
    sheets,
    outOfScope,
  };
}

function boss(id, displayName, docSlug, sheets, outOfScope = []) {
  return {
    id,
    displayName,
    category: "boss",
    runtimeStatus: "runtime-enabled or registered boss",
    baseline: [`docs/art/bosses/${docSlug}.md`, `assets/art/boss-${docSlug}-concept.png`],
    sheets,
    outOfScope,
  };
}

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
  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth ${bitDepth}: ${filePath}`);
  if (interlace !== 0) throw new Error(`Unsupported interlaced PNG: ${filePath}`);
  const palette = chunks.find((chunk) => chunk.type === "PLTE")?.data ?? null;
  const transparency = chunks.find((chunk) => chunk.type === "tRNS")?.data ?? null;
  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data));
  const raw = inflateSync(idat);
  return { width, height, rgba: toRgba(raw, width, height, colorType, palette, transparency), colorType };
}

function toRgba(raw, width, height, colorType, palette, transparency) {
  const channels = channelCount(colorType);
  const stride = width * channels;
  const unfiltered = Buffer.alloc(stride * height);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = raw.subarray(rawOffset, rawOffset + stride);
    rawOffset += stride;
    const outOffset = y * stride;
    unfilter(filter, row, unfiltered, outOffset, stride, channels, y === 0 ? null : outOffset - stride);
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i += 1, p += channels) {
    const out = i * 4;
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
    frames,
  };
}

function makeContactSheet(actor, diagnostics) {
  const decoded = diagnostics.map((diag) => ({ diag, png: readPng(abs(diag.src)) }));
  const scale = Math.min(
    1,
    THUMB_MAX_W / Math.max(...diagnostics.map((diag) => diag.frameW)),
    THUMB_MAX_H / Math.max(...diagnostics.map((diag) => diag.frameH)),
  );
  const maxCount = Math.max(...diagnostics.map((diag) => diag.count));
  const cellW = Math.ceil(Math.max(...diagnostics.map((diag) => diag.frameW)) * scale) + CELL_PAD * 2;
  const cellH = Math.ceil(Math.max(...diagnostics.map((diag) => diag.frameH)) * scale) + CELL_PAD * 2;
  const out = newImage(cellW * maxCount, cellH * diagnostics.length, [30, 34, 40, 255]);
  for (let row = 0; row < decoded.length; row += 1) {
    const { diag, png } = decoded[row];
    for (let frame = 0; frame < diag.count; frame += 1) {
      const x = frame * cellW;
      const y = row * cellH;
      checker(out, x, y, cellW, cellH);
      drawFrame(out, png, diag, frame, x + CELL_PAD, y + CELL_PAD, scale);
    }
  }
  const filePath = path.join(CONTACT_DIR, `${actor.id}.png`);
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

function drawFrame(out, src, spec, frame, dstX, dstY, scale) {
  const srcX0 = frame * spec.frameW;
  const drawW = Math.max(1, Math.round(spec.frameW * scale));
  const drawH = Math.max(1, Math.round(spec.frameH * scale));
  for (let y = 0; y < drawH; y += 1) {
    const sy = Math.min(spec.frameH - 1, Math.floor(y / scale));
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
  return { status: "baseline clear", existing };
}

function run() {
  ensureDirs();
  const inventory = [];
  for (const actor of actors) {
    const diagnostics = actor.sheets.map(analyzeSheet);
    const contactSheet = makeContactSheet(actor, diagnostics);
    const baseline = baselineStatus(actor);
    const record = { ...actor, baselineStatus: baseline.status, existingBaseline: baseline.existing, contactSheet, diagnostics };
    inventory.push(record);
    writeFileSync(path.join(DIAG_DIR, `${actor.id}.json`), `${JSON.stringify(record)}\n`);
  }
  writeFileSync(path.join(OUT_DIR, "inventory.json"), `${JSON.stringify(inventory)}\n`);
  writeFileSync(path.join(OUT_DIR, "inventory.md"), renderMarkdown(inventory));
  process.stdout.write(`Wrote ${inventory.length} actor audits to ${rel(OUT_DIR)}\n`);
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
