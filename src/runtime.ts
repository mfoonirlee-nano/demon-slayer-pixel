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
import {
  spawnNextMapSegment,
  resetMapGenerator,
  updatePlatforms,
  updatePillars,
  updateCrystals,
  updateChests,
  drawPlatforms,
  drawPillars,
  drawCrystals,
  drawChests,
} from "./entities/platform";
import { updateProjectiles, drawProjectiles } from "./entities/projectile";
import { updateParticles, updateSkillBursts, updateHitBursts, drawParticles, drawSkillBursts, drawHitBursts } from "./entities/particle";
import type { GameSnapshot } from "./gameStore";

let frameId = 0;
let running = false;
let publishState: (snapshot: GameSnapshot) => void = () => {};

function publishCurrentState() {
  publishState(getStateSnapshot());
}

function queueNextFrame() {
  frameId = requestAnimationFrame(loop);
}

function restart() {
  resetState();
  resetMapGenerator();
  publishCurrentState();
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
    publishCurrentState();
    queueNextFrame();
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
      spawnNextMapSegment();
      state.platformSpawnTimer = RUNTIME_CONFIG.platformSpawnBaseInterval + Math.random() * RUNTIME_CONFIG.platformSpawnRandomInterval;
    }

    if (!state.boss && state.bossSpawnTimer <= 0 && state.elapsed > RUNTIME_CONFIG.bossAppearAfterSeconds) {
      spawnBoss();
      state.bossSpawnTimer = RUNTIME_CONFIG.disableBossSpawnTimer;
    }

    updatePlayer();
    updatePlatforms(dt);
    updatePillars();
    updateCrystals(dt);
    updateChests(dt);
    updateEnemies();
    updateBoss();
    updateProjectiles();
    updateParticles();
    updateSkillBursts();
    updateHitBursts();
  }

  drawBackground();
  drawPillars();
  drawPlatforms();
  drawCrystals();
  drawChests();

  if (state.player.skillFlash > 0) {
    const flashT = state.player.skillFlash / SKILL_FLASH.maxFrames;
    const radius = SKILL_FLASH.baseRadius - state.player.skillFlash * SKILL_FLASH.radiusStep;
    ctx.fillStyle = `rgba(${SKILL_FLASH.overlayColorRgb},${flashT * SKILL_FLASH.overlayAlphaScale})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = `rgba(${SKILL_FLASH.outerStrokeColorRgb},${flashT * SKILL_FLASH.outerStrokeAlphaScale})`;
    ctx.lineWidth = SKILL_FLASH.outerLineWidth;
    ctx.beginPath();
    ctx.arc(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, Math.max(SKILL_FLASH.minOuterRadius, radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${SKILL_FLASH.innerStrokeColorRgb},${flashT * SKILL_FLASH.innerStrokeAlphaScale})`;
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
  publishCurrentState();
  queueNextFrame();
}

export function startGame(options: { onStateChange?: (snapshot: GameSnapshot) => void } = {}) {
  if (!ctx) {
    throw new Error(UI_COPY.canvasContextMissing);
  }
  if (running) {
    return stopGame;
  }

  running = true;
  publishState = options.onStateChange ?? (() => {});
  resetState();
  publishCurrentState();

  setupInput({
    onJump: tryJump,
    onAttack: triggerAttack,
    onSkill: castSelectedSkill,
    onSwitchSkill: selectSkill,
    onRestart: restart,
  });

  state.last = 0;
  queueNextFrame();

  console.log('[runtime] startGame: spritesReady=', state.spritesReady);
  if (!state.spritesReady) {
    loadSprites().catch((err) => {
      console.error('[runtime] loadSprites failed:', err);
      state.spritesReady = true;
    });
  }

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
