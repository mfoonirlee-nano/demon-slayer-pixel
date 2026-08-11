import { describe, expect, it } from "vitest";

import { GROUND_Y, MIST_BONE_CONFIG } from "../../constants";
import { resetState, state } from "../../game/state";
import { updateBoss } from "../boss";
import { updateProjectiles } from "../projectile";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { updateMistBoneEffects } from "./mistBoneEffects";

const FAR_FUTURE_COOLDOWN = 999;
const BOSS_X = 200;
const PLAYER_X = 430;
const PHASE_TWO_HP_RATIO = 0.5;
const PHASE_THREE_HP_RATIO = 0.2;
const PHASE_THREE = 3;
const MAX_DART_TRAVEL_FRAMES = 20;
const MIST_BONE_PHASE_ONE_DART_DAMAGE = 9;
const PLATFORM_PLAYER_X_OFFSET = 40;

describe("mist bone boss behavior", () => {
  it("lays a thin slowing fog field under its phase-one burial spike", () => {
    const boss = readyMistBone();
    boss.skillCd = 0;

    updateBoss();
    advanceBossFrames(MIST_BONE_CONFIG.spawnAtFrame + 1);

    expect(state.mistBoneSpikes).toHaveLength(1);
    expect(state.mistBoneFogs).toEqual([
      expect.objectContaining({
        kind: "thin",
        x: PLAYER_X + state.player.w / 2,
        y: GROUND_Y,
        radiusX: MIST_BONE_CONFIG.thinFogRadiusX,
        radiusY: MIST_BONE_CONFIG.thinFogRadiusY,
        life: MIST_BONE_CONFIG.thinFogLife,
      }),
    ]);
  });

  it("keeps platform-cast fog and spikes attached while their platform moves", () => {
    const boss = readyMistBone();
    const platform = {
      x: PLAYER_X - PLATFORM_PLAYER_X_OFFSET,
      y: 380,
      baseY: 380,
      w: 300,
      h: 12,
      vx: 0,
      phase: 0,
      style: "stone" as const,
      kind: "normal" as const,
      spriteIndex: 0,
      spriteAct: null,
      trim: 0,
      notch: 0,
      hoverAmplitude: 0,
    };
    state.platforms.push(platform);
    state.player.onPlatform = platform;
    state.player.y = platform.y - state.player.h;
    boss.skillCd = 0;

    updateBoss();
    advanceBossFrames(MIST_BONE_CONFIG.spawnAtFrame + 1);

    const fog = state.mistBoneFogs[0];
    const spike = state.mistBoneSpikes[0];
    const initialFog = { x: fog.x, y: fog.y };
    const initialSpike = { x: spike.x, y: spike.y };
    const initialPhaseSeed = fog.phaseSeed;
    const movement = { x: 18, y: -9 };
    platform.x += movement.x;
    platform.y += movement.y;

    updateMistBoneEffects();

    expect(fog).toMatchObject({
      x: initialFog.x + movement.x,
      y: initialFog.y + movement.y,
      phaseSeed: initialPhaseSeed,
    });
    expect(spike).toMatchObject({
      x: initialSpike.x + movement.x,
      y: initialSpike.y + movement.y,
    });
  });

  it("uses a sprite-backed bone dart attack between special casts", () => {
    const boss = readyMistBone();

    updateBoss();

    expect(boss.actionState).toBe("attack");
    expect(boss.actionTimer).toBe(0);
    expect(boss.castFacing).toBe(1);
    expect(boss.aiTimer).toBeGreaterThan(0);
    expect(state.projectiles).toEqual([]);

    advanceBossFrames(MIST_BONE_CONFIG.attackReleaseFrame - 1);
    expect(state.projectiles).toEqual([]);

    updateBoss();
    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0]).toMatchObject({
      kind: "bossBone",
      damage: MIST_BONE_PHASE_ONE_DART_DAMAGE,
    });
    expect(state.projectiles[0].vx).toBeGreaterThan(0);

    const hpBeforeHit = state.player.hp;
    for (let frame = 0; frame < MAX_DART_TRAVEL_FRAMES && state.projectiles.length > 0; frame += 1) {
      updateProjectiles();
    }
    expect(state.projectiles).toHaveLength(0);
    expect(state.player.hp).toBeLessThan(hpBeforeHit);

    advanceBossFrames(MIST_BONE_CONFIG.attackDuration - MIST_BONE_CONFIG.attackReleaseFrame);
    expect(boss.actionState).toBe("move");
  });

  it("adds staggered darts by phase and keeps the direction chosen on windup", () => {
    const boss = readyMistBone();
    boss.hp = boss.hpMax * PHASE_THREE_HP_RATIO;

    updateBoss();
    state.player.x = 0;
    advanceBossFrames(
      MIST_BONE_CONFIG.attackReleaseFrame
        + MIST_BONE_CONFIG.attackShotInterval * (MIST_BONE_CONFIG.attackMaxShots - 1),
    );

    expect(boss.phase).toBe(PHASE_THREE);
    expect(state.projectiles).toHaveLength(MIST_BONE_CONFIG.attackMaxShots);
    expect(state.projectiles.every((projectile) => projectile.vx > 0)).toBe(true);
  });

  it("prioritizes special casts and alternates the base ground patterns", () => {
    const boss = readyMistBone();
    boss.hp = boss.hpMax * PHASE_THREE_HP_RATIO;
    boss.skillCd = 0;

    updateBoss();
    expect(boss.actionState).toBe("cast");
    expect(boss.skillMode).toBe("mistBoneLine");

    boss.actionState = "move";
    boss.castTimer = 0;
    boss.recoveryTimer = 0;
    boss.skillCd = 0;
    boss.skillEffectSpawned = false;
    updateBoss();

    expect(boss.actionState).toBe("cast");
    expect(boss.skillMode).toBe("mistBoneSpike");
  });

  it("follows its phase-three spike line with a release-locked chase", () => {
    const boss = readyMistBone();
    boss.hp = boss.hpMax * PHASE_THREE_HP_RATIO;
    boss.skillCd = 0;

    updateBoss();
    expect(boss.castFacing).toBe(1);
    state.player.x = 0;
    advanceBossFrames(MIST_BONE_CONFIG.spawnAtFrame + 1);

    expect(boss.skillMode).toBe("mistBoneLine");
    expect(state.mistBoneFogs).toContainEqual(expect.objectContaining({
      kind: "thin",
      x: state.player.w / 2,
    }));
    expect(boss.castFacing).toBe(1);
    expect(boss.mistBoneChaseFacing).toBe(-1);

    state.player.x = PLAYER_X;
    advanceBossFrames(boss.castTimer);

    expect(boss.actionState).toBe("dash");
    expect(boss.vx).toBe(-MIST_BONE_CONFIG.chaseSpeed);
    expect(boss.castFacing).toBe(-1);

    state.player.x = boss.x;
    state.player.y = boss.y;
    state.player.invincible = 0;
    const hpBeforeHit = state.player.hp;
    updateBoss();

    expect(state.player.hp).toBeLessThan(hpBeforeHit);
    expect(boss.skillHitDone).toBe(true);

    state.player.invincible = 0;
    const hpAfterHit = state.player.hp;
    updateBoss();
    expect(state.player.hp).toBe(hpAfterHit);

    boss.x = 1;
    updateBoss();

    expect(boss.actionState).toBe("recover");
    expect(boss.recoveryTimer).toBe(MIST_BONE_CONFIG.chaseRecoveryFrames);
    expect(boss.vx).toBe(0);
  });

  it("keeps the phase-two spike line on its normal recovery", () => {
    const boss = readyMistBone();
    boss.hp = boss.hpMax * PHASE_TWO_HP_RATIO;
    boss.skillCd = 0;

    updateBoss();
    expect(boss.skillMode).toBe("mistBoneLine");

    advanceBossFrames(MIST_BONE_CONFIG.castDuration);

    expect(boss.phase).toBe(2);
    expect(boss.actionState).toBe("recover");
    expect(boss.recoveryTimer).toBe(MIST_BONE_CONFIG.recoveryFrames);
  });
});

function readyMistBone() {
  resetState();
  const boss = createBossEncounter({
    id: BOSS_ARCHETYPE_IDS.mistBone,
    bossKills: 0,
    elapsedSeconds: 0,
    animSeed: 0,
  });
  boss.entering = false;
  boss.x = BOSS_X;
  boss.y = GROUND_Y - boss.h;
  boss.skillCd = FAR_FUTURE_COOLDOWN;
  boss.aiTimer = 0;
  state.player.x = PLAYER_X;
  state.player.y = GROUND_Y - state.player.h;
  state.player.onPlatform = null;
  state.boss = boss;
  return boss;
}

function advanceBossFrames(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) updateBoss();
}
