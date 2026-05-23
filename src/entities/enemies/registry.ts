import { CHASER_ARCHETYPE } from "./chaser";
import { RUNNER_ARCHETYPE, isRunnerSheet } from "./runner";
import type { EnemyArchetype } from "./common";

export function enemyArchetypeForSheet(sheetIndex: number): EnemyArchetype {
  if (isRunnerSheet(sheetIndex)) return RUNNER_ARCHETYPE;
  return CHASER_ARCHETYPE;
}
