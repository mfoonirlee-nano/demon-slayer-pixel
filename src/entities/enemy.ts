import { state, type EnemyState } from "../state";
import { WIDTH, GROUND_Y, ENEMY_SHEETS, ENEMY_DRAW_SCALE } from "../constants";
import { hitbox, frameIndex } from "../utils";
import { drawSheetFrame } from "../graphics";
import { hurtPlayer } from "./player";

export function spawnEnemy() {
  const side = Math.random() < 0.5 ? -1 : 1;
  const speed = 0.72 + Math.random() * 1.08 + state.elapsed / 60;
  const damage = Math.min(20, 3 + state.elapsed * 0.1);
  state.enemies.push({
    x: side === 1 ? WIDTH + 20 : -40,
    y: GROUND_Y - 48,
    w: 30,
    h: 48,
    vx: -side * speed,
    hp: 16 + state.elapsed * 0.3,
    damage,
    hitCd: 0,
    animSeed: Math.floor(Math.random() * 60),
    sheetIndex: Math.floor(Math.random() * ENEMY_SHEETS.length),
  });
}

export function updateEnemies() {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    e.x += e.vx;
    e.hitCd -= 1;

    const toward = state.player.x + state.player.w / 2 - (e.x + e.w / 2);
    e.vx += Math.sign(toward) * 0.03;
    e.vx = Math.max(-3.2, Math.min(3.2, e.vx));

    if (hitbox(state.player, e)) {
      hurtPlayer(e.damage, e.vx);
    }

    if (e.x < -120 || e.x > WIDTH + 120) {
      state.enemies.splice(i, 1);
    }
  }
}

export function drawEnemy(e: EnemyState) {
  const sheet = ENEMY_SHEETS[e.sheetIndex % ENEMY_SHEETS.length] || ENEMY_SHEETS[0];
  const frame = frameIndex(sheet.count, 7, state.elapsed, e.animSeed);
  const facing = e.vx > 0 ? 1 : -1;
  const drawW = Math.round(sheet.frameW * ENEMY_DRAW_SCALE);
  const drawH = Math.round(sheet.frameH * ENEMY_DRAW_SCALE);
  const centerX = e.x + e.w / 2;
  const feetY = e.y + e.h;
  drawSheetFrame(sheet, frame, centerX - drawW / 2, feetY - drawH, drawW, drawH, facing);
}
