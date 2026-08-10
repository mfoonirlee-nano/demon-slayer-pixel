import { state } from "../../game/state";

type BloodMoonHazardClearOptions = {
  preserveRunes?: boolean;
  clearSummons?: boolean;
};

export function clearBloodMoonHazards(
  options: BloodMoonHazardClearOptions = {},
) {
  state.bossSkill1Effects.length = 0;
  state.spiderStringCages.length = 0;
  state.spiderStringPillars.length = 0;
  state.deadBellWaves.length = 0;
  state.deadBellBlades.length = 0;
  state.mistBoneFogs.length = 0;
  state.mistBoneSpikes.length = 0;
  state.mirrorShards.length = 0;
  state.mirrorAfterimages.length = 0;
  state.fangGaleWaves.length = 0;
  state.lanternEmberLures.length = 0;
  state.lanternEmberFirelines.length = 0;
  state.lanternEmberBuffTethers.length = 0;
  state.lanternEmberAwakenedGrids.length = 0;
  state.lanternEmberAshZones.length = 0;

  if (options.preserveRunes) {
    const runes = state.bloodMoonEffects.filter(({ kind }) => kind === "phaseRune");
    state.bloodMoonEffects.length = 0;
    state.bloodMoonEffects.push(...runes);
  } else {
    state.bloodMoonEffects.length = 0;
  }

  for (const enemy of state.enemies) enemy.lanternBuffTimer = 0;
  if (!options.clearSummons) return;
  for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
    if (state.enemies[index]?.spawnSource === "boss") state.enemies.splice(index, 1);
  }
}
