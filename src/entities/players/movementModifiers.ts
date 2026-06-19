import { state } from "../../game/state";
import { LANTERN_EMBER_CONFIG } from "../../constants";

export function lanternAshZonePlayerMoveScale() {
  for (const zone of state.lanternEmberAshZones) {
    const footX = state.player.x + state.player.w / 2;
    const footY = state.player.y + state.player.h;
    const radiusY = zone.radius * LANTERN_EMBER_CONFIG.ashZoneVerticalRadiusScale;
    const dx = (footX - zone.x) / zone.radius;
    const dy = (footY - zone.y) / radiusY;
    if (dx * dx + dy * dy <= 1) return LANTERN_EMBER_CONFIG.ashZoneMoveScale;
  }

  return 1;
}
