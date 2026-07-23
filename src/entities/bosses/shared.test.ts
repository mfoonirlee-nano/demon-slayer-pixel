import { describe, expect, it } from "vitest";
import { resetState, state } from "../../game/state";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { damagePlayerOnContact } from "./shared";

const PLAYER_HP_AFTER_SCALED_CONTACT_DAMAGE = 79;

describe("boss damage", () => {
  it("increases boss contact damage by half", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.spiderString,
      bossKills: 0,
      elapsedSeconds: 0,
    });
    boss.x = state.player.x;

    damagePlayerOnContact(boss);

    expect(state.player.hp).toBe(PLAYER_HP_AFTER_SCALED_CONTACT_DAMAGE);
  });
});
