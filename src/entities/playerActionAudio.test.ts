import { beforeEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y, SKILL_IDS } from "../constants";
import { keys } from "../game/input";
import { resetState, state } from "../game/state";
import type { GameSfx } from "../game/audio";
import type { SkillId } from "../types/assets";
import { implementedPlayerSkillIds, playerSkillById } from "../systems/skillCatalog";
import { createBossEncounter } from "./bosses/encounter";
import { spawnEnemyById } from "./enemy";
import { attackBox, hurtPlayer, triggerAttack, tryJump, updatePlayer } from "./player";
import {
  castSelectedSkill,
  castUltimateSkill,
  playerSkillReleaseFrame,
  triggerUltimateOpeningEffect,
  updateSkillCastRelease,
  updateUltimateCastAndTimer,
} from "./players/skillCasting";

const audioMock = vi.hoisted(() => ({
  ensureAudio: vi.fn(),
  playSfx: vi.fn(),
}));

vi.mock("../game/audio", () => audioMock);

const PLAYER_SKILL_RELEASE_SFX = {
  [SKILL_IDS.lineProjectile]: "playerSkillLine",
  [SKILL_IDS.closeArc]: "playerSkillArc",
  [SKILL_IDS.guardCounter]: "playerSkillGuard",
  [SKILL_IDS.dashReposition]: "playerSkillDash",
  [SKILL_IDS.vortexControl]: "playerSkillVortex",
  [SKILL_IDS.armorBreak]: "playerSkillArmorBreak",
  [SKILL_IDS.antiAirMulti]: "playerSkillRain",
  [SKILL_IDS.returningBlade]: "playerSkillReturningBlade",
  [SKILL_IDS.verticalWave]: "playerSkillVerticalWave",
} satisfies Record<SkillId, GameSfx>;
const BASE_RUN_STEP_INTERVAL_UPDATES = 16;
const RUN_STEP_EXPECTED_CONTACTS = 2;
const RUN_STEP_RIGHT_PITCH = 1.02;
const LANDING_TEST_HEIGHT = 80;
const LANDING_TEST_FRAMES = 20;
const AIR_ATTACK_TEST_HEIGHT = 48;
const HURT_TEST_DAMAGE = 5;
const FATAL_TEST_DAMAGE = 999;
const DAMAGE_SOURCE_VX = 1;
const COUNTER_TEST_ACTIVE_FRAMES = 10;

function selectedSkillOrThrow(skillId: SkillId) {
  const skill = playerSkillById(skillId);
  if (!skill) throw new Error(`Missing player skill ${skillId}`);
  return skill;
}

function placeChaserInAttackBox() {
  expect(spawnEnemyById("chaser", "debug", "right")).toBe(true);
  const box = attackBox();
  const enemy = state.enemies[0]!;
  enemy.x = box.x;
  enemy.y = box.y;
  return enemy;
}

describe("player action audio", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
    audioMock.playSfx.mockClear();
  });

  it("spaces footstep sfx at the base run cadence", () => {
    keys.add("d");

    for (let update = 1; update < BASE_RUN_STEP_INTERVAL_UPDATES; update += 1) {
      updatePlayer();
    }

    expect(audioMock.playSfx).not.toHaveBeenCalled();
    updatePlayer();
    expect(audioMock.playSfx).toHaveBeenNthCalledWith(1, "playerRunStep", RUN_STEP_RIGHT_PITCH);

    for (let update = 0; update < BASE_RUN_STEP_INTERVAL_UPDATES; update += 1) {
      updatePlayer();
    }

    expect(audioMock.playSfx).toHaveBeenCalledTimes(RUN_STEP_EXPECTED_CONTACTS);
    expect(audioMock.playSfx).toHaveBeenNthCalledWith(2, "playerRunStep", RUN_STEP_RIGHT_PITCH);
  });

  it("plays landing sfx for a normal aerial landing", () => {
    state.player.y = GROUND_Y - state.player.h - LANDING_TEST_HEIGHT;
    state.player.vy = 8;

    for (
      let frame = 0;
      frame < LANDING_TEST_FRAMES && state.player.y + state.player.h < GROUND_Y;
      frame += 1
    ) {
      updatePlayer();
    }

    expect(audioMock.playSfx).toHaveBeenCalledWith("playerLand", expect.any(Number));
  });

  it("plays jump sfx when the player leaves the ground", () => {
    tryJump();

    expect(audioMock.playSfx).toHaveBeenCalledWith("playerJump");
  });

  it("plays jump sfx for a successful air jump but not a third jump", () => {
    state.player.skillLevels[SKILL_IDS.vortexControl] = 3;
    state.player.equippedSkillIds[2] = SKILL_IDS.vortexControl;
    state.player.y = GROUND_Y - state.player.h - AIR_ATTACK_TEST_HEIGHT;

    tryJump();

    expect(audioMock.playSfx).toHaveBeenCalledTimes(1);
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerJump");

    tryJump();

    expect(audioMock.playSfx).toHaveBeenCalledTimes(1);
  });

  it("plays attack action sfx on the ground and in the air", () => {
    triggerAttack();
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerAttackStart");

    resetState();
    audioMock.playSfx.mockClear();
    state.player.y = GROUND_Y - state.player.h - AIR_ATTACK_TEST_HEIGHT;

    triggerAttack();
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerAttackStart");
    expect(state.player.attackTimer).toBeGreaterThan(0);
    expect(state.player.fallAttackTimer).toBe(0);
  });

  it("plays one hit feedback cue when a basic attack connects with one enemy", () => {
    placeChaserInAttackBox();

    triggerAttack();
    audioMock.playSfx.mockClear();
    updatePlayer();

    expect(audioMock.playSfx.mock.calls).toEqual([["enemyHurt", expect.any(Number)]]);
  });

  it("plays one defeat feedback cue when a basic attack defeats one enemy", () => {
    const enemy = placeChaserInAttackBox();
    enemy.hp = 1;

    triggerAttack();
    audioMock.playSfx.mockClear();
    updatePlayer();

    expect(audioMock.playSfx.mock.calls).toEqual([["enemyDefeat", expect.any(Number)]]);
  });

  it("plays the boss hit cue when a basic attack connects", () => {
    const box = attackBox();
    state.boss = createBossEncounter({ bossKills: 0, elapsedSeconds: 0 });
    state.boss.x = box.x;
    state.boss.y = box.y;
    state.boss.entering = false;

    triggerAttack();
    updatePlayer();

    expect(audioMock.playSfx).toHaveBeenCalledWith("playerBossHit");
  });

  it("plays fall attack action sfx when attacking in the air with down held", () => {
    state.player.y = GROUND_Y - state.player.h - AIR_ATTACK_TEST_HEIGHT;
    keys.add("s");

    triggerAttack();
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerFallAttackStart");
    expect(state.player.attackTimer).toBe(0);
    expect(state.player.fallAttackTimer).toBeGreaterThan(0);

    audioMock.playSfx.mockClear();
    for (let frame = 0; frame < LANDING_TEST_FRAMES && state.player.fallAttackTimer > 0; frame += 1) {
      updatePlayer();
    }

    expect(audioMock.playSfx).toHaveBeenCalledWith("playerFallAttackImpact");
  });

  it("plays ultimate cast and opening impact sfx", () => {
    state.player.ultimateLevel = 1;
    state.player.ultimateEnergy = state.player.ultimateEnergyMax;

    castUltimateSkill();
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerUltimateCast");

    audioMock.playSfx.mockClear();
    triggerUltimateOpeningEffect();
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerUltimateImpact");
  });

  it("plays the ultimate end cue when moon tide expires", () => {
    state.player.ultimateTimer = 2;

    updateUltimateCastAndTimer();
    expect(audioMock.playSfx).not.toHaveBeenCalledWith("playerUltimateEnd");

    updateUltimateCastAndTimer();
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerUltimateEnd");
  });

  it("plays hurt, death, and counter response sfx", () => {
    hurtPlayer(HURT_TEST_DAMAGE, DAMAGE_SOURCE_VX);
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerHurt");

    resetState();
    audioMock.playSfx.mockClear();
    state.guardCounterEffect = {
      elapsed: 0,
      frame: 0,
      hitsRemaining: 1,
      maxHits: 1,
      activeFrames: COUNTER_TEST_ACTIVE_FRAMES,
      counterPadding: 0,
      damageMultiplier: 1,
      barrierFlash: 0,
    };
    hurtPlayer(HURT_TEST_DAMAGE, DAMAGE_SOURCE_VX);
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerCounter");

    resetState();
    audioMock.playSfx.mockClear();
    hurtPlayer(FATAL_TEST_DAMAGE, DAMAGE_SOURCE_VX);
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerDeath");
  });

  it("plays a distinct release sfx for every implemented player skill", () => {
    expect(implementedPlayerSkillIds().sort()).toEqual(
      (Object.keys(PLAYER_SKILL_RELEASE_SFX) as SkillId[]).sort(),
    );

    for (const skillId of implementedPlayerSkillIds()) {
      resetState();
      audioMock.playSfx.mockClear();
      state.player.equippedSkillIds[0] = skillId;
      state.player.skillLevels[skillId] = 1;
      state.player.skillIndex = 0;
      state.player.skillEnergy = state.player.skillEnergyMax;
      const skill = selectedSkillOrThrow(skillId);

      castSelectedSkill();
      expect(audioMock.playSfx).toHaveBeenCalledWith("playerSkillCast", expect.any(Number));

      audioMock.playSfx.mockClear();
      for (let frame = 0; frame < playerSkillReleaseFrame(skill); frame += 1) {
        updateSkillCastRelease();
      }

      expect(audioMock.playSfx).toHaveBeenCalledWith(PLAYER_SKILL_RELEASE_SFX[skillId]);
    }
  });
});
