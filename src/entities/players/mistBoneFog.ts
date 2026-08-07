import type { GameState, MistBoneFogState } from "../../types/game-state";

export function activeMistBoneFogForPlayer(
  gameState: GameState,
): MistBoneFogState | null {
  const footX = gameState.player.x + gameState.player.w / 2;
  const footY = gameState.player.y + gameState.player.h;
  let containingFog: MistBoneFogState | null = null;

  for (const fog of gameState.mistBoneFogs) {
    if (fog.kind !== "thin" || fog.life <= 0) continue;
    const dx = (footX - fog.x) / fog.radiusX;
    const dy = (footY - fog.y) / fog.radiusY;
    if (dx * dx + dy * dy <= 1 && (!containingFog || fog.life > containingFog.life)) {
      containingFog = fog;
    }
  }

  return containingFog;
}
