import { BOSS_CONFIG, WIDTH } from "../../constants";
import { state } from "../../game/state";
import { clamp, hitbox } from "../../game/utils";
import { hurtPlayer } from "../player";
import { bossArchetypeForId } from "./registry";
import type { LiveBoss } from "./types";

export function damagePlayerOnContact(boss: LiveBoss) {
  const archetype = bossArchetypeForId(boss.id);
  if (hitbox(state.player, boss)) {
    hurtPlayer(archetype.contactDamageBase + boss.phase * archetype.contactDamagePhase, boss.vx);
  }
}

export function moveChasingBoss(boss: LiveBoss) {
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
