/* eslint-disable no-magic-numbers */
import { loadConfiguration, numericProperty } from "./sprite-audit-catalog.mjs";

const assets = loadConfiguration("src/constants/assets.ts");
const combat = loadConfiguration("src/constants/combat.ts");
const { BOSS_ARCHETYPES } = loadConfiguration("src/entities/bosses/registry.ts");

// These are draw formulas from the renderers, not gameplay/collision dimensions.
export function runtimeLayout(actor, sheet) {
  if (actor.category === "player") {
    if (sheet.state === "ultimateCast") {
      return layout(sheet.frameW * combat.PLAYER_COMBAT.ultimateDrawScale,
        sheet.frameH * combat.PLAYER_COMBAT.ultimateDrawScale, 0.5, 0.83);
    }
    return layout(sheet.drawW ?? sheet.frameW * sheet.drawScale,
      sheet.drawH ?? sheet.frameH * sheet.drawScale, sheet.anchorX ?? 0.5, sheet.anchorY ?? 1);
  }
  if (actor.category === "enemy") {
    const filename = `src/entities/enemies/${actor.id}.ts`;
    const config = `${actor.id.toUpperCase()}_CONFIG`;
    const property = actor.id === "splitter" ? (sheet.proxy ? "childDrawScale" : "parentDrawScale") : "drawScale";
    let scale = assets.ENEMY_DRAW_SCALE * numericProperty(filename, config, property, 1);
    if (actor.id === "brute") scale *= numericProperty(filename, "BRUTE_PHASE_DRAW_SCALE", sheet.state, 1);
    if (actor.id === "runner" && sheet.state === "dash") {
      scale *= numericProperty(filename, config, "dashDrawScaleMultiplier", 1);
    }
    return layout(Math.round(sheet.frameW * scale), Math.round(sheet.frameH * scale));
  }
  const boss = BOSS_ARCHETYPES[actor.id];
  if (actor.id === "fang-gale" && sheet.state === "finalBite") {
    const { FANG_GALE_CONFIG } = loadConfiguration("src/constants/bossTuning.ts");
    return layout(boss.castDrawW * FANG_GALE_CONFIG.finalBiteDrawScale,
      boss.castDrawH * FANG_GALE_CONFIG.finalBiteDrawScale, 0.5,
      1 - boss.castBottomPadding / boss.castDrawH);
  }
  if (actor.id === "blood-moon-many-faces") {
    if (sheet.state === "death") {
      return layout(boss.drawH * sheet.frameW / sheet.frameH, boss.drawH);
    }
    if (!sheet.primary) {
      const scale = assets.BLOOD_MOON_BODY_DRAW_SCALES[sheet.src] ?? 1;
      return layout(boss.castDrawW * scale, boss.castDrawH * scale, 0.5,
        1 - boss.castBottomPadding / boss.castDrawH);
    }
  }
  if (sheet.state === "death") {
    // Reserved sheets have no live death renderer; compare against the move body.
    return { ...layout(boss.drawW, boss.drawH), referenceOnly: true };
  }
  if (sheet.primary || sheet.state === "awakened:move") return layout(boss.drawW, boss.drawH);
  if (sheet.state === "afterimage") {
    const config = assets.MIRROR_DREAM_CONFIG;
    return layout(config.afterimageDrawW * combat.BOSS_CONFIG.bodyDrawScale,
      config.afterimageDrawH * combat.BOSS_CONFIG.bodyDrawScale, 0.5,
      1 - config.afterimageBottomPadding / config.afterimageDrawH);
  }
  if (sheet.state === "nightmare") {
    return layout(assets.MIRROR_DREAM_CONFIG.nightmareCastDrawW, assets.MIRROR_DREAM_CONFIG.nightmareCastDrawH, 0.5, 0.5);
  }
  if (actor.id === "spider-string" && sheet.state === "attack") {
    const config = assets.SPIDER_STRING_ATTACK_CONFIG;
    return layout(config.drawW, config.drawH, 0.5, 1 - config.drawBottomPadding / config.drawH);
  }
  if (actor.id === "spider-string" && sheet.state === "pillarCast") {
    const config = assets.SPIDER_STRING_PILLAR_CONFIG;
    return layout(config.castDrawW, config.castDrawH, 0.5, 1 - config.castDrawBottomPadding / config.castDrawH);
  }
  if (actor.id === "spider-string" && sheet.state === "ultimateCast") {
    const config = assets.SPIDER_STRING_CAGE_CONFIG;
    return layout(config.castDrawW, config.castDrawH, 0.5, 1 - config.castDrawBottomPadding / config.castDrawH);
  }
  return layout(boss.castDrawW, boss.castDrawH, 0.5, 1 - boss.castBottomPadding / boss.castDrawH);
}

function layout(drawW, drawH, anchorX = 0.5, anchorY = 1) {
  return { drawW, drawH, anchorX, anchorY };
}
