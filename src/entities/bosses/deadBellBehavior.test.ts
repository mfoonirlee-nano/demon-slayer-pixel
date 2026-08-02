import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEAD_BELL_BLADE_SHEET,
  DEAD_BELL_CONFIG,
  GROUND_Y,
  WIDTH,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { updateBoss } from "../boss";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { drawDeadBellEffects, updateDeadBellEffects } from "./deadBellEffects";
import { spawnDeadBellBlade } from "./deadBellBehavior";

const LONG_BLADE_WARNING_FRAMES = 52;
const originalBladeImage = DEAD_BELL_BLADE_SHEET.image;

describe("dead bell boss warnings", () => {
  afterEach(() => {
    DEAD_BELL_BLADE_SHEET.image = originalBladeImage;
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

  it.each([-1, 1] as const)(
    "keeps a facing-%s blade lane harmless and stationary through its sprite warning",
    (facing) => {
      resetState();
      const context = createContext();
      const bladeImage = {} as HTMLImageElement;
      setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
      DEAD_BELL_BLADE_SHEET.image = bladeImage;
      const boss = createBossEncounter({
        id: BOSS_ARCHETYPE_IDS.deadBell,
        bossKills: 0,
        elapsedSeconds: 0,
        animSeed: 0,
      });
      boss.entering = false;
      boss.x = 400;
      boss.y = GROUND_Y - boss.h;
      boss.castFacing = facing;

      spawnDeadBellBlade(boss, DEAD_BELL_CONFIG.lowerBladeY, LONG_BLADE_WARNING_FRAMES);
      const blade = state.deadBellBlades[0];
      const startX = blade.x;
      state.player.x = blade.x;
      state.player.y = blade.y;
      const hpBeforeWarning = state.player.hp;
      drawDeadBellEffects();

      expect(context.drawImage).toHaveBeenCalledOnce();
      expect(context.drawImage.mock.calls[0][0]).toBe(bladeImage);
      expect(context.drawImage.mock.calls[0][1]).toBe(0);
      expect(context.translate).toHaveBeenCalledWith(
        blade.x + blade.w / 2,
        blade.y + blade.h / 2,
      );
      expect(context.scale).toHaveBeenCalledWith(facing, 1);

      const halfwayUpdateCount = LONG_BLADE_WARNING_FRAMES / 2 + 1;
      for (let frame = 0; frame < halfwayUpdateCount; frame += 1) {
        updateDeadBellEffects();
      }
      context.drawImage.mockClear();
      drawDeadBellEffects();

      expect(context.drawImage.mock.calls[0][1]).toBe(DEAD_BELL_BLADE_SHEET.frameW);
      for (
        let frame = halfwayUpdateCount;
        frame < LONG_BLADE_WARNING_FRAMES;
        frame += 1
      ) {
        updateDeadBellEffects();
      }

      expect(blade.delay).toBe(0);
      expect(blade.x).toBe(startX);
      expect(state.player.hp).toBe(hpBeforeWarning);
      expect(state.deadBellBlades).toContain(blade);

      updateDeadBellEffects();

      expect(blade.x).toBe(startX + blade.vx);
      expect(state.player.hp).toBeLessThan(hpBeforeWarning);
      expect(state.deadBellBlades).not.toContain(blade);
    },
  );
});

function advanceBossFrames(frames: number) {
  for (let frame = 0; frame < frames; frame += 1) updateBoss();
}

function createContext() {
  return {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    filter: "none",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: false,
  } as unknown as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
    scale: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
  };
}
