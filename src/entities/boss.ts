import { BLOOD_MOON_CONFIG, BOSS_CONFIG } from "../constants";
import { state } from "../game/state";
import { playSfx } from "../game/audio";
import type { BossArchetypeId } from "../types/game-state";
import { BOSS_ARCHETYPE_IDS } from "./bosses/registry";
import { bossPhaseForHp, createBossEncounter } from "./bosses/encounter";
import { updateBloodMoonBoss } from "./bosses/bloodMoonBehavior";
import { updateDeadBellBoss } from "./bosses/deadBellBehavior";
import { updateFangGaleBoss } from "./bosses/fangGaleBehavior";
import { updateLanternEmberBoss } from "./bosses/lanternEmberBehavior";
import { updateMistBoneBoss } from "./bosses/mistBoneBehavior";
import { updateMirrorDreamBoss } from "./bosses/mirrorDreamBehavior";
import { updateSpiderStringBoss } from "./bosses/spiderStringBehavior";
import type { LiveBoss } from "./bosses/types";

const BLOOD_MOON_PHASE_SHIFT_PITCH_STEP = 0.04;

export { drawBoss } from "./bosses/renderBoss";
export { drawBossSkill1Effects, updateBossSkill1Effects } from "./bosses/spiderStringEffects";
export { drawSpiderStringCageEffects, updateSpiderStringCageEffects } from "./bosses/spiderStringCageEffects";
export { drawDeadBellEffects, updateDeadBellEffects } from "./bosses/deadBellEffects";
export { drawFangGaleEffects, updateFangGaleEffects } from "./bosses/fangGaleEffects";
export { drawMirrorDreamEffects, updateMirrorDreamEffects } from "./bosses/mirrorDreamEffects";
export { drawMistBoneEffects, updateMistBoneEffects } from "./bosses/mistBoneEffects";
export { drawLanternEmberEffects, updateLanternEmberEffects } from "./bosses/lanternEmberEffects";
export { drawBloodMoonEffects, updateBloodMoonEffects } from "./bosses/bloodMoonEffects";

export function spawnBoss(id?: BossArchetypeId) {
  state.boss = createBossEncounter({
    id,
    bossKills: state.bossKills,
    elapsedSeconds: state.elapsed,
  });
  playSfx("bossSpawn");
}

export function updateBoss() {
  const boss = state.boss;
  if (!boss) return;

  boss.hitCd -= 1;
  boss.aiTimer -= 1;
  boss.jumpCd -= 1;
  boss.skillCd -= 1;
  boss.actionTimer += 1;
  if ((boss.armorBreakTimer ?? 0) > 0) {
    boss.armorBreakTimer = Math.max(0, (boss.armorBreakTimer ?? 0) - 1);
  }

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

  updateBossPhase(boss);

  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) {
    updateDeadBellBoss(boss);
  } else if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) {
    updateLanternEmberBoss(boss);
  } else if (boss.id === BOSS_ARCHETYPE_IDS.fangGale) {
    updateFangGaleBoss(boss);
  } else if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) {
    updateMirrorDreamBoss(boss);
  } else if (boss.id === BOSS_ARCHETYPE_IDS.mistBone) {
    updateMistBoneBoss(boss);
  } else if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) {
    updateBloodMoonBoss(boss);
  } else {
    updateSpiderStringBoss(boss);
  }
}

function updateBossPhase(boss: LiveBoss) {
  const previousPhase = boss.phase;
  boss.phase = bossPhaseForHp(boss);
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon && boss.phase > previousPhase) {
    boss.phaseShiftTimer = BLOOD_MOON_CONFIG.phaseShiftFrames;
    boss.actionState = "windup";
    boss.actionTimer = 0;
    boss.vx = 0;
    playSfx("bossPhaseShift", 1 + boss.phase * BLOOD_MOON_PHASE_SHIFT_PITCH_STEP);
  }
}
