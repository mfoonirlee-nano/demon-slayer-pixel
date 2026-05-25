import { state, resetState, getStateSnapshot } from "./state";
import { ctx } from "./context";
import { updateMoon } from "./moon";
import { canAutoSpawnEntities, setDebugRuntimeActions } from "./debug";
import {
  WIDTH,
  HEIGHT,
  RUNTIME_CONFIG,
  UI_COPY,
  LOADING_SCREEN,
  SKILL_FLASH,
} from "./constants";
import { loadSprites } from "./assets";
import { setupInput, teardownInput, debugCollisionBoxes } from "./input";
import { drawBackground, drawGroundTiles } from "./background";
import { drawNearForeground } from "./nearForeground";

import { updatePlayer, drawPlayer, triggerAttack, castSelectedSkill, castUltimateSkill, selectSkill, tryJump } from "./entities/player";
import { spawnEnemy, spawnEnemyBySheetIndex, updateEnemies, drawEnemy } from "./entities/enemy";
import { updateBindingZones, drawBindingZones } from "./entities/enemies/binder";
import { spawnBoss, updateBoss, drawBoss, updateBossSkill1Effects, drawBossSkill1Effects } from "./entities/boss";
import {
  spawnMapSegmentOfKind,
  spawnNextMapSegment,
  nextMapSpawnInterval,
  resetMapGenerator,
  updatePlatforms,
  updateCrystals,
  updateChests,
  drawPlatforms,
  drawCrystals,
  drawChests,
} from "./entities/platform";
import { updateProjectiles, drawProjectiles } from "./entities/projectile";
import { updateParticles, updateSkillBursts, updateHitBursts, updateSkill1Effects, updateSkill2Effects, updateSkill3Effect, updateUltimateEffects, drawParticles, drawSkillBursts, drawHitBursts, drawSkill1Effects, drawSkill2Effects, drawSkill3Effect, drawUltimateEffects } from "./entities/particle";
import type { GameSnapshot } from "./gameStore";

let frameId = 0;
let running = false;
let paused = false;
let publishState: (snapshot: GameSnapshot) => void = () => {};

function publishCurrentState() {
  publishState(getStateSnapshot(paused));
}

function togglePause() {
  if (state.gameOver || !state.spritesReady) return;
  paused = !paused;
  publishCurrentState();
}

function queueNextFrame() {
  frameId = requestAnimationFrame(loop);
}

function restart() {
  paused = false;
  resetState();
  resetMapGenerator();
  publishCurrentState();
}

setDebugRuntimeActions({
  canSpawn: () => !state.gameOver,
  publish: publishCurrentState,
  spawnEnemySheet: spawnEnemyBySheetIndex,
  spawnPlatformSegment: spawnMapSegmentOfKind,
  spawnBoss,
});

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
  if (paused) {
    state.last = ts;
    queueNextFrame();
    return;
  }
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
    if (canAutoSpawnEntities()) {
      state.spawnTimer -= dt;
      state.bossSpawnTimer -= dt;
    }

    if (canAutoSpawnEntities() && !state.boss && state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = Math.max(
        RUNTIME_CONFIG.enemySpawnMinInterval,
        RUNTIME_CONFIG.enemySpawnBaseInterval - state.elapsed * RUNTIME_CONFIG.enemySpawnDecay,
      );
    }

    if (canAutoSpawnEntities()) state.platformSpawnTimer -= dt;
    if (canAutoSpawnEntities() && state.platformSpawnTimer <= 0) {
      spawnNextMapSegment();
      state.platformSpawnTimer = nextMapSpawnInterval();
    }

    if (canAutoSpawnEntities() && !state.boss && state.bossSpawnTimer <= 0 && state.elapsed > RUNTIME_CONFIG.bossAppearAfterSeconds) {
      spawnBoss();
      state.bossSpawnTimer = RUNTIME_CONFIG.disableBossSpawnTimer;
    }

    updateBindingZones();
    updatePlayer();
    updatePlatforms(dt);
    updateCrystals(dt);
    updateChests(dt);
    updateEnemies();
    updateBoss();
    updateBossSkill1Effects();
    updateProjectiles();
    updateParticles();
    updateSkillBursts();
    updateHitBursts();
    updateSkill1Effects();
    updateSkill2Effects();
    updateSkill3Effect();
    updateUltimateEffects();
  }

  drawBackground();
  drawNearForeground();
  drawPlatforms();
  drawCrystals();
  drawChests();
  drawBindingZones();

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
  drawSkill3Effect();
  drawUltimateEffects();
  drawSkillBursts();
  for (const e of state.enemies) drawEnemy(e);
  drawBoss();
  drawBossSkill1Effects();
  drawSkill1Effects();
  drawSkill2Effects();
  drawHitBursts();
  drawProjectiles();
  drawParticles();
  drawGroundTiles();

  if (debugCollisionBoxes) {
    ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(state.player.x, state.player.y, state.player.w, state.player.h);

    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    for (const e of state.enemies) {
      ctx.strokeRect(e.x, e.y, e.w, e.h);
    }

    if (state.boss) {
      ctx.strokeStyle = "rgba(255, 128, 0, 0.8)";
      ctx.strokeRect(state.boss.x, state.boss.y, state.boss.w, state.boss.h);
    }
  }

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
    onUltimate: castUltimateSkill,
    onSwitchSkill: selectSkill,
    onRestart: restart,
    onPause: togglePause,
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
