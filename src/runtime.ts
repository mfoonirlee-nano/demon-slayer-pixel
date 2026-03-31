import { state, resetState, getStateSnapshot } from "./state";
import { ctx } from "./context";
import { WIDTH, HEIGHT } from "./constants";
import { loadSprites } from "./assets";
import { setupInput, teardownInput } from "./input";
import { drawBackground } from "./background";

import { updatePlayer, drawPlayer, triggerAttack, castSelectedSkill, selectSkill, tryJump } from "./entities/player";
import { spawnEnemy, updateEnemies, drawEnemy } from "./entities/enemy";
import { spawnBoss, updateBoss, drawBoss } from "./entities/boss";
import { spawnPlatform, updatePlatforms, drawPlatforms, updateCrystals, drawCrystals } from "./entities/platform";
import { updateProjectiles, drawProjectiles } from "./entities/projectile";
import { updateParticles, updateSkillBursts, updateHitBursts, drawParticles, drawSkillBursts, drawHitBursts } from "./entities/particle";
import type { GameSnapshot } from "./gameStore";

let frameId = 0;
let running = false;
let publishState: (snapshot: GameSnapshot) => void = () => {};

function restart() {
  resetState();
  publishState(getStateSnapshot());
}

function drawLoadingState() {
  if (!ctx) return;
  drawBackground();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.font = "24px monospace";
  const loadingText = "加载像素贴图中...";
  ctx.fillText(loadingText, WIDTH / 2 - ctx.measureText(loadingText).width / 2, HEIGHT / 2);
}

function loop(ts: number) {
  if (!running || !ctx) return;
  if (!state.last) state.last = ts;
  const dt = Math.min(32, ts - state.last) / 1000;
  state.last = ts;

  const moonTarget = state.boss ? 1 : 0;
  state.moonBloodLerp += (moonTarget - state.moonBloodLerp) * Math.min(1, dt * 2.4);

  if (!state.spritesReady) {
    drawLoadingState();
    publishState(getStateSnapshot());
    frameId = requestAnimationFrame(loop);
    return;
  }

  if (!state.gameOver) {
    state.elapsed += dt;
    state.spawnTimer -= dt;
    state.bossSpawnTimer -= dt;

    if (!state.boss && state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = Math.max(0.38, 1.2 - state.elapsed * 0.012);
    }

    state.platformSpawnTimer -= dt;
    if (state.platformSpawnTimer <= 0) {
      spawnPlatform();
      state.platformSpawnTimer = 2.2 + Math.random() * 1.5;
    }

    if (!state.boss && state.bossSpawnTimer <= 0 && state.elapsed > 18) {
      spawnBoss();
      state.bossSpawnTimer = 9999;
    }

    updatePlayer();
    updatePlatforms(dt);
    updateCrystals(dt);
    updateEnemies();
    updateBoss();
    updateProjectiles();
    updateParticles();
    updateSkillBursts();
    updateHitBursts();
  }

  drawBackground();
  drawPlatforms();
  drawCrystals();

  if (state.player.skillFlash > 0 && ctx) {
    const flashT = state.player.skillFlash / 24;
    const radius = 320 - state.player.skillFlash * 9;
    ctx.fillStyle = `rgba(98,190,255,${flashT * 0.08})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = `rgba(140,240,255,${flashT * 0.95})`;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, Math.max(40, radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(214,247,255,${flashT * 0.65})`;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.arc(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, Math.max(24, radius - 22), 0, Math.PI * 2);
    ctx.stroke();
    state.player.skillFlash -= 1;
  }

  drawPlayer();
  drawSkillBursts();
  for (const e of state.enemies) drawEnemy(e);
  drawBoss();
  drawHitBursts();
  drawProjectiles();
  drawParticles();
  publishState(getStateSnapshot());
  frameId = requestAnimationFrame(loop);
}

export function startGame(options: { onStateChange?: (snapshot: GameSnapshot) => void } = {}) {
  if (!ctx) {
    throw new Error("Canvas context is not ready.");
  }
  if (running) {
    return stopGame;
  }

  running = true;
  publishState = options.onStateChange ?? (() => {});
  resetState();
  publishState(getStateSnapshot());

  setupInput({
    onJump: tryJump,
    onAttack: triggerAttack,
    onSkill: castSelectedSkill,
    onSwitchSkill: selectSkill,
    onRestart: restart,
  });

  const loadTask = state.spritesReady ? Promise.resolve() : loadSprites();
  loadTask
    .catch((err) => {
      console.error(err);
      state.spritesReady = true;
    })
    .finally(() => {
      if (!running) return;
      state.last = 0;
      frameId = requestAnimationFrame(loop);
    });

  return stopGame;
}

export function stopGame() {
  running = false;
  publishState = () => {};
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }
  teardownInput();
}
