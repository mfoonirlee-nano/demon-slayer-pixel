import { describe, expect, it } from "vitest";

import { BOSS_ACT_SEQUENCE } from "../../entities/bosses/registry";
import { ACT_LANDMARK_SPRITES } from "./actLandmarks";

const FIRST_ACT = 1;
const FINAL_ACT = 13;
const EXPECTED_ACTS = Array.from({ length: FINAL_ACT }, (_, index) => index + FIRST_ACT);
const EXPECTED_ACT_LANDMARKS = [
  ["spider-string", "base", "act-01-spider-string.png"],
  ["mist-bone", "base", "act-02-mist-bone.png"],
  ["mirror-dream", "base", "act-03-mirror-dream.png"],
  ["fang-gale", "base", "act-04-fang-gale.png"],
  ["lantern-ember", "base", "act-05-lantern-ember.png"],
  ["dead-bell", "base", "act-06-dead-bell.png"],
  ["spider-string", "awakened", "act-07-spider-string-awakened.png"],
  ["mist-bone", "awakened", "act-08-mist-bone-awakened.png"],
  ["mirror-dream", "awakened", "act-09-mirror-dream-awakened.png"],
  ["fang-gale", "awakened", "act-10-fang-gale-awakened.png"],
  ["lantern-ember", "awakened", "act-11-lantern-ember-awakened.png"],
  ["dead-bell", "awakened", "act-12-dead-bell-awakened.png"],
  ["blood-moon-many-faces", "final", "act-13-blood-moon-many-faces.png"],
] as const;

function filename(src: string) {
  const parts = new URL(src, "http://localhost").pathname.split("/");
  return parts[parts.length - 1];
}

describe("act landmark catalog", () => {
  it("assigns one exclusive boss landmark to each of the thirteen acts", () => {
    expect(ACT_LANDMARK_SPRITES.map((sprite) => sprite.act)).toEqual(EXPECTED_ACTS);
    expect(ACT_LANDMARK_SPRITES.map((sprite) => sprite.bossId)).toEqual(BOSS_ACT_SEQUENCE);
    expect(ACT_LANDMARK_SPRITES.map((sprite) => [
      sprite.bossId,
      sprite.form,
      filename(sprite.src),
    ])).toEqual(EXPECTED_ACT_LANDMARKS);

    expect(new Set(ACT_LANDMARK_SPRITES.map((sprite) => sprite.src)).size).toBe(FINAL_ACT);
  });

  it("keeps every landmark drawable", () => {
    expect(ACT_LANDMARK_SPRITES.every((sprite) => sprite.drawH > 0)).toBe(true);
    expect(ACT_LANDMARK_SPRITES.every((sprite) => sprite.alpha > 0 && sprite.alpha <= 1)).toBe(true);
  });
});
