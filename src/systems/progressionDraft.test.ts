import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "../constants";
import { createInitialState } from "../game/state";
import type { GameState, SkillLevel, UpgradeChoiceState } from "../types/game-state";
import {
  addRunXp,
  applyUpgradeChoice,
  processPendingLevelUps,
  xpToNextLevel,
} from "./progression";
import { implementedPlayerSkillIds } from "./skillCatalog";

const REPLAY_SEED = 34091;
const SEED_SAMPLE_COUNT = 64;
const REPLAY_LEVEL_COUNT = 6;
const MAX_SKILL_LEVEL = 3;
const MAX_CHOICE_COUNT = 3;
const MAX_UNLEARNED_CHOICES = 2;
const LATE_ENCOUNTER_SECONDS = 180;
const LATE_ENCOUNTER_WAVES = 9;

function createSeededRun(seed: number) {
  const state = createInitialState();
  state.enemyDirector.runSeed = seed;
  return state;
}

function nextDraft(state: GameState) {
  addRunXp(state, xpToNextLevel(state.player.runLevel));
  return state.pendingUpgradeChoices;
}

function draftKey(choices: UpgradeChoiceState[]) {
  return choices.map((choice) => `${choice.type}:${choice.skillId ?? "ultimate"}`).join(",");
}

function setAllSkillLevels(state: GameState, level: SkillLevel) {
  for (const skillId of implementedPlayerSkillIds()) {
    state.player.skillLevels[skillId] = level;
  }
}

describe("seeded skill drafts", () => {
  it("replays the same draft sequence for the same seed and decisions", () => {
    const first = createSeededRun(REPLAY_SEED);
    const replay = createSeededRun(REPLAY_SEED);

    for (let level = 0; level < REPLAY_LEVEL_COUNT; level += 1) {
      expect(nextDraft(first)).toEqual(nextDraft(replay));
      expect(applyUpgradeChoice(first, 0)).toBe(true);
      expect(applyUpgradeChoice(replay, 0)).toBe(true);
    }
    expect(first.player.skillLevels).toEqual(replay.player.skillLevels);
  });

  it("offers every starting upgrade and every new technique in the first draft across run seeds", () => {
    const firstRun = createSeededRun(REPLAY_SEED);
    const upgradeIds = new Set<string>();
    const unlockIds = new Set<string>();
    const drafts = new Set<string>();

    for (let seed = 1; seed <= SEED_SAMPLE_COUNT; seed += 1) {
      const choices = nextDraft(createSeededRun(seed));
      drafts.add(draftKey(choices));
      for (const choice of choices) {
        if (choice.type === "upgradeSkill" && choice.skillId) upgradeIds.add(choice.skillId);
        if (choice.type === "unlockSkill" && choice.skillId) unlockIds.add(choice.skillId);
      }
    }

    expect(drafts.size).toBeGreaterThan(1);
    expect(upgradeIds).toEqual(new Set(Object.keys(firstRun.player.skillLevels)));
    expect(unlockIds).toEqual(new Set(implementedPlayerSkillIds().filter(
      (skillId) => !firstRun.player.skillLevels[skillId],
    )));
    expect(unlockIds.has(SKILL_IDS.returningBlade)).toBe(true);
    expect(unlockIds.has(SKILL_IDS.verticalWave)).toBe(true);
  });

  it("uses a fresh per-level sample even when the learned pool does not change", () => {
    const drafts = new Set<string>();
    for (let level = 1; level <= REPLAY_LEVEL_COUNT; level += 1) {
      const state = createSeededRun(REPLAY_SEED);
      state.player.runLevel = level;
      drafts.add(draftKey(nextDraft(state)));
    }
    expect(drafts.size).toBeGreaterThan(1);
  });

  it("does not depend on or mutate encounter timing, and keeps pending choices stable", () => {
    const early = createSeededRun(REPLAY_SEED);
    const late = createSeededRun(REPLAY_SEED);
    late.elapsed = LATE_ENCOUNTER_SECONDS;
    late.enemyDirector.elapsedInAct = LATE_ENCOUNTER_SECONDS;
    late.enemyDirector.wavesCleared = LATE_ENCOUNTER_WAVES;
    const directorBefore = structuredClone(late.enemyDirector);

    expect(nextDraft(late)).toEqual(nextDraft(early));
    expect(late.enemyDirector).toEqual(directorBefore);
    const pendingChoices = late.pendingUpgradeChoices;
    processPendingLevelUps(late);
    addRunXp(late, 0);
    expect(late.pendingUpgradeChoices).toBe(pendingChoices);
  });

  it("retains upgrade and discovery choices without duplicates or ineligible cards", () => {
    for (let seed = 1; seed <= SEED_SAMPLE_COUNT; seed += 1) {
      const state = createSeededRun(seed);
      state.player.ultimateLevel = 1;
      state.player.skillLevels[SKILL_IDS.lineProjectile] = MAX_SKILL_LEVEL;
      state.player.skillLevels[SKILL_IDS.closeArc] = 2;

      const choices = nextDraft(state);
      expect(choices).toHaveLength(MAX_CHOICE_COUNT);
      expect(choices.some((choice) => choice.type === "upgradeSkill")).toBe(true);
      expect(choices.some((choice) => choice.type === "unlockSkill")).toBe(true);
      expect(choices).toContainEqual(expect.objectContaining({ type: "upgradeUltimate", nextLevel: 2 }));
      expect(new Set(choices.map((choice) => choice.skillId ?? "ultimate")).size).toBe(choices.length);
      for (const choice of choices) {
        if (!choice.skillId) continue;
        expect(implementedPlayerSkillIds()).toContain(choice.skillId);
        const currentLevel = state.player.skillLevels[choice.skillId] ?? 0;
        expect(currentLevel).toBeLessThan(MAX_SKILL_LEVEL);
        expect(choice.nextLevel).toBe(currentLevel + 1);
        expect(choice.type).toBe(currentLevel === 0 ? "unlockSkill" : "upgradeSkill");
      }
    }
  });

  it("caps unlearned cards even when only discoveries remain", () => {
    for (const hasUltimate of [false, true]) {
      const state = createSeededRun(REPLAY_SEED);
      for (const skillId of implementedPlayerSkillIds()) {
        if (state.player.skillLevels[skillId]) state.player.skillLevels[skillId] = MAX_SKILL_LEVEL;
      }
      state.player.ultimateLevel = hasUltimate ? MAX_SKILL_LEVEL : 0;

      const choices = nextDraft(state);
      expect(choices).toHaveLength(MAX_UNLEARNED_CHOICES);
      expect(choices.every((choice) => (
        choice.type === "unlockSkill" || (!hasUltimate && choice.type === "upgradeUltimate")
      ))).toBe(true);
    }
  });

  it("fills from upgrades when every normal skill is learned", () => {
    const state = createSeededRun(REPLAY_SEED);
    setAllSkillLevels(state, 1);
    state.player.ultimateLevel = MAX_SKILL_LEVEL;

    const choices = nextDraft(state);
    expect(choices).toHaveLength(MAX_CHOICE_COUNT);
    expect(choices.every((choice) => choice.type === "upgradeSkill")).toBe(true);
    expect(new Set(choices.map((choice) => choice.skillId)).size).toBe(MAX_CHOICE_COUNT);
  });

  it("returns the sole remaining improvement instead of filling with duplicates or capped skills", () => {
    const state = createSeededRun(REPLAY_SEED);
    setAllSkillLevels(state, MAX_SKILL_LEVEL);
    state.player.ultimateLevel = MAX_SKILL_LEVEL;
    state.player.skillLevels[SKILL_IDS.verticalWave] = 2;

    expect(nextDraft(state)).toEqual([expect.objectContaining({
      type: "upgradeSkill", skillId: SKILL_IDS.verticalWave, nextLevel: MAX_SKILL_LEVEL,
    })]);
    expect(applyUpgradeChoice(state, 0)).toBe(true);
    expect(nextDraft(state)).toEqual([]);
  });
});
