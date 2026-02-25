import os
import struct
import zlib
from collections import deque

SPRITES_DIR = '/Users/bytedance/Work/demon-slayer/assets/sprites'


def parse_png_rgba(path):
    with open(path, 'rb') as f:
        data = f.read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'Not PNG: {path}')

    pos = 8
    width = height = None
    color_type = bit_depth = None
    interlace = None
    idat = bytearray()

    while pos < len(data):
        ln = struct.unpack('!I', data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        pos += 12 + ln

        if typ == b'IHDR':
            width, height, bit_depth, color_type, comp, flt, interlace = struct.unpack('!IIBBBBB', chunk)
            if bit_depth != 8 or color_type != 6 or interlace != 0:
                raise ValueError(f'Unsupported PNG mode in {path}: bit_depth={bit_depth}, color_type={color_type}, interlace={interlace}')
        elif typ == b'IDAT':
            idat.extend(chunk)
        elif typ == b'IEND':
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
            raise ValueError(f'Unsupported filter type {ftype} in {path}')

        out[y * stride:(y + 1) * stride] = row
        prev = row

    return width, height, out


def save_png_rgba(path, w, h, rgba):
    def chunk(tag, payload):
        return struct.pack('!I', len(payload)) + tag + payload + struct.pack('!I', zlib.crc32(tag + payload) & 0xFFFFFFFF)

    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)
        raw.extend(rgba[y * stride:(y + 1) * stride])

    ihdr = struct.pack('!IIBBBBB', w, h, 8, 6, 0, 0, 0)
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    png.extend(chunk(b'IHDR', ihdr))
    png.extend(chunk(b'IDAT', zlib.compress(bytes(raw), 9)))
    png.extend(chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


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
    w, h, rgba = parse_png_rgba(path)
    removed = remove_background_connected(rgba, w, h)
    save_png_rgba(path, w, h, rgba)
    return removed, w, h


def main():
    files = [
        os.path.join(SPRITES_DIR, f)
        for f in os.listdir(SPRITES_DIR)
        if f.lower().endswith('.png') and not f.endswith('_transparency_test.png')
    ]
    files.sort()

    for path in files:
        try:
            removed, w, h = process_file(path)
            print(f'{os.path.basename(path)}: removed={removed}, size={w}x{h}')
        except Exception as e:
            print(f'{os.path.basename(path)}: skipped ({e})')


if __name__ == '__main__':
    main()
