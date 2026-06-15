import { state, resetState, getStateSnapshot } from "./state";
import { ctx } from "./context";
import { updateMoon } from "./moon";
import { canAutoSpawnEntities, hasDebugInfiniteSkillCharge, setDebugRuntimeActions } from "./debug";
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
import { drawBackground, drawGroundTileBase, drawGroundTileFront } from "./background";
import { drawNearForeground } from "./nearForeground";

import { updatePlayer, drawPlayer, triggerAttack, castSelectedSkill, castUltimateSkill, selectSkill, tryJump } from "./entities/player";
import { spawnEnemy, spawnEnemyBySheetIndex, updateEnemies, drawEnemy } from "./entities/enemy";
import { updateBindingZones, drawBindingZonesBack, drawBindingZonesFront } from "./entities/enemies/binder";
import { drawWardenAuraIndicators } from "./entities/enemies/warden";
import { spawnBoss, updateBoss, drawBoss, updateBossSkill1Effects, drawBossSkill1Effects, updateDeadBellEffects, drawDeadBellEffects, updateMirrorDreamEffects, drawMirrorDreamEffects, updateLanternEmberEffects, drawLanternEmberEffects, updateBloodMoonEffects, drawBloodMoonEffects } from "./entities/boss";
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
import {
  updateParticles,
  updateSkillBursts,
  updateHitBursts,
  updateSkill1Effects,
  updateSkill2Effects,
  updateSkill3Effect,
  updatePlayerSkillEffects,
  updateUltimateEffects,
  updateUltimateTrails,
  updateUltimateAfterimageSlashes,
  drawParticles,
  drawSkillBursts,
  drawHitBursts,
  drawSkill1Effects,
  drawSkill2Effects,
  drawSkill3Effect,
  drawPlayerSkillEffects,
  drawUltimateEffects,
  drawUltimateTrails,
  drawUltimateAfterimageSlashes,
} from "./entities/particle";
import type { GameSnapshot } from "./gameStore";
import type { SkillId } from "./types/assets";
import type { EquipmentItemId, EquipmentSlot } from "./types/game-state";
import { applyUpgradeChoice } from "./systems/progression";
import { chooseBossEquipment as chooseBossEquipmentReward, equipEquipment as equipEquipmentInState } from "./systems/equipment";
import { equipSkillSlot as equipSkillSlotInState, SKILL_SLOT_COUNT } from "./systems/loadout";

let frameId = 0;
let running = false;
let manualPaused = false;
let publishState: (snapshot: GameSnapshot) => void = () => {};

function hasBlockingOverlay() {
  return state.pendingEquipmentChoices.length > 0 || state.pendingUpgradeChoices.length > 0;
}

function isPaused() {
  return manualPaused || hasBlockingOverlay();
}

function publishCurrentState() {
  syncDebugInfiniteSkillCharge();
  publishState(getStateSnapshot(manualPaused, isPaused()));
}

function syncDebugInfiniteSkillCharge() {
  if (!hasDebugInfiniteSkillCharge()) return;
  state.player.skillEnergy = state.player.skillEnergyMax;
  state.player.skillCharges = state.player.maxSkillCharges;
}

function togglePause() {
  if (state.gameOver || !state.spritesReady) return;
  if (hasBlockingOverlay()) return;
  manualPaused = !manualPaused;
  publishCurrentState();
}

function queueNextFrame() {
  frameId = requestAnimationFrame(loop);
}

function restart() {
  manualPaused = false;
  resetState();
  resetMapGenerator();
  publishCurrentState();
}

function runCombatAction(action: () => void) {
  if (isPaused() || state.gameOver || !state.spritesReady) return;
  action();
}

export function chooseUpgradeReward(index: number) {
  if (applyUpgradeChoice(state, index)) publishCurrentState();
}

export function chooseBossEquipment(index: number) {
  if (chooseBossEquipmentReward(state, index)) publishCurrentState();
}

export function equipSkillSlot(slotIndex: number, skillId: SkillId) {
  if (equipSkillSlotInState(state, slotIndex, skillId)) publishCurrentState();
}

function equipDebugSkillSlot(slotIndex: number, skillId: SkillId) {
  if (slotIndex < 0 || slotIndex >= SKILL_SLOT_COUNT) return;

  if (!state.player.skillLevels[skillId]) {
    state.player.skillLevels[skillId] = 1;
  }

  const duplicateSlot = state.player.equippedSkillIds.findIndex((equippedId, index) => (
    index !== slotIndex && equippedId === skillId
  ));
  if (duplicateSlot !== -1) {
    state.player.equippedSkillIds[duplicateSlot] = null;
  }

  if (equipSkillSlotInState(state, slotIndex, skillId)) {
    state.player.skillIndex = slotIndex;
  }
}

export function equipEquipment(slot: EquipmentSlot, itemId: EquipmentItemId | null) {
  if (equipEquipmentInState(state, slot, itemId)) publishCurrentState();
}

setDebugRuntimeActions({
  canSpawn: () => !state.gameOver,
  publish: publishCurrentState,
  setInfiniteSkillCharge: (enabled) => {
    if (enabled) syncDebugInfiniteSkillCharge();
  },
  spawnEnemySheet: spawnEnemyBySheetIndex,
  spawnPlatformSegment: spawnMapSegmentOfKind,
  spawnBoss,
  equipSkillSlot: equipDebugSkillSlot,
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
  if (isPaused()) {
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
    updateDeadBellEffects();
    updateMirrorDreamEffects();
    updateLanternEmberEffects();
    updateBloodMoonEffects();
    updateProjectiles();
    updateParticles();
    updateSkillBursts();
    updateHitBursts();
    updateSkill1Effects();
    updateSkill2Effects();
    updateSkill3Effect();
    updatePlayerSkillEffects();
    updateUltimateEffects();
    updateUltimateTrails();
    updateUltimateAfterimageSlashes();
  }

  drawBackground();
  drawNearForeground();
  drawGroundTileBase();
  drawPlatforms();
  drawCrystals();
  drawChests();
  drawBindingZonesBack();
  drawUltimateTrails();
  drawUltimateEffects();

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
  drawSkillBursts();
  drawUltimateAfterimageSlashes();
  drawWardenAuraIndicators();
  for (const e of state.enemies) drawEnemy(e);
  drawBoss();
  drawBossSkill1Effects();
  drawDeadBellEffects();
  drawMirrorDreamEffects();
  drawLanternEmberEffects();
  drawBloodMoonEffects();
  drawSkill1Effects();
  drawGroundTileFront();
  drawSkill2Effects();
  drawPlayerSkillEffects();
  drawBindingZonesFront();
  drawHitBursts();
  drawProjectiles();
  drawParticles();

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
    onJump: () => runCombatAction(tryJump),
    onAttack: () => runCombatAction(triggerAttack),
    onSkill: () => runCombatAction(castSelectedSkill),
    onUltimate: () => runCombatAction(castUltimateSkill),
    onSwitchSkill: (index) => runCombatAction(() => selectSkill(index)),
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
