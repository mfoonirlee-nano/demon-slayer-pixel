import os
import struct
import zlib


ROOT = os.path.dirname(os.path.abspath(__file__))
SPRITES_DIR = os.path.join(ROOT, "assets", "sprites")


SPRITE_SHEET_SPECS = {
    "player/player_idle.png": dict(frame_w=320, frame_h=380, count=6, padding=10, anchor_y="bottom"),
    "player/player_run.png": dict(frame_w=320, frame_h=430, count=6, padding=10, anchor_y="bottom"),
    "player/player_jump.png": dict(frame_w=300, frame_h=310, count=6, padding=8, anchor_y="bottom"),
    "player/player_attack.png": dict(frame_w=400, frame_h=400, count=6, padding=12, anchor_y="bottom"),
    "player/player_fall_attack.png": dict(frame_w=400, frame_h=400, count=6, padding=12, anchor_y="bottom"),
    "enemies/chaser/chaser.png": dict(frame_w=287, frame_h=282, count=8, padding=8, anchor_y="bottom"),
    "enemies/crawler/crawler.png": dict(frame_w=314, frame_h=145, count=4, padding=6, anchor_y="bottom"),
    "enemies/crawler/crawler_windup.png": dict(frame_w=314, frame_h=145, count=4, padding=6, anchor_y="bottom"),
    "enemies/crawler/crawler_lunge.png": dict(frame_w=314, frame_h=145, count=5, padding=6, anchor_y="bottom"),
    "enemies/crawler/crawler_recover.png": dict(frame_w=314, frame_h=145, count=3, padding=6, anchor_y="bottom"),
    "enemies/runner/runner_approach.png": dict(frame_w=250, frame_h=250, count=6, padding=8, anchor_y="bottom"),
    "enemies/runner/runner_windup.png": dict(frame_w=250, frame_h=250, count=4, padding=8, anchor_y="bottom"),
    "enemies/runner/runner_dash.png": dict(frame_w=250, frame_h=250, count=5, padding=8, anchor_y="bottom"),
    "enemies/runner/runner_recover.png": dict(frame_w=250, frame_h=250, count=3, padding=8, anchor_y="bottom"),
    "enemies/caster/caster_move.png": dict(frame_w=288, frame_h=360, count=4, padding=10, anchor_y="bottom"),
    "enemies/caster/caster_windup.png": dict(frame_w=288, frame_h=360, count=4, padding=10, anchor_y="bottom"),
    "enemies/caster/caster_cast.png": dict(frame_w=288, frame_h=360, count=4, padding=10, anchor_y="bottom"),
    "enemies/caster/caster_recover.png": dict(frame_w=288, frame_h=360, count=3, padding=10, anchor_y="bottom"),
    "enemies/caster/caster_hit.png": dict(frame_w=288, frame_h=360, count=3, padding=10, anchor_y="bottom"),
    "enemies/caster/caster_wisp.png": dict(frame_w=96, frame_h=96, count=4, padding=4, anchor_y="center"),
    "enemies/duelist/duelist.png": dict(frame_w=320, frame_h=360, count=4, padding=10, anchor_y="bottom"),
    "enemies/brute/brute_advance.png": dict(frame_w=320, frame_h=360, count=6, padding=10, anchor_y="bottom"),
    "enemies/brute/brute_guard.png": dict(frame_w=320, frame_h=360, count=4, padding=10, anchor_y="bottom"),
    "enemies/brute/brute_shield_bash.png": dict(frame_w=320, frame_h=360, count=5, padding=10, anchor_y="bottom"),
    "enemies/brute/brute_recover.png": dict(frame_w=320, frame_h=360, count=3, padding=10, anchor_y="bottom"),
    "enemies/brute/brute_shield_break.png": dict(frame_w=320, frame_h=360, count=4, padding=10, anchor_y="bottom"),
    "enemies/brute/brute_broken_advance.png": dict(frame_w=320, frame_h=360, count=6, padding=10, anchor_y="bottom"),
    "enemies/brute/brute_cleave.png": dict(frame_w=320, frame_h=360, count=5, padding=10, anchor_y="bottom"),
    "enemies/brute/brute_broken_recover.png": dict(frame_w=320, frame_h=360, count=3, padding=10, anchor_y="bottom"),
    "boss/boss.png": dict(frame_w=350, frame_h=419, count=4, padding=12, anchor_y="bottom"),
    "boss/boss_skill1.png": dict(frame_w=400, frame_h=400, count=6, padding=12, anchor_y="center"),
    "boss/boss_skill1_effect.png": dict(frame_w=400, frame_h=350, count=6, padding=10, anchor_y="center"),
    "skills/skill1.png": dict(frame_w=800, frame_h=420, count=5, padding=12, anchor_y="center"),
    "skills/skill1_effect.png": dict(frame_w=250, frame_h=150, count=7, padding=6, anchor_y="center"),
    "skills/skill2.png": dict(frame_w=500, frame_h=500, count=6, padding=12, anchor_y="center"),
    "skills/skill2_effect.png": dict(frame_w=380, frame_h=450, count=6, padding=10, anchor_y="center"),
    "skills/skill3.png": dict(frame_w=540, frame_h=470, count=5, padding=12, anchor_y="center"),
    "skills/skill3_effect.png": dict(frame_w=400, frame_h=300, count=6, padding=10, anchor_y="center"),
    "skills/ultimate_skill.png": dict(frame_w=400, frame_h=496, count=6, padding=12, anchor_y="center"),
    "skills/ultimate_skill_effect.png": dict(frame_w=432, frame_h=496, count=5, padding=12, anchor_y="center"),
}

SPRITE_REL_BY_BASENAME = {
    os.path.basename(rel): rel
    for rel in SPRITE_SHEET_SPECS
}


def normalize_rel(path):
    return path.replace("\\", "/").lstrip("./")


def sprite_rel_for_path(path, sprites_dir=SPRITES_DIR):
    rel = normalize_rel(os.path.relpath(path, sprites_dir))
    if rel in SPRITE_SHEET_SPECS:
        return rel
    return SPRITE_REL_BY_BASENAME.get(os.path.basename(path))


def sprite_rel_for_origin(rel_path):
    rel = normalize_rel(rel_path)
    if rel in SPRITE_SHEET_SPECS:
        return rel
    return SPRITE_REL_BY_BASENAME.get(os.path.basename(rel), rel)


def parse_png_rgba(path):
    with open(path, "rb") as f:
        data = f.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not PNG: {path}")

    pos = 8
    width = height = None
    bit_depth = color_type = interlace = None
    palette = None
    transparency = b""
    idat = bytearray()

    while pos < len(data):
        ln = struct.unpack("!I", data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        pos += 12 + ln

        if typ == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack("!IIBBBBB", chunk)
        elif typ == b"PLTE":
            palette = [tuple(chunk[i:i + 3]) for i in range(0, len(chunk), 3)]
        elif typ == b"tRNS":
            transparency = chunk
        elif typ == b"IDAT":
            idat.extend(chunk)
        elif typ == b"IEND":
            break

    if interlace != 0:
        raise ValueError(
            f"Unsupported PNG mode in {path}: bit_depth={bit_depth}, "
            f"color_type={color_type}, interlace={interlace}"
        )
    if color_type == 3:
        if bit_depth not in (1, 2, 4, 8):
            raise ValueError(
                f"Unsupported PNG mode in {path}: bit_depth={bit_depth}, "
                f"color_type={color_type}, interlace={interlace}"
            )
    elif bit_depth != 8:
        raise ValueError(
            f"Unsupported PNG mode in {path}: bit_depth={bit_depth}, "
            f"color_type={color_type}, interlace={interlace}"
        )

    modes = {
        0: (1, 1),
        2: (3, 3),
        4: (2, 2),
        6: (4, 4),
    }
    if color_type == 3:
        channels, bpp = 1, 1
        stride = width if bit_depth == 8 else (width * bit_depth + 7) // 8
    elif color_type in modes:
        channels, bpp = modes[color_type]
        stride = width * channels
    else:
        raise ValueError(f"Unsupported PNG color_type={color_type} in {path}")

    raw = zlib.decompress(bytes(idat))
    rows = bytearray(height * stride)

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
                left = row[i - bpp] if i >= bpp else 0
                row[i] = (row[i] + left) & 0xFF
        elif ftype == 2:
            for i in range(stride):
                row[i] = (row[i] + prev[i]) & 0xFF
        elif ftype == 3:
            for i in range(stride):
                left = row[i - bpp] if i >= bpp else 0
                up = prev[i]
                row[i] = (row[i] + ((left + up) >> 1)) & 0xFF
        elif ftype == 4:
            for i in range(stride):
                left = row[i - bpp] if i >= bpp else 0
                up = prev[i]
                up_left = prev[i - bpp] if i >= bpp else 0
                row[i] = (row[i] + paeth(left, up, up_left)) & 0xFF
        elif ftype != 0:
            raise ValueError(f"Unsupported filter type {ftype} in {path}")

        rows[y * stride:(y + 1) * stride] = row
        prev = row

    rgba = bytearray(width * height * 4)
    if color_type == 6:
        rgba[:] = rows
    elif color_type == 2:
        transparent_rgb = None
        if len(transparency) >= 6:
            transparent_rgb = tuple(struct.unpack("!HHH", transparency[:6]))
        for i in range(width * height):
            src = i * 3
            dst = i * 4
            r, g, b = rows[src], rows[src + 1], rows[src + 2]
            a = 0 if transparent_rgb == (r, g, b) else 255
            rgba[dst:dst + 4] = bytes((r, g, b, a))
    elif color_type == 3:
        if palette is None:
            raise ValueError(f"Palette PNG missing PLTE chunk: {path}")
        for y in range(height):
            row = rows[y * stride:(y + 1) * stride]
            out_x = 0
            for byte in row:
                if bit_depth == 8:
                    indexes = (byte,)
                elif bit_depth == 4:
                    indexes = (byte >> 4, byte & 0x0F)
                elif bit_depth == 2:
                    indexes = ((byte >> 6) & 0x03, (byte >> 4) & 0x03, (byte >> 2) & 0x03, byte & 0x03)
                else:
                    indexes = tuple((byte >> shift) & 0x01 for shift in range(7, -1, -1))
                for color_index in indexes:
                    if out_x >= width:
                        break
                    dst = (y * width + out_x) * 4
                    if color_index >= len(palette):
                        raise ValueError(f"Palette index out of range in {path}")
                    r, g, b = palette[color_index]
                    a = transparency[color_index] if color_index < len(transparency) else 255
                    rgba[dst:dst + 4] = bytes((r, g, b, a))
                    out_x += 1
    elif color_type == 0:
        transparent_gray = None
        if len(transparency) >= 2:
            transparent_gray = struct.unpack("!H", transparency[:2])[0]
        for i, gray in enumerate(rows):
            dst = i * 4
            a = 0 if transparent_gray == gray else 255
            rgba[dst:dst + 4] = bytes((gray, gray, gray, a))
    elif color_type == 4:
        for i in range(width * height):
            src = i * 2
            dst = i * 4
            gray, a = rows[src], rows[src + 1]
            rgba[dst:dst + 4] = bytes((gray, gray, gray, a))

    return width, height, rgba


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


def alpha_bbox(rgba, w, h, x0=0, y0=0, x1=None, y1=None, threshold=0):
    if x1 is None:
        x1 = w
    if y1 is None:
        y1 = h
    min_x = min_y = None
    max_x = max_y = None
    for y in range(y0, y1):
        row = y * w
        for x in range(x0, x1):
            if rgba[(row + x) * 4 + 3] <= threshold:
                continue
            if min_x is None:
                min_x = max_x = x
                min_y = max_y = y
            else:
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
    if min_x is None:
        return None
    return (min_x, min_y, max_x + 1, max_y + 1)


def _content_runs_by_alpha(rgba, w, h, count, threshold):
    min_column_pixels = max(1, h // 160)
    active = []
    for x in range(w):
        pixels = 0
        for y in range(h):
            if rgba[(y * w + x) * 4 + 3] > threshold:
                pixels += 1
                if pixels >= min_column_pixels:
                    break
        active.append(pixels >= min_column_pixels)

    runs = []
    start = None
    for x, is_active in enumerate(active):
        if is_active and start is None:
            start = x
        elif not is_active and start is not None:
            runs.append([start, x])
            start = None
    if start is not None:
        runs.append([start, w])

    merge_gap = max(2, min(12, w // max(1, count * 30)))
    merged = []
    for run in runs:
        if merged and run[0] - merged[-1][1] <= merge_gap:
            merged[-1][1] = run[1]
        else:
            merged.append(run)
    return merged


def _merge_regions_to_count(regions, count):
    regions = [list(region) for region in regions]
    while len(regions) > count:
        best_i = 0
        best_gap = regions[1][0] - regions[0][1]
        for i in range(1, len(regions) - 1):
            gap = regions[i + 1][0] - regions[i][1]
            if gap < best_gap:
                best_i = i
                best_gap = gap
        regions[best_i][1] = regions[best_i + 1][1]
        del regions[best_i + 1]
    return [tuple(region) for region in regions]


def detect_sequence_bboxes(rgba, w, h, count, threshold=8):
    runs = _content_runs_by_alpha(rgba, w, h, count, threshold)
    if len(runs) > count:
        runs = _merge_regions_to_count(runs, count)
    if len(runs) != count:
        return []

    boxes = []
    for x0, x1 in runs:
        bbox = alpha_bbox(rgba, w, h, x0, 0, x1, h, 0)
        if bbox is None:
            return []
        boxes.append(bbox)
    return boxes


def equal_frame_bboxes(rgba, w, h, count):
    boxes = []
    for i in range(count):
        x0 = round(i * w / count)
        x1 = round((i + 1) * w / count)
        bbox = alpha_bbox(rgba, w, h, x0, 0, x1, h, 0)
        boxes.append(bbox)
    return boxes


def _paste_scaled_region(src_rgba, src_w, bbox, dst_rgba, dst_w, frame_x, spec):
    frame_w = spec["frame_w"]
    frame_h = spec["frame_h"]
    padding = min(spec.get("padding", 8), frame_w // 3, frame_h // 3)
    anchor_y = spec.get("anchor_y", "center")
    x0, y0, x1, y1 = bbox
    src_region_w = x1 - x0
    src_region_h = y1 - y0
    max_w = max(1, frame_w - padding * 2)
    max_h = max(1, frame_h - padding * 2)
    scale = min(1.0, max_w / src_region_w, max_h / src_region_h)
    out_w = max(1, round(src_region_w * scale))
    out_h = max(1, round(src_region_h * scale))
    dst_x0 = frame_x + (frame_w - out_w) // 2
    if anchor_y == "bottom":
        dst_y0 = frame_h - padding - out_h
    elif anchor_y == "top":
        dst_y0 = padding
    else:
        dst_y0 = (frame_h - out_h) // 2
    dst_y0 = max(0, min(frame_h - out_h, dst_y0))

    for dy in range(out_h):
        src_y = y0 + min(src_region_h - 1, dy * src_region_h // out_h)
        dst_row = (dst_y0 + dy) * dst_w
        src_row = src_y * src_w
        for dx in range(out_w):
            src_x = x0 + min(src_region_w - 1, dx * src_region_w // out_w)
            src_i = (src_row + src_x) * 4
            dst_i = (dst_row + dst_x0 + dx) * 4
            dst_rgba[dst_i:dst_i + 4] = src_rgba[src_i:src_i + 4]

    return scale < 1.0


def reframe_sheet_rgba(rgba, w, h, spec, use_detected_regions=None):
    count = spec["count"]
    target_w = spec["frame_w"] * count
    target_h = spec["frame_h"]
    if use_detected_regions is None:
        use_detected_regions = (w, h) != (target_w, target_h)

    boxes = detect_sequence_bboxes(rgba, w, h, count) if use_detected_regions else []
    used_detected = bool(boxes)
    if not boxes:
        boxes = equal_frame_bboxes(rgba, w, h, count)

    if (w, h) == (target_w, target_h) and not use_detected_regions:
        touches_frame_edge = False
        for frame, bbox in enumerate(boxes):
            if bbox is None:
                continue
            cell_x0 = frame * spec["frame_w"]
            cell_x1 = cell_x0 + spec["frame_w"]
            if bbox[0] <= cell_x0 or bbox[1] <= 0 or bbox[2] >= cell_x1 or bbox[3] >= target_h:
                touches_frame_edge = True
                break
        if not touches_frame_edge:
            return w, h, rgba, False, False, 0

    out = bytearray(target_w * target_h * 4)
    scaled = 0
    for frame, bbox in enumerate(boxes):
        if bbox is None:
            continue
        if _paste_scaled_region(rgba, w, bbox, out, target_w, frame * spec["frame_w"], spec):
            scaled += 1

    return target_w, target_h, out, True, used_detected, scaled


def reframe_sheet_if_known(rel_path, rgba, w, h, use_detected_regions=None):
    if rel_path is None:
        return w, h, rgba, False, False, 0
    rel = normalize_rel(rel_path)
    spec = SPRITE_SHEET_SPECS.get(rel)
    if spec is None:
        return w, h, rgba, False, False, 0
    return reframe_sheet_rgba(rgba, w, h, spec, use_detected_regions)
