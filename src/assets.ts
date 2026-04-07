import {
  PLAYER_SHEETS,
  ENEMY_SHEETS,
  BOSS_SHEET,
  SKILLS,
  DEFAULT_SKILL_FRAME_COUNT,
} from "./constants";
import type { FrameRange } from "./types/assets";
import { loadImage, buildEvenRanges } from "./utils";
import { state } from "./state";

const IMAGE_ANALYSIS = {
  alphaThreshold: 8,
  contentDensityRatio: 0.02,
  minSeparatorWidth: 2,
  minSplitWidth: 2,
} as const;

const IMAGE_PIXEL_DATA = {
  channelCount: 4,
  alphaChannelOffset: 3,
} as const;

function detectVariableFrameRanges(image: HTMLImageElement, expectedCount?: number): FrameRange[] | null {
  try {
    const w = image.width;
    const h = image.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    let top = 0;
    let bottom = h - 1;
    let found = false;
    for (let y = 0; y < h && !found; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = (y * w + x) * IMAGE_PIXEL_DATA.channelCount + IMAGE_PIXEL_DATA.alphaChannelOffset;
        if (data[idx] > IMAGE_ANALYSIS.alphaThreshold) {
          top = y;
          found = true;
          break;
        }
      }
    }
    found = false;
    for (let y = h - 1; y >= 0 && !found; y -= 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = (y * w + x) * IMAGE_PIXEL_DATA.channelCount + IMAGE_PIXEL_DATA.alphaChannelOffset;
        if (data[idx] > IMAGE_ANALYSIS.alphaThreshold) {
          bottom = y;
          found = true;
          break;
        }
      }
    }
    if (bottom <= top) {
      top = 0;
      bottom = h - 1;
    }
    const contentRows = bottom - top + 1;
    const maxOpaquePerColumn = Math.max(1, Math.floor(contentRows * IMAGE_ANALYSIS.contentDensityRatio));
    const opaqueCountPerCol = new Array(w).fill(0);
    for (let x = 0; x < w; x += 1) {
      let cnt = 0;
      for (let y = top; y <= bottom; y += 1) {
        const idx = (y * w + x) * IMAGE_PIXEL_DATA.channelCount + IMAGE_PIXEL_DATA.alphaChannelOffset;
        if (data[idx] > IMAGE_ANALYSIS.alphaThreshold) {
          cnt += 1;
          if (cnt > maxOpaquePerColumn) break;
        }
      }
      opaqueCountPerCol[x] = cnt;
    }
    const isDelimiter = new Array(w).fill(false);
    for (let x = 0; x < w; x += 1) {
      isDelimiter[x] = opaqueCountPerCol[x] <= maxOpaquePerColumn;
    }
    const runs: Array<[number, number]> = [];
    let inRun = false;
    let runStart = 0;
    for (let x = 0; x < w; x += 1) {
      if (isDelimiter[x]) {
        if (!inRun) {
          inRun = true;
          runStart = x;
        }
      } else if (inRun) {
        runs.push([runStart, x - 1]);
        inRun = false;
      }
    }
    if (inRun) runs.push([runStart, w - 1]);
    const goodRuns = runs.filter((r) => r[1] - r[0] + 1 >= IMAGE_ANALYSIS.minSeparatorWidth);
    let contentStart = 0;
    let contentEnd = w;
    if (goodRuns.length && goodRuns[0][0] === 0) contentStart = goodRuns[0][1] + 1;
    if (goodRuns.length) {
      const last = goodRuns[goodRuns.length - 1];
      if (last[1] === w - 1) contentEnd = last[0];
    }
    const ranges: FrameRange[] = [];
    let prev = contentStart;
    for (const run of goodRuns) {
      const a = run[0];
      const b = run[1];
      if (a > prev && a < contentEnd) {
        const width = a - prev;
        if (width > 0) ranges.push({ x: prev, w: width });
      }
      prev = Math.max(prev, b + 1);
    }
    if (prev < contentEnd) ranges.push({ x: prev, w: contentEnd - prev });
    const rs = ranges.filter((r) => r.w > 0);
    if (!rs.length) return null;
    function adjustToExpected(list: FrameRange[]): FrameRange[] {
      const out = list.slice();
      if (typeof expectedCount === "number" && expectedCount > 0) {
        if (out.length > expectedCount) {
          while (out.length > expectedCount) {
            let idx = 0;
            for (let i = 1; i < out.length; i += 1) {
              if (out[i].w < out[idx].w) idx = i;
            }
            const left = idx - 1 >= 0 ? out[idx - 1] : null;
            const right = idx + 1 < out.length ? out[idx + 1] : null;
            if (!left && !right) break;
            if (!left && right) {
              right.x = out[idx].x;
              right.w += out[idx].w;
              out.splice(idx, 1);
            } else if (left && !right) {
              left.w += out[idx].w;
              out.splice(idx, 1);
            } else if (left && right) {
              if (left.w <= right.w) {
                left.w += out[idx].w;
                out.splice(idx, 1);
              } else {
                right.x = out[idx].x;
                right.w += out[idx].w;
                out.splice(idx, 1);
              }
            }
          }
        } else if (out.length < expectedCount) {
          while (out.length < expectedCount) {
            let idx = 0;
            for (let i = 1; i < out.length; i += 1) {
              if (out[i].w > out[idx].w) idx = i;
            }
            const r = out[idx];
            if (r.w <= IMAGE_ANALYSIS.minSplitWidth) break;
            const w1 = Math.floor(r.w / 2);
            const w2 = r.w - w1;
            const x2 = r.x + w1;
            out.splice(idx, 1, { x: r.x, w: w1 }, { x: x2, w: w2 });
          }
        }
      }
      return out;
    }
    const adjusted = adjustToExpected(rs);
    if (!adjusted.length) return null;
    return adjusted;
  } catch (_) {
    return null;
  }
}

export async function loadSprites() {
  const jobs: Array<Promise<void>> = [];
  for (const sheet of Object.values(PLAYER_SHEETS)) {
    jobs.push(loadImage(sheet.src).then((img) => {
      sheet.image = img;
    }));
  }
  for (const sheet of ENEMY_SHEETS) {
    jobs.push(loadImage(sheet.src).then((img) => {
      sheet.image = img;
    }));
  }
  jobs.push(loadImage(BOSS_SHEET.src).then((img) => {
    BOSS_SHEET.image = img;
  }));
  for (const skill of SKILLS) {
    jobs.push(loadImage(skill.src).then((img) => {
      skill.image = img;
      if (skill.frameRanges && skill.frameRanges.length) {
        skill.frameRanges = skill.frameRanges.slice();
      } else if (Array.isArray(skill.frameWidths) && skill.frameWidths.length) {
        skill.frameRanges = [];
        let x = 0;
        for (const fw of skill.frameWidths) {
          const widthValue = Math.max(1, Math.floor(fw));
          skill.frameRanges.push({ x, w: widthValue });
          x += widthValue;
        }
      } else if (skill.frameW) {
        skill.frameRanges = [];
        const count = skill.frameCount || DEFAULT_SKILL_FRAME_COUNT;
        for (let i = 0; i < count; i += 1) {
          skill.frameRanges.push({ x: i * skill.frameW, w: skill.frameW });
        }
      } else if (skill.frameCount) {
        skill.frameRanges = buildEvenRanges(img.width, skill.frameCount);
      } else {
        const detected = detectVariableFrameRanges(img, skill.frameCount);
        skill.frameRanges = detected && detected.length ? detected : buildEvenRanges(img.width, DEFAULT_SKILL_FRAME_COUNT);
      }
    }));
  }
  await Promise.all(jobs);
  state.spritesReady = true;
}
