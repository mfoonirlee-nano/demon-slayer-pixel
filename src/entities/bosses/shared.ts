import { state } from "../../game/state";
import { hitbox } from "../../game/utils";
import { hurtPlayer } from "../player";
import { bossArchetypeForId } from "./registry";
import type { LiveBoss } from "./types";

export function damagePlayerOnContact(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  if (hitbox(state.player, boss)) {
    hurtPlayer(archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase, boss.vx);
  }
}
