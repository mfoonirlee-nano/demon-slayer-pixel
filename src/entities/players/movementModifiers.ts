import { state } from "../../game/state";
import {
  LANTERN_EMBER_CONFIG,
  MIST_BONE_CONFIG,
  SPIDER_STRING_CAGE_CONFIG,
} from "../../constants";
import { equipmentMoveSpeedMultiplier } from "../../systems/equipment";
import { dashRepositionMoveSpeedMultiplier } from "../../systems/playerSkillPassives";
import { bindingZonePlayerMoveScale } from "../enemies/binder";
import { activeLanternAshZoneForPlayer } from "./lanternAshZone";
import { activeMistBoneFogForPlayer } from "./mistBoneFog";
import { moonTideMoveSpeedMultiplier } from "./moonTide";

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

export function mistBoneFogPlayerMoveScale() {
  return activeMistBoneFogForPlayer(state)
    ? MIST_BONE_CONFIG.thinFogMoveScale
    : 1;
}

export function playerMoveScale() {
  return Math.min(
    bindingZonePlayerMoveScale(),
    lanternAshZonePlayerMoveScale(),
    mistBoneFogPlayerMoveScale(),
    spiderSilkSlowPlayerMoveScale(),
  )
    * equipmentMoveSpeedMultiplier(state)
    * dashRepositionMoveSpeedMultiplier(state)
    * moonTideMoveSpeedMultiplier();
}
