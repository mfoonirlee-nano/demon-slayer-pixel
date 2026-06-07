import { BINDER_ARCHETYPE, isBinderSheet } from "./binder";
import { BRUTE_ARCHETYPE, isBruteSheet } from "./brute";
import { CASTER_ARCHETYPE, isCasterSheet } from "./caster";
import { CHASER_ARCHETYPE } from "./chaser";
import { CRAWLER_ARCHETYPE, isCrawlerSheet } from "./crawler";
import { DUELIST_ARCHETYPE, isDuelistSheet } from "./duelist";
import { GLIDER_ARCHETYPE, isGliderSheet } from "./glider";
import { RUNNER_ARCHETYPE, isRunnerSheet } from "./runner";
import type { EnemyArchetype } from "./common";

export function enemyArchetypeForSheet(sheetIndex: number): EnemyArchetype {
  if (isCrawlerSheet(sheetIndex)) return CRAWLER_ARCHETYPE;
  if (isRunnerSheet(sheetIndex)) return RUNNER_ARCHETYPE;
  if (isCasterSheet(sheetIndex)) return CASTER_ARCHETYPE;
  if (isDuelistSheet(sheetIndex)) return DUELIST_ARCHETYPE;
  if (isBruteSheet(sheetIndex)) return BRUTE_ARCHETYPE;
  if (isBinderSheet(sheetIndex)) return BINDER_ARCHETYPE;
  if (isGliderSheet(sheetIndex)) return GLIDER_ARCHETYPE;
  return CHASER_ARCHETYPE;
}
