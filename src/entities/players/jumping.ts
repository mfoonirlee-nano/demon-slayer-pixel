import {
  GROUND_Y,
  PLAYER_COMBAT,
  VORTEX_CONTROL_DOUBLE_JUMP_CONFIG,
} from "../../constants";
import { playSfx } from "../../game/audio";
import { onGround } from "../../game/utils";
import { hasVortexControlDoubleJumpPassive } from "../../systems/playerSkillPassives";
import type { GameState } from "../../types/game-state";
import { isBinderTalismanStunned } from "../enemies/binder";
import { moonTideJumpMultiplier } from "./moonTide";

export function tryPlayerJump(state: GameState) {
  if (isBinderTalismanStunned()) return;

  const player = state.player;
  if (player.ultimateCastTimer > 0) return;
  if (onGround(player, player.onPlatform)) {
    player.vortexControlAirJumpsUsed = 0;
    player.vy = -player.jump * moonTideJumpMultiplier();
    playSfx("playerJump");
    return;
  }
  if (
    player.fallAttackTimer > 0
    || player.vortexControlAirJumpsUsed >= VORTEX_CONTROL_DOUBLE_JUMP_CONFIG.extraAirJumps
    || !hasVortexControlDoubleJumpPassive(state)
  ) return;

  player.vortexControlAirJumpsUsed += 1;
  player.vy = -player.jump * moonTideJumpMultiplier();
  playSfx("playerJump");
}

export function resolvePlayerLanding(state: GameState, previousBottom: number) {
  const player = state.player;
  player.onPlatform = null;

  let landed = false;
  if (player.vy >= 0) {
    for (const platform of state.platforms) {
      const overlapX = player.x + player.w > platform.x + PLAYER_COMBAT.platformEdgePadding
        && player.x < platform.x + platform.w - PLAYER_COMBAT.platformEdgePadding;
      if (!overlapX) continue;

      const currentBottom = player.y + player.h;
      if (
        previousBottom <= platform.y + PLAYER_COMBAT.platformLandingTolerance
        && currentBottom >= platform.y
      ) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.onPlatform = platform;
        landed = true;
        break;
      }
    }
  }

  if (!landed && player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    player.vy = 0;
    landed = true;
  }

  if (landed) {
    player.vortexControlAirJumpsUsed = 0;
  }
  return landed;
}
