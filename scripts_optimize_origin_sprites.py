import os
from collections import Counter, deque

from scripts_sprite_sheet_utils import (
    SPRITES_DIR,
    parse_png_rgba,
    reframe_sheet_if_known,
    save_png_rgba,
    sprite_rel_for_origin,
)

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(ROOT, "assets", "origin")
DST_DIR = SPRITES_DIR


def qbin(r, g, b):
    return (r >> 3, g >> 3, b >> 3)


def build_bg_palette(rgba, w, h):
    c = Counter()
    coords = []
    for x in range(w):
        coords.append((x, 0))
        coords.append((x, h - 1))
    for y in range(1, h - 1):
        coords.append((0, y))
        coords.append((w - 1, y))

    for x, y in coords:
        p = (y * w + x) * 4
        a = rgba[p + 3]
        if a == 0:
            continue
        c[qbin(rgba[p], rgba[p + 1], rgba[p + 2])] += 1

    if not c:
        return set(), []

    total = sum(c.values())
    picked = []
    acc = 0
    for color_bin, count in c.most_common(48):
        picked.append(color_bin)
        acc += count
        if acc / total >= 0.95:
            break
    return set(picked), picked


def is_bg_bin_near(bin_rgb, bg_centers):
    br, bg, bb = bin_rgb
    for cr, cg, cb in bg_centers:
        dr = abs(br - cr)
        dg = abs(bg - cg)
        db = abs(bb - cb)
        if max(dr, dg, db) <= 2 and (dr + dg + db) <= 4:
            return True
    return False


def is_bg_pixel(rgba, idx, bg_bins, bg_centers):
    a = rgba[idx + 3]
    if a == 0:
        return True
    b = qbin(rgba[idx], rgba[idx + 1], rgba[idx + 2])
    return b in bg_bins or is_bg_bin_near(b, bg_centers)


def clear_small_bg_speckles(rgba, w, h, bg_bins, bg_centers, max_component=220):
    visited = bytearray(w * h)
    removed = 0

    for start in range(w * h):
        if visited[start]:
            continue
        p = start * 4
        if not is_bg_pixel(rgba, p, bg_bins, bg_centers):
            visited[start] = 1
            continue
        if rgba[p + 3] == 0:
            visited[start] = 1
            continue

        q = deque([start])
        visited[start] = 1
        comp = []
        touches_edge = False

        while q:
            idx = q.popleft()
            comp.append(idx)
            x = idx % w
            y = idx // w
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                touches_edge = True

            if x > 0:
                n = idx - 1
                if not visited[n]:
                    np = n * 4
                    if rgba[np + 3] != 0 and is_bg_pixel(rgba, np, bg_bins, bg_centers):
                        visited[n] = 1
                        q.append(n)
                    else:
                        visited[n] = 1
            if x + 1 < w:
                n = idx + 1
                if not visited[n]:
                    np = n * 4
                    if rgba[np + 3] != 0 and is_bg_pixel(rgba, np, bg_bins, bg_centers):
                        visited[n] = 1
                        q.append(n)
                    else:
                        visited[n] = 1
            if y > 0:
                n = idx - w
                if not visited[n]:
                    np = n * 4
                    if rgba[np + 3] != 0 and is_bg_pixel(rgba, np, bg_bins, bg_centers):
                        visited[n] = 1
                        q.append(n)
                    else:
                        visited[n] = 1
            if y + 1 < h:
                n = idx + w
                if not visited[n]:
                    np = n * 4
                    if rgba[np + 3] != 0 and is_bg_pixel(rgba, np, bg_bins, bg_centers):
                        visited[n] = 1
                        q.append(n)
                    else:
                        visited[n] = 1

        if not touches_edge and len(comp) <= max_component:
            for idx in comp:
                alpha_i = idx * 4 + 3
                if rgba[alpha_i] != 0:
                    rgba[alpha_i] = 0
                    removed += 1

    return removed


def clear_bg_noise_by_neighbors(rgba, w, h, bg_bins, bg_centers, rounds=2, min_trans_neighbors=6):
    removed = 0
    for _ in range(rounds):
        to_clear = []
        for y in range(1, h - 1):
            row = y * w
            for x in range(1, w - 1):
                idx = row + x
                p = idx * 4
                if rgba[p + 3] == 0:
                    continue
                if not is_bg_pixel(rgba, p, bg_bins, bg_centers):
                    continue
                trans_neighbors = 0
                for ny in (y - 1, y, y + 1):
                    for nx in (x - 1, x, x + 1):
                        if nx == x and ny == y:
                            continue
                        n = (ny * w + nx) * 4 + 3
                        if rgba[n] == 0:
                            trans_neighbors += 1
                if trans_neighbors >= min_trans_neighbors:
                    to_clear.append(p + 3)
        for alpha_i in to_clear:
            if rgba[alpha_i] != 0:
                rgba[alpha_i] = 0
                removed += 1
    return removed


def transparentize_connected_bg(rgba, w, h):
    bg_bins, bg_centers = build_bg_palette(rgba, w, h)
    if not bg_bins:
        return 0, 0, 0

    visited = bytearray(w * h)
    q = deque()

    def try_push(x, y):
        idx = y * w + x
        if visited[idx]:
            return
        p = idx * 4
        if is_bg_pixel(rgba, p, bg_bins, bg_centers):
            visited[idx] = 1
            q.append(idx)

    for x in range(w):
        try_push(x, 0)
        try_push(x, h - 1)
    for y in range(h):
        try_push(0, y)
        try_push(w - 1, y)

    removed = 0
    while q:
        idx = q.popleft()
        x = idx % w
        y = idx // w
        p = idx * 4
        if rgba[p + 3] != 0:
            rgba[p + 3] = 0
            removed += 1

        if x > 0:
            try_push(x - 1, y)
        if x + 1 < w:
            try_push(x + 1, y)
        if y > 0:
            try_push(x, y - 1)
        if y + 1 < h:
            try_push(x, y + 1)

    speck_removed = clear_small_bg_speckles(rgba, w, h, bg_bins, bg_centers, max_component=700)
    neighbor_removed = clear_bg_noise_by_neighbors(rgba, w, h, bg_bins, bg_centers)
    return removed, speck_removed, neighbor_removed


def process_one(src_path, dst_path, sprite_rel):
    w, h, rgba = parse_png_rgba(src_path)
    removed, speck_removed, neighbor_removed = transparentize_connected_bg(rgba, w, h)
    w, h, rgba, reframed, detected_regions, scaled = reframe_sheet_if_known(sprite_rel, rgba, w, h)
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    save_png_rgba(dst_path, w, h, rgba)
    return w, h, removed, speck_removed, neighbor_removed, reframed, detected_regions, scaled


def main():
    if not os.path.isdir(SRC_DIR):
        raise SystemExit(f"missing source dir: {SRC_DIR}")
    os.makedirs(DST_DIR, exist_ok=True)

    sources = []
    for dirpath, _, files in os.walk(SRC_DIR):
        for name in files:
            if name.lower().endswith(".png"):
                src = os.path.join(dirpath, name)
                rel = os.path.relpath(src, SRC_DIR)
                sources.append((src, sprite_rel_for_origin(rel)))
    sources.sort(key=lambda item: item[1])

    if not sources:
        print("no png files found in", SRC_DIR)
        return

    for src, sprite_rel in sources:
        dst = os.path.join(DST_DIR, sprite_rel)
        try:
            w, h, removed, speck_removed, neighbor_removed, reframed, detected_regions, scaled = process_one(
                src, dst, sprite_rel
            )
            print(
                f"{sprite_rel}: {w}x{h}, bg_removed={removed}, speck_removed={speck_removed}, "
                f"neighbor_removed={neighbor_removed}, reframed={reframed}, "
                f"detected_regions={detected_regions}, scaled_frames={scaled}, out={dst}"
            )
        except Exception as e:
            print(f"{sprite_rel}: skipped ({e})")


if __name__ == "__main__":
    main()
