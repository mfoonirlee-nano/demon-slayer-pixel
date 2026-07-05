import { beforeEach, describe, expect, it, vi } from "vitest";
import { GROUND_Y, SKILL_IDS } from "../constants";
import { keys } from "../game/input";
import { resetState, state } from "../game/state";
import type { GameSfx } from "../game/audio";
import type { SkillId } from "../types/assets";
import { implementedPlayerSkillIds, playerSkillById } from "../systems/skillCatalog";
import { hurtPlayer, triggerAttack, tryJump, updatePlayer } from "./player";
import {
  castSelectedSkill,
  castUltimateSkill,
  playerSkillReleaseFrame,
  triggerUltimateOpeningEffect,
  updateSkillCastRelease,
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
const RUN_STEP_TEST_FRAMES = 12;
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

describe("player action audio", () => {
  beforeEach(() => {
    resetState();
    keys.clear();
    audioMock.playSfx.mockClear();
  });

  it("plays footstep sfx while the player runs on the ground", () => {
    keys.add("d");

    for (let frame = 0; frame < RUN_STEP_TEST_FRAMES; frame += 1) {
      updatePlayer();
    }

    expect(audioMock.playSfx).toHaveBeenCalledWith("playerRunStep", RUN_STEP_RIGHT_PITCH);
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

  it("plays attack and fall attack action sfx", () => {
    triggerAttack();
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerAttackStart");

    resetState();
    audioMock.playSfx.mockClear();
    state.player.y = GROUND_Y - state.player.h - AIR_ATTACK_TEST_HEIGHT;

    triggerAttack();
    expect(audioMock.playSfx).toHaveBeenCalledWith("playerFallAttackStart");

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
