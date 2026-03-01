import { state } from "../state.js";
import { WIDTH, GROUND_Y, BOSS_SHEET } from "../constants.js";
import { hitbox, frameIndex } from "../utils.js";
import { drawSheetFrame } from "../graphics.js";
import { playTone } from "../audio.js";
import { hurtPlayer } from "./player.js";
import { spawnEnemy } from "./enemy.js";

export function spawnBoss() {
  state.boss = {
    x: WIDTH + 140,
    y: GROUND_Y - 92,
    w: 72,
    h: 92,
    vx: -2.6,
    targetX: WIDTH - 170,
    entering: true,
    hpMax: 460 + state.elapsed * 2.2,
    hp: 460 + state.elapsed * 2.2,
    phase: 1,
    hitCd: 0,
    aiTimer: 0,
    jumpCd: 0,
    animSeed: Math.floor(Math.random() * 80),
  };
  playTone(120, 0.2, "sawtooth", 0.06);
  playTone(90, 0.25, "sawtooth", 0.05);
}

export function updateBoss() {
  const boss = state.boss;
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

  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.vx += Math.sign(toward) * (0.08 + boss.phase * 0.02);
  boss.vx *= 0.94;
  boss.vx = Math.max(-4.8 - boss.phase, Math.min(4.8 + boss.phase, boss.vx));
  boss.x += boss.vx;
  boss.x = Math.max(0, Math.min(WIDTH - boss.w, boss.x));

  if (boss.aiTimer <= 0) {
    if (boss.phase >= 2 && Math.random() < 0.55) {
      const dir = Math.sign(toward) || 1;
      for (let i = 0; i < boss.phase; i += 1) {
        state.projectiles.push({
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

  if (hitbox(state.player, boss)) {
    hurtPlayer(12 + boss.phase * 2, boss.vx);
  }
}

export function drawBoss() {
  const boss = state.boss;
  if (!boss) return;
  const frame = frameIndex(BOSS_SHEET.count, 9 - boss.phase, state.elapsed, boss.animSeed);
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  const facing = toward >= 0 ? 1 : -1;
  drawSheetFrame(BOSS_SHEET, frame, boss.x - 52, boss.y - 108, 176, 208, facing);
}
