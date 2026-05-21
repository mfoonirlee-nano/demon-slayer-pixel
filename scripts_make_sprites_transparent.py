import os
from collections import deque

from scripts_sprite_sheet_utils import (
    SPRITES_DIR,
    parse_png_rgba,
    reframe_sheet_if_known,
    save_png_rgba,
    sprite_rel_for_path,
)


def is_bg_pixel(r, g, b, a):
    if a == 0:
        return False
    mx = max(r, g, b)
    mn = min(r, g, b)
    # Light neutral colors used by checkerboard background.
    return 190 <= mx <= 255 and (mx - mn) <= 22


def remove_background_connected(rgba, w, h):
    visited = bytearray(w * h)
    q = deque()

    def try_push(x, y):
        idx = y * w + x
        if visited[idx]:
            return
        p = idx * 4
        r, g, b, a = rgba[p], rgba[p + 1], rgba[p + 2], rgba[p + 3]
        if is_bg_pixel(r, g, b, a):
            visited[idx] = 1
            q.append((x, y))

    for x in range(w):
        try_push(x, 0)
        try_push(x, h - 1)
    for y in range(h):
        try_push(0, y)
        try_push(w - 1, y)

    removed = 0
    while q:
        x, y = q.popleft()
        idx = y * w + x
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

    return removed


def process_file(path):
    sprite_rel = sprite_rel_for_path(path)
    w, h, rgba = parse_png_rgba(path)
    removed = remove_background_connected(rgba, w, h)
    w, h, rgba, reframed, detected_regions, scaled = reframe_sheet_if_known(sprite_rel, rgba, w, h)
    save_png_rgba(path, w, h, rgba)
    return removed, w, h, reframed, detected_regions, scaled


def main():
    files = []
    for dirpath, _, names in os.walk(SPRITES_DIR):
        for name in names:
            if name.lower().endswith('.png') and not name.endswith('_transparency_test.png'):
                files.append(os.path.join(dirpath, name))
    files.sort()

    for path in files:
        rel = os.path.relpath(path, SPRITES_DIR)
        try:
            removed, w, h, reframed, detected_regions, scaled = process_file(path)
            print(
                f'{rel}: removed={removed}, size={w}x{h}, reframed={reframed}, '
                f'detected_regions={detected_regions}, scaled_frames={scaled}'
            )
        except Exception as e:
            print(f'{rel}: skipped ({e})')


if __name__ == '__main__':
    main()
