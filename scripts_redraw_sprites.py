import math
import os
import struct
import zlib

ROOT = '/Users/bytedance/Work/demon-slayer/assets/sprites'
os.makedirs(ROOT, exist_ok=True)


def png_chunk(tag, data):
    return struct.pack('!I', len(data)) + tag + data + struct.pack('!I', zlib.crc32(tag + data) & 0xffffffff)


def save_png(path, w, h, rgba):
    raw = bytearray()
    row = w * 4
    for y in range(h):
        raw.append(0)
        i = y * row
        raw.extend(rgba[i:i + row])
    out = bytearray(b'\x89PNG\r\n\x1a\n')
    out.extend(png_chunk(b'IHDR', struct.pack('!IIBBBBB', w, h, 8, 6, 0, 0, 0)))
    out.extend(png_chunk(b'IDAT', zlib.compress(bytes(raw), 9)))
    out.extend(png_chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(out)


def col(hexv, a=255):
    hexv = hexv.lstrip('#')
    return (int(hexv[0:2], 16), int(hexv[2:4], 16), int(hexv[4:6], 16), a)


def new_img(w, h):
    return bytearray(w * h * 4)


def pset(img, w, h, x, y, c):
    if 0 <= x < w and 0 <= y < h:
        i = (y * w + x) * 4
        img[i:i + 4] = bytes(c)


def rect(img, w, h, x, y, ww, hh, c):
    for yy in range(y, y + hh):
        if 0 <= yy < h:
            base = yy * w
            for xx in range(x, x + ww):
                if 0 <= xx < w:
                    i = (base + xx) * 4
                    img[i:i + 4] = bytes(c)


def line(img, w, h, x1, y1, x2, y2, c):
    dx = abs(x2 - x1)
    sx = 1 if x1 < x2 else -1
    dy = -abs(y2 - y1)
    sy = 1 if y1 < y2 else -1
    err = dx + dy
    while True:
        pset(img, w, h, x1, y1, c)
        if x1 == x2 and y1 == y2:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x1 += sx
        if e2 <= dx:
            err += dx
            y1 += sy


def draw_haori_pattern(img, w, h, x, y, ww, hh, c_dark, c_green):
    for yy in range(hh):
        for xx in range(ww):
            cell = ((xx // 4) + (yy // 4)) % 2
            pset(img, w, h, x + xx, y + yy, c_green if cell else c_dark)


def draw_tanjiro_frame(img, W, H, ox, oy, p):
    c_outline = col('#1a0f18')
    c_skin = col('#f4cfb3')
    c_skin_shadow = col('#d6a98f')
    c_hair_dark = col('#4a1f2a')
    c_hair_light = col('#7a3248')
    c_eye = col('#5c1f2d')
    c_uniform = col('#122642')
    c_uniform_hi = col('#214679')
    c_green = col('#2ec082')
    c_haori_dark = col('#0b1b1c')
    c_pants = col('#3b202c')
    c_pants_hi = col('#5b2f41')
    c_foot = col('#1d1118')
    c_wrap = col('#8fb7b8')
    c_sword = col('#d8ecfb')
    c_sword_edge = col('#6aaef4')
    c_hilt = col('#3d2730')

    bob = p.get('bob', 0)
    lean = p.get('lean', 0)
    arm = p.get('arm', 0)
    leg = p.get('leg', 0)
    sword = p.get('sword', 0)

    body_x = ox + 14 + lean
    body_y = oy + 13 + bob

    # legs / stance
    rect(img, W, H, body_x - 6, body_y + 19 + leg, 7, 12, c_pants)
    rect(img, W, H, body_x + 5, body_y + 18 - leg, 8, 13, c_pants)
    rect(img, W, H, body_x - 4, body_y + 22 + leg, 4, 4, c_pants_hi)
    rect(img, W, H, body_x + 7, body_y + 21 - leg, 4, 4, c_pants_hi)

    rect(img, W, H, body_x - 6, body_y + 31 + leg, 7, 3, c_wrap)
    rect(img, W, H, body_x + 5, body_y + 31 - leg, 8, 3, c_wrap)
    rect(img, W, H, body_x - 7, body_y + 34 + leg, 8, 2, c_foot)
    rect(img, W, H, body_x + 5, body_y + 34 - leg, 9, 2, c_foot)

    # torso
    rect(img, W, H, body_x - 2, body_y + 8, 12, 12, c_uniform)
    rect(img, W, H, body_x - 1, body_y + 10, 8, 3, c_uniform_hi)

    # haori flowing behind
    draw_haori_pattern(img, W, H, body_x - 15, body_y + 7 + arm, 13, 10, c_haori_dark, c_green)
    draw_haori_pattern(img, W, H, body_x - 10, body_y + 14 + arm, 8, 6, c_haori_dark, c_green)
    draw_haori_pattern(img, W, H, body_x + 8, body_y + 8 - arm, 5, 9, c_haori_dark, c_green)

    # neck + head
    rect(img, W, H, body_x + 2, body_y + 6, 3, 2, c_skin_shadow)
    rect(img, W, H, body_x, body_y - 3, 10, 9, c_skin)
    rect(img, W, H, body_x + 1, body_y - 1, 8, 2, c_skin_shadow)

    # hair (spiky)
    rect(img, W, H, body_x - 1, body_y - 6, 11, 4, c_hair_dark)
    rect(img, W, H, body_x - 3, body_y - 4, 3, 4, c_hair_dark)
    rect(img, W, H, body_x + 10, body_y - 4, 3, 4, c_hair_dark)
    rect(img, W, H, body_x + 2, body_y - 8, 2, 2, c_hair_light)
    rect(img, W, H, body_x + 6, body_y - 7, 2, 2, c_hair_light)

    # face details
    pset(img, W, H, body_x + 3, body_y + 0, c_eye)
    pset(img, W, H, body_x + 7, body_y + 0, c_eye)
    pset(img, W, H, body_x + 4, body_y + 2, c_skin_shadow)
    pset(img, W, H, body_x + 6, body_y + 2, c_skin_shadow)

    # arms
    rect(img, W, H, body_x - 1, body_y + 10 + arm, 3, 8, c_uniform_hi)
    rect(img, W, H, body_x + 9, body_y + 10 - arm, 3, 8, c_uniform_hi)
    rect(img, W, H, body_x + 10, body_y + 16 - arm, 2, 2, c_skin)

    # sword
    sx = body_x + 12
    sy = body_y + 16 - arm
    length = 10 + sword
    rect(img, W, H, sx - 1, sy, 2, 2, c_hilt)
    line(img, W, H, sx + 1, sy + 1, sx + length, sy - 1, c_sword_edge)
    line(img, W, H, sx + 1, sy + 2, sx + length, sy, c_sword)

    # outline pass (lightweight)
    for y in range(oy + 2, oy + 46):
        for x in range(ox + 2, ox + 46):
            i = (y * W + x) * 4
            if img[i + 3] == 0:
                continue
            neighbors = [
                (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1),
            ]
            for nx, ny in neighbors:
                if 0 <= nx < W and 0 <= ny < H:
                    ni = (ny * W + nx) * 4
                    if img[ni + 3] == 0:
                        pset(img, W, H, nx, ny, c_outline)


def draw_water_arc(img, W, H, cx, cy, r, thickness, phase, start_deg=10, end_deg=170):
    c1 = col('#7ed8ff')
    c2 = col('#4daef0')
    c3 = col('#dff7ff')
    for t in range(start_deg, end_deg, 2):
        ang = (t + phase) * math.pi / 180.0
        x = int(cx + r * math.cos(ang))
        y = int(cy + r * math.sin(ang))
        for k in range(thickness):
            pset(img, W, H, x, y + k, c1)
            if k % 2 == 0:
                pset(img, W, H, x, y + k - 1, c2)
    for t in range(start_deg + 8, end_deg - 8, 7):
        ang = (t + phase) * math.pi / 180.0
        x = int(cx + (r - 2) * math.cos(ang))
        y = int(cy + (r - 2) * math.sin(ang))
        pset(img, W, H, x, y, c3)


def render_player_sheet(path, fw, fh, poses):
    W = fw * len(poses)
    H = fh
    img = new_img(W, H)
    for i, pose in enumerate(poses):
        ox = i * fw
        draw_tanjiro_frame(img, W, H, ox, 0, pose)
    save_png(path, W, H, img)


def render_water_fx_sheet(path):
    fw, fh, frames = 64, 48, 6
    W, H = fw * frames, fh
    img = new_img(W, H)
    for i in range(frames):
        ox = i * fw
        phase = i * 9
        radius = 16 + i * 2
        thickness = 2 + (1 if i > 2 else 0)
        center_x = ox + 30
        center_y = 24

        # Main circular sweep
        draw_water_arc(img, W, H, center_x, center_y, radius, thickness, phase, 18, 196)
        # Inner secondary flow
        draw_water_arc(img, W, H, center_x + 2, center_y + 2, radius - 5, 2, phase + 18, 26, 180)
        # Front slash tip
        tip_x = ox + 42 + i * 2
        tip_y = 20 - i
        line(img, W, H, tip_x - 8, tip_y + 8, tip_x + 7, tip_y, col('#6dc9ff'))
        line(img, W, H, tip_x - 8, tip_y + 9, tip_x + 7, tip_y + 1, col('#dff7ff'))
    save_png(path, W, H, img)


def draw_enemy(img, W, H, ox, oy, pose):
    c1 = col('#2b1221')
    c2 = col('#c34a67')
    c3 = col('#f4d0dd')
    c4 = col('#1a0f15')
    b = pose.get('bob', 0)
    a = pose.get('arm', 0)
    rect(img, W, H, ox + 6, oy + 9 + b, 12, 12, c1)
    rect(img, W, H, ox + 7, oy + 6 + b, 10, 4, c3)
    rect(img, W, H, ox + 4, oy + 10 + b + a, 2, 8, c2)
    rect(img, W, H, ox + 18, oy + 10 + b - a, 2, 8, c2)
    rect(img, W, H, ox + 8, oy + 21 + b, 3, 11, c4)
    rect(img, W, H, ox + 13, oy + 21 + b, 3, 11, c4)


def draw_boss(img, W, H, ox, oy, pose):
    c1 = col('#311623')
    c2 = col('#b63b62')
    c3 = col('#f2cad6')
    c4 = col('#190f16')
    b = pose.get('bob', 0)
    a = pose.get('arm', 0)
    j = pose.get('jaw', 0)
    rect(img, W, H, ox + 9, oy + 8 + b, 18, 16, c1)
    rect(img, W, H, ox + 10, oy + 4 + b, 16, 6, c3)
    rect(img, W, H, ox + 6, oy + 11 + b + a, 3, 10, c2)
    rect(img, W, H, ox + 27, oy + 11 + b - a, 3, 10, c2)
    rect(img, W, H, ox + 16, oy + 12 + b + j, 4, 2, col('#ff9cbc'))
    rect(img, W, H, ox + 12, oy + 24 + b, 5, 14, c4)
    rect(img, W, H, ox + 19, oy + 24 + b, 5, 14, c4)


def render_sheet(path, fw, fh, poses, draw_fn):
    W = fw * len(poses)
    H = fh
    img = new_img(W, H)
    for i, pose in enumerate(poses):
        draw_fn(img, W, H, i * fw, 0, pose)
    save_png(path, W, H, img)


PLAYER = {
    'idle': [
        dict(bob=0, lean=0, arm=0, leg=0, sword=1),
        dict(bob=1, lean=0, arm=1, leg=0, sword=1),
        dict(bob=0, lean=0, arm=0, leg=0, sword=1),
        dict(bob=-1, lean=0, arm=-1, leg=0, sword=1),
    ],
    'run': [
        dict(bob=0, lean=-1, arm=-1, leg=-2, sword=2),
        dict(bob=0, lean=0, arm=0, leg=-1, sword=2),
        dict(bob=0, lean=1, arm=1, leg=2, sword=2),
        dict(bob=0, lean=0, arm=0, leg=1, sword=2),
    ],
    'jump': [
        dict(bob=-2, lean=0, arm=-1, leg=-2, sword=4),
        dict(bob=-3, lean=1, arm=1, leg=-1, sword=5),
    ],
    'attack': [
        dict(bob=0, lean=1, arm=0, leg=0, sword=10),
        dict(bob=-1, lean=2, arm=-1, leg=0, sword=15),
        dict(bob=0, lean=1, arm=0, leg=0, sword=12),
    ],
}
ENEMY = [
    dict(bob=0, arm=0),
    dict(bob=1, arm=1),
    dict(bob=0, arm=0),
    dict(bob=-1, arm=-1),
]
BOSS = [
    dict(bob=0, arm=0, jaw=0),
    dict(bob=1, arm=1, jaw=1),
    dict(bob=0, arm=0, jaw=0),
    dict(bob=-1, arm=-1, jaw=0),
]

render_player_sheet(os.path.join(ROOT, 'player_idle.png'), 48, 48, PLAYER['idle'])
render_player_sheet(os.path.join(ROOT, 'player_run.png'), 48, 48, PLAYER['run'])
render_player_sheet(os.path.join(ROOT, 'player_jump.png'), 48, 48, PLAYER['jump'])
render_player_sheet(os.path.join(ROOT, 'player_attack.png'), 64, 48, PLAYER['attack'])
render_water_fx_sheet(os.path.join(ROOT, 'water_slash.png'))
render_sheet(os.path.join(ROOT, 'enemy.png'), 24, 36, ENEMY, draw_enemy)
render_sheet(os.path.join(ROOT, 'boss.png'), 36, 48, BOSS, draw_boss)

print('high-detail sprites redrawn at', ROOT)
