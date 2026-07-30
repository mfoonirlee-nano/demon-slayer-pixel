import { afterEach, describe, expect, it, vi } from "vitest";
import { DEAD_BELL_CONFIG, GROUND_Y, WIDTH } from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { updateBoss } from "../boss";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { drawDeadBellEffects } from "./deadBellEffects";
import { spawnDeadBellBlade } from "./deadBellBehavior";

const LONG_BLADE_WARNING_FRAMES = 52;

describe("dead bell boss warnings", () => {
  afterEach(() => {
    setCanvas(null);
  });

  it("gives the player a warning window before duet reprisal becomes active", () => {
    resetState();
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.deadBell,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
      awakened: true,
    });
    boss.entering = false;
    boss.x = WIDTH - boss.w;
    boss.y = GROUND_Y - boss.h;
    boss.actionState = "cast";
    boss.skillMode = "deadBellDuet";
    boss.castTimer = 1;
    boss.skillEffectSpawned = true;
    state.boss = boss;
    state.player.x = 0;
    state.player.attackTimer = 999;

    updateBoss();
    const hpBeforeWarning = state.player.hp;
    advanceBossFrames(DEAD_BELL_CONFIG.reprisalWarningFrames);

    expect(state.player.hp).toBe(hpBeforeWarning);

    updateBoss();
    expect(state.player.hp).toBeLessThan(hpBeforeWarning);
  });

  it("keeps long-delay blade lanes visible for their entire warning", () => {
    resetState();
    const context = createContext();
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.deadBell,
      bossKills: 0,
      elapsedSeconds: 0,
      animSeed: 0,
    });
    boss.entering = false;
    boss.x = 400;
    boss.y = GROUND_Y - boss.h;
    boss.castFacing = 1;

    spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, LONG_BLADE_WARNING_FRAMES);
    drawDeadBellEffects();

    expect(context.minimumGlobalAlpha).toBeGreaterThanOrEqual(0);
    expect(context.fillRect).toHaveBeenCalledWith(
      0,
      DEAD_BELL_CONFIG.lowerBladeY - DEAD_BELL_CONFIG.bladeHitH / 2,
      WIDTH,
      DEAD_BELL_CONFIG.bladeHitH,
    );
  });
});

function advanceBossFrames(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) updateBoss();
}

function createContext() {
  let globalAlpha = 1;
  let minimumGlobalAlpha = 1;
  const context = {
    beginPath() {},
    fillRect: vi.fn(),
    lineTo() {},
    moveTo() {},
    restore() {},
    save() {},
    setLineDash() {},
    stroke() {},
    fillStyle: "",
    lineWidth: 1,
    strokeStyle: "",
    get globalAlpha() {
      return globalAlpha;
    },
    set globalAlpha(value: number) {
      globalAlpha = value;
      minimumGlobalAlpha = Math.min(minimumGlobalAlpha, value);
    },
    get minimumGlobalAlpha() {
      return minimumGlobalAlpha;
    },
  };
  return context as unknown as CanvasRenderingContext2D & {
    fillRect: ReturnType<typeof vi.fn>;
    minimumGlobalAlpha: number;
  };
}
