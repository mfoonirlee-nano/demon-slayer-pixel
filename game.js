const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = HEIGHT - 80;
const GRAVITY = 0.75;

const keys = new Set();
const enemies = [];
const particles = [];
const projectiles = [];
const platforms = [];
const waterBursts = [];
const hitBursts = [];
const crystals = [];

const BASIC_ATTACK = { damage: 16, reach: 64, frames: 16, color: "#6be0ff" };
const SKILL_WATER_WHEEL = { name: "贰之型 水车", radius: 250, color: "#7fe8ff" };

const PLAYER_SHEETS = {
  idle: { src: "assets/sprites/player_idle.png", frameW: 435, frameH: 304, count: 2, image: null },
  run: { src: "assets/sprites/player_run.png", frameW: 435, frameH: 304, count: 3, image: null },
  jump: { src: "assets/sprites/player_jump.png", frameW: 435, frameH: 304, count: 3, image: null },
  attack: { src: "assets/sprites/player_attack.png", frameW: 435, frameH: 304, count: 3, image: null },
};
const ENEMY_SHEETS = [
  { src: "assets/sprites/enemy_1.png", frameW: 287, frameH: 282, count: 4, image: null },
  { src: "assets/sprites/enemy_2.png", frameW: 314, frameH: 145, count: 4, image: null },
  { src: "assets/sprites/enemy_3.png", frameW: 233, frameH: 250, count: 4, image: null },
];
const ENEMY_REF_DRAW_W = 120;
const ENEMY_DRAW_SCALE = ENEMY_REF_DRAW_W / ENEMY_SHEETS[1].frameW;
const BOSS_SHEET = { src: "assets/sprites/boss.png", frameW: 350, frameH: 419, count: 4, image: null };
const WATER_FX_SHEET = { src: "assets/sprites/water_slash.png", frameW: 64, frameH: 48, count: 6, image: null };
const USE_SEPARATE_WATER_FX = false;
let spritesReady = false;

const STAR_FIELD = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 137) % WIDTH,
  y: 22 + ((i * 73) % 190),
  size: i % 9 === 0 ? 3 : 2,
  twinkle: (i * 11) % 24,
}));
const MOUNTAINS = Array.from({ length: 10 }, (_, i) => ({
  x: i * 140,
  w: 150 + (i % 3) * 34,
  h: 90 + (i % 4) * 22,
}));
const TREES = Array.from({ length: 34 }, (_, i) => ({
  x: i * 54 + (i % 3) * 11,
  h: 34 + (i % 6) * 12,
  crownW: 22 + (i % 4) * 5,
  layer: (i % 3) + 1,
}));
const CLOUDS = Array.from({ length: 12 }, (_, i) => ({
  x: i * 150 + (i % 3) * 26,
  y: 34 + (i % 5) * 24,
  w: 44 + (i % 4) * 16,
  h: 14 + (i % 3) * 5,
  layer: 0.55 + (i % 4) * 0.18,
}));
const LANTERNS = Array.from({ length: 8 }, (_, i) => ({
  x: i * 170 + 60,
  y: GROUND_Y - 130 - (i % 2) * 18,
}));

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Sprite load failed: ${src}`));
    img.src = src;
  });
}

async function loadSprites() {
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
  await Promise.all(jobs);
  spritesReady = true;
}

let elapsed = 0;
let last = 0;
let spawnTimer = 0;
let bossSpawnTimer = 28;
let platformSpawnTimer = 0;
let gameOver = false;
let boss = null;
let moonBloodLerp = 0;

let audioCtx = null;

const player = {
  x: 140,
  y: GROUND_Y - 56,
  w: 34,
  h: 56,
  vx: 0,
  vy: 0,
  speed: 4,
  jump: 14,
  facing: 1,
  hp: 100,
  invincible: 0,
  attackTimer: 0,
  score: 0,
  attackBonus: 0,
  skillEnergy: 0,
  skillCharges: 0,
  onPlatform: null,
  skillFlash: 0,
};

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playTone(freq, duration = 0.08, type = "square", volume = 0.03) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.setValueAtTime(freq, now);
  osc.type = type;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function onGround(entity) {
  return entity.y + entity.h >= GROUND_Y - 0.1 || (entity === player && !!player.onPlatform);
}

function hitbox(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function frameIndex(frameCount, speed, seed = 0) {
  return Math.floor((elapsed * 60 + seed) / speed) % frameCount;
}

function drawSheetFrame(sheet, frame, x, y, w, h, facing = 1) {
  if (!sheet.image) return;
  const safeFrame = ((frame % sheet.count) + sheet.count) % sheet.count;
  const sx = safeFrame * sheet.frameW;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(facing, 1);
  ctx.drawImage(
    sheet.image,
    sx,
    0,
    sheet.frameW,
    sheet.frameH,
    -w / 2,
    -h / 2,
    w,
    h,
  );
  ctx.restore();
}

function emitSlash(x, y, color) {
  for (let i = 0; i < 12; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 20 + Math.random() * 10,
      color,
    });
  }
}

function emitHitBurst(x, y, color = "#9feaff", power = 1) {
  hitBursts.push({
    x,
    y,
    life: Math.floor(10 + 8 * power),
    maxLife: Math.floor(10 + 8 * power),
    radius: 8 + 6 * power,
    grow: 1.8 + 1.2 * power,
    color,
    sparks: Array.from({ length: Math.floor(8 + 8 * power) }, (_, i) => {
      const ang = (Math.PI * 2 * i) / Math.floor(8 + 8 * power) + (Math.random() - 0.5) * 0.25;
      return {
        ang,
        dist: 1 + Math.random() * 5,
        speed: 1.2 + Math.random() * 2.4 + power * 0.5,
        size: 1.4 + Math.random() * 1.8,
      };
    }),
  });
}

function spawnEnemy() {
  const side = Math.random() < 0.5 ? -1 : 1;
  const speed = 0.72 + Math.random() * 1.08 + elapsed / 60;
  const damage = Math.min(20, 3 + elapsed * 0.1);
  enemies.push({
    x: side === 1 ? WIDTH + 20 : -40,
    y: GROUND_Y - 48,
    w: 30,
    h: 48,
    vx: -side * speed,
    hp: 16 + elapsed * 0.3,
    damage,
    hitCd: 0,
    animSeed: Math.floor(Math.random() * 60),
    sheetIndex: Math.floor(Math.random() * ENEMY_SHEETS.length),
  });
}

function spawnCrystalOnPlatform(platform) {
  const type = Math.random() < 0.55 ? "atk" : "hp";
  crystals.push({
    platform,
    offsetX: 16 + Math.random() * Math.max(24, platform.w - 32),
    type,
    size: 10,
    phase: Math.random() * Math.PI * 2,
  });
}

function spawnPlatform() {
  const width = 88 + Math.random() * 74;
  const y = GROUND_Y - (70 + Math.random() * 130);
  const styles = ["stone", "moss", "shrine", "ruin"];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const platform = {
    x: WIDTH + 40,
    y,
    w: width,
    h: 12,
    vx: -(1.4 + Math.random() * 0.9 + elapsed * 0.02),
    phase: Math.random() * Math.PI * 2,
    style,
    trim: 2 + Math.floor(Math.random() * 3),
    notch: Math.random() < 0.5 ? 0 : 1 + Math.floor(Math.random() * 3),
  };
  platforms.push(platform);
  if (y <= GROUND_Y - 120 && Math.random() < 0.58) {
    spawnCrystalOnPlatform(platform);
  }
}

function spawnBoss() {
  boss = {
    x: WIDTH + 140,
    y: GROUND_Y - 92,
    w: 72,
    h: 92,
    vx: -2.6,
    targetX: WIDTH - 170,
    entering: true,
    hpMax: 460 + elapsed * 2.2,
    hp: 460 + elapsed * 2.2,
    phase: 1,
    hitCd: 0,
    aiTimer: 0,
    jumpCd: 0,
    animSeed: Math.floor(Math.random() * 80),
  };
  playTone(120, 0.2, "sawtooth", 0.06);
  playTone(90, 0.25, "sawtooth", 0.05);
}

function triggerAttack() {
  if (player.attackTimer > 0) return;
  player.attackTimer = BASIC_ATTACK.frames;
  playTone(320, 0.07, "triangle", 0.05);
}

function gainSkillEnergy(amount) {
  if (player.skillCharges >= 3) {
    player.skillEnergy = 100;
    return;
  }
  player.skillEnergy += amount;
  while (player.skillEnergy >= 100 && player.skillCharges < 3) {
    player.skillEnergy -= 100;
    player.skillCharges += 1;
  }
  if (player.skillCharges >= 3) {
    player.skillCharges = 3;
    player.skillEnergy = 100;
  }
}

function castSkillWaterWheel() {
  if (player.skillCharges <= 0) return;
  player.skillCharges -= 1;
  if (player.skillCharges < 3) {
    player.skillEnergy = Math.min(player.skillEnergy, 99);
  }
  player.skillFlash = 24;

  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const radius = SKILL_WATER_WHEEL.radius;
  waterBursts.push({
    x: cx,
    y: cy + 4,
    life: 32,
    maxLife: 32,
    radius: 42,
    grow: 8.4,
    spin: Math.random() * Math.PI * 2,
    armCount: 4,
    crestCount: 22,
    surgeWidth: 70,
    surgeGrow: 20,
    geysers: Array.from({ length: 10 }, (_, i) => {
      const ang = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.3;
      return {
        ang,
        dist: 22 + Math.random() * 24,
        height: 26 + Math.random() * 34,
        width: 5 + Math.random() * 5,
        sway: Math.random() * Math.PI * 2,
      };
    }),
    splashes: Array.from({ length: 44 }, (_, i) => {
      const ang = (Math.PI * 2 * i) / 44 + (Math.random() - 0.5) * 0.14;
      return {
        ang,
        dist: 12 + Math.random() * 10,
        speed: 2.4 + Math.random() * 3.8,
        rise: 0.6 + Math.random() * 1.2,
        size: 1.8 + Math.random() * 2.8,
      };
    }),
  });

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const e = enemies[i];
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dist = Math.hypot(ex - cx, ey - cy);
    if (dist > radius) continue;
    const ratio = 1 - dist / radius;
    const damage = (35 + ratio * 45) * (1 + player.attackBonus * 0.025);
    e.hp -= damage;
    e.hitCd = 12;
    emitSlash(ex, ey, SKILL_WATER_WHEEL.color);
    emitHitBurst(ex, ey, "#9beeff", 1.5);
    if (e.hp <= 0) {
      player.score += 12;
      gainSkillEnergy(35);
      enemies.splice(i, 1);
    }
  }

  if (boss) {
    const bx = boss.x + boss.w / 2;
    const by = boss.y + boss.h / 2;
    const dist = Math.hypot(bx - cx, by - cy);
    if (dist <= radius + 40) {
      const ratio = Math.max(0.2, 1 - dist / (radius + 40));
      boss.hp -= 60 * ratio;
      boss.hitCd = 10;
      emitSlash(bx, by, "#9beeff");
      emitHitBurst(bx, by, "#c8f4ff", 2.2);
      if (boss.hp <= 0) {
        player.score += 220;
        gainSkillEnergy(100);
        boss = null;
        bossSpawnTimer = 45;
      }
    }
  }

  for (let i = 0; i < 170; i += 1) {
    const ang = (Math.PI * 2 * i) / 170;
    const speed = 2.4 + Math.random() * 6.2;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed - 0.4,
      life: 16 + Math.random() * 18,
      color: i % 2 ? "#7edbff" : "#d5f8ff",
      size: 2 + Math.random() * 3.4,
      fade: 0.92 + Math.random() * 0.04,
    });
  }
  playTone(620, 0.11, "triangle", 0.06);
  playTone(860, 0.09, "sawtooth", 0.05);
}

function attackBox() {
  const reach = BASIC_ATTACK.reach;
  return {
    x: player.facing === 1 ? player.x + player.w : player.x - reach,
    y: player.y + 8,
    w: reach,
    h: 38,
    damage: BASIC_ATTACK.damage + player.attackBonus,
    color: BASIC_ATTACK.color,
  };
}

function hurtPlayer(damage, sourceVx) {
  if (player.invincible > 0) return;
  player.hp -= damage;
  player.invincible = 28;
  player.vx = -Math.sign(sourceVx || 1) * 7;
  player.vy = -5;
  emitSlash(player.x + player.w / 2, player.y + 24, "#ff4e73");
  playTone(120, 0.12, "square", 0.05);
  if (player.hp <= 0) {
    gameOver = true;
  }
}

function handleInputPress(key) {
  const k = key.toLowerCase();
  keys.add(k);
  ensureAudio();

  if ((k === "w" || k === " ") && onGround(player)) {
    player.vy = -player.jump;
    playTone(260, 0.05, "triangle", 0.04);
  }

  if (k === "j") {
    triggerAttack();
  }

  if (k === "k") {
    castSkillWaterWheel();
  }

  if (gameOver && k === "r") {
    restart();
  }
}

function handleInputRelease(key) {
  keys.delete(key.toLowerCase());
}

window.addEventListener("keydown", (e) => {
  const raw = e.key === " " ? " " : e.key.toLowerCase();
  if (["a", "d", "w", " ", "j", "k", "r", "arrowleft", "arrowright", "arrowup"].includes(raw)) {
    e.preventDefault();
  }
  handleInputPress(raw);
});

window.addEventListener("keyup", (e) => {
  const raw = e.key === " " ? " " : e.key.toLowerCase();
  handleInputRelease(raw);
});

function setupTouchControls() {
  const buttons = document.querySelectorAll(".touch-btn");
  if (!buttons.length) return;

  const pointerToKey = new Map();

  function releaseAllTouchKeys() {
    for (const key of pointerToKey.values()) {
      handleInputRelease(key);
    }
    pointerToKey.clear();
    for (const btn of buttons) btn.classList.remove("pressed");
  }

  for (const btn of buttons) {
    const key = btn.dataset.key;
    const isHold = btn.dataset.hold === "true";
    if (!key) continue;

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.classList.add("pressed");
      if (isHold) {
        handleInputPress(key);
        pointerToKey.set(e.pointerId, key);
      } else {
        handleInputPress(key);
      }
    });

    const release = (e) => {
      btn.classList.remove("pressed");
      if (!isHold) {
        handleInputRelease(key);
        return;
      }
      const mapped = pointerToKey.get(e.pointerId);
      if (!mapped) return;
      handleInputRelease(mapped);
      pointerToKey.delete(e.pointerId);
    };

    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", release);
  }

  window.addEventListener("blur", releaseAllTouchKeys);
}

function updatePlayer() {
  if (player.onPlatform && platforms.includes(player.onPlatform)) {
    player.x += player.onPlatform.vx;
  }
  if (keys.has("a")) {
    player.vx = -player.speed;
    player.facing = -1;
  } else if (keys.has("d")) {
    player.vx = player.speed;
    player.facing = 1;
  } else {
    player.vx *= 0.72;
  }

  player.vy += GRAVITY;
  const prevBottom = player.y + player.h;
  player.x += player.vx;
  player.y += player.vy;
  player.x = Math.max(0, Math.min(WIDTH - player.w, player.x));
  player.onPlatform = null;

  let landed = false;
  if (player.vy >= 0) {
    for (const p of platforms) {
      const overlapX = player.x + player.w > p.x + 8 && player.x < p.x + p.w - 8;
      if (!overlapX) continue;
      const nowBottom = player.y + player.h;
      if (prevBottom <= p.y + 2 && nowBottom >= p.y) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onPlatform = p;
        landed = true;
        break;
      }
    }
  }

  if (!landed && player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
  }

  if (player.attackTimer > 0) {
    player.attackTimer -= 1;
    const box = attackBox();

    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const e = enemies[i];
      if (hitbox(box, e) && e.hitCd <= 0) {
        e.hp -= box.damage;
        e.hitCd = 8;
        emitSlash(e.x + e.w / 2, e.y + 20, box.color);
        emitHitBurst(e.x + e.w / 2, e.y + 20, "#8ee6ff", 1.0);
        playTone(430 + Math.random() * 60, 0.04, "triangle", 0.025);
        if (e.hp <= 0) {
          player.score += 10;
          gainSkillEnergy(35);
          emitSlash(e.x + e.w / 2, e.y + 24, "#ff915d");
          enemies.splice(i, 1);
        }
      }
    }

    if (boss && hitbox(box, boss) && boss.hitCd <= 0) {
      boss.hp -= box.damage;
      boss.hitCd = 7;
      emitSlash(boss.x + boss.w * 0.4, boss.y + 30, box.color);
      emitHitBurst(boss.x + boss.w * 0.4, boss.y + 30, "#b4efff", 1.4);
      playTone(180, 0.06, "sawtooth", 0.05);
      if (boss.hp <= 0) {
        player.score += 220;
        gainSkillEnergy(100);
        emitSlash(boss.x + boss.w / 2, boss.y + 30, "#ffc96b");
        playTone(700, 0.12, "triangle", 0.06);
        boss = null;
        bossSpawnTimer = 45;
      }
    }
  }

  if (player.invincible > 0) player.invincible -= 1;
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const e = enemies[i];
    e.x += e.vx;
    e.hitCd -= 1;

    const toward = player.x + player.w / 2 - (e.x + e.w / 2);
    e.vx += Math.sign(toward) * 0.03;
    e.vx = Math.max(-3.2, Math.min(3.2, e.vx));

    if (hitbox(player, e)) {
      hurtPlayer(e.damage, e.vx);
    }

    if (e.x < -120 || e.x > WIDTH + 120) {
      enemies.splice(i, 1);
    }
  }
}

function updatePlatforms(dt) {
  for (let i = platforms.length - 1; i >= 0; i -= 1) {
    const p = platforms[i];
    p.x += p.vx;
    p.phase += dt * 3;
    if (p.x + p.w < -20) platforms.splice(i, 1);
  }
}

function updateCrystals(dt) {
  for (let i = crystals.length - 1; i >= 0; i -= 1) {
    const c = crystals[i];
    if (!platforms.includes(c.platform)) {
      crystals.splice(i, 1);
      continue;
    }

    c.phase += dt * 4;
    const x = c.platform.x + c.offsetX;
    const y = c.platform.y - 18 + Math.sin(c.phase) * 2;
    const box = { x: x - c.size / 2, y: y - c.size / 2, w: c.size, h: c.size };

    if (hitbox(player, box)) {
      if (c.type === "atk") {
        player.attackBonus = Math.min(24, player.attackBonus + 2);
        emitHitBurst(x, y, "#82d6ff", 1.6);
        playTone(560, 0.08, "triangle", 0.045);
      } else {
        player.hp = Math.min(100, player.hp + 24);
        emitHitBurst(x, y, "#6ff3b6", 1.4);
        playTone(440, 0.08, "triangle", 0.045);
      }
      crystals.splice(i, 1);
    }
  }
}

function updateBoss() {
  if (!boss) return;

  boss.hitCd -= 1;
  boss.aiTimer -= 1;
  boss.jumpCd -= 1;

  if (boss.entering) {
    boss.x += boss.vx;
    if (boss.x <= boss.targetX) {
      boss.x = boss.targetX;
      boss.vx = 0;
      boss.entering = false;
      boss.aiTimer = 32;
    }
    return;
  }

  if (boss.hp < boss.hpMax * 0.66) boss.phase = 2;
  if (boss.hp < boss.hpMax * 0.33) boss.phase = 3;

  const toward = player.x + player.w / 2 - (boss.x + boss.w / 2);
  boss.vx += Math.sign(toward) * (0.08 + boss.phase * 0.02);
  boss.vx *= 0.94;
  boss.vx = Math.max(-4.8 - boss.phase, Math.min(4.8 + boss.phase, boss.vx));
  boss.x += boss.vx;
  boss.x = Math.max(0, Math.min(WIDTH - boss.w, boss.x));

  if (boss.aiTimer <= 0) {
    if (boss.phase >= 2 && Math.random() < 0.55) {
      const dir = Math.sign(toward) || 1;
      for (let i = 0; i < boss.phase; i += 1) {
        projectiles.push({
          x: boss.x + boss.w / 2,
          y: boss.y + 16 + i * 10,
          w: 12,
          h: 8,
          vx: (5.2 + i * 0.6) * dir,
          life: 90,
          damage: 8 + boss.phase,
        });
      }
      playTone(190, 0.08, "sawtooth", 0.05);
    } else {
      spawnEnemy();
      if (boss.phase >= 3) spawnEnemy();
      playTone(100, 0.09, "square", 0.045);
    }
    boss.aiTimer = 100 - boss.phase * 14;
  }

  if (boss.jumpCd <= 0 && Math.random() < 0.03 * boss.phase) {
    boss.vx += Math.sign(toward) * (6 + boss.phase);
    boss.jumpCd = 34;
  }

  if (hitbox(player, boss)) {
    hurtPlayer(12 + boss.phase * 2, boss.vx);
  }
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const p = projectiles[i];
    p.x += p.vx;
    p.life -= 1;
    if (hitbox(player, p)) {
      hurtPlayer(p.damage, p.vx);
      projectiles.splice(i, 1);
      continue;
    }
    if (p.life <= 0 || p.x < -24 || p.x > WIDTH + 24) {
      projectiles.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= p.fade || 0.96;
    p.vy *= p.fade || 0.96;
    if (p.size) p.size *= 0.97;
    p.life -= 1;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateWaterBursts() {
  for (let i = waterBursts.length - 1; i >= 0; i -= 1) {
    const b = waterBursts[i];
    b.life -= 1;
    b.radius += b.grow;
    b.surgeWidth += b.surgeGrow;
    b.spin += 0.24;
    for (const g of b.geysers) {
      g.dist += 0.9;
      g.height *= 0.985;
      g.width *= 0.99;
      g.sway += 0.2;
    }
    for (const s of b.splashes) {
      s.dist += s.speed;
      s.rise += 0.1;
      s.size *= 0.985;
    }
    if (b.life <= 0) waterBursts.splice(i, 1);
  }
}

function updateHitBursts() {
  for (let i = hitBursts.length - 1; i >= 0; i -= 1) {
    const b = hitBursts[i];
    b.life -= 1;
    b.radius += b.grow;
    for (const s of b.sparks) {
      s.dist += s.speed;
      s.size *= 0.97;
    }
    if (b.life <= 0) hitBursts.splice(i, 1);
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function colorLerp(c1, c2, t) {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}

function drawBackground() {
  const nightTop = "#0a1223";
  const nightMid = "#101b33";
  const nightLow = "#152744";
  const scrollFar = (elapsed * 8) % WIDTH;
  const scrollMid = (elapsed * 14) % WIDTH;
  const scrollNear = (elapsed * 22) % WIDTH;
  const cloudDrift = elapsed * 10;

  ctx.fillStyle = nightTop;
  ctx.fillRect(0, 0, WIDTH, 170);
  ctx.fillStyle = nightMid;
  ctx.fillRect(0, 170, WIDTH, 120);
  ctx.fillStyle = nightLow;
  ctx.fillRect(0, 290, WIDTH, GROUND_Y - 290);

  // Moon: color shifts over time; transitions to blood moon during boss phase.
  const cycle = 0.5 + 0.5 * Math.sin(elapsed * 0.08);
  const moonBaseRGB = [
    Math.round(lerp(208, 255, cycle)),
    Math.round(lerp(226, 232, cycle)),
    Math.round(lerp(255, 190, cycle)),
  ];
  const moonColor = colorLerp(moonBaseRGB, [186, 36, 42], moonBloodLerp);
  ctx.fillStyle = `rgba(196,225,255,${0.09 + 0.12 * (1 - moonBloodLerp)})`;
  ctx.beginPath();
  ctx.arc(762, 80, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(206,230,255,${0.12 + 0.16 * (1 - moonBloodLerp)})`;
  ctx.beginPath();
  ctx.arc(762, 80, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,86,92,${0.08 + 0.14 * moonBloodLerp})`;
  ctx.beginPath();
  ctx.arc(762, 80, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,112,122,${0.05 + 0.09 * moonBloodLerp})`;
  ctx.beginPath();
  ctx.arc(762, 80, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = moonColor;
  ctx.beginPath();
  ctx.arc(762, 80, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(156,176,208,0.35)";
  ctx.fillRect(749, 75, 7, 1);
  ctx.fillRect(757, 83, 6, 1);
  ctx.fillRect(767, 79, 5, 1);
  ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.15 * (1 - moonBloodLerp)})`;
  ctx.beginPath();
  ctx.arc(754, 74, 7, 0, Math.PI * 2);
  ctx.fill();

  // Moving cloud layers.
  for (const c of CLOUDS) {
    const x1 = c.x - cloudDrift * c.layer;
    for (const wrap of [x1, x1 + WIDTH + 220]) {
      ctx.fillStyle = `rgba(172,196,230,${0.12 + c.layer * 0.03})`;
      ctx.fillRect(wrap, c.y, c.w, c.h);
      ctx.fillRect(wrap + c.w * 0.2, c.y - 6, c.w * 0.58, c.h * 0.7);
      ctx.fillRect(wrap + c.w * 0.52, c.y + 2, c.w * 0.42, c.h * 0.65);
    }
  }

  for (const s of STAR_FIELD) {
    const twinkleOn = Math.floor(elapsed * 12 + s.twinkle) % 6 !== 0;
    if (!twinkleOn) continue;
    ctx.fillStyle = s.size === 3 ? "#dbe9ff" : "#a8c6ff";
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }

  for (const m of MOUNTAINS) {
    const x = m.x - scrollFar;
    ctx.fillStyle = "#1d2f4f";
    ctx.fillRect(x, GROUND_Y - 220, m.w, m.h);
    ctx.fillStyle = "#243a5f";
    ctx.fillRect(x + 14, GROUND_Y - 220 + 12, m.w - 28, m.h - 12);
    ctx.fillStyle = "#2c466f";
    ctx.fillRect(x + m.w / 2 - 16, GROUND_Y - 220, 32, 16);
  }

  for (const m of MOUNTAINS) {
    const x = m.x + WIDTH - scrollFar;
    ctx.fillStyle = "#1d2f4f";
    ctx.fillRect(x, GROUND_Y - 220, m.w, m.h);
    ctx.fillStyle = "#243a5f";
    ctx.fillRect(x + 14, GROUND_Y - 220 + 12, m.w - 28, m.h - 12);
    ctx.fillStyle = "#2c466f";
    ctx.fillRect(x + m.w / 2 - 16, GROUND_Y - 220, 32, 16);
  }

  for (const t of TREES) {
    const parallax = 0.45 + t.layer * 0.2;
    const xBase = t.x - scrollMid * parallax;
    for (const wrap of [xBase, xBase + WIDTH + 140]) {
      const y = GROUND_Y - 46 - t.h;
      const trunkW = 6 + t.layer;
      const crownW = t.crownW;
      ctx.fillStyle = "#13253f";
      ctx.fillRect(wrap + crownW * 0.42, y + 18, trunkW, t.h + 8);
      ctx.fillStyle = t.layer === 1 ? "#1a3659" : t.layer === 2 ? "#21426c" : "#2a4f80";
      ctx.fillRect(wrap, y, crownW, 24 + t.layer * 4);
      ctx.fillStyle = "#2e5d8f";
      ctx.fillRect(wrap + 4, y + 3, crownW - 8, 12 + t.layer * 2);
      ctx.fillStyle = "#3b6c9f";
      ctx.fillRect(wrap + 8, y + 7, 6, 3);
    }
  }

  ctx.fillStyle = "#0b1424";
  ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

  for (let i = -1; i < Math.ceil(WIDTH / 32) + 1; i += 1) {
    const x = i * 32 - (scrollNear % 32);
    ctx.fillStyle = i % 2 === 0 ? "#192f4d" : "#1f3a5f";
    ctx.fillRect(x, GROUND_Y - 14, 24, 14);
    ctx.fillStyle = "#2a4b77";
    ctx.fillRect(x + 4, GROUND_Y - 10, 8, 6);
  }

  for (const lantern of LANTERNS) {
    const x = lantern.x - scrollNear * 0.7;
    const y = lantern.y;
    ctx.fillStyle = "#3b2e25";
    ctx.fillRect(x + 7, y + 20, 2, 34);
    ctx.fillStyle = "#6c4830";
    ctx.fillRect(x, y + 8, 16, 14);
    ctx.fillStyle = "#ffcf75";
    ctx.fillRect(x + 3, y + 11, 10, 8);
    ctx.fillStyle = "#ffe8a7";
    ctx.fillRect(x + 6, y + 13, 4, 4);
  }

  ctx.fillStyle = "rgba(180, 210, 255, 0.08)";
  ctx.fillRect(0, GROUND_Y - 50, WIDTH, 20);
  ctx.fillStyle = "rgba(180, 210, 255, 0.12)";
  ctx.fillRect(0, GROUND_Y - 30, WIDTH, 14);
  for (let i = 0; i < 3; i += 1) {
    const fx = ((elapsed * (12 + i * 5)) % (WIDTH + 260)) - 130;
    const fy = 120 + i * 48;
    ctx.fillStyle = "rgba(140,190,255,0.08)";
    ctx.fillRect(fx, fy, 220 + i * 50, 10);
  }
}

function drawWaterBursts() {
  for (const b of waterBursts) {
    const t = b.life / b.maxLife;
    const glow = 0.2 + t * 0.6;
    const baseR = b.radius;
    const cx = b.x;
    const cy = b.y;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Ground surge sheet under the character for area-coverage impact.
    const surgeH = 10 + t * 12;
    ctx.fillStyle = `rgba(110,198,255,${0.14 + t * 0.2})`;
    ctx.fillRect(cx - b.surgeWidth * 0.5, cy + 14, b.surgeWidth, surgeH);
    ctx.fillStyle = `rgba(214,246,255,${0.12 + t * 0.22})`;
    ctx.fillRect(cx - b.surgeWidth * 0.36, cy + 10, b.surgeWidth * 0.72, 4 + t * 5);

    // "Water wheel" spiral arms (kimetsu-like swirling motion).
    for (let arm = 0; arm < b.armCount; arm += 1) {
      const armStart = b.spin + (Math.PI * 2 * arm) / b.armCount;
      ctx.strokeStyle = `rgba(112,205,255,${0.26 + glow * 0.55})`;
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      for (let s = 0; s <= 34; s += 1) {
        const p = s / 34;
        const rr = baseR * (0.25 + p * 0.95);
        const ang = armStart + p * (1.75 + (1 - t) * 0.4) + Math.sin(p * 8 + b.spin) * 0.06;
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr * 0.84;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Foam highlight along each arm.
      ctx.strokeStyle = `rgba(227,248,255,${0.22 + glow * 0.45})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let s = 6; s <= 34; s += 1) {
        const p = s / 34;
        const rr = baseR * (0.25 + p * 0.95);
        const ang = armStart + p * (1.75 + (1 - t) * 0.4) + Math.sin(p * 8 + b.spin) * 0.06 + 0.08;
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr * 0.84 - 1.4;
        if (s === 6) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Outer circular sweep to keep the area-coverage feeling.
    for (let i = 0; i < 2; i += 1) {
      const r = baseR + 12 - i * 14;
      ctx.strokeStyle = `rgba(${140 + i * 30},${220 + i * 10},255,${0.18 + glow * 0.45 - i * 0.08})`;
      ctx.lineWidth = 3 - i;
      ctx.beginPath();
      ctx.arc(cx, cy - i * 3, r, b.spin + i * 0.6, b.spin + i * 0.6 + Math.PI * (1.3 + t * 0.5));
      ctx.stroke();
    }

    // Ring geysers around character.
    for (const g of b.geysers) {
      const gx = cx + Math.cos(g.ang + b.spin * 0.08) * g.dist;
      const gy = cy + Math.sin(g.ang + b.spin * 0.08) * g.dist * 0.8 + 14;
      const topWobble = Math.sin(g.sway) * 3;
      ctx.strokeStyle = `rgba(131,219,255,${0.18 + t * 0.35})`;
      ctx.lineWidth = Math.max(1.2, g.width * 0.5);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + topWobble, gy - g.height * 0.55, gx - topWobble * 0.5, gy - g.height);
      ctx.stroke();
      ctx.fillStyle = `rgba(223,249,255,${0.16 + t * 0.32})`;
      ctx.fillRect(gx - 1, gy - g.height - 2, 2.2, 2.2);
    }

    // Crest droplets around outer edge (wave tips).
    for (let i = 0; i < b.crestCount; i += 1) {
      const ang = (Math.PI * 2 * i) / b.crestCount + b.spin * 0.35;
      const rr = baseR + 22 + Math.sin(b.spin + i * 0.7) * 5;
      const px = cx + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr * 0.82 - 8;
      ctx.fillStyle = `rgba(214,248,255,${0.22 + t * 0.5})`;
      ctx.fillRect(px, py, 2.2, 2.2);
    }

    // Splash droplets around player.
    for (const s of b.splashes) {
      const px = cx + Math.cos(s.ang + b.spin * 0.06) * s.dist;
      const py = cy + Math.sin(s.ang + b.spin * 0.06) * s.dist - s.rise * 10;
      const alpha = Math.max(0, t * 0.9);
      ctx.fillStyle = `rgba(205,245,255,${alpha})`;
      ctx.fillRect(px, py, s.size, s.size);
    }

    // Central splash crown near character.
    for (let i = 0; i < 14; i += 1) {
      const ang = (Math.PI * 2 * i) / 14 + b.spin * 0.08;
      const rr = 18 + Math.sin(b.spin + i) * 4;
      const px = cx + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr - 8;
      ctx.fillStyle = `rgba(140,220,255,${0.3 + t * 0.5})`;
      ctx.fillRect(px, py, 3, 3);
    }
    ctx.restore();
  }
}

function drawHitBursts() {
  for (const b of hitBursts) {
    const t = b.life / b.maxLife;
    const a = 0.2 + t * 0.7;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(166,236,255,${a})`;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(225,250,255,${a * 0.7})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, Math.max(2, b.radius - 6), 0, Math.PI * 2);
    ctx.stroke();
    for (const s of b.sparks) {
      const px = b.x + Math.cos(s.ang) * s.dist;
      const py = b.y + Math.sin(s.ang) * s.dist;
      ctx.fillStyle = `rgba(203,246,255,${a})`;
      ctx.fillRect(px, py, s.size, s.size);
    }
    ctx.restore();
  }
}

function drawCrystals() {
  for (const c of crystals) {
    if (!platforms.includes(c.platform)) continue;
    const x = c.platform.x + c.offsetX;
    const y = c.platform.y - 18 + Math.sin(c.phase) * 2;
    const glow = 0.45 + 0.2 * Math.sin(c.phase * 1.7);
    if (c.type === "atk") {
      ctx.fillStyle = `rgba(118,200,255,${glow})`;
      ctx.fillRect(x - 7, y - 7, 14, 14);
      ctx.fillStyle = "#d9f4ff";
      ctx.fillRect(x - 3, y - 5, 6, 10);
      ctx.fillRect(x - 5, y - 3, 10, 6);
    } else {
      ctx.fillStyle = `rgba(108,245,180,${glow})`;
      ctx.fillRect(x - 7, y - 7, 14, 14);
      ctx.fillStyle = "#dcffe9";
      ctx.fillRect(x - 2, y - 5, 4, 10);
      ctx.fillRect(x - 5, y - 2, 10, 4);
    }
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    if (p.style === "shrine") {
      ctx.fillStyle = "#4c2830";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#9a3947";
      ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, 4);
      for (let i = 10; i < p.w - 6; i += 16) {
        ctx.fillStyle = "#2c1b20";
        ctx.fillRect(p.x + i, p.y + 2, 2, p.h - 2);
      }
      ctx.fillStyle = "#2a151b";
      ctx.fillRect(p.x + 6, p.y + p.h, p.w - 12, 3);
    } else if (p.style === "ruin") {
      ctx.fillStyle = "#3a4554";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#5d6e84";
      ctx.fillRect(p.x + 1, p.y + 1, p.w - 2, 3);
      for (let i = 0; i < p.notch; i += 1) {
        const nx = p.x + p.w * (0.18 + i * 0.28);
        ctx.clearRect(nx, p.y, 4, 2);
      }
      ctx.fillStyle = "#1e2938";
      ctx.fillRect(p.x + 5, p.y + p.h, p.w - 10, 3);
    } else if (p.style === "moss") {
      ctx.fillStyle = "#2e4667";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#3f5f88";
      ctx.fillRect(p.x + 3, p.y + 2, p.w - 6, 4);
      ctx.fillStyle = "#132238";
      ctx.fillRect(p.x + 7, p.y + p.h, p.w - 14, 3);
      for (let i = 0; i < p.w; i += 16) {
        const sway = Math.sin(p.phase + i * 0.1) * 1.5;
        ctx.fillStyle = "#4dd193";
        ctx.fillRect(p.x + i + 3, p.y - 4 + sway, 3, 4);
      }
    } else {
      ctx.fillStyle = "#435368";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = "#607894";
      ctx.fillRect(p.x + p.trim, p.y + 2, p.w - p.trim * 2, 3);
      ctx.fillStyle = "#1a2638";
      ctx.fillRect(p.x + 6, p.y + p.h, p.w - 12, 3);
      for (let i = 8; i < p.w - 4; i += 22) {
        ctx.fillStyle = "#2a3a4f";
        ctx.fillRect(p.x + i, p.y + 3, 5, 5);
      }
    }
  }
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible / 3) % 2 === 0) return;
  const state = player.attackTimer > 0 ? "attack" : !onGround(player) ? "jump" : Math.abs(player.vx) > 1.1 ? "run" : "idle";
  const speed = state === "attack" ? 3 : state === "run" ? 5 : state === "jump" ? 7 : 8;
  const sheet = PLAYER_SHEETS[state];
  const frame = frameIndex(sheet.count, speed);
  const sizeByState = {
    idle: { w: 145, h: 101 },
    run: { w: 132, h: 92 },
    jump: { w: 132, h: 92 },
    attack: { w: 132, h: 92 },
  };
  const drawSize = sizeByState[state];
  const feetY = player.y + player.h;
  const centerX = player.x + player.w / 2;
  const drawW = drawSize.w;
  const drawH = drawSize.h;
  const drawX = centerX - drawW / 2;
  const drawY = feetY - drawH - 2;
  drawSheetFrame(sheet, frame, drawX, drawY, drawW, drawH, player.facing);

  if (USE_SEPARATE_WATER_FX && player.attackTimer > 0 && WATER_FX_SHEET.image) {
    const total = Math.max(1, BASIC_ATTACK.frames);
    const progress = 1 - player.attackTimer / total;
    const fxFrame = Math.min(
      WATER_FX_SHEET.count - 1,
      Math.max(0, Math.floor(progress * WATER_FX_SHEET.count)),
    );
    const fxW = 132;
    const fxH = 96;
    const fxX = player.facing === 1 ? player.x - 8 : player.x - 94;
    const fxY = player.y - 30;
    drawSheetFrame(WATER_FX_SHEET, fxFrame, fxX, fxY, fxW, fxH, player.facing);
  }
}

function drawEnemy(e) {
  const sheet = ENEMY_SHEETS[e.sheetIndex % ENEMY_SHEETS.length] || ENEMY_SHEETS[0];
  const frame = frameIndex(sheet.count, 7, e.animSeed);
  const facing = e.vx > 0 ? 1 : -1;
  const drawW = Math.round(sheet.frameW * ENEMY_DRAW_SCALE);
  const drawH = Math.round(sheet.frameH * ENEMY_DRAW_SCALE);
  const centerX = e.x + e.w / 2;
  const feetY = e.y + e.h;
  drawSheetFrame(sheet, frame, centerX - drawW / 2, feetY - drawH, drawW, drawH, facing);
}

function drawBoss() {
  if (!boss) return;
  const frame = frameIndex(BOSS_SHEET.count, 9 - boss.phase, boss.animSeed);
  const toward = player.x + player.w / 2 - (boss.x + boss.w / 2);
  const facing = toward >= 0 ? 1 : -1;
  drawSheetFrame(BOSS_SHEET, frame, boss.x - 52, boss.y - 108, 176, 208, facing);
}

function drawProjectiles() {
  for (const p of projectiles) {
    ctx.fillStyle = "#ff6e93";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#ffe2ef";
    ctx.fillRect(p.x + 2, p.y + 2, 3, 3);
  }
}

function drawUI() {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(18, 16, 360, 126);
  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText(`HP: ${Math.max(0, Math.floor(player.hp))}`, 28, 42);
  ctx.fillText(`击杀分: ${player.score}`, 28, 64);
  ctx.fillText(`招式: ${SKILL_WATER_WHEEL.name}`, 28, 86);
  ctx.fillText(`可用: ${player.skillCharges}/3`, 214, 86);
  ctx.fillText(`攻击加成: +${player.attackBonus}`, 28, 118);

  ctx.fillStyle = "#2f445e";
  ctx.fillRect(128, 28, 150, 14);
  ctx.fillStyle = "#26d5ff";
  ctx.fillRect(128, 28, (Math.max(0, player.hp) / 100) * 150, 14);
  ctx.fillStyle = "#2f445e";
  ctx.fillRect(28, 94, 110, 10);
  ctx.fillStyle = "#7fe8ff";
  ctx.fillRect(28, 94, (player.skillEnergy / 100) * 110, 10);
  ctx.fillStyle = "#fff";
  const surviveText = `生存: ${elapsed.toFixed(1)}s`;
  const controlsText = "J: 普通攻击  K: 贰之型 水车";
  const surviveX = Math.max(20, WIDTH - 24 - ctx.measureText(surviveText).width);
  const controlsX = Math.max(20, WIDTH - 24 - ctx.measureText(controlsText).width);
  ctx.fillText(surviveText, surviveX, 38);
  ctx.fillText(controlsText, controlsX, 62);

  if (boss) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(WIDTH / 2 - 190, 14, 380, 32);
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.fillText(`下弦之鬼·阶段 ${boss.phase}`, WIDTH / 2 - 178, 36);
    ctx.fillStyle = "#443246";
    ctx.fillRect(WIDTH / 2 - 20, 22, 190, 14);
    ctx.fillStyle = "#ff6e93";
    ctx.fillRect(WIDTH / 2 - 20, 22, (boss.hp / boss.hpMax) * 190, 14);
  }

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "36px monospace";
    ctx.fillText("战斗结束", WIDTH / 2 - 110, HEIGHT / 2 - 20);
    ctx.font = "18px monospace";
    ctx.fillText(`最终生存: ${elapsed.toFixed(1)}s`, WIDTH / 2 - 105, HEIGHT / 2 + 16);
    ctx.fillText("按 R 重新开始", WIDTH / 2 - 88, HEIGHT / 2 + 50);
  }
}

function restart() {
  player.x = 140;
  player.y = GROUND_Y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.hp = 100;
  player.score = 0;
  player.attackTimer = 0;
  player.attackBonus = 0;
  player.invincible = 0;
  enemies.length = 0;
  platforms.length = 0;
  crystals.length = 0;
  particles.length = 0;
  waterBursts.length = 0;
  hitBursts.length = 0;
  projectiles.length = 0;
  elapsed = 0;
  spawnTimer = 0;
  bossSpawnTimer = 28;
  platformSpawnTimer = 0;
  boss = null;
  player.skillEnergy = 0;
  player.skillCharges = 0;
  player.onPlatform = null;
  player.skillFlash = 0;
  gameOver = false;
}

function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(32, ts - last) / 1000;
  last = ts;
  const moonTarget = boss ? 1 : 0;
  moonBloodLerp += (moonTarget - moonBloodLerp) * Math.min(1, dt * 2.4);

  if (!spritesReady) {
    drawBackground();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "24px monospace";
    const loadingText = "加载像素贴图中...";
    ctx.fillText(loadingText, WIDTH / 2 - ctx.measureText(loadingText).width / 2, HEIGHT / 2);
    requestAnimationFrame(loop);
    return;
  }

  if (!gameOver) {
    elapsed += dt;
    spawnTimer -= dt;
    bossSpawnTimer -= dt;

    if (!boss && spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = Math.max(0.38, 1.2 - elapsed * 0.012);
    }

    platformSpawnTimer -= dt;
    if (platformSpawnTimer <= 0) {
      spawnPlatform();
      platformSpawnTimer = 2.2 + Math.random() * 1.5;
    }

    if (!boss && bossSpawnTimer <= 0 && elapsed > 18) {
      spawnBoss();
      bossSpawnTimer = 9999;
    }

    updatePlayer();
    updatePlatforms(dt);
    updateCrystals(dt);
    updateEnemies();
    updateBoss();
    updateProjectiles();
    updateParticles();
    updateWaterBursts();
    updateHitBursts();
  }

  drawBackground();
  drawPlatforms();
  drawCrystals();
  if (player.skillFlash > 0) {
    const flashT = player.skillFlash / 24;
    const radius = 320 - player.skillFlash * 9;
    ctx.fillStyle = `rgba(98,190,255,${flashT * 0.08})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = `rgba(140,240,255,${flashT * 0.95})`;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, Math.max(40, radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(214,247,255,${flashT * 0.65})`;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + player.h / 2, Math.max(24, radius - 22), 0, Math.PI * 2);
    ctx.stroke();
    player.skillFlash -= 1;
  }
  drawPlayer();
  drawWaterBursts();
  for (const e of enemies) drawEnemy(e);
  drawBoss();
  drawHitBursts();
  drawProjectiles();

  for (const p of particles) {
    ctx.fillStyle = p.color;
    const size = p.size || 3;
    ctx.fillRect(p.x, p.y, size, size);
  }

  drawUI();
  requestAnimationFrame(loop);
}

setupTouchControls();

loadSprites()
  .catch((err) => {
    console.error(err);
    spritesReady = true;
  })
  .finally(() => {
    requestAnimationFrame(loop);
  });
