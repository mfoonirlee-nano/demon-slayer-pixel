import { state, resetState, getStateSnapshot } from "./state";
import { ctx } from "../rendering/context";
import { updateMoon } from "../moon";
import {
  applyDebugInfiniteUltimateCharge,
  canAutoSpawnEntities,
  hasDebugInfiniteHealth,
  hasDebugInfiniteSkillCharge,
  hasDebugInfiniteUltimateCharge,
  setDebugRuntimeActions,
} from "./debug";
import {
  WIDTH,
  HEIGHT,
  RUNTIME_CONFIG,
  UI_COPY,
  LOADING_SCREEN,
  SKILL_FLASH,
} from "../constants";
import { loadSprites } from "../assets";
import { getCoverProgress } from "./coverProgress";
import { setupInput, teardownInput, debugCollisionBoxes } from "./input";
import { drawBackground, drawGroundTileBase, drawGroundTileOcclusion } from "../rendering/background";
import { drawNearForeground } from "../rendering/nearForeground";

import { updatePlayer, drawPlayer, triggerAttack, castSelectedSkill, castUltimateSkill, selectSkill, tryJump } from "../entities/player";
import {
  drawEnemy,
  isEnemyBehindSpawnOccluder,
  spawnEnemyById,
  spawnEnemyBySheetIndex,
  updateEnemies,
} from "../entities/enemy";
import { updateBindingZones, drawBindingZonesBack, drawBindingZonesFront } from "../entities/enemies/binder";
import {
  drawBruteFireballEffects,
  updateBruteFireballEffects,
} from "../entities/enemies/bruteFireballEffects";
import { drawWardenAuraIndicators } from "../entities/enemies/warden";
import {
  drawBloodMoonEffects,
  drawBoss,
  drawBossDefeatSplitEffect,
  drawBossSkill1Effects,
  drawDeadBellEffects,
  drawFangGaleEffects,
  drawLanternEmberEffects,
  drawMirrorDreamEffects,
  drawMistBoneEffects,
  drawSpiderStringCageEffects,
  spawnBoss,
  updateBloodMoonEffects,
  updateBoss,
  updateBossDefeatSplitEffect,
  updateBossSkill1Effects,
  updateDeadBellEffects,
  updateFangGaleEffects,
  updateLanternEmberEffects,
  updateMirrorDreamEffects,
  updateMistBoneEffects,
  updateSpiderStringCageEffects,
} from "../entities/boss";
import {
  spawnMapSegmentOfKind,
  spawnNextMapSegment,
  nextMapSpawnInterval,
  resetMapGenerator,
  updatePlatforms,
  updateCrystals,
  updateChests,
  drawPlatformOcclusion,
  drawPlatforms,
  drawCrystals,
  drawChests,
} from "../entities/platform";
import { updateProjectiles, drawProjectiles } from "../entities/projectile";
import {
  updateParticles,
  updateSkillBursts,
  updateHitBursts,
  updateLineProjectileEffects,
  updateCloseArcEffects,
  updateCloseArcBasicCrescentEffects,
  updateGuardCounterEffect,
  updatePlayerSkillEffects,
  updateUltimateEffects,
  updateUltimateTrails,
  updateUltimateAfterimageSlashes,
  updateUltimatePlayerGhosts,
  drawParticles,
  drawSkillBursts,
  drawHitBursts,
  drawLineProjectileEffects,
  drawCloseArcEffects,
  drawCloseArcBasicCrescentEffects,
  drawGuardCounterEffect,
  drawPlayerSkillEffects,
  drawUltimateEffects,
  drawUltimateTrails,
  drawUltimateAfterimageSlashes,
  drawUltimatePlayerGhosts,
} from "../entities/particle";
import { gameStore, type GameSnapshot } from "./gameStore";
import { languageAtom } from "../i18n/language";
import { message } from "../i18n/messages";
import type { SkillId } from "../types/assets";
import type { EnemyState, EquipmentItemId, EquipmentSlot, SkillLevel } from "../types/game-state";
import { applyUpgradeChoice } from "../systems/progression";
import { chooseBossEquipment as chooseBossEquipmentReward, equipEquipment as equipEquipmentInState } from "../systems/equipment";
import { equipSkillSlot as equipSkillSlotInState, setSkillLevel as setSkillLevelInState, SKILL_SLOT_COUNT } from "../systems/loadout";
import { updateEnemyDirector } from "../systems/enemyDirector";
import { markSpritesReady } from "../systems/runLifecycle";

let frameId = 0;

type EnemyLayerFilter = (enemy: EnemyState) => boolean;

function isEnemyAboveNearForeground(enemy: EnemyState) {
  return !isEnemyBehindSpawnOccluder(enemy);
}

function drawEnemyLayer(shouldDraw: EnemyLayerFilter) {
  drawWardenAuraIndicators(shouldDraw);
  for (const enemy of state.enemies) {
    if (shouldDraw(enemy)) drawEnemy(enemy);
  }
}
let running = false;
let manualPaused = false;
let publishState: (snapshot: GameSnapshot) => void = () => {};

function hasBlockingOverlay() {
  return state.pendingEquipmentChoices.length > 0 || state.pendingUpgradeChoices.length > 0;
}

function isPaused() {
  return manualPaused || hasBlockingOverlay() || state.bossDefeatSplitEffect !== null;
}

function publishCurrentState() {
  syncDebugInfiniteHealth();
  syncDebugInfiniteSkillCharge();
  syncDebugInfiniteUltimateCharge();
  publishState(getStateSnapshot(manualPaused, isPaused()));
}

function syncDebugInfiniteHealth() {
  if (!hasDebugInfiniteHealth()) return;
  state.player.hp = state.player.maxHp;
}

function syncDebugInfiniteSkillCharge() {
  if (!hasDebugInfiniteSkillCharge()) return;
  state.player.skillEnergy = state.player.skillEnergyMax;
  state.player.skillCharges = state.player.maxSkillCharges;
}

function syncDebugInfiniteUltimateCharge() {
  if (!hasDebugInfiniteUltimateCharge()) return;
  applyDebugInfiniteUltimateCharge(state);
}

function togglePause() {
  if (state.gameOver || !state.spritesReady) return;
  if (hasBlockingOverlay() || state.bossDefeatSplitEffect) return;
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
  if (state.player.ultimateCastTimer > 0) return;
  action();
}

function isUltimateCastFreezeActive() {
  return state.player.ultimateCastTimer > 0;
}

export function updateUltimateCastFreezeFrame() {
  updatePlayer();
  // Gameplay remains frozen, but old visual bursts must not stay at peak density for the full cast.
  updateParticles();
  updateSkillBursts();
  updateHitBursts();
  updateUltimateTrails();
  updateUltimateAfterimageSlashes();
  updateUltimatePlayerGhosts();
  updateUltimateEffects();
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
    setSkillLevelInState(state, skillId, 1);
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

function setDebugSkillLevel(skillId: SkillId, level: SkillLevel) {
  setSkillLevelInState(state, skillId, level);
}

export function equipEquipment(slot: EquipmentSlot, itemId: EquipmentItemId | null) {
  if (equipEquipmentInState(state, slot, itemId)) publishCurrentState();
}

setDebugRuntimeActions({
  canSpawn: () => !state.gameOver,
  publish: publishCurrentState,
  setInfiniteHealth: (enabled) => {
    if (enabled) syncDebugInfiniteHealth();
  },
  setInfiniteSkillCharge: (enabled) => {
    if (enabled) syncDebugInfiniteSkillCharge();
  },
  setInfiniteUltimateCharge: (enabled) => {
    if (enabled) syncDebugInfiniteUltimateCharge();
  },
  spawnEnemySheet: spawnEnemyBySheetIndex,
  spawnPlatformSegment: spawnMapSegmentOfKind,
  spawnBoss,
  equipSkillSlot: equipDebugSkillSlot,
  setSkillLevel: setDebugSkillLevel,
});

function drawLoadingState() {
  if (!ctx) return;
  drawBackground();
  ctx.fillStyle = LOADING_SCREEN.overlayColor;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = LOADING_SCREEN.textColor;
  ctx.font = LOADING_SCREEN.font;
  const loadingText = message(gameStore.get(languageAtom), "loading.sprites");
  ctx.fillText(loadingText, WIDTH / 2 - ctx.measureText(loadingText).width / 2, HEIGHT / 2);
}

function loop(ts: number) {
  if (!running || !ctx) return;
  const bossDefeatFreezeActive = state.bossDefeatSplitEffect !== null;
  // Rewards or victory may already be queued, but this RAF must continue until the split finishes.
  if (manualPaused || (hasBlockingOverlay() && !bossDefeatFreezeActive)) {
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
    coverProgressTarget: getCoverProgress(),
    coverProgressLerpSpeed: RUNTIME_CONFIG.moonCoverProgressLerpSpeed,
  });

  if (!state.spritesReady) {
    drawLoadingState();
    publishCurrentState();
    queueNextFrame();
    return;
  }

  if (!state.gameOver || bossDefeatFreezeActive) {
    if (bossDefeatFreezeActive) {
      updateBossDefeatSplitEffect();
    } else if (isUltimateCastFreezeActive()) {
      updateUltimateCastFreezeFrame();
    } else {
      state.elapsed += dt;
      if (canAutoSpawnEntities()) {
        const directorUpdate = updateEnemyDirector(state.enemyDirector, {
          dt,
          bossKills: state.bossKills,
          elapsedSeconds: state.elapsed,
          activeEnemies: state.enemies,
          playerHp: state.player.hp,
          playerMaxHp: state.player.maxHp,
          bossActive: state.boss !== null,
        });
        for (const request of directorUpdate.spawnRequests) {
          spawnEnemyById(request.enemyId, "regular", request.pattern, { elite: request.elite });
        }
        if (!state.boss && directorUpdate.spawnBoss) {
          spawnBoss();
        }
      }

      if (canAutoSpawnEntities()) state.platformSpawnTimer -= dt;
      if (canAutoSpawnEntities() && state.platformSpawnTimer <= 0) {
        spawnNextMapSegment();
        state.platformSpawnTimer = nextMapSpawnInterval();
      }

      updateBindingZones();
      updatePlayer();
      updatePlatforms(dt);
      updateCrystals(dt);
      updateChests(dt);
      updateEnemies();
      updateBruteFireballEffects();
      updateBoss();
      updateBossSkill1Effects();
      updateSpiderStringCageEffects();
      updateDeadBellEffects();
      updateMistBoneEffects();
      updateMirrorDreamEffects();
      updateFangGaleEffects();
      updateLanternEmberEffects();
      updateBloodMoonEffects();
      updateProjectiles();
      updateParticles();
      updateSkillBursts();
      updateHitBursts();
      updateLineProjectileEffects();
      updateCloseArcEffects();
      updateCloseArcBasicCrescentEffects();
      updateGuardCounterEffect();
      updatePlayerSkillEffects();
      updateUltimateEffects();
      updateUltimateTrails();
      updateUltimateAfterimageSlashes();
      updateUltimatePlayerGhosts();
    }
  }

  drawBackground();
  drawEnemyLayer(isEnemyBehindSpawnOccluder);
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

  drawUltimatePlayerGhosts();
  drawPlayer();
  drawPlatformOcclusion();
  drawGuardCounterEffect();
  drawSkillBursts();
  drawUltimateAfterimageSlashes();
  drawEnemyLayer(isEnemyAboveNearForeground);
  drawBoss();
  drawBossDefeatSplitEffect();
  drawBossSkill1Effects();
  drawSpiderStringCageEffects();
  drawDeadBellEffects();
  drawMistBoneEffects();
  drawMirrorDreamEffects();
  drawFangGaleEffects();
  drawBloodMoonEffects();
  drawLineProjectileEffects();
  drawGroundTileOcclusion();
  drawLanternEmberEffects();
  drawCloseArcEffects();
  drawCloseArcBasicCrescentEffects();
  drawPlayerSkillEffects();
  drawBindingZonesFront();
  drawHitBursts();
  drawBruteFireballEffects();
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
      markSpritesReady(state);
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
