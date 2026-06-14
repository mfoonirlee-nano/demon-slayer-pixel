import { state } from "../state";
import { canAutoSpawnEntities } from "../debug";
import {
  WIDTH,
  GROUND_Y,
  BOSS_CONFIG,
  BOSS_SKILL1_CONFIG,
  BLOOD_MOON_CONFIG,
  BLOOD_MOON_LANTERN_BELL_CAST_SHEET,
  BLOOD_MOON_LANTERN_BELL_EFFECT_SHEET,
  BLOOD_MOON_MANY_FACES_CAST_SHEET,
  BLOOD_MOON_MANY_FACES_EFFECT_SHEET,
  BLOOD_MOON_MIRROR_FANG_CAST_SHEET,
  BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
  BLOOD_MOON_PHASE_SHIFT_SHEET,
  BLOOD_MOON_RECOVER_SHEET,
  BLOOD_MOON_SIXFOLD_CAST_SHEET,
  BLOOD_MOON_SIXFOLD_EFFECT_SHEET,
  BLOOD_MOON_SPIDER_MIST_CAST_SHEET,
  BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
  DEAD_BELL_BLADE_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_WAVE_SHEET,
  LANTERN_EMBER_ASH_ZONE_SHEET,
  LANTERN_EMBER_AWAKENED_GRID_SHEET,
  LANTERN_EMBER_BUFF_CAST_SHEET,
  LANTERN_EMBER_BUFF_TETHER_SHEET,
  LANTERN_EMBER_CONFIG,
  LANTERN_EMBER_FIRELINE_CAST_SHEET,
  LANTERN_EMBER_FIRELINE_SHEET,
  LANTERN_EMBER_LURE_EFFECT_SHEET,
  LANTERN_EMBER_SUMMON_SHEET,
  MIRROR_AFTERIMAGE_SHEET,
  MIRROR_DREAM_CONFIG,
  MIRROR_NIGHTMARE_SHEET,
  MIRROR_SHARD_SHEET,
} from "../constants";
import type {
  BossArchetypeId,
  BossSkill1EffectState,
  BossState,
  BloodMoonEffectState,
  DeadBellBladeState,
  DeadBellWaveState,
  LanternEmberAshZoneState,
  LanternEmberAwakenedGridState,
  LanternEmberBuffTetherState,
  LanternEmberFirelineState,
  LanternEmberLureState,
  MirrorAfterimageState,
  MirrorShardState,
} from "../types/game-state";
import { clamp, hitbox, frameIndex } from "../utils";
import { drawSheetFrame } from "../graphics";
import { ctx } from "../context";
import { playSfx } from "../audio";
import { hurtPlayer } from "./player";
import { spawnEnemy } from "./enemy";
import { damageEnemy } from "./enemies/common";
import { resolveEnemyDefeat } from "./enemies/defeat";
import { BOSS_ARCHETYPE_IDS, bossArchetypeForId, bossArchetypeForKillCount } from "./bosses/registry";

type LiveBoss = NonNullable<BossState>;

export function spawnBoss(id?: BossArchetypeId) {
  const archetype = id ? bossArchetypeForId(id) : bossArchetypeForKillCount(state.bossKills);
  const act = state.bossKills + 1;
  const awakened = archetype.id === BOSS_ARCHETYPE_IDS.lanternEmber
    && act >= archetype.awakenedUnlockAct;
  const hp = archetype.hpBase
    + state.bossKills * archetype.hpPerKill
    + state.elapsed * archetype.hpScaleByElapsed;

  state.boss = {
    id: archetype.id,
    x: WIDTH + BOSS_CONFIG.spawnOffsetX,
    y: GROUND_Y - archetype.yOffsetFromGround,
    w: archetype.collisionW,
    h: archetype.collisionH,
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
    actionState: "move",
    actionTimer: 0,
    facing: -1,
    skillCd: archetype.skillInitialCooldown,
    castTimer: 0,
    skillEffectSpawned: false,
    castFacing: -1,
    skillHitDone: false,
    skillMode: archetype.skillMode,
    recoveryTimer: 0,
    awakened,
  };
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
  } else if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) {
    updateMirrorDreamBoss(boss);
  } else if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) {
    updateBloodMoonBoss(boss);
  } else {
    updateSpiderStringBoss(boss);
  }
}

function updateBossPhase(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  const phaseThresholds = boss.awakened
    ? [0.75, 0.5, 0.25]
    : archetype.phaseThresholds;
  const hpRatio = boss.hp / boss.hpMax;
  const previousPhase = boss.phase;
  boss.phase = 1;
  for (const threshold of phaseThresholds) {
    if (hpRatio < threshold) boss.phase += 1;
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon && boss.phase > previousPhase) {
    boss.phaseShiftTimer = BLOOD_MOON_CONFIG.phaseShiftFrames;
    boss.actionState = "windup";
    boss.actionTimer = 0;
    boss.vx = 0;
    playSfx("bossPhaseShift", 1 + boss.phase * 0.04);
  }
}

function damagePlayerOnContact(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  if (hitbox(state.player, boss)) {
    hurtPlayer(archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase, boss.vx);
  }
}

function updateSpiderStringBoss(boss: LiveBoss) {
  if (boss.castTimer > 0) {
    boss.vx = 0;
    boss.castTimer -= 1;
    const framesSinceCastStart = BOSS_SKILL1_CONFIG.castDuration - boss.castTimer;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= BOSS_SKILL1_CONFIG.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnBossSkill1Effect(boss);
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0 && boss.phase >= BOSS_SKILL1_CONFIG.minPhase) {
    const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
    boss.castFacing = toPlayer >= 0 ? 1 : -1;
    boss.facing = boss.castFacing;
    boss.castTimer = BOSS_SKILL1_CONFIG.castDuration;
    boss.skillEffectSpawned = false;
    boss.skillMode = "spiderString";
    boss.actionState = "cast";
    boss.actionTimer = 0;
    boss.skillCd = BOSS_SKILL1_CONFIG.cooldown;
    boss.vx = 0;
    playSfx("bossCast", 0.92);
    return;
  }

  moveChasingBoss(boss);

  if (boss.aiTimer <= 0) {
    const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
    if (boss.phase >= 2 && Math.random() < BOSS_CONFIG.projectileChance) {
      const dir = Math.sign(toward) || 1;
      for (let i = 0; i < boss.phase; i += 1) {
        state.projectiles.push({
          kind: "boss",
          x: boss.x + boss.w / 2,
          y: boss.y + BOSS_CONFIG.projectileYOffset + i * BOSS_CONFIG.projectileYOffsetStep,
          w: BOSS_CONFIG.projectileW,
          h: BOSS_CONFIG.projectileH,
          vx: (BOSS_CONFIG.projectileBaseSpeed + i * BOSS_CONFIG.projectileSpeedStep) * dir,
          life: BOSS_CONFIG.projectileLife,
          damage: BOSS_CONFIG.projectileBaseDamage + boss.phase,
        });
      }
      playSfx("bossProjectile", 1 + boss.phase * 0.04);
    } else if (canAutoSpawnEntities()) {
      spawnEnemy();
      if (boss.phase >= BOSS_CONFIG.summonExtraEnemyPhase) spawnEnemy();
      playSfx("bossSummon", 0.92);
    }
    boss.aiTimer = BOSS_CONFIG.aiBaseCooldown - boss.phase * BOSS_CONFIG.aiPhaseReduction;
  }

  if (boss.jumpCd <= 0 && Math.random() < BOSS_CONFIG.jumpChancePerPhase * boss.phase) {
    const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
    boss.vx += Math.sign(toward) * (BOSS_CONFIG.jumpVelocityBase + boss.phase);
    boss.jumpCd = BOSS_CONFIG.jumpCooldown;
  }

  damagePlayerOnContact(boss);
}

function updateDeadBellBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= 0.82;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const castDuration = boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboCastDuration
      : DEAD_BELL_CONFIG.castDuration;
    const framesSinceCastStart = castDuration - boss.castTimer;
    const spawnAtFrame = boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboSpawnAtFrame
      : DEAD_BELL_CONFIG.spawnAtFrame;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnDeadBellPattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = boss.skillMode === "deadBellCombo"
        ? DEAD_BELL_CONFIG.recoveryFrames
        : Math.floor(DEAD_BELL_CONFIG.recoveryFrames * 0.55);
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startDeadBellCast(boss);
    return;
  }

  moveDeadBellBoss(boss);
  damagePlayerOnContact(boss);
}

function updateMirrorDreamBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= MIRROR_DREAM_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const framesSinceCastStart = MIRROR_DREAM_CONFIG.castDuration - boss.castTimer;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= MIRROR_DREAM_CONFIG.spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnMirrorDreamPattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = MIRROR_DREAM_CONFIG.recoveryFrames;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startMirrorDreamCast(boss);
    return;
  }

  moveMirrorDreamBoss(boss);
  damagePlayerOnContact(boss);
}

function updateLanternEmberBoss(boss: LiveBoss) {
  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= LANTERN_EMBER_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const castDuration = lanternCastDuration(boss);
    const framesSinceCastStart = castDuration - boss.castTimer;
    const spawnAtFrame = boss.skillMode === "lanternAwakenedGrid"
      ? LANTERN_EMBER_CONFIG.awakenedSpawnAtFrame
      : LANTERN_EMBER_CONFIG.spawnAtFrame;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnLanternEmberPattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = LANTERN_EMBER_CONFIG.recoveryFrames;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startLanternEmberCast(boss);
    return;
  }

  moveLanternEmberBoss(boss);
  damagePlayerOnContact(boss);
}

function updateBloodMoonBoss(boss: LiveBoss) {
  if ((boss.phaseShiftTimer ?? 0) > 0) {
    boss.phaseShiftTimer = Math.max(0, (boss.phaseShiftTimer ?? 0) - 1);
    boss.vx *= BLOOD_MOON_CONFIG.drag;
    if (boss.phaseShiftTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.recoveryTimer > 0) {
    boss.recoveryTimer -= 1;
    boss.vx *= BLOOD_MOON_CONFIG.drag;
    if (boss.recoveryTimer <= 0) {
      boss.actionState = "move";
      boss.actionTimer = 0;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.castTimer > 0) {
    boss.vx = 0;
    const castDuration = bloodMoonCastDuration(boss);
    const spawnAtFrame = boss.skillMode === "bloodMoonManyFaces"
      ? BLOOD_MOON_CONFIG.finalSpawnAtFrame
      : BLOOD_MOON_CONFIG.spawnAtFrame;
    const framesSinceCastStart = castDuration - boss.castTimer;

    boss.castTimer -= 1;
    if (!boss.skillEffectSpawned && framesSinceCastStart >= spawnAtFrame) {
      boss.skillEffectSpawned = true;
      spawnBloodMoonPattern(boss);
    }
    if (boss.castTimer <= 0) {
      boss.actionState = "recover";
      boss.actionTimer = 0;
      boss.recoveryTimer = boss.skillMode === "bloodMoonManyFaces"
        ? BLOOD_MOON_CONFIG.finalRecoveryFrames
        : BLOOD_MOON_CONFIG.recoveryFrames;
    }
    damagePlayerOnContact(boss);
    return;
  }

  if (boss.skillCd <= 0) {
    startBloodMoonCast(boss);
    return;
  }

  moveBloodMoonBoss(boss);
  damagePlayerOnContact(boss);
}

function bloodMoonCastDuration(boss: LiveBoss) {
  return boss.skillMode === "bloodMoonManyFaces"
    ? BLOOD_MOON_CONFIG.finalCastDuration
    : BLOOD_MOON_CONFIG.castDuration;
}

function startBloodMoonCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextBloodMoonSkill(boss);
  boss.castTimer = bloodMoonCastDuration(boss);
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = bloodMoonSkillCooldown(boss);
  boss.vx = 0;

  playSfx("bossCast", boss.skillMode === "bloodMoonManyFaces" ? 0.78 : 0.88);
}

function nextBloodMoonSkill(boss: LiveBoss) {
  if (boss.phase >= 5) return "bloodMoonManyFaces";
  if (boss.phase === 4) return "bloodMoonSixfold";
  if (boss.phase === 3) return "bloodMoonLanternBell";
  if (boss.phase === 2) return "bloodMoonMirrorFang";
  return "bloodMoonSpiderMist";
}

function bloodMoonSkillCooldown(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonManyFaces") return BLOOD_MOON_CONFIG.finalSkillCooldown;
  return Math.max(142, BLOOD_MOON_CONFIG.skillCooldown - boss.phase * 12);
}

function moveBloodMoonBoss(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const bossCenter = boss.x + boss.w / 2;
  const toPlayer = playerCenter - bossCenter;
  const distance = Math.abs(toPlayer);
  boss.facing = toPlayer >= 0 ? 1 : -1;
  boss.actionState = "move";

  if (distance < BLOOD_MOON_CONFIG.closeDistance) {
    boss.vx -= Math.sign(toPlayer) * BLOOD_MOON_CONFIG.retreatForce;
  } else if (distance > BLOOD_MOON_CONFIG.preferredDistance) {
    boss.vx += Math.sign(toPlayer) * (
      BLOOD_MOON_CONFIG.moveSteeringForce
      + boss.phase * BLOOD_MOON_CONFIG.phaseSteeringForce
    );
  } else {
    boss.vx *= 0.84;
  }

  boss.vx *= BLOOD_MOON_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(BLOOD_MOON_CONFIG.maxVelocityBase + boss.phase * BLOOD_MOON_CONFIG.maxVelocityPhase),
    BLOOD_MOON_CONFIG.maxVelocityBase + boss.phase * BLOOD_MOON_CONFIG.maxVelocityPhase,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function spawnBloodMoonPattern(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonMirrorFang") {
    spawnBloodMoonMirrorFang(boss);
  } else if (boss.skillMode === "bloodMoonLanternBell") {
    spawnBloodMoonLanternBell(boss);
  } else if (boss.skillMode === "bloodMoonSixfold") {
    spawnBloodMoonSixfold(boss);
  } else if (boss.skillMode === "bloodMoonManyFaces") {
    spawnBloodMoonManyFaces(boss);
  } else {
    spawnBloodMoonSpiderMist(boss);
  }
}

function bloodMoonDamage(base: number, boss: LiveBoss, scale = 1) {
  return (base + boss.phase * BLOOD_MOON_CONFIG.damagePhase) * scale;
}

function playerFootSurfaceY() {
  return state.player.onPlatform?.y ?? GROUND_Y;
}

function spawnBloodMoonEffect(effect: BloodMoonEffectState) {
  state.bloodMoonEffects.push(effect);
}

function spawnBloodMoonSpiderMist(boss: LiveBoss, delay = 0, damageScale = 1) {
  const hitW = BLOOD_MOON_CONFIG.spiderMistHitW;
  const hitH = BLOOD_MOON_CONFIG.spiderMistHitH;
  const playerCenter = state.player.x + state.player.w / 2;
  const count = boss.phase >= 4 ? 2 : 1;
  const offsets = count === 1 ? [0] : [-70, 70];

  offsets.forEach((offset, index) => {
    const x = clamp(playerCenter - hitW / 2 + offset, 0, WIDTH - hitW);
    const surfaceY = playerFootSurfaceY();
    spawnBloodMoonEffect({
      kind: "spiderMist",
      x,
      y: surfaceY - hitH,
      w: hitW,
      h: hitH,
      vx: 0,
      facing: boss.castFacing,
      delay: delay + index * 10,
      warningFrames: BLOOD_MOON_CONFIG.spiderMistWarningFrames,
      elapsed: 0,
      frame: 0,
      life: BLOOD_MOON_CONFIG.spiderMistLife,
      damage: bloodMoonDamage(BLOOD_MOON_CONFIG.spiderMistDamageBase, boss, damageScale),
      hitPlayerCd: 0,
      hitDone: false,
    });
  });
  playSfx("bossFire", 0.8);
}

function spawnBloodMoonMirrorFang(boss: LiveBoss, delay = 0, damageScale = 1) {
  const hitW = BLOOD_MOON_CONFIG.mirrorFangHitW;
  const hitH = BLOOD_MOON_CONFIG.mirrorFangHitH;
  const startX = boss.castFacing === 1 ? boss.x + boss.w : boss.x - hitW;
  const playerCenterY = state.player.y + state.player.h / 2;
  spawnBloodMoonEffect({
    kind: "mirrorFang",
    x: clamp(startX, -hitW, WIDTH),
    y: clamp(playerCenterY - hitH / 2, 140, GROUND_Y - hitH),
    w: hitW,
    h: hitH,
    vx: boss.castFacing * (BLOOD_MOON_CONFIG.mirrorFangSpeed + boss.phase * 0.18),
    facing: boss.castFacing,
    delay,
    warningFrames: BLOOD_MOON_CONFIG.mirrorFangWarningFrames,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.mirrorFangLife,
    damage: bloodMoonDamage(BLOOD_MOON_CONFIG.mirrorFangDamageBase, boss, damageScale),
    hitPlayerCd: 0,
    hitDone: false,
  });
  playSfx("bossBlade", 1.1);
}

function spawnBloodMoonLanternBell(boss: LiveBoss) {
  spawnBloodMoonEffect({
    kind: "lanternBell",
    x: boss.x + boss.w / 2 - 92,
    y: boss.y + boss.h * 0.18,
    w: 184,
    h: 150,
    vx: 0,
    facing: boss.castFacing,
    delay: 0,
    warningFrames: 0,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.lanternBellLife,
    damage: 0,
    hitPlayerCd: 0,
    hitDone: true,
  });

  if (canAutoSpawnEntities()) {
    const spawnCount = Math.min(2, Math.max(0, BLOOD_MOON_CONFIG.summonMaxEnemies - state.enemies.length));
    for (let i = 0; i < spawnCount; i += 1) spawnEnemy();
  }
  for (const enemy of state.enemies.slice(0, BLOOD_MOON_CONFIG.summonMaxEnemies)) {
    enemy.lanternBuffTimer = Math.max(enemy.lanternBuffTimer ?? 0, Math.floor(LANTERN_EMBER_CONFIG.buffFrames * 0.45));
  }
  spawnLanternFireline(boss);
  spawnDeadBellBlade(boss, playerBladeLane(), DEAD_BELL_CONFIG.bladeWarningFrames);
  playSfx("bossSummon", 0.82);
}

function spawnBloodMoonSixfold(boss: LiveBoss) {
  spawnBloodMoonEffect({
    kind: "sixfold",
    x: boss.x + boss.w / 2 - 100,
    y: boss.y + boss.h * 0.08,
    w: 200,
    h: 170,
    vx: 0,
    facing: boss.castFacing,
    delay: 0,
    warningFrames: 0,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.sixfoldLife,
    damage: 0,
    hitPlayerCd: 0,
    hitDone: true,
  });

  const roll = Math.floor(Math.random() * 4);
  if (roll === 0) {
    spawnBloodMoonSpiderMist(boss, 18, 0.86);
  } else if (roll === 1) {
    spawnBloodMoonMirrorFang(boss, 16, 0.86);
  } else if (roll === 2) {
    spawnLanternFireline(boss);
  } else {
    spawnDeadBellWave(boss, 16, Math.floor(DEAD_BELL_CONFIG.waveMaxRadius * 0.82));
  }
  playSfx("bossUltimate", 0.92);
}

function spawnBloodMoonManyFaces(boss: LiveBoss) {
  spawnBloodMoonSpiderMist(boss, 0, 0.72);
  spawnBloodMoonMirrorFang(boss, 18, 0.72);
  spawnDeadBellWave(boss, 36, Math.floor(DEAD_BELL_CONFIG.waveMaxRadius * 0.82));
  spawnBloodMoonManyFacesBurst(boss, BLOOD_MOON_CONFIG.manyFacesDelayFrames);
  playSfx("bossUltimate", 0.76);
}

function spawnBloodMoonManyFacesBurst(boss: LiveBoss, delay: number) {
  const hitW = BLOOD_MOON_CONFIG.manyFacesHitW;
  const hitH = BLOOD_MOON_CONFIG.manyFacesHitH;
  const playerCenter = state.player.x + state.player.w / 2;
  const playerMid = state.player.y + state.player.h / 2;
  spawnBloodMoonEffect({
    kind: "manyFaces",
    x: clamp(playerCenter - hitW / 2, 0, WIDTH - hitW),
    y: clamp(playerMid - hitH / 2, 96, GROUND_Y - hitH),
    w: hitW,
    h: hitH,
    vx: 0,
    facing: boss.castFacing,
    delay,
    warningFrames: BLOOD_MOON_CONFIG.manyFacesWarningFrames,
    elapsed: 0,
    frame: 0,
    life: BLOOD_MOON_CONFIG.manyFacesLife,
    damage: bloodMoonDamage(BLOOD_MOON_CONFIG.manyFacesDamageBase, boss),
    hitPlayerCd: 0,
    hitDone: false,
  });
}

function lanternCastDuration(boss: LiveBoss) {
  return boss.skillMode === "lanternAwakenedGrid"
    ? LANTERN_EMBER_CONFIG.awakenedCastDuration
    : LANTERN_EMBER_CONFIG.castDuration;
}

function startLanternEmberCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextLanternEmberSkill(boss);
  boss.castTimer = lanternCastDuration(boss);
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = lanternSkillCooldown(boss);
  boss.vx = 0;

  playSfx("bossCast", 0.96);
}

function nextLanternEmberSkill(boss: LiveBoss) {
  const roll = Math.random();
  if (boss.awakened && (boss.phase >= 4 || roll < 0.26)) return "lanternAwakenedGrid";
  if (boss.phase >= 3 && state.enemies.length > 0 && roll < 0.56) return "lanternBuff";
  if (boss.phase >= 2 && roll < 0.76) return "lanternFireline";
  return "lanternLure";
}

function lanternSkillCooldown(boss: LiveBoss) {
  if (boss.skillMode === "lanternAwakenedGrid") return LANTERN_EMBER_CONFIG.awakenedCooldown;
  if (boss.skillMode === "lanternBuff") return LANTERN_EMBER_CONFIG.buffCooldown;
  if (boss.skillMode === "lanternFireline") return LANTERN_EMBER_CONFIG.firelineCooldown;
  return Math.max(150, LANTERN_EMBER_CONFIG.summonCooldown - boss.phase * 10);
}

function moveLanternEmberBoss(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
  boss.actionState = "move";
  boss.vx += Math.sign(toward) * (
    LANTERN_EMBER_CONFIG.moveSteeringForce
    + boss.phase * LANTERN_EMBER_CONFIG.phaseSteeringForce
  );
  boss.vx *= LANTERN_EMBER_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(LANTERN_EMBER_CONFIG.maxVelocityBase + boss.phase * LANTERN_EMBER_CONFIG.maxVelocityPhase),
    LANTERN_EMBER_CONFIG.maxVelocityBase + boss.phase * LANTERN_EMBER_CONFIG.maxVelocityPhase,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function spawnLanternEmberPattern(boss: LiveBoss) {
  if (boss.skillMode === "lanternFireline") {
    spawnLanternFireline(boss);
  } else if (boss.skillMode === "lanternBuff") {
    spawnLanternBuff(boss);
  } else if (boss.skillMode === "lanternAwakenedGrid") {
    spawnLanternAwakenedGrid(boss);
  } else {
    spawnLanternSummon(boss);
  }
}

function spawnLanternSummon(boss: LiveBoss) {
  const count = boss.phase >= LANTERN_EMBER_CONFIG.summonExtraEnemyPhase
    ? LANTERN_EMBER_CONFIG.summonMaxEnemies
    : 1;
  if (canAutoSpawnEntities()) {
    for (let i = 0; i < count; i += 1) spawnEnemy();
  }
  state.lanternEmberLures.push({
    x: boss.x + boss.w / 2 + boss.castFacing * 36,
    y: boss.y + LANTERN_EMBER_CONFIG.lureYOffset,
    vx: boss.castFacing * LANTERN_EMBER_CONFIG.lureSpeed,
    facing: boss.castFacing,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.lureLife,
  });
  playSfx("bossSummon", 0.95);
}

function spawnLanternFireline(boss: LiveBoss) {
  const w = LANTERN_EMBER_CONFIG.firelineHitW
    + Math.max(0, boss.phase - 1) * LANTERN_EMBER_CONFIG.firelinePhaseW;
  const playerCenter = state.player.x + state.player.w / 2;
  const x = clamp(playerCenter - w / 2, 0, WIDTH - w);
  state.lanternEmberFirelines.push({
    x,
    y: state.player.onPlatform?.y ?? GROUND_Y,
    w,
    h: LANTERN_EMBER_CONFIG.firelineHitH,
    warningFrames: LANTERN_EMBER_CONFIG.firelineWarningFrames,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.firelineLife,
    damage: LANTERN_EMBER_CONFIG.firelineDamageBase + boss.phase * LANTERN_EMBER_CONFIG.firelineDamagePhase,
    hitPlayer: false,
  });
  playSfx("bossFire");
}

function spawnLanternBuff(boss: LiveBoss) {
  const targets = nearestLanternBuffTargets(boss);
  for (const enemy of targets) {
    enemy.lanternBuffTimer = Math.max(enemy.lanternBuffTimer ?? 0, LANTERN_EMBER_CONFIG.buffFrames);
    state.lanternEmberBuffTethers.push({
      fromX: boss.x + boss.w / 2,
      fromY: boss.y + LANTERN_EMBER_CONFIG.lureYOffset,
      toX: enemy.x + enemy.w / 2,
      toY: enemy.y + enemy.h / 2,
      facing: boss.castFacing,
      elapsed: 0,
      frame: 0,
      life: LANTERN_EMBER_CONFIG.buffTetherLife,
    });
  }
  if (targets.length === 0) spawnLanternSummon(boss);
  playSfx("bossBuff");
}

function nearestLanternBuffTargets(boss: LiveBoss) {
  const bossCenterX = boss.x + boss.w / 2;
  const bossCenterY = boss.y + boss.h / 2;
  return state.enemies
    .map((enemy) => ({
      enemy,
      dist: Math.hypot(enemy.x + enemy.w / 2 - bossCenterX, enemy.y + enemy.h / 2 - bossCenterY),
    }))
    .filter(({ dist }) => dist <= LANTERN_EMBER_CONFIG.buffRadius)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, LANTERN_EMBER_CONFIG.buffMaxTargets)
    .map(({ enemy }) => enemy);
}

function spawnLanternAwakenedGrid(boss: LiveBoss) {
  const direction = boss.castFacing || 1;
  state.lanternEmberAwakenedGrids.push({
    x: direction > 0 ? -LANTERN_EMBER_CONFIG.awakenedGridPeriod : 0,
    y: GROUND_Y,
    w: WIDTH + LANTERN_EMBER_CONFIG.awakenedGridPeriod * 2,
    h: LANTERN_EMBER_CONFIG.awakenedGridHitH,
    vx: direction * LANTERN_EMBER_CONFIG.awakenedGridSpeed,
    warningFrames: LANTERN_EMBER_CONFIG.awakenedGridWarningFrames,
    elapsed: 0,
    frame: 0,
    life: LANTERN_EMBER_CONFIG.awakenedGridLife,
    damage: LANTERN_EMBER_CONFIG.awakenedGridDamageBase + boss.phase * LANTERN_EMBER_CONFIG.awakenedGridDamagePhase,
    hitPlayerCd: 0,
  });
  spawnLanternAshZone(boss);
  playSfx("bossUltimate", 0.84);
}

function spawnLanternAshZone(boss: LiveBoss) {
  const x = clamp(
    state.player.x + state.player.w / 2 + boss.castFacing * 42,
    LANTERN_EMBER_CONFIG.ashZoneRadius,
    WIDTH - LANTERN_EMBER_CONFIG.ashZoneRadius,
  );
  state.lanternEmberAshZones.push({
    x,
    y: state.player.onPlatform?.y ?? GROUND_Y,
    radius: LANTERN_EMBER_CONFIG.ashZoneRadius,
    life: LANTERN_EMBER_CONFIG.ashZoneLife,
    maxLife: LANTERN_EMBER_CONFIG.ashZoneLife,
    elapsed: 0,
    frame: 0,
    damage: LANTERN_EMBER_CONFIG.ashZoneDamageBase + boss.phase * LANTERN_EMBER_CONFIG.ashZoneDamagePhase,
  });
}

function moveChasingBoss(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
  boss.actionState = "move";
  boss.vx += Math.sign(toward) * (BOSS_CONFIG.baseSteeringForce + boss.phase * BOSS_CONFIG.phaseSteeringForce);
  boss.vx *= BOSS_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(BOSS_CONFIG.baseMaxVelocity + boss.phase),
    BOSS_CONFIG.baseMaxVelocity + boss.phase,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function moveDeadBellBoss(boss: LiveBoss) {
  const toward = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.facing = toward >= 0 ? 1 : -1;
  boss.actionState = "move";
  boss.vx += Math.sign(toward) * (0.045 + boss.phase * 0.012);
  boss.vx *= 0.9;
  boss.vx = clamp(boss.vx, -(3.2 + boss.phase * 0.35), 3.2 + boss.phase * 0.35);
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function moveMirrorDreamBoss(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const bossCenter = boss.x + boss.w / 2;
  const toPlayer = playerCenter - bossCenter;
  boss.facing = toPlayer >= 0 ? 1 : -1;
  boss.actionState = "move";

  const distance = Math.abs(toPlayer);
  if (distance < MIRROR_DREAM_CONFIG.closeDistance) {
    boss.vx -= Math.sign(toPlayer) * (MIRROR_DREAM_CONFIG.retreatForce + boss.phase * 0.006);
  } else if (distance > MIRROR_DREAM_CONFIG.preferredDistance) {
    boss.vx += Math.sign(toPlayer) * (MIRROR_DREAM_CONFIG.steeringForce + boss.phase * 0.005);
  } else {
    boss.vx *= 0.84;
  }

  boss.vx *= MIRROR_DREAM_CONFIG.drag;
  boss.vx = clamp(
    boss.vx,
    -(MIRROR_DREAM_CONFIG.maxVelocity + boss.phase * 0.2),
    MIRROR_DREAM_CONFIG.maxVelocity + boss.phase * 0.2,
  );
  boss.x += boss.vx;
  boss.x = clamp(boss.x, 0, WIDTH - boss.w);
}

function startDeadBellCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = boss.phase >= 3
    ? "deadBellCombo"
    : boss.phase >= 2
      ? "deadBellDouble"
      : "deadBellSingle";
  boss.castTimer = boss.skillMode === "deadBellCombo"
    ? DEAD_BELL_CONFIG.comboCastDuration
    : DEAD_BELL_CONFIG.castDuration;
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = boss.skillMode === "deadBellCombo"
    ? DEAD_BELL_CONFIG.comboCooldown
    : Math.max(160, DEAD_BELL_CONFIG.skillCooldown - boss.phase * 18);
  boss.vx = 0;

  playSfx("bossCast", 0.9);
}

function spawnDeadBellPattern(boss: LiveBoss) {
  if (boss.skillMode === "deadBellSingle") {
    spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
    return;
  }

  if (boss.skillMode === "deadBellDouble") {
    spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
    spawnDeadBellWave(boss, DEAD_BELL_CONFIG.delayedWaveFrames, DEAD_BELL_CONFIG.waveMaxRadius + 34);
    spawnDeadBellBlade(boss, playerBladeLane(), Math.floor(DEAD_BELL_CONFIG.delayedWaveFrames * 0.55));
    return;
  }

  spawnDeadBellWave(boss, 0, DEAD_BELL_CONFIG.waveMaxRadius);
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.upperBladeY, DEAD_BELL_CONFIG.bladeWarningFrames);
  spawnDeadBellWave(boss, DEAD_BELL_CONFIG.delayedWaveFrames, DEAD_BELL_CONFIG.waveMaxRadius + 46);
  spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, DEAD_BELL_CONFIG.delayedWaveFrames + 18);
}

function spawnDeadBellWave(boss: LiveBoss, delay: number, maxRadius: number) {
  state.deadBellWaves.push({
    x: boss.x + boss.w / 2,
    y: boss.y + boss.h / 2,
    radius: DEAD_BELL_CONFIG.waveStartRadius,
    maxRadius,
    thickness: DEAD_BELL_CONFIG.waveThickness,
    warningFrames: DEAD_BELL_CONFIG.waveWarningFrames,
    expandFrames: DEAD_BELL_CONFIG.waveExpandFrames,
    delay,
    elapsed: 0,
    frame: 0,
    damage: DEAD_BELL_CONFIG.damageBase + boss.phase * DEAD_BELL_CONFIG.damagePhase,
    hitPlayer: false,
  });
  playSfx("bossWave");
}

function playerBladeLane() {
  return clamp(
    state.player.y + state.player.h / 2,
    DEAD_BELL_CONFIG.upperBladeY,
    GROUND_Y - DEAD_BELL_CONFIG.bladeHitH * 1.4,
  );
}

function spawnDeadBellBlade(boss: LiveBoss, centerY: number, delay: number) {
  const w = DEAD_BELL_CONFIG.bladeHitW;
  const h = DEAD_BELL_CONFIG.bladeHitH;
  state.deadBellBlades.push({
    x: boss.castFacing === 1 ? boss.x + boss.w : boss.x - w,
    y: centerY - h / 2,
    w,
    h,
    vx: boss.castFacing * DEAD_BELL_CONFIG.bladeSpeed,
    facing: boss.castFacing,
    delay,
    elapsed: 0,
    frame: 0,
    life: DEAD_BELL_CONFIG.bladeLife,
    damage: DEAD_BELL_CONFIG.damageBase + boss.phase * DEAD_BELL_CONFIG.damagePhase + 2,
  });
  playSfx("bossBlade", delay > 0 ? 0.92 : 1);
}

function startMirrorDreamCast(boss: LiveBoss) {
  const toPlayer = state.player.x + state.player.w / 2 - (boss.x + boss.w / 2);
  boss.castFacing = toPlayer >= 0 ? 1 : -1;
  boss.facing = boss.castFacing;
  boss.skillMode = nextMirrorDreamSkill(boss);
  boss.castTimer = MIRROR_DREAM_CONFIG.castDuration;
  boss.skillEffectSpawned = false;
  boss.actionState = "cast";
  boss.actionTimer = 0;
  boss.skillCd = Math.max(150, MIRROR_DREAM_CONFIG.skillCooldown - boss.phase * 18);
  boss.vx = 0;

  playSfx("bossCast", 1.12);
}

function nextMirrorDreamSkill(boss: LiveBoss) {
  const roll = Math.random();
  if (boss.phase >= 3 && roll < 0.42) return "mirrorNightmare";
  if (boss.phase >= 2 && roll < 0.32) return "mirrorNightmare";
  return roll < 0.66 ? "mirrorAfterimage" : "mirrorShard";
}

function spawnMirrorDreamPattern(boss: LiveBoss) {
  if (boss.skillMode === "mirrorAfterimage") {
    spawnMirrorAfterimage(boss, undefined);
    teleportMirrorDreamBoss(boss);
    playSfx("bossMirror", 1.12);
    return;
  }

  if (boss.skillMode === "mirrorNightmare") {
    spawnMirrorNightmareImages(boss);
    playSfx("bossMirror", 0.82);
    return;
  }

  spawnMirrorShardFromBoss(boss);
}

function spawnMirrorAfterimage(boss: LiveBoss, spawnAt: number | undefined, centerX = boss.x + boss.w / 2) {
  const life = spawnAt === undefined
    ? MIRROR_DREAM_CONFIG.afterimageLife
    : spawnAt + MIRROR_DREAM_CONFIG.nightmareBreakFadeFrames;
  state.mirrorAfterimages.push({
    x: centerX - boss.w / 2,
    y: boss.y,
    w: boss.w,
    h: boss.h,
    facing: boss.facing,
    elapsed: 0,
    frame: 0,
    life,
    maxLife: life,
    spawnAt,
    spawned: false,
    damage: MIRROR_DREAM_CONFIG.damageBase + boss.phase * MIRROR_DREAM_CONFIG.damagePhase,
  });
}

function teleportMirrorDreamBoss(boss: LiveBoss) {
  const playerCenter = state.player.x + state.player.w / 2;
  const bossCenter = boss.x + boss.w / 2;
  const side = bossCenter < playerCenter ? 1 : -1;
  const preferredCenter = playerCenter + side * MIRROR_DREAM_CONFIG.teleportPlayerOffset;
  const fallbackCenter = playerCenter - side * MIRROR_DREAM_CONFIG.teleportAwayOffset;
  const minCenter = boss.w / 2;
  const maxCenter = WIDTH - boss.w / 2;
  const targetCenter = preferredCenter >= minCenter && preferredCenter <= maxCenter
    ? preferredCenter
    : fallbackCenter;

  boss.x = clamp(targetCenter - boss.w / 2, 0, WIDTH - boss.w);
  boss.vx = 0;
  const toPlayer = playerCenter - (boss.x + boss.w / 2);
  boss.facing = toPlayer >= 0 ? 1 : -1;
  boss.castFacing = boss.facing;
}

function spawnMirrorNightmareImages(boss: LiveBoss) {
  const count = Math.min(
    MIRROR_DREAM_CONFIG.nightmareMaxImages,
    MIRROR_DREAM_CONFIG.nightmareBaseImages + boss.phase,
  );
  const playerCenter = state.player.x + state.player.w / 2;
  const half = (count - 1) / 2;

  for (let i = 0; i < count; i += 1) {
    const offset = (i - half) * MIRROR_DREAM_CONFIG.nightmareSpacing;
    const centerX = clamp(playerCenter + offset, boss.w / 2, WIDTH - boss.w / 2);
    const spawnAt = MIRROR_DREAM_CONFIG.nightmareFirstBreakFrame + i * MIRROR_DREAM_CONFIG.nightmareBreakDelay;
    boss.facing = centerX < playerCenter ? 1 : -1;
    spawnMirrorAfterimage(boss, spawnAt, centerX);
  }
  boss.facing = boss.castFacing;
}

function spawnMirrorShardFromBoss(boss: LiveBoss) {
  const startX = boss.x + boss.w / 2 + boss.castFacing * 34;
  const startY = boss.y + boss.h * 0.36;
  const targetX = state.player.x + state.player.w / 2;
  const targetY = state.player.y + state.player.h / 2;
  const dir = Math.sign(targetX - startX) || boss.castFacing;
  const travelFrames = Math.max(28, Math.abs(targetX - startX) / MIRROR_DREAM_CONFIG.shardSpeed);
  const vy = clamp((targetY - startY) / travelFrames, -2.4, 2.4);
  spawnMirrorShard({
    kind: "shard",
    centerX: startX,
    centerY: startY,
    vx: dir * (MIRROR_DREAM_CONFIG.shardSpeed + boss.phase * 0.25),
    vy,
    damage: MIRROR_DREAM_CONFIG.damageBase + boss.phase * MIRROR_DREAM_CONFIG.damagePhase,
    bouncesRemaining: 1,
  });
  playSfx("bossMirror", 1.04);
}

function spawnMirrorNightmareShard(afterimage: MirrorAfterimageState) {
  const centerX = afterimage.x + afterimage.w / 2;
  const centerY = afterimage.y + afterimage.h * 0.38;
  const targetX = state.player.x + state.player.w / 2;
  const targetY = state.player.y + state.player.h / 2;
  const dx = targetX - centerX;
  const dy = targetY - centerY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const speed = MIRROR_DREAM_CONFIG.nightmareSpeed;
  spawnMirrorShard({
    kind: "nightmare",
    centerX,
    centerY,
    vx: dx / distance * speed,
    vy: dy / distance * speed,
    damage: afterimage.damage,
    bouncesRemaining: 0,
  });
  playSfx("bossMirror", 1.22);
}

function spawnMirrorShard(params: {
  kind: MirrorShardState["kind"];
  centerX: number;
  centerY: number;
  vx: number;
  vy: number;
  damage: number;
  bouncesRemaining: number;
}) {
  const hitW = params.kind === "nightmare"
    ? MIRROR_DREAM_CONFIG.nightmareHitW
    : MIRROR_DREAM_CONFIG.shardHitW;
  const hitH = params.kind === "nightmare"
    ? MIRROR_DREAM_CONFIG.nightmareHitH
    : MIRROR_DREAM_CONFIG.shardHitH;
  state.mirrorShards.push({
    kind: params.kind,
    x: params.centerX - hitW / 2,
    y: params.centerY - hitH / 2,
    w: hitW,
    h: hitH,
    vx: params.vx,
    vy: params.vy,
    facing: params.vx >= 0 ? 1 : -1,
    frame: 0,
    elapsed: 0,
    life: params.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareLife
      : MIRROR_DREAM_CONFIG.shardLife,
    damage: params.damage,
    bouncesRemaining: params.bouncesRemaining,
  });
}

export function drawBoss() {
  const boss = state.boss;
  if (!boss) return;

  const archetype = bossArchetypeForId(boss.id);
  const centerX = boss.x + boss.w / 2;
  const feetY = boss.y + boss.h;

  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon && (boss.phaseShiftTimer ?? 0) > 0) {
    const elapsed = BLOOD_MOON_CONFIG.phaseShiftFrames - (boss.phaseShiftTimer ?? 0);
    const frame = Math.min(
      BLOOD_MOON_PHASE_SHIFT_SHEET.count - 1,
      Math.floor(elapsed / BLOOD_MOON_CONFIG.phaseShiftFrameDuration),
    );
    drawSheetFrame(
      BLOOD_MOON_PHASE_SHIFT_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.facing,
    );
    return;
  }

  if (boss.castTimer > 0) {
    const castSheet = bossCastSheet(boss);
    const castDuration = bossCastDuration(boss);
    const frameDuration = bossCastFrameDuration(boss);
    const framesSinceCastStart = castDuration - boss.castTimer;
    const frame = Math.min(
      castSheet.count - 1,
      Math.floor(framesSinceCastStart / frameDuration),
    );
    drawSheetFrame(
      castSheet,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.castFacing,
    );
    drawDeadBellBeatCue(boss);
    return;
  }

  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon && boss.recoveryTimer > 0) {
    const recoveryDuration = boss.skillMode === "bloodMoonManyFaces"
      ? BLOOD_MOON_CONFIG.finalRecoveryFrames
      : BLOOD_MOON_CONFIG.recoveryFrames;
    const elapsed = recoveryDuration - boss.recoveryTimer;
    const frame = Math.min(
      BLOOD_MOON_RECOVER_SHEET.count - 1,
      Math.floor(elapsed / BLOOD_MOON_CONFIG.recoverFrameDuration),
    );
    drawSheetFrame(
      BLOOD_MOON_RECOVER_SHEET,
      frame,
      centerX - archetype.castDrawW / 2,
      feetY - archetype.castDrawH + archetype.castBottomPadding,
      archetype.castDrawW,
      archetype.castDrawH,
      boss.facing,
    );
    return;
  }

  const frame = frameIndex(
    archetype.sheets.move.count,
    BOSS_CONFIG.baseAnimSpeed - boss.phase,
    state.elapsed,
    boss.animSeed,
  );
  drawSheetFrame(
    archetype.sheets.move,
    frame,
    centerX - archetype.drawW / 2,
    feetY - archetype.drawH,
    archetype.drawW,
    archetype.drawH,
    boss.facing,
  );
  drawDeadBellBeatCue(boss);
}

function bossCastSheet(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return bloodMoonCastSheet(boss);
  if (boss.id !== BOSS_ARCHETYPE_IDS.lanternEmber) return archetype.sheets.cast;
  if (boss.skillMode === "lanternFireline") return LANTERN_EMBER_FIRELINE_CAST_SHEET;
  if (boss.skillMode === "lanternBuff") return LANTERN_EMBER_BUFF_CAST_SHEET;
  return LANTERN_EMBER_SUMMON_SHEET;
}

function bloodMoonCastSheet(boss: LiveBoss) {
  if (boss.skillMode === "bloodMoonMirrorFang") return BLOOD_MOON_MIRROR_FANG_CAST_SHEET;
  if (boss.skillMode === "bloodMoonLanternBell") return BLOOD_MOON_LANTERN_BELL_CAST_SHEET;
  if (boss.skillMode === "bloodMoonSixfold") return BLOOD_MOON_SIXFOLD_CAST_SHEET;
  if (boss.skillMode === "bloodMoonManyFaces") return BLOOD_MOON_MANY_FACES_CAST_SHEET;
  return BLOOD_MOON_SPIDER_MIST_CAST_SHEET;
}

function bossCastDuration(boss: LiveBoss) {
  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) {
    return boss.skillMode === "deadBellCombo"
      ? DEAD_BELL_CONFIG.comboCastDuration
      : DEAD_BELL_CONFIG.castDuration;
  }
  if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) return lanternCastDuration(boss);
  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) return MIRROR_DREAM_CONFIG.castDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return bloodMoonCastDuration(boss);
  return BOSS_SKILL1_CONFIG.castDuration;
}

function bossCastFrameDuration(boss: LiveBoss) {
  if (boss.id === BOSS_ARCHETYPE_IDS.deadBell) return DEAD_BELL_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.lanternEmber) return LANTERN_EMBER_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.mirrorDream) return MIRROR_DREAM_CONFIG.castFrameDuration;
  if (boss.id === BOSS_ARCHETYPE_IDS.bloodMoon) return BLOOD_MOON_CONFIG.castFrameDuration;
  return BOSS_SKILL1_CONFIG.castFrameDuration;
}

function drawDeadBellBeatCue(boss: LiveBoss) {
  if (!ctx || boss.id !== BOSS_ARCHETYPE_IDS.deadBell) return;

  const comboStopBeat = boss.skillMode === "deadBellCombo"
    && boss.castTimer > DEAD_BELL_CONFIG.comboCastDuration - DEAD_BELL_CONFIG.comboSpawnAtFrame;
  const counterWindow = boss.recoveryTimer > 0;
  if (!comboStopBeat && !counterWindow) return;

  const centerX = boss.x + boss.w / 2;
  const centerY = boss.y + boss.h * 0.42;
  const t = counterWindow
    ? boss.recoveryTimer / DEAD_BELL_CONFIG.recoveryFrames
    : boss.castTimer / DEAD_BELL_CONFIG.comboCastDuration;
  ctx.save();
  ctx.globalAlpha = counterWindow ? 0.35 + t * 0.18 : 0.42 + (1 - t) * 0.25;
  ctx.strokeStyle = counterWindow ? "#f0d08a" : "#c94238";
  ctx.lineWidth = counterWindow ? 2 : 3;
  ctx.setLineDash(counterWindow ? [8, 8] : [3, 10]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, counterWindow ? 56 : 72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(centerX - 46, centerY);
  ctx.lineTo(centerX + 46, centerY);
  ctx.stroke();
  ctx.restore();
}

function spawnBossSkill1Effect(boss: LiveBoss) {
  const facing = boss.castFacing;
  const archetype = bossArchetypeForId(boss.id);
  const damage = (archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase)
    * BOSS_SKILL1_CONFIG.damageMultiplier;
  const startX = boss.x + boss.w / 2 + facing * BOSS_SKILL1_CONFIG.effectSpawnXOffset;
  const startY = boss.y + BOSS_SKILL1_CONFIG.effectSpawnYOffset;
  const vx = facing * BOSS_SKILL1_CONFIG.effectSpeed;

  const p = state.player;
  const targetX = p.x + p.w / 2;
  const targetY = p.y + p.h / 2;
  const g = BOSS_SKILL1_CONFIG.effectGravity;
  const dx = Math.abs(targetX - startX);
  const t = Math.max(BOSS_SKILL1_CONFIG.effectMinTravelFrames, dx / BOSS_SKILL1_CONFIG.effectSpeed);
  let vy = (targetY - startY - 0.5 * g * t * t) / t;
  vy = Math.max(BOSS_SKILL1_CONFIG.effectMaxInitialVy, Math.min(BOSS_SKILL1_CONFIG.effectMinInitialVy, vy));

  state.bossSkill1Effects.push({
    kind: "spiderString",
    x: startX,
    y: startY,
    vx,
    vy,
    facing,
    frame: 0,
    elapsed: 0,
    damage,
    hitPlayerCd: 0,
  });
  playSfx("bossProjectile", 0.86);
}

export function updateBossSkill1Effects() {
  const sheet = bossArchetypeForId(BOSS_ARCHETYPE_IDS.spiderString).sheets.effect;
  const drawW = sheet.frameW * BOSS_SKILL1_CONFIG.effectDrawScale;
  const drawH = sheet.frameH * BOSS_SKILL1_CONFIG.effectDrawScale;
  const animTotalFrames = sheet.count * BOSS_SKILL1_CONFIG.effectFrameDuration;

  for (let i = state.bossSkill1Effects.length - 1; i >= 0; i -= 1) {
    const eff = state.bossSkill1Effects[i] as BossSkill1EffectState;
    eff.vy += BOSS_SKILL1_CONFIG.effectGravity;
    eff.x += eff.vx;
    eff.y += eff.vy;
    eff.elapsed += 1;
    if (eff.hitPlayerCd > 0) eff.hitPlayerCd -= 1;

    eff.frame = Math.min(
      sheet.count - 1,
      Math.floor(eff.elapsed / BOSS_SKILL1_CONFIG.effectFrameDuration),
    );

    const effLeft = eff.x - drawW / 2;
    const effRight = eff.x + drawW / 2;
    const effTop = eff.y - drawH / 2;
    const effBottom = eff.y + drawH / 2;

    const p = state.player;
    if (eff.hitPlayerCd <= 0) {
      const overlapX = effRight > p.x && effLeft < p.x + p.w;
      const overlapY = effBottom > p.y && effTop < p.y + p.h;
      if (overlapX && overlapY) {
        hurtPlayer(eff.damage, eff.vx);
        eff.hitPlayerCd = BOSS_SKILL1_CONFIG.hitPlayerCooldown;
      }
    }

    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      if (enemy.hitCd > 0) continue;
      const overlapX = effRight > enemy.x && effLeft < enemy.x + enemy.w;
      const overlapY = effBottom > enemy.y && effTop < enemy.y + enemy.h;
      if (!overlapX || !overlapY) continue;
      damageEnemy(enemy, eff.damage, BOSS_SKILL1_CONFIG.hitEnemyCooldown);
      resolveEnemyDefeat(enemy, j, "none");
    }

    const offLeft = eff.facing === -1 && effRight < 0;
    const offRight = eff.facing === 1 && effLeft > WIDTH;
    const animDone = eff.elapsed >= animTotalFrames;
    if (offLeft || offRight || animDone) state.bossSkill1Effects.splice(i, 1);
  }
}

export function updateDeadBellEffects() {
  updateDeadBellWaves();
  updateDeadBellBlades();
}

function updateDeadBellWaves() {
  for (let i = state.deadBellWaves.length - 1; i >= 0; i -= 1) {
    const wave = state.deadBellWaves[i] as DeadBellWaveState;
    if (wave.delay > 0) {
      wave.delay -= 1;
      continue;
    }

    wave.elapsed += 1;
    if (wave.elapsed <= wave.warningFrames) {
      wave.radius = DEAD_BELL_CONFIG.waveStartRadius + Math.sin(wave.elapsed * 0.5) * 4;
      wave.frame = 0;
    } else {
      const activeElapsed = wave.elapsed - wave.warningFrames;
      const t = clamp(activeElapsed / wave.expandFrames, 0, 1);
      wave.radius = DEAD_BELL_CONFIG.waveStartRadius + (wave.maxRadius - DEAD_BELL_CONFIG.waveStartRadius) * t;
      wave.frame = Math.min(
        DEAD_BELL_WAVE_SHEET.count - 1,
        1 + Math.floor(activeElapsed / DEAD_BELL_CONFIG.waveFrameDuration),
      );
    }

    if (!wave.hitPlayer && wave.elapsed > wave.warningFrames) {
      const p = state.player;
      const px = p.x + p.w / 2;
      const py = p.y + p.h / 2;
      const playerRadius = Math.max(p.w, p.h) * 0.35;
      const dist = Math.hypot(px - wave.x, py - wave.y);
      if (Math.abs(dist - wave.radius) <= wave.thickness + playerRadius) {
        wave.hitPlayer = true;
        hurtPlayer(wave.damage, wave.x - px);
      }
    }

    if (wave.elapsed > wave.warningFrames + wave.expandFrames + 14) {
      state.deadBellWaves.splice(i, 1);
    }
  }
}

function updateDeadBellBlades() {
  for (let i = state.deadBellBlades.length - 1; i >= 0; i -= 1) {
    const blade = state.deadBellBlades[i] as DeadBellBladeState;
    if (blade.delay > 0) {
      blade.delay -= 1;
      continue;
    }

    blade.elapsed += 1;
    blade.life -= 1;
    blade.x += blade.vx;
    blade.frame = Math.min(
      DEAD_BELL_BLADE_SHEET.count - 1,
      Math.floor(blade.elapsed / DEAD_BELL_CONFIG.bladeFrameDuration),
    );

    if (hitbox(state.player, blade)) {
      hurtPlayer(blade.damage, blade.vx);
      state.deadBellBlades.splice(i, 1);
      continue;
    }

    const offLeft = blade.vx < 0 && blade.x + blade.w < -DEAD_BELL_CONFIG.bladeDrawW;
    const offRight = blade.vx > 0 && blade.x > WIDTH + DEAD_BELL_CONFIG.bladeDrawW;
    if (blade.life <= 0 || offLeft || offRight) state.deadBellBlades.splice(i, 1);
  }
}

export function updateMirrorDreamEffects() {
  updateMirrorAfterimages();
  updateMirrorShards();
}

export function updateLanternEmberEffects() {
  updateLanternLures();
  updateLanternBuffTethers();
  updateLanternFirelines();
  updateLanternAwakenedGrids();
  updateLanternAshZones();
}

function bloodMoonEffectSpec(kind: BloodMoonEffectState["kind"]) {
  if (kind === "mirrorFang") {
    return {
      sheet: BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
      frameDuration: BLOOD_MOON_CONFIG.mirrorFangFrameDuration,
      drawW: BLOOD_MOON_CONFIG.mirrorFangDrawW,
      drawH: BLOOD_MOON_CONFIG.mirrorFangDrawH,
      groundAligned: false,
      bottomPadding: 0,
    };
  }
  if (kind === "lanternBell") {
    return {
      sheet: BLOOD_MOON_LANTERN_BELL_EFFECT_SHEET,
      frameDuration: BLOOD_MOON_CONFIG.lanternBellFrameDuration,
      drawW: BLOOD_MOON_CONFIG.lanternBellDrawW,
      drawH: BLOOD_MOON_CONFIG.lanternBellDrawH,
      groundAligned: false,
      bottomPadding: 0,
    };
  }
  if (kind === "sixfold") {
    return {
      sheet: BLOOD_MOON_SIXFOLD_EFFECT_SHEET,
      frameDuration: BLOOD_MOON_CONFIG.sixfoldFrameDuration,
      drawW: BLOOD_MOON_CONFIG.sixfoldDrawW,
      drawH: BLOOD_MOON_CONFIG.sixfoldDrawH,
      groundAligned: false,
      bottomPadding: 0,
    };
  }
  if (kind === "manyFaces") {
    return {
      sheet: BLOOD_MOON_MANY_FACES_EFFECT_SHEET,
      frameDuration: BLOOD_MOON_CONFIG.manyFacesFrameDuration,
      drawW: BLOOD_MOON_CONFIG.manyFacesDrawW,
      drawH: BLOOD_MOON_CONFIG.manyFacesDrawH,
      groundAligned: false,
      bottomPadding: 0,
    };
  }
  return {
    sheet: BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
    frameDuration: BLOOD_MOON_CONFIG.spiderMistFrameDuration,
    drawW: BLOOD_MOON_CONFIG.spiderMistDrawW,
    drawH: BLOOD_MOON_CONFIG.spiderMistDrawH,
    groundAligned: true,
    bottomPadding: 14,
  };
}

export function updateBloodMoonEffects() {
  for (let i = state.bloodMoonEffects.length - 1; i >= 0; i -= 1) {
    const effect = state.bloodMoonEffects[i] as BloodMoonEffectState;
    if (effect.delay > 0) {
      effect.delay -= 1;
      continue;
    }

    const spec = bloodMoonEffectSpec(effect.kind);
    effect.elapsed += 1;
    effect.life -= 1;
    if (effect.hitPlayerCd > 0) effect.hitPlayerCd -= 1;

    const activeElapsed = Math.max(0, effect.elapsed - effect.warningFrames);
    effect.frame = Math.min(
      spec.sheet.count - 1,
      Math.floor(activeElapsed / spec.frameDuration),
    );

    if (effect.kind === "mirrorFang" && effect.elapsed > effect.warningFrames) {
      effect.x += effect.vx;
    }

    if (
      effect.damage > 0
      && effect.elapsed > effect.warningFrames
      && !effect.hitDone
      && effect.hitPlayerCd <= 0
      && hitbox(state.player, effect)
    ) {
      hurtPlayer(effect.damage, effect.vx || effect.x - (state.player.x + state.player.w / 2));
      effect.hitDone = true;
      effect.hitPlayerCd = BLOOD_MOON_CONFIG.hitPlayerCooldown;
    }

    const offLeft = effect.kind === "mirrorFang" && effect.x + effect.w < -spec.drawW;
    const offRight = effect.kind === "mirrorFang" && effect.x > WIDTH + spec.drawW;
    if (effect.life <= 0 || offLeft || offRight) state.bloodMoonEffects.splice(i, 1);
  }
}

function updateLanternLures() {
  for (let i = state.lanternEmberLures.length - 1; i >= 0; i -= 1) {
    const lure = state.lanternEmberLures[i] as LanternEmberLureState;
    lure.elapsed += 1;
    lure.life -= 1;
    lure.x += lure.vx;
    lure.frame = Math.min(
      LANTERN_EMBER_LURE_EFFECT_SHEET.count - 1,
      Math.floor(lure.elapsed / LANTERN_EMBER_CONFIG.lureFrameDuration),
    );
    if (lure.life <= 0) state.lanternEmberLures.splice(i, 1);
  }
}

function updateLanternBuffTethers() {
  for (let i = state.lanternEmberBuffTethers.length - 1; i >= 0; i -= 1) {
    const tether = state.lanternEmberBuffTethers[i] as LanternEmberBuffTetherState;
    tether.elapsed += 1;
    tether.life -= 1;
    tether.frame = Math.min(
      LANTERN_EMBER_BUFF_TETHER_SHEET.count - 1,
      Math.floor(tether.elapsed / LANTERN_EMBER_CONFIG.buffTetherFrameDuration),
    );
    if (tether.life <= 0) state.lanternEmberBuffTethers.splice(i, 1);
  }
}

function updateLanternFirelines() {
  for (let i = state.lanternEmberFirelines.length - 1; i >= 0; i -= 1) {
    const fireline = state.lanternEmberFirelines[i] as LanternEmberFirelineState;
    fireline.elapsed += 1;
    fireline.life -= 1;
    const activeElapsed = Math.max(0, fireline.elapsed - fireline.warningFrames);
    fireline.frame = fireline.elapsed <= fireline.warningFrames
      ? 0
      : Math.min(
        LANTERN_EMBER_FIRELINE_SHEET.count - 1,
        1 + Math.floor(activeElapsed / LANTERN_EMBER_CONFIG.firelineFrameDuration),
      );

    if (!fireline.hitPlayer && fireline.elapsed > fireline.warningFrames && isPlayerInLanternFireline(fireline)) {
      fireline.hitPlayer = true;
      hurtPlayer(fireline.damage, state.player.x + state.player.w / 2 - (fireline.x + fireline.w / 2));
    }

    if (fireline.life <= 0) state.lanternEmberFirelines.splice(i, 1);
  }
}

function updateLanternAwakenedGrids() {
  for (let i = state.lanternEmberAwakenedGrids.length - 1; i >= 0; i -= 1) {
    const grid = state.lanternEmberAwakenedGrids[i] as LanternEmberAwakenedGridState;
    grid.elapsed += 1;
    grid.life -= 1;
    if (grid.hitPlayerCd > 0) grid.hitPlayerCd -= 1;
    if (grid.elapsed > grid.warningFrames) grid.x += grid.vx;

    const activeElapsed = Math.max(0, grid.elapsed - grid.warningFrames);
    grid.frame = grid.elapsed <= grid.warningFrames
      ? 0
      : Math.min(
        LANTERN_EMBER_AWAKENED_GRID_SHEET.count - 1,
        1 + Math.floor(activeElapsed / LANTERN_EMBER_CONFIG.awakenedGridFrameDuration),
      );

    if (grid.elapsed > grid.warningFrames && grid.hitPlayerCd <= 0 && isPlayerInLanternGrid(grid)) {
      hurtPlayer(grid.damage, grid.vx);
      grid.hitPlayerCd = LANTERN_EMBER_CONFIG.awakenedGridHitCooldown;
    }

    if (grid.life <= 0) state.lanternEmberAwakenedGrids.splice(i, 1);
  }
}

function updateLanternAshZones() {
  for (let i = state.lanternEmberAshZones.length - 1; i >= 0; i -= 1) {
    const zone = state.lanternEmberAshZones[i] as LanternEmberAshZoneState;
    zone.elapsed += 1;
    zone.life -= 1;
    if (
      zone.elapsed >= LANTERN_EMBER_CONFIG.ashZoneDamageFirstFrame
      && (zone.elapsed - LANTERN_EMBER_CONFIG.ashZoneDamageFirstFrame) % LANTERN_EMBER_CONFIG.ashZoneDamageIntervalFrames === 0
      && isPlayerInLanternAshZone(zone)
      && state.player.invincible <= 0
    ) {
      hurtPlayer(zone.damage, zone.x - (state.player.x + state.player.w / 2));
      state.player.invincible = Math.max(state.player.invincible, LANTERN_EMBER_CONFIG.ashZoneDamageInvincibleFrames);
    }

    const rawFrame = Math.floor(zone.elapsed / LANTERN_EMBER_CONFIG.ashZoneFrameDuration);
    if (rawFrame < LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame) {
      zone.frame = rawFrame;
    } else {
      const loopCount = LANTERN_EMBER_ASH_ZONE_SHEET.count - LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame;
      zone.frame = LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame
        + (rawFrame - LANTERN_EMBER_CONFIG.ashZoneLoopStartFrame) % loopCount;
    }

    if (zone.life <= 0) state.lanternEmberAshZones.splice(i, 1);
  }
}

function isPlayerInLanternFireline(fireline: LanternEmberFirelineState) {
  const p = state.player;
  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;
  return footX >= fireline.x
    && footX <= fireline.x + fireline.w
    && footY >= fireline.y - fireline.h
    && footY <= fireline.y + 12;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function isPlayerInLanternGrid(grid: LanternEmberAwakenedGridState) {
  const p = state.player;
  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;
  if (footY < grid.y - grid.h || footY > grid.y + 14) return false;
  const localX = positiveModulo(footX - grid.x, LANTERN_EMBER_CONFIG.awakenedGridPeriod);
  return localX <= LANTERN_EMBER_CONFIG.awakenedGridDangerW;
}

function isPlayerInLanternAshZone(zone: LanternEmberAshZoneState) {
  const p = state.player;
  const footX = p.x + p.w / 2;
  const footY = p.y + p.h;
  const radiusY = zone.radius * LANTERN_EMBER_CONFIG.ashZoneVerticalRadiusScale;
  const dx = (footX - zone.x) / zone.radius;
  const dy = (footY - zone.y) / radiusY;
  return dx * dx + dy * dy <= 1;
}

function updateMirrorAfterimages() {
  for (let i = state.mirrorAfterimages.length - 1; i >= 0; i -= 1) {
    const afterimage = state.mirrorAfterimages[i] as MirrorAfterimageState;
    afterimage.elapsed += 1;
    afterimage.life -= 1;
    afterimage.frame = Math.min(
      MIRROR_AFTERIMAGE_SHEET.count - 1,
      Math.floor(afterimage.elapsed / MIRROR_DREAM_CONFIG.afterimageFrameDuration),
    );

    if (
      afterimage.spawnAt !== undefined
      && !afterimage.spawned
      && afterimage.elapsed >= afterimage.spawnAt
    ) {
      afterimage.spawned = true;
      afterimage.life = Math.min(afterimage.life, MIRROR_DREAM_CONFIG.nightmareBreakFadeFrames);
      spawnMirrorNightmareShard(afterimage);
    }

    if (afterimage.life <= 0) state.mirrorAfterimages.splice(i, 1);
  }
}

function updateMirrorShards() {
  for (let i = state.mirrorShards.length - 1; i >= 0; i -= 1) {
    const shard = state.mirrorShards[i] as MirrorShardState;
    const sheet = shard.kind === "nightmare" ? MIRROR_NIGHTMARE_SHEET : MIRROR_SHARD_SHEET;
    const frameDuration = shard.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareFrameDuration
      : MIRROR_DREAM_CONFIG.shardFrameDuration;

    shard.elapsed += 1;
    shard.life -= 1;
    shard.x += shard.vx;
    shard.y += shard.vy;
    shard.frame = Math.min(sheet.count - 1, Math.floor(shard.elapsed / frameDuration));

    const hitLeftWall = shard.x <= 0 && shard.vx < 0;
    const hitRightWall = shard.x + shard.w >= WIDTH && shard.vx > 0;
    if (shard.kind === "shard" && shard.bouncesRemaining > 0 && (hitLeftWall || hitRightWall)) {
      shard.x = clamp(shard.x, 0, WIDTH - shard.w);
      shard.vx *= -1;
      shard.facing = shard.vx >= 0 ? 1 : -1;
      shard.bouncesRemaining -= 1;
      shard.frame = Math.min(MIRROR_SHARD_SHEET.count - 1, 4);
      playSfx("bossMirror", 1.28);
    }

    if (hitbox(state.player, shard)) {
      hurtPlayer(shard.damage, shard.vx);
      state.mirrorShards.splice(i, 1);
      continue;
    }

    const drawW = shard.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareDrawW
      : MIRROR_DREAM_CONFIG.shardDrawW;
    const offLeft = shard.x + shard.w < -drawW;
    const offRight = shard.x > WIDTH + drawW;
    const offTop = shard.y + shard.h < -drawW;
    const offBottom = shard.y > GROUND_Y + drawW;
    if (shard.life <= 0 || offLeft || offRight || offTop || offBottom) {
      state.mirrorShards.splice(i, 1);
    }
  }
}

export function drawBossSkill1Effects() {
  const sheet = bossArchetypeForId(BOSS_ARCHETYPE_IDS.spiderString).sheets.effect;
  if (!ctx || !sheet.image) return;
  const drawW = sheet.frameW * BOSS_SKILL1_CONFIG.effectDrawScale;
  const drawH = sheet.frameH * BOSS_SKILL1_CONFIG.effectDrawScale;
  for (const e of state.bossSkill1Effects) {
    const sx = e.frame * sheet.frameW;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(e.facing, 1);
    ctx.drawImage(sheet.image, sx, 0, sheet.frameW, sheet.frameH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

export function drawMirrorDreamEffects() {
  drawMirrorAfterimages();
  drawMirrorShards();
}

export function drawLanternEmberEffects() {
  drawLanternAshZones();
  drawLanternFirelines();
  drawLanternAwakenedGrids();
  drawLanternLures();
  drawLanternBuffTethers();
}

export function drawBloodMoonEffects() {
  if (!ctx) return;
  for (const effect of state.bloodMoonEffects) {
    if (effect.delay > 0) continue;
    drawBloodMoonEffectWarning(effect);

    const spec = bloodMoonEffectSpec(effect.kind);
    if (!spec.sheet.image) continue;
    const centerX = effect.x + effect.w / 2;
    const drawX = centerX - spec.drawW / 2;
    const drawY = spec.groundAligned
      ? effect.y + effect.h - spec.drawH + spec.bottomPadding
      : effect.y + effect.h / 2 - spec.drawH / 2;
    const fade = clamp(effect.life / Math.max(1, effect.life + effect.elapsed), 0.24, 1);

    ctx.save();
    ctx.globalAlpha = effect.elapsed <= effect.warningFrames ? 0.42 : fade;
    drawSheetFrame(
      spec.sheet,
      effect.frame,
      drawX,
      drawY,
      spec.drawW,
      spec.drawH,
      effect.facing,
    );
    ctx.restore();
  }
}

function drawBloodMoonEffectWarning(effect: BloodMoonEffectState) {
  if (!ctx || effect.warningFrames <= 0 || effect.elapsed > effect.warningFrames) return;
  const progress = clamp(effect.elapsed / effect.warningFrames, 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.26 + progress * 0.36;
  ctx.strokeStyle = effect.kind === "mirrorFang" ? "#f0d08a" : "#e04038";
  ctx.fillStyle = effect.kind === "manyFaces"
    ? "rgba(150, 16, 28, 0.18)"
    : "rgba(210, 42, 42, 0.14)";
  ctx.lineWidth = effect.kind === "manyFaces" ? 3 : 2;
  ctx.setLineDash(effect.kind === "mirrorFang" ? [18, 10] : [8, 7]);

  if (effect.kind === "mirrorFang") {
    const y = effect.y + effect.h / 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  } else {
    ctx.fillRect(effect.x, effect.y, effect.w, effect.h);
    ctx.strokeRect(effect.x, effect.y, effect.w, effect.h);
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function drawLanternLures() {
  if (!ctx) return;
  for (const lure of state.lanternEmberLures) {
    const fade = clamp(lure.life / LANTERN_EMBER_CONFIG.lureLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.36 + fade * 0.64;
    drawSheetFrame(
      LANTERN_EMBER_LURE_EFFECT_SHEET,
      lure.frame,
      lure.x - LANTERN_EMBER_CONFIG.lureDrawW / 2,
      lure.y - LANTERN_EMBER_CONFIG.lureDrawH / 2,
      LANTERN_EMBER_CONFIG.lureDrawW,
      LANTERN_EMBER_CONFIG.lureDrawH,
      lure.facing,
    );
    ctx.restore();
  }
}

function drawLanternFirelines() {
  if (!ctx) return;
  for (const fireline of state.lanternEmberFirelines) {
    const warning = fireline.elapsed <= fireline.warningFrames;
    const fade = clamp(fireline.life / LANTERN_EMBER_CONFIG.firelineLife, 0, 1);
    const drawH = LANTERN_EMBER_CONFIG.firelineDrawH;
    ctx.save();
    ctx.globalAlpha = warning ? 0.45 : 0.35 + fade * 0.65;
    drawSheetFrame(
      LANTERN_EMBER_FIRELINE_SHEET,
      fireline.frame,
      fireline.x,
      fireline.y - drawH + LANTERN_EMBER_CONFIG.firelineYOffset,
      fireline.w,
      drawH,
    );
    ctx.restore();
  }
}

function drawLanternAwakenedGrids() {
  if (!ctx) return;
  for (const grid of state.lanternEmberAwakenedGrids) {
    const warning = grid.elapsed <= grid.warningFrames;
    const fade = clamp(grid.life / LANTERN_EMBER_CONFIG.awakenedGridLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = warning ? 0.38 : 0.32 + fade * 0.6;
    drawSheetFrame(
      LANTERN_EMBER_AWAKENED_GRID_SHEET,
      grid.frame,
      grid.x,
      grid.y - LANTERN_EMBER_CONFIG.awakenedGridDrawH,
      LANTERN_EMBER_CONFIG.awakenedGridDrawW,
      LANTERN_EMBER_CONFIG.awakenedGridDrawH,
    );
    ctx.restore();
  }
}

function drawLanternAshZones() {
  if (!ctx) return;
  for (const zone of state.lanternEmberAshZones) {
    const drawW = Math.round(zone.radius * LANTERN_EMBER_CONFIG.ashZoneDrawWidthScale);
    const drawH = Math.round(drawW * LANTERN_EMBER_ASH_ZONE_SHEET.frameH / LANTERN_EMBER_ASH_ZONE_SHEET.frameW);
    const fade = Math.min(
      1,
      zone.elapsed / 18,
      zone.life / 18,
    );
    ctx.save();
    ctx.globalAlpha = 0.78 * fade;
    drawSheetFrame(
      LANTERN_EMBER_ASH_ZONE_SHEET,
      zone.frame,
      zone.x - drawW / 2,
      zone.y - drawH,
      drawW,
      drawH,
    );
    ctx.restore();
  }
}

function drawLanternBuffTethers() {
  const image = LANTERN_EMBER_BUFF_TETHER_SHEET.image;
  if (!ctx || !image) return;
  const sheet = LANTERN_EMBER_BUFF_TETHER_SHEET;
  for (const tether of state.lanternEmberBuffTethers) {
    const dx = tether.toX - tether.fromX;
    const dy = tether.toY - tether.fromY;
    const drawW = Math.max(LANTERN_EMBER_CONFIG.buffTetherDrawW, Math.hypot(dx, dy));
    const drawH = LANTERN_EMBER_CONFIG.buffTetherDrawH;
    const sx = tether.frame * sheet.frameW;
    const fade = clamp(tether.life / LANTERN_EMBER_CONFIG.buffTetherLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.35 + fade * 0.65;
    ctx.translate(tether.fromX, tether.fromY);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.drawImage(image, sx, 0, sheet.frameW, sheet.frameH, 0, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

function drawMirrorAfterimages() {
  if (!ctx) return;
  for (const afterimage of state.mirrorAfterimages) {
    const centerX = afterimage.x + afterimage.w / 2;
    const feetY = afterimage.y + afterimage.h;
    const lifeT = clamp(afterimage.life / afterimage.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = MIRROR_DREAM_CONFIG.afterimageAlpha * (0.24 + lifeT * 0.76);
    drawSheetFrame(
      MIRROR_AFTERIMAGE_SHEET,
      afterimage.frame,
      centerX - MIRROR_DREAM_CONFIG.afterimageDrawW / 2,
      feetY - MIRROR_DREAM_CONFIG.afterimageDrawH + MIRROR_DREAM_CONFIG.afterimageBottomPadding,
      MIRROR_DREAM_CONFIG.afterimageDrawW,
      MIRROR_DREAM_CONFIG.afterimageDrawH,
      afterimage.facing,
    );
    ctx.restore();
  }
}

function drawMirrorShards() {
  if (!ctx) return;
  for (const shard of state.mirrorShards) {
    const sheet = shard.kind === "nightmare" ? MIRROR_NIGHTMARE_SHEET : MIRROR_SHARD_SHEET;
    const drawW = shard.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareDrawW
      : MIRROR_DREAM_CONFIG.shardDrawW;
    const drawH = shard.kind === "nightmare"
      ? MIRROR_DREAM_CONFIG.nightmareDrawH
      : MIRROR_DREAM_CONFIG.shardDrawH;
    const centerX = shard.x + shard.w / 2;
    const centerY = shard.y + shard.h / 2;
    drawSheetFrame(
      sheet,
      shard.frame,
      centerX - drawW / 2,
      centerY - drawH / 2,
      drawW,
      drawH,
      shard.facing,
    );
  }
}

export function drawDeadBellEffects() {
  drawDeadBellWaves();
  drawDeadBellBlades();
}

function drawDeadBellWaves() {
  if (!ctx) return;
  for (const wave of state.deadBellWaves) {
    const warning = wave.delay > 0 || wave.elapsed <= wave.warningFrames;
    const activeElapsed = Math.max(0, wave.elapsed - wave.warningFrames);
    const fade = clamp(1 - activeElapsed / (wave.expandFrames + 18), 0.28, 1);
    const drawW = wave.radius * 2;
    const drawH = drawW * (DEAD_BELL_WAVE_SHEET.frameH / DEAD_BELL_WAVE_SHEET.frameW);
    ctx.save();
    ctx.globalAlpha = warning ? 0.52 : fade;
    drawSheetFrame(
      DEAD_BELL_WAVE_SHEET,
      warning ? 0 : wave.frame,
      wave.x - drawW / 2,
      wave.y - drawH / 2,
      drawW,
      drawH,
    );
    ctx.restore();
  }
}

function drawDeadBellBlades() {
  if (!ctx) return;
  for (const blade of state.deadBellBlades) {
    if (blade.delay > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2 + (1 - blade.delay / DEAD_BELL_CONFIG.bladeWarningFrames) * 0.35;
      ctx.strokeStyle = "#d7b66d";
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(0, blade.y + blade.h / 2);
      ctx.lineTo(WIDTH, blade.y + blade.h / 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const drawX = blade.x + blade.w / 2 - DEAD_BELL_CONFIG.bladeDrawW / 2;
    const drawY = blade.y + blade.h / 2 - DEAD_BELL_CONFIG.bladeDrawH / 2;
    drawSheetFrame(
      DEAD_BELL_BLADE_SHEET,
      blade.frame,
      drawX,
      drawY,
      DEAD_BELL_CONFIG.bladeDrawW,
      DEAD_BELL_CONFIG.bladeDrawH,
      blade.facing,
    );
  }
}
