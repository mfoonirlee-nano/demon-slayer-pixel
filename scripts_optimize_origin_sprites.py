import os
import struct
import zlib
from collections import Counter, deque


ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(ROOT, "assets", "origin")
DST_DIR = os.path.join(ROOT, "assets", "sprites")


def parse_png_rgba(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not PNG: {path}")

    pos = 8
    width = height = None
    bit_depth = color_type = interlace = None
    idat = bytearray()

    while pos < len(data):
        ln = struct.unpack("!I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        pos += 12 + ln

        if typ == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack("!IIBBBBB", chunk)
            if bit_depth != 8 or color_type != 6 or interlace != 0:
                raise ValueError(
                    f"Unsupported PNG mode in {path}: bit_depth={bit_depth}, "
                    f"color_type={color_type}, interlace={interlace}"
                )
        elif typ == b"IDAT":
            idat.extend(chunk)
        elif typ == b"IEND":
            break

    raw = zlib.decompress(bytes(idat))
    stride = width * 4
    out = bytearray(width * height * 4)

    def paeth(a, b, c):
        p = a + b - c
        pa = abs(p - a)
        pb = abs(p - b)
        pc = abs(p - c)
        if pa <= pb and pa <= pc:
            return a
        if pb <= pc:
            return b
        return c

    in_pos = 0
    prev = bytearray(stride)
    for y in range(height):
        ftype = raw[in_pos]
        in_pos += 1
        row = bytearray(raw[in_pos:in_pos + stride])
        in_pos += stride

        if ftype == 1:
            for i in range(stride):
                left = row[i - 4] if i >= 4 else 0
                row[i] = (row[i] + left) & 0xFF
        elif ftype == 2:
            for i in range(stride):
                row[i] = (row[i] + prev[i]) & 0xFF
        elif ftype == 3:
            for i in range(stride):
                left = row[i - 4] if i >= 4 else 0
                up = prev[i]
                row[i] = (row[i] + ((left + up) >> 1)) & 0xFF
        elif ftype == 4:
            for i in range(stride):
                left = row[i - 4] if i >= 4 else 0
                up = prev[i]
                up_left = prev[i - 4] if i >= 4 else 0
                row[i] = (row[i] + paeth(left, up, up_left)) & 0xFF
        elif ftype != 0:
            raise ValueError(f"Unsupported filter type {ftype} in {path}")

        out[y * stride:(y + 1) * stride] = row
        prev = row

    return width, height, out


def save_png_rgba(path, w, h, rgba):
    def chunk(tag, payload):
        return (
            struct.pack("!I", len(payload))
            + tag
            + payload
            + struct.pack("!I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)
        raw.extend(rgba[y * stride:(y + 1) * stride])

    ihdr = struct.pack("!IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png.extend(chunk(b"IHDR", ihdr))
    png.extend(chunk(b"IDAT", zlib.compress(bytes(raw), 9)))
    png.extend(chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)


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
        return set()

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
        return 0, 0

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


def process_one(src_path, dst_path):
    w, h, rgba = parse_png_rgba(src_path)
    removed, speck_removed, neighbor_removed = transparentize_connected_bg(rgba, w, h)
    save_png_rgba(dst_path, w, h, rgba)
    return w, h, removed, speck_removed, neighbor_removed


def main():
    if not os.path.isdir(SRC_DIR):
        raise SystemExit(f"missing source dir: {SRC_DIR}")
    os.makedirs(DST_DIR, exist_ok=True)

    names = sorted(
        f for f in os.listdir(SRC_DIR)
        if f.lower().endswith(".png")
    )
    if not names:
        print("no png files found in", SRC_DIR)
        return

    for name in names:
        src = os.path.join(SRC_DIR, name)
        dst = os.path.join(DST_DIR, name)
        try:
            w, h, removed, speck_removed, neighbor_removed = process_one(src, dst)
            print(
                f"{name}: {w}x{h}, bg_removed={removed}, speck_removed={speck_removed}, "
                f"neighbor_removed={neighbor_removed}, out={dst}"
            )
        except Exception as e:
            print(f"{name}: skipped ({e})")


if __name__ == "__main__":
    main()
