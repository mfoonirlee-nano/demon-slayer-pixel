import { LANTERN_EMBER_CONFIG } from "../../constants";
import type { GameState, LanternEmberAshZoneState } from "../../types/game-state";

export function activeLanternAshZoneForPlayer(
  gameState: GameState,
): LanternEmberAshZoneState | null {
  const footX = gameState.player.x + gameState.player.w / 2;
  const footY = gameState.player.y + gameState.player.h;
  let containingZone: LanternEmberAshZoneState | null = null;

  for (const zone of gameState.lanternEmberAshZones) {
    const radiusY = zone.radius * LANTERN_EMBER_CONFIG.ashZoneVerticalRadiusScale;
    const dx = (footX - zone.x) / zone.radius;
    const dy = (footY - zone.y) / radiusY;
    if (dx * dx + dy * dy <= 1 && (!containingZone || zone.life > containingZone.life)) {
      containingZone = zone;
    }
  }

  return containingZone;
}
