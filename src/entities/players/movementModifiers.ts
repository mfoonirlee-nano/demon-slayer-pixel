import { state } from "../../game/state";
import { LANTERN_EMBER_CONFIG, SPIDER_STRING_CAGE_CONFIG } from "../../constants";
import { activeLanternAshZoneForPlayer } from "./lanternAshZone";

export function lanternAshZonePlayerMoveScale() {
  return activeLanternAshZoneForPlayer(state)
    ? LANTERN_EMBER_CONFIG.ashZoneMoveScale
    : 1;
}

export function spiderSilkSlowPlayerMoveScale() {
  return state.player.spiderSilkSlowTimer > 0
    ? SPIDER_STRING_CAGE_CONFIG.slowMoveScale
    : 1;
}
