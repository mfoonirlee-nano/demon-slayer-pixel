import { state } from "../state";
import { WIDTH, GROUND_Y, BOSS_SHEET, BOSS_CONFIG } from "../constants";
import type { BossState } from "../types/game-state";
import { hitbox, frameIndex } from "../utils";
import { drawSheetFrame } from "../graphics";
import { playTone } from "../audio";
import { hurtPlayer } from "./player";
import { spawnEnemy } from "./enemy";

export function spawnBoss() {
  const hp = BOSS_CONFIG.baseHp + state.elapsed * BOSS_CONFIG.hpScaleByElapsed;
  state.boss = {
    x: WIDTH + BOSS_CONFIG.spawnOffsetX,
    y: GROUND_Y - BOSS_CONFIG.yOffsetFromGround,
    w: BOSS_CONFIG.w,
    h: BOSS_CONFIG.h,
    vx: BOSS_CONFIG.entryVelocityX,
    targetX: WIDTH - BOSS_CONFIG.targetXOffset,
    entering: true,
    hpMax: hp,
    hp,
    phase: 1,
    hitCd: 0,
    aiTimer: 0,
    jumpCd: 0,
    animSeed: Math.floor(Math.random() * BOSS_CONFIG.animSeedMax),
  };
  playTone(120, 0.2, "sawtooth", 0.06);
  playTone(90, 0.25, "sawtooth", 0.05);
}

export function updateBoss() {
  const boss = state.boss as BossState;
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
      boss.aiTimer = BOSS_CONFIG.entryAiDelay;
    }
    return;
  }

  if (boss.hp < boss.hpMax * BOSS_CONFIG.phaseTwoThreshold) boss.phase = 2;
  if (boss.hp < boss.hpMax * BOSS_CONFIG.phaseThreeThreshold) boss.phase = 3;

  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.vx += Math.sign(toward) * (BOSS_CONFIG.baseSteeringForce + boss.phase * BOSS_CONFIG.phaseSteeringForce);
  boss.vx *= BOSS_CONFIG.drag;
  boss.vx = Math.max(-(BOSS_CONFIG.baseMaxVelocity + boss.phase), Math.min(BOSS_CONFIG.baseMaxVelocity + boss.phase, boss.vx));
  boss.x += boss.vx;
  boss.x = Math.max(0, Math.min(WIDTH - boss.w, boss.x));

  if (boss.aiTimer <= 0) {
    if (boss.phase >= 2 && Math.random() < BOSS_CONFIG.projectileChance) {
      const dir = Math.sign(toward) || 1;
      for (let i = 0; i < boss.phase; i += 1) {
        state.projectiles.push({
          x: boss.x + boss.w / 2,
          y: boss.y + BOSS_CONFIG.projectileYOffset + i * BOSS_CONFIG.projectileYOffsetStep,
          w: BOSS_CONFIG.projectileW,
          h: BOSS_CONFIG.projectileH,
          vx: (BOSS_CONFIG.projectileBaseSpeed + i * BOSS_CONFIG.projectileSpeedStep) * dir,
          life: BOSS_CONFIG.projectileLife,
          damage: BOSS_CONFIG.projectileBaseDamage + boss.phase,
        });
      }
      playTone(190, 0.08, "sawtooth", 0.05);
    } else {
      spawnEnemy();
      if (boss.phase >= BOSS_CONFIG.summonExtraEnemyPhase) spawnEnemy();
      playTone(100, 0.09, "square", 0.045);
    }
    boss.aiTimer = BOSS_CONFIG.aiBaseCooldown - boss.phase * BOSS_CONFIG.aiPhaseReduction;
  }

  if (boss.jumpCd <= 0 && Math.random() < BOSS_CONFIG.jumpChancePerPhase * boss.phase) {
    boss.vx += Math.sign(toward) * (BOSS_CONFIG.jumpVelocityBase + boss.phase);
    boss.jumpCd = BOSS_CONFIG.jumpCooldown;
  }

  if (hitbox(state.player, boss)) {
    hurtPlayer(BOSS_CONFIG.touchDamageBase + boss.phase * BOSS_CONFIG.touchDamagePhase, boss.vx);
  }
}

export function drawBoss() {
  const boss = state.boss as BossState;
  if (!boss) return;
  const frame = frameIndex(BOSS_SHEET.count, BOSS_CONFIG.baseAnimSpeed - boss.phase, state.elapsed, boss.animSeed);
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  const facing = toward >= 0 ? 1 : -1;
  drawSheetFrame(
    BOSS_SHEET,
    frame,
    boss.x - BOSS_CONFIG.drawOffsetX,
    boss.y - BOSS_CONFIG.drawOffsetY,
    BOSS_CONFIG.drawW,
    BOSS_CONFIG.drawH,
    facing,
  );
}
