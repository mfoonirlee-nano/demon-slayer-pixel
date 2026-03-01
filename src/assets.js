import { PLAYER_SHEETS, ENEMY_SHEETS, BOSS_SHEET, WATER_FX_SHEET, SKILLS } from "./constants.js";
import { loadImage, buildEvenRanges } from "./utils.js";
import { state } from "./state.js";

function detectVariableFrameRanges(image, expectedCount) {
  try {
    const w = image.width;
    const h = image.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    const alphaThreshold = 8;
    let top = 0;
    let bottom = h - 1;
    let found = false;
    for (let y = 0; y < h && !found; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = (y * w + x) * 4 + 3;
        if (data[idx] > alphaThreshold) {
          top = y;
          found = true;
          break;
        }
      }
    }
    found = false;
    for (let y = h - 1; y >= 0 && !found; y -= 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = (y * w + x) * 4 + 3;
        if (data[idx] > alphaThreshold) {
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
    const maxOpaquePerColumn = Math.max(1, Math.floor(contentRows * 0.02));
    const opaqueCountPerCol = new Array(w).fill(0);
    for (let x = 0; x < w; x += 1) {
      let cnt = 0;
      for (let y = top; y <= bottom; y += 1) {
        const idx = (y * w + x) * 4 + 3;
        if (data[idx] > alphaThreshold) {
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
    const runs = [];
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
    const minSep = 2;
    const goodRuns = runs.filter((r) => r[1] - r[0] + 1 >= minSep);
    let contentStart = 0;
    let contentEnd = w;
    if (goodRuns.length && goodRuns[0][0] === 0) contentStart = goodRuns[0][1] + 1;
    if (goodRuns.length) {
      const last = goodRuns[goodRuns.length - 1];
      if (last[1] === w - 1) contentEnd = last[0];
    }
    const ranges = [];
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
    function adjustToExpected(list) {
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
            if (!left) {
              right.x = out[idx].x;
              right.w += out[idx].w;
              out.splice(idx, 1);
            } else if (!right) {
              left.w += out[idx].w;
              out.splice(idx, 1);
            } else {
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
            if (r.w <= 2) break;
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
  const jobs = [];
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
  jobs.push(loadImage(WATER_FX_SHEET.src).then((img) => {
    WATER_FX_SHEET.image = img;
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
          const wv = Math.max(1, Math.floor(fw));
          skill.frameRanges.push({ x, w: wv });
          x += wv;
        }
      } else {
        const detected = detectVariableFrameRanges(img, skill.frameCount);
        if (detected && detected.length) {
          skill.frameRanges = detected;
        } else if (skill.frameW) {
        skill.frameRanges = [];
        const count = skill.frameCount || 6;
        for (let i = 0; i < count; i++) {
            skill.frameRanges.push({ x: i * skill.frameW, w: skill.frameW });
        }
        } else {
          skill.frameRanges = buildEvenRanges(img.width, skill.frameCount || 6);
        }
      }
      const widths = (skill.frameRanges || []).map(fr => fr.w);
      try {
        console.log(`[${skill.id}] frame widths (${widths.length}):`, widths);
      } catch (_) {}
    }));
  }
  await Promise.all(jobs);
  state.spritesReady = true;
}
