import { describe, expect, it } from "vitest";

import { ACT_OCCLUDER_SPRITES } from "./actOccluders";

const FINAL_ACT = 13;
const ACTS = Array.from({ length: FINAL_ACT }, (_, index) => index + 1);

describe("act occluder catalog", () => {
  it("assigns one boss-themed environment prop to every act", () => {
    const themedSprites = ACT_OCCLUDER_SPRITES.filter((sprite) => sprite.kind === "themed");

    for (const act of ACTS) {
      expect(themedSprites.filter((sprite) => sprite.acts.includes(act))).toHaveLength(1);
    }

    expect(ACTS.map((act) => (
      themedSprites.find((sprite) => sprite.acts.includes(act))?.id
    ))).toEqual([
      "spider-string-webbed-cedar",
      "mist-bone-bamboo-thicket",
      "mirror-dream-shard-outcrop",
      "fang-gale-windbent-pine",
      "lantern-ember-charred-cedar",
      "dead-bell-weeping-tree",
      "spider-string-webbed-cedar",
      "mist-bone-bamboo-thicket",
      "mirror-dream-shard-outcrop",
      "fang-gale-windbent-pine",
      "lantern-ember-charred-cedar",
      "dead-bell-weeping-tree",
      "blood-moon-mask-banyan",
    ]);
  });

  it("keeps the general bamboo and rock cluster available in every act", () => {
    const genericSprites = ACT_OCCLUDER_SPRITES.filter((sprite) => sprite.kind === "generic");

    expect(genericSprites).toHaveLength(1);
    expect(genericSprites[0].id).toBe("moon-bamboo-rock-cluster");
    expect(genericSprites[0].acts).toEqual(ACTS);
  });

  it("uses opaque native-resolution sources for enemy cover", () => {
    expect(ACT_OCCLUDER_SPRITES.every((sprite) => sprite.alpha === 1)).toBe(true);
    expect(ACT_OCCLUDER_SPRITES.every((sprite) => sprite.sourceH >= sprite.drawH)).toBe(true);
    expect(new Set(ACT_OCCLUDER_SPRITES.map((sprite) => sprite.src)).size).toBe(
      ACT_OCCLUDER_SPRITES.length,
    );
  });
});
