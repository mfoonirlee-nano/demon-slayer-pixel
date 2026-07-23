import { BOSS_CONFIG } from "../../constants";
import { state } from "../../game/state";
import { hitbox } from "../../game/utils";
import { hurtPlayer } from "../player";
import { bossArchetypeForId } from "./registry";
import type { LiveBoss } from "./types";

export function bossAttackDamage(damage: number) {
  return damage * BOSS_CONFIG.attackDamageMultiplier;
}

export function damagePlayerOnContact(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  if (hitbox(state.player, boss)) {
    hurtPlayer(
      bossAttackDamage(archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase),
      boss.vx,
    );
  }
}
