import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEAD_BELL_AWAKENED_ECHO_BELL_SHEET,
  DEAD_BELL_CONFIG,
  DEAD_BELL_RECOVER_SHEET,
  DEAD_BELL_SHEET,
  GROUND_Y,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { setCanvas } from "../../rendering/context";
import { createBossEncounter } from "./encounter";
import { BOSS_ARCHETYPE_IDS } from "./registry";
import { drawBoss, resolveBossVisualFrame } from "./renderBoss";

const originalBodyImage = DEAD_BELL_SHEET.image;
const originalEchoImage = DEAD_BELL_AWAKENED_ECHO_BELL_SHEET.image;

describe("Dead Bell body presentation", () => {
  afterEach(() => {
    resetState();
    setCanvas(null);
    DEAD_BELL_SHEET.image = originalBodyImage;
    DEAD_BELL_AWAKENED_ECHO_BELL_SHEET.image = originalEchoImage;
  });

  it("keeps casting and recovery pixels on the same ground baseline", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.deadBell,
      bossKills: 0,
      elapsedSeconds: 0,
    });
    boss.entering = false;
    boss.y = GROUND_Y - boss.h;
    boss.actionState = "cast";
    boss.skillMode = "deadBellCombo";
    boss.castTimer = DEAD_BELL_CONFIG.comboCastDuration;

    const castPose = resolveBossVisualFrame(boss, 0);
    expect(castPose.y + castPose.h).toBe(GROUND_Y);

    boss.castTimer = 0;
    boss.actionState = "recover";
    boss.recoveryTimer = DEAD_BELL_CONFIG.recoveryFrames;
    const recoveryPose = resolveBossVisualFrame(boss, 0);
    expect(recoveryPose.y + recoveryPose.h).toBe(GROUND_Y);
  });

  it("holds a dedicated vulnerable pose through the counter window", () => {
    const boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.deadBell,
      bossKills: 0,
      elapsedSeconds: 0,
      awakened: true,
    });
    boss.entering = false;
    boss.actionState = "recover";
    boss.skillMode = "deadBellDuet";
    boss.deadBellReprisalTimer = 0;

    boss.recoveryTimer = DEAD_BELL_CONFIG.counterFrames;
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: DEAD_BELL_RECOVER_SHEET,
      frame: 0,
    });

    boss.recoveryTimer = Math.floor(DEAD_BELL_CONFIG.counterFrames / 2);
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: DEAD_BELL_RECOVER_SHEET,
      frame: 1,
    });

    boss.recoveryTimer = 1;
    expect(resolveBossVisualFrame(boss, 0)).toMatchObject({
      sheet: DEAD_BELL_RECOVER_SHEET,
      frame: DEAD_BELL_RECOVER_SHEET.count - 1,
    });
  });

  it("draws a persistent second cracked bell behind the awakened body", () => {
    const context = createContext();
    const bodyImage = {} as HTMLImageElement;
    const echoImage = {} as HTMLImageElement;
    DEAD_BELL_SHEET.image = bodyImage;
    DEAD_BELL_AWAKENED_ECHO_BELL_SHEET.image = echoImage;
    setCanvas({ getContext: () => context } as unknown as HTMLCanvasElement);
    state.boss = createBossEncounter({
      id: BOSS_ARCHETYPE_IDS.deadBell,
      bossKills: 0,
      elapsedSeconds: 0,
      awakened: true,
    });
    state.boss.entering = false;
    state.boss.y = GROUND_Y - state.boss.h;
    const centerX = state.boss.x + state.boss.w / 2;
    const feetY = state.boss.y + state.boss.h;

    drawBoss();

    expect(context.drawImage).toHaveBeenCalledTimes(2);
    expect(context.drawImage.mock.calls[0][0]).toBe(echoImage);
    expect(context.drawImage.mock.calls[1][0]).toBe(bodyImage);
    expect(context.translate.mock.calls[0]).toEqual([
      centerX - state.boss.facing * DEAD_BELL_CONFIG.awakenedEchoHorizontalOffset,
      feetY
        - DEAD_BELL_CONFIG.awakenedEchoBottomOffset
        - DEAD_BELL_CONFIG.awakenedEchoDrawH / 2,
    ]);
    expect(context.scale.mock.calls[0]).toEqual([state.boss.facing, 1]);
  });
});

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
