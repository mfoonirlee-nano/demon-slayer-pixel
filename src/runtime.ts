import { state, resetState, getStateSnapshot } from "./state";
import { ctx } from "./context";
import { updateMoon } from "./moon";
import {
  WIDTH,
  HEIGHT,
  RUNTIME_CONFIG,
  UI_COPY,
  LOADING_SCREEN,
  SKILL_FLASH,
} from "./constants";
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
let runToken = 0;
let publishState: (snapshot: GameSnapshot) => void = () => {};

function restart() {
  resetState();
  publishState(getStateSnapshot());
}

function drawLoadingState() {
  if (!ctx) return;
  drawBackground();
  ctx.fillStyle = LOADING_SCREEN.overlayColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = LOADING_SCREEN.textColor;
  ctx.font = LOADING_SCREEN.font;
  const loadingText = UI_COPY.loadingSprites;
  ctx.fillText(loadingText, WIDTH / 2 - ctx.measureText(loadingText).width / 2, HEIGHT / 2);
}

function loop(ts: number) {
  if (!running || !ctx) return;
  if (!state.last) state.last = ts;
  const dt = Math.min(RUNTIME_CONFIG.maxFrameDeltaMs, ts - state.last) / RUNTIME_CONFIG.msPerSecond;
  state.last = ts;

  updateMoon(state.moon, dt, {
    bloodActive: state.boss !== null,
    bloodLerpSpeed: RUNTIME_CONFIG.moonBloodLerpSpeed,
  });

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
      state.spawnTimer = Math.max(
        RUNTIME_CONFIG.enemySpawnMinInterval,
        RUNTIME_CONFIG.enemySpawnBaseInterval - state.elapsed * RUNTIME_CONFIG.enemySpawnDecay,
      );
    }

    state.platformSpawnTimer -= dt;
    if (state.platformSpawnTimer <= 0) {
      spawnPlatform();
      state.platformSpawnTimer = RUNTIME_CONFIG.platformSpawnBaseInterval + Math.random() * RUNTIME_CONFIG.platformSpawnRandomInterval;
    }

    if (!state.boss && state.bossSpawnTimer <= 0 && state.elapsed > RUNTIME_CONFIG.bossAppearAfterSeconds) {
      spawnBoss();
      state.bossSpawnTimer = RUNTIME_CONFIG.disableBossSpawnTimer;
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

  if (state.player.skillFlash > 0) {
    const flashT = state.player.skillFlash / SKILL_FLASH.maxFrames;
    const radius = SKILL_FLASH.baseRadius - state.player.skillFlash * SKILL_FLASH.radiusStep;
    ctx.fillStyle = `rgba(${SKILL_FLASH.overlayColor[0]},${SKILL_FLASH.overlayColor[1]},${SKILL_FLASH.overlayColor[2]},${flashT * SKILL_FLASH.overlayAlphaScale})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = `rgba(${SKILL_FLASH.outerStrokeColor[0]},${SKILL_FLASH.outerStrokeColor[1]},${SKILL_FLASH.outerStrokeColor[2]},${flashT * SKILL_FLASH.outerStrokeAlphaScale})`;
    ctx.lineWidth = SKILL_FLASH.outerLineWidth;
    ctx.beginPath();
    ctx.arc(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, Math.max(SKILL_FLASH.minOuterRadius, radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${SKILL_FLASH.innerStrokeColor[0]},${SKILL_FLASH.innerStrokeColor[1]},${SKILL_FLASH.innerStrokeColor[2]},${flashT * SKILL_FLASH.innerStrokeAlphaScale})`;
    ctx.lineWidth = SKILL_FLASH.innerLineWidth;
    ctx.beginPath();
    ctx.arc(
      state.player.x + state.player.w / 2,
      state.player.y + state.player.h / 2,
      Math.max(SKILL_FLASH.minInnerRadius, radius - SKILL_FLASH.innerRadiusBase),
      0,
      Math.PI * 2,
    );
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
    throw new Error(UI_COPY.canvasContextMissing);
  }
  if (running) {
    return stopGame;
  }

  running = true;
  const currentRunToken = ++runToken;
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
      if (!running || currentRunToken !== runToken) return;
      state.last = 0;
      frameId = requestAnimationFrame(loop);
    });

  return stopGame;
}

export function stopGame() {
  running = false;
  runToken += 1;
  publishState = () => {};
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }
  teardownInput();
}
