import { state } from "../state";
import { GRAVITY, GROUND_Y, WIDTH, BASIC_ATTACK, SKILLS, PLAYER_SHEETS } from "../constants";
import { onGround, hitbox, frameIndex } from "../utils";
import { drawSheetFrame, drawVariableSheetFrame } from "../graphics";
import { playTone } from "../audio";
import { emitSlash, emitHitBurst } from "./particle";
import { keys } from "../input";

export function triggerAttack() {
  if (state.player.attackTimer > 0 || state.player.skillTimer > 0) return;
  state.player.attackTimer = BASIC_ATTACK.frames;
  playTone(320, 0.07, "triangle", 0.05);
}

export function gainSkillEnergy(amount: number) {
  const p = state.player;
  if (p.skillCharges >= 3) {
    p.skillEnergy = 100;
    return;
  }
  p.skillEnergy += amount;
  while (p.skillEnergy >= 100 && p.skillCharges < 3) {
    p.skillEnergy -= 100;
    p.skillCharges += 1;
  }
  if (p.skillCharges >= 3) {
    p.skillCharges = 3;
    p.skillEnergy = 100;
  }
}

export function selectSkill(index: number) {
  state.player.skillIndex = Math.max(0, Math.min(SKILLS.length - 1, index));
}

export function castSelectedSkill() {
  const p = state.player;
  if (p.skillCharges <= 0) return;
  const skill = SKILLS[p.skillIndex] || SKILLS[0];
  p.skillCharges -= 1;
  if (p.skillCharges < 3) {
    p.skillEnergy = Math.min(p.skillEnergy, 99);
  }
  p.skillFlash = 0;
  p.skillTimer = 24;

  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const radius = skill.radius;
  const frameCount = Math.max(1, (skill.frameRanges || []).length);

  state.skillBursts.push({
    x: cx,
    y: cy + 2,
    life: 40,
    maxLife: 40,
    frame: 0,
    frameCount,
    skillIndex: p.skillIndex,
    width: 400,
    height: 300,
    scaleIn: 0.92,
    scaleOut: 1.08,
    color: skill.color,
  });

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    const ex = e.x + e.w / 2;
    const ey = e.y + e.h / 2;
    const dist = Math.hypot(ex - cx, ey - cy);
    if (dist > radius) continue;
    const ratio = 1 - dist / radius;
    const damage = (skill.enemyBase + ratio * skill.enemyScale) * (1 + p.attackBonus * 0.025);
    e.hp -= damage;
    e.hitCd = 12;
    emitSlash(ex, ey, skill.color);
    emitHitBurst(ex, ey, "#9beeff", 1.5);
    if (e.hp <= 0) {
      p.score += 12;
      gainSkillEnergy(35);
      state.enemies.splice(i, 1);
    }
  }

  if (state.boss) {
    const boss = state.boss;
    const bx = boss.x + boss.w / 2;
    const by = boss.y + boss.h / 2;
    const dist = Math.hypot(bx - cx, by - cy);
    if (dist <= radius + 40) {
      const ratio = Math.max(0.2, 1 - dist / (radius + 40));
      boss.hp -= skill.bossBase * ratio;
      boss.hitCd = 10;
      emitSlash(bx, by, "#9beeff");
      emitHitBurst(bx, by, "#c8f4ff", 2.2);
      if (boss.hp <= 0) {
        p.score += 220;
        gainSkillEnergy(100);
        state.boss = null;
        state.bossSpawnTimer = 45;
      }
    }
  }

  playTone(620, 0.11, "triangle", 0.06);
  playTone(860, 0.09, "sawtooth", 0.05);
}

export function attackBox() {
  const p = state.player;
  const reach = BASIC_ATTACK.reach;
  return {
    x: p.facing === 1 ? p.x + p.w : p.x - reach,
    y: p.y + 8,
    w: reach,
    h: 38,
    damage: BASIC_ATTACK.damage + p.attackBonus,
    color: BASIC_ATTACK.color,
  };
}

export function hurtPlayer(damage: number, sourceVx: number) {
  const p = state.player;
  if (p.invincible > 0) return;
  p.hp -= damage;
  p.invincible = 28;
  p.vx = -Math.sign(sourceVx || 1) * 7;
  p.vy = -5;
  emitSlash(p.x + p.w / 2, p.y + 24, "#ff4e73");
  playTone(120, 0.12, "square", 0.05);
  if (p.hp <= 0) {
    state.gameOver = true;
  }
}

export function tryJump() {
  const p = state.player;
  if (onGround(p, p.onPlatform)) {
    p.vy = -p.jump;
    playTone(260, 0.05, "triangle", 0.04);
  }
}

export function updatePlayer() {
  const p = state.player;

  if (p.onPlatform && state.platforms.includes(p.onPlatform)) {
    p.x += p.onPlatform.vx;
  }
  if (keys.has("a")) {
    p.vx = -p.speed;
    p.facing = -1;
  } else if (keys.has("d")) {
    p.vx = p.speed;
    p.facing = 1;
  } else {
    p.vx *= 0.72;
  }

  p.vy += GRAVITY;
  const prevBottom = p.y + p.h;
  p.x += p.vx;
  p.y += p.vy;
  p.x = Math.max(0, Math.min(WIDTH - p.w, p.x));
  p.onPlatform = null;

  let landed = false;
  if (p.vy >= 0) {
    for (const plt of state.platforms) {
      const overlapX = p.x + p.w > plt.x + 8 && p.x < plt.x + plt.w - 8;
      if (!overlapX) continue;
      const nowBottom = p.y + p.h;
      if (prevBottom <= plt.y + 2 && nowBottom >= plt.y) {
        p.y = plt.y - p.h;
        p.vy = 0;
        p.onPlatform = plt;
        landed = true;
        break;
      }
    }
  }

  if (!landed && p.y + p.h >= GROUND_Y) {
    p.y = GROUND_Y - p.h;
    p.vy = 0;
  }

  if (p.skillTimer > 0) p.skillTimer -= 1;

  if (p.attackTimer > 0) {
    p.attackTimer -= 1;
    const box = attackBox();

    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const e = state.enemies[i];
      if (hitbox(box, e) && e.hitCd <= 0) {
        e.hp -= box.damage;
        e.hitCd = 8;
        emitSlash(e.x + e.w / 2, e.y + 20, box.color);
        emitHitBurst(e.x + e.w / 2, e.y + 20, "#8ee6ff", 1.0);
        playTone(430 + Math.random() * 60, 0.04, "triangle", 0.025);
        if (e.hp <= 0) {
          p.score += 10;
          gainSkillEnergy(35);
          emitSlash(e.x + e.w / 2, e.y + 24, "#ff915d");
          state.enemies.splice(i, 1);
        }
      }
    }

    if (state.boss && hitbox(box, state.boss) && state.boss.hitCd <= 0) {
      const boss = state.boss;
      boss.hp -= box.damage;
      boss.hitCd = 7;
      emitSlash(boss.x + boss.w * 0.4, boss.y + 30, box.color);
      emitHitBurst(boss.x + boss.w * 0.4, boss.y + 30, "#b4efff", 1.4);
      playTone(180, 0.06, "sawtooth", 0.05);
      if (boss.hp <= 0) {
        p.score += 220;
        gainSkillEnergy(100);
        emitSlash(boss.x + boss.w / 2, boss.y + 30, "#ffc96b");
        playTone(700, 0.12, "triangle", 0.06);
        state.boss = null;
        state.bossSpawnTimer = 45;
      }
    }
  }

  if (p.invincible > 0) p.invincible -= 1;
}

export function drawPlayer() {
  const p = state.player;
  if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) return;

  if (p.skillTimer > 0) {
    const skill = SKILLS[p.skillIndex] || SKILLS[0];

    if (skill.image) {
      const total = 24;
      const progress = 1 - p.skillTimer / total;
      let frame = 0;
      if (skill.frameRanges && skill.frameRanges.length > 0) {
        frame = Math.min(skill.frameRanges.length - 1, Math.max(0, Math.floor(progress * skill.frameRanges.length)));
      } else {
        frame = Math.min((skill.frameCount || 6) - 1, Math.max(0, Math.floor(progress * (skill.frameCount || 6))));
      }

      if (isNaN(frame)) frame = 0;

      const srcH = skill.frameH || (skill.image ? skill.image.height : 496);
      const drawH = (skill.drawScale ? srcH * skill.drawScale : 150);
      let drawW = drawH;

      if (skill.frameRanges && skill.frameRanges[frame]) {
        const fr = skill.frameRanges[frame];
        drawW = drawH * (fr.w / srcH);
      } else if (skill.frameRanges && skill.frameRanges.length > 0) {
        const safeFr = skill.frameRanges[frame % skill.frameRanges.length];
        if (safeFr) drawW = drawH * (safeFr.w / srcH);
      } else {
        drawW = drawH;
      }

      const centerY = p.y + p.h / 2;
      const centerX = p.x + p.w / 2;
      const drawX = centerX - drawW / 2;
      const drawY = centerY - drawH / 2;

      drawVariableSheetFrame(skill, frame, drawX, drawY, drawW, drawH, p.facing);
      return;
    } else {
      const sheet = PLAYER_SHEETS.attack;
      if (sheet.image) {
        const frame = frameIndex(sheet.count, 3, state.elapsed);
        const drawSize = { w: 132, h: 92 };
        const feetY = p.y + p.h;
        const centerX = p.x + p.w / 2;
        const drawW = drawSize.w;
        const drawH = drawSize.h;
        const drawX = centerX - drawW / 2;
        const drawY = feetY - drawH - 2;
        drawSheetFrame(sheet, frame, drawX, drawY, drawW, drawH, p.facing);
        return;
      }
    }
  }

  const isLanded = onGround(p, p.onPlatform);
  const stateName = p.attackTimer > 0 ? "attack" : !isLanded ? "jump" : Math.abs(p.vx) > 1.1 ? "run" : "idle";
  const speed = stateName === "attack" ? 3 : stateName === "run" ? 5 : stateName === "jump" ? 7 : 8;
  const sheet = PLAYER_SHEETS[stateName];
  const frame = frameIndex(sheet.count, speed, state.elapsed);

  const sizeByState = {
    idle: { w: 145, h: 101 },
    run: { w: 132, h: 92 },
    jump: { w: 132, h: 92 },
    attack: { w: 132, h: 92 },
  };
  const drawSize = sizeByState[stateName];
  const feetY = p.y + p.h;
  const centerX = p.x + p.w / 2;
  const drawW = drawSize.w;
  const drawH = drawSize.h;
  const drawX = centerX - drawW / 2;
  const drawY = feetY - drawH - 2;
  drawSheetFrame(sheet, frame, drawX, drawY, drawW, drawH, p.facing);

}
