import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BINDER_TALISMAN_SHEET,
  BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET,
  BINDER_TALISMAN_STUN_EFFECT_SHEET,
  MOON_TIDE_PLAYER_SHEETS,
  PLAYER_ANIMATION_STATES,
  PLAYER_COMBAT,
  PLAYER_DRAW,
  PLAYER_SHEETS,
  SKILL_IDS,
  ULTIMATE_SKILL_SHEET,
} from "../../constants";
import { resetState, state } from "../../game/state";
import { onGround } from "../../game/utils";
import { setCanvas } from "../../rendering/context";
import { tryJump, updatePlayer } from "../player";
import { drawPlayer } from "./render";

type MockCanvasContext = CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
};

const BINDER_ATTACHMENT_BACK_OFFSET_RATIO = 0.24;
const BINDER_ATTACHMENT_CENTER_Y_RATIO = 0.55;
const BINDER_KEY_SCRAMBLE_HOVER_Y_OFFSET = 18;
const EXPECTED_ULTIMATE_CAST_FRAME_DURATION = 5;
const MAX_TEST_AIR_FRAMES = 100;
const TEST_FRAMES_PER_SECOND = 60;
const ATTACK_LAYOUT = {
  frameW: 768, frameH: 512, count: 16, lastFrame: 15, sourceArgEnd: 5,
  sourceDensity: 3.2, feetX: 320, feetY: 450, baselineInsetY: 12, bodyW: 256, bodyH: 340,
};
const TEST_IMAGE = {} as HTMLImageElement;
const RUN_IMAGE = {} as HTMLImageElement;
const ATTACK_IMAGE = {} as HTMLImageElement;
const MOVING_ATTACK_IMAGE = {} as HTMLImageElement;
const JUMP_IMAGE = {} as HTMLImageElement;
const FALL_ATTACK_IMAGE = {} as HTMLImageElement;
const MOON_TIDE_IMAGES: Record<keyof typeof MOON_TIDE_PLAYER_SHEETS, HTMLImageElement> = {
  [PLAYER_ANIMATION_STATES.idle]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.run]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.jump]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.attack]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.movingAttack]: {} as HTMLImageElement,
  [PLAYER_ANIMATION_STATES.fallAttack]: {} as HTMLImageElement,
};

function createMockContext(): MockCanvasContext {
  const context = {
    drawImage: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    globalAlpha: 1,
  } as unknown as MockCanvasContext;

  Object.defineProperty(context, "filter", {
    get: () => "none",
    set: vi.fn(),
  });

  return context;
}

function installMockContext(context: CanvasRenderingContext2D) {
  setCanvas({
    getContext: () => context,
  } as unknown as HTMLCanvasElement);
}

describe("player render", () => {
  beforeEach(() => {
    resetState();
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = TEST_IMAGE;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.run].image = RUN_IMAGE;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.attack].image = ATTACK_IMAGE;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.movingAttack].image = MOVING_ATTACK_IMAGE;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.jump].image = JUMP_IMAGE;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.fallAttack].image = FALL_ATTACK_IMAGE;
    for (const stateName of Object.values(PLAYER_ANIMATION_STATES)) {
      MOON_TIDE_PLAYER_SHEETS[stateName].image = MOON_TIDE_IMAGES[stateName];
    }
    BINDER_TALISMAN_SHEET.image = TEST_IMAGE;
    BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET.image = TEST_IMAGE;
    BINDER_TALISMAN_STUN_EFFECT_SHEET.image = TEST_IMAGE;
    ULTIMATE_SKILL_SHEET.image = TEST_IMAGE;
  });

  afterEach(() => {
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle].image = null;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.run].image = null;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.attack].image = null;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.movingAttack].image = null;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.jump].image = null;
    PLAYER_SHEETS[PLAYER_ANIMATION_STATES.fallAttack].image = null;
    for (const sheet of Object.values(MOON_TIDE_PLAYER_SHEETS)) {
      sheet.image = null;
    }
    BINDER_TALISMAN_SHEET.image = null;
    BINDER_TALISMAN_KEY_SCRAMBLE_EFFECT_SHEET.image = null;
    BINDER_TALISMAN_STUN_EFFECT_SHEET.image = null;
    ULTIMATE_SKILL_SHEET.image = null;
    setCanvas(null);
    vi.restoreAllMocks();
  });

  it.each([
    { facing: 1, direction: -1 },
    { facing: -1, direction: 1 },
  ])("draws binder talisman on the visual back and key scramble above the head when facing $facing", ({ facing, direction }) => {
    const context = createMockContext();
    installMockContext(context);
    state.player.facing = facing;
    state.player.binderTalismanKeyScrambleTimer = 30;

    drawPlayer();

    const talismanTranslate = context.translate.mock.calls[1];
    expect(talismanTranslate).toBeDefined();
    const [talismanCenterX, talismanCenterY] = talismanTranslate;
    const idleSheet = PLAYER_SHEETS[PLAYER_ANIMATION_STATES.idle];
    const playerCenterX = state.player.x + state.player.w / 2;
    const playerRefY = state.player.y + state.player.h - PLAYER_DRAW.yOffset;
    const playerSpriteTop = playerRefY - idleSheet.drawH * (idleSheet.anchorY ?? 1);

    expect(talismanCenterX).toBeCloseTo(
      playerCenterX + direction * idleSheet.drawW * BINDER_ATTACHMENT_BACK_OFFSET_RATIO,
    );
    expect(talismanCenterY).toBeCloseTo(
      playerSpriteTop + idleSheet.drawH * BINDER_ATTACHMENT_CENTER_Y_RATIO,
    );

    const keyScrambleTranslate = context.translate.mock.calls[2];
    expect(keyScrambleTranslate).toBeDefined();
    expect(keyScrambleTranslate[0]).toBeCloseTo(playerCenterX);
    expect(keyScrambleTranslate[1]).toBeCloseTo(playerSpriteTop - BINDER_KEY_SCRAMBLE_HOVER_Y_OFFSET);
  });

  it.each([1, -1])("aligns the off-center attack feet and body attachments facing %s", (facing) => {
    const context = createMockContext();
    installMockContext(context);
    state.player.facing = facing;
    state.player.attackDuration = 18;
    state.player.attackTimer = 1;
    state.player.attackFromRun = false;
    state.player.binderTalismanKeyScrambleTimer = 30;

    drawPlayer();

    const draw = context.drawImage.mock.calls[0];
    expect(draw.slice(0, ATTACK_LAYOUT.sourceArgEnd)).toEqual([
      ATTACK_IMAGE, ATTACK_LAYOUT.lastFrame * ATTACK_LAYOUT.frameW,
      0, ATTACK_LAYOUT.frameW, ATTACK_LAYOUT.frameH,
    ]);
    expect(draw[7] / ATTACK_LAYOUT.frameW).toBeCloseTo(1 / ATTACK_LAYOUT.sourceDensity);
    expect(draw[8] / ATTACK_LAYOUT.frameH).toBeCloseTo(1 / ATTACK_LAYOUT.sourceDensity);
    const centerX = state.player.x + state.player.w / 2;
    const refY = state.player.y + state.player.h - PLAYER_DRAW.yOffset;
    const [drawnCenterX, drawnCenterY] = context.translate.mock.calls[0];
    expect(drawnCenterX + facing * (draw[5] + ATTACK_LAYOUT.feetX / ATTACK_LAYOUT.sourceDensity)).toBeCloseTo(centerX);
    const visibleFeetY = refY - ATTACK_LAYOUT.baselineInsetY / ATTACK_LAYOUT.sourceDensity;
    expect(drawnCenterY + draw[6] + ATTACK_LAYOUT.feetY / ATTACK_LAYOUT.sourceDensity).toBeCloseTo(visibleFeetY);
    const bodyW = ATTACK_LAYOUT.bodyW / ATTACK_LAYOUT.sourceDensity;
    const bodyH = ATTACK_LAYOUT.bodyH / ATTACK_LAYOUT.sourceDensity;
    const bodyTop = visibleFeetY - bodyH;
    const [talismanX, talismanY] = context.translate.mock.calls[1];
    expect(talismanX).toBeCloseTo(centerX - facing * bodyW * BINDER_ATTACHMENT_BACK_OFFSET_RATIO);
    expect(talismanY).toBeCloseTo(bodyTop + bodyH * BINDER_ATTACHMENT_CENTER_Y_RATIO);
    const [statusX, statusY] = context.translate.mock.calls[2];
    expect(statusX).toBeCloseTo(centerX);
    expect(statusY).toBeCloseTo(bodyTop - BINDER_KEY_SCRAMBLE_HOVER_Y_OFFSET);
  });

  it("plays all sixteen stationary attack sprites within the normal attack duration", () => {
    const context = createMockContext();
    installMockContext(context);
    state.player.attackFromRun = false;
    const seenFrames = new Set<number>();
    for (let remaining = state.player.attackDuration; remaining > 0; remaining -= 1) {
      state.player.attackTimer = remaining;
      context.drawImage.mockClear();
      drawPlayer();
      const draw = context.drawImage.mock.calls[0];
      expect(draw[0]).toBe(ATTACK_IMAGE);
      seenFrames.add(draw[1] / ATTACK_LAYOUT.frameW);
    }
    expect([...seenFrames]).toEqual(Array.from({ length: ATTACK_LAYOUT.count }, (_, index) => index));
  });

  it("draws stun attachment effects from the talisman center", () => {
    const context = createMockContext();
    installMockContext(context);
    state.player.binderTalismanStunStatusTimer = 30;

    drawPlayer();

    expect(context.translate.mock.calls[2]).toEqual(context.translate.mock.calls[1]);
  });

  it("holds each ultimate cast sprite for five game frames before advancing", () => {
    const context = createMockContext();
    installMockContext(context);
    expect(PLAYER_COMBAT.ultimateCastFrames).toBe(
      ULTIMATE_SKILL_SHEET.count * EXPECTED_ULTIMATE_CAST_FRAME_DURATION,
    );

    state.player.ultimateCastTimer = PLAYER_COMBAT.ultimateCastFrames
      - EXPECTED_ULTIMATE_CAST_FRAME_DURATION
      + 1;
    drawPlayer();
    expect(context.drawImage.mock.calls[0]?.[1]).toBe(0);

    context.drawImage.mockClear();
    state.player.ultimateCastTimer -= 1;
    drawPlayer();
    expect(context.drawImage.mock.calls[0]?.[1]).toBe(ULTIMATE_SKILL_SHEET.frameW);
  });

  it.each([
    { moonTide: false, startTime: 0 },
    { moonTide: false, startTime: 137 },
    { moonTide: true, startTime: 11 },
    { moonTide: true, startTime: 251 },
  ])("follows a whole jump without looping poses (Moon Tide: $moonTide, clock: $startTime)", ({ moonTide, startTime }) => {
    const context = createMockContext();
    installMockContext(context);
    state.elapsed = startTime;
    if (moonTide) {
      state.player.ultimateLevel = 1;
      state.player.ultimateTimer = 1000;
    }
    const sheet = moonTide ? MOON_TIDE_PLAYER_SHEETS.jump : PLAYER_SHEETS.jump;
    const poses: number[] = [];

    tryJump();
    for (let tick = 0; tick < MAX_TEST_AIR_FRAMES; tick += 1) {
      updatePlayer();
      state.elapsed += 1 / TEST_FRAMES_PER_SECOND;
      if (onGround(state.player, state.player.onPlatform)) break;
      context.drawImage.mockClear();
      const position = { y: state.player.y, vy: state.player.vy };
      drawPlayer();
      const draw = context.drawImage.mock.calls.find(([image]) => image === sheet.image);
      expect(draw).toBeDefined();
      poses.push(Number(draw?.[1]) / sheet.frameW);
      expect(state.player).toMatchObject(position);
    }

    expect(poses[0]).toBe(0);
    expect([...new Set(poses)]).toEqual(Array.from({ length: sheet.count }, (_, frame) => frame));
    expect(poses).toEqual([...poses].sort((a, b) => a - b));
    expect(onGround(state.player, state.player.onPlatform)).toBe(true);
  });

  it("restarts the rising pose when a second jump interrupts descent", () => {
    const context = createMockContext();
    installMockContext(context);
    state.player.skillLevels[SKILL_IDS.vortexControl] = 3;
    state.player.equippedSkillIds[2] = SKILL_IDS.vortexControl;
    tryJump();
    do {
      updatePlayer();
    } while (state.player.vy < state.player.jump / 2);
    drawPlayer();
    expect(context.drawImage.mock.calls[0]?.[1]).toBeGreaterThan(0);

    tryJump();
    updatePlayer();
    context.drawImage.mockClear();
    drawPlayer();

    expect(context.drawImage.mock.calls[0]?.[0]).toBe(JUMP_IMAGE);
    expect(context.drawImage.mock.calls[0]?.[1]).toBe(0);
  });

  it.each([
    { moonTide: false, lastAirPose: 3, firstGroundPose: 4 },
    { moonTide: true, lastAirPose: 4, firstGroundPose: 5 },
  ])("keeps ground splash poses out of a long dive (Moon Tide: $moonTide)", ({ moonTide, lastAirPose, firstGroundPose }) => {
    const context = createMockContext();
    installMockContext(context);
    state.player.y -= 1000;
    state.player.fallAttackTimer = 1;
    if (moonTide) {
      state.player.ultimateLevel = 1;
      state.player.ultimateTimer = 1000;
    }
    const sheet = moonTide ? MOON_TIDE_PLAYER_SHEETS.fallAttack : PLAYER_SHEETS.fallAttack;
    const airbornePoses: number[] = [];
    for (let tick = 0; tick < MAX_TEST_AIR_FRAMES; tick += 1) {
      updatePlayer();
      context.drawImage.mockClear();
      // Landing grants blinking immunity; inspect the underlying landing pose.
      state.player.invincible = 0;
      drawPlayer();
      const draw = context.drawImage.mock.calls.find(([image]) => image === sheet.image);
      expect(draw).toBeDefined();
      const pose = Number(draw?.[1]) / sheet.frameW;
      if (state.player.fallAttackTimer === 0) {
        expect(pose).toBe(firstGroundPose);
        break;
      }
      airbornePoses.push(pose);
    }
    expect(airbornePoses.length).toBeGreaterThan(sheet.animSpeed * lastAirPose);
    expect(Math.max(...airbornePoses)).toBe(lastAirPose);
    expect(state.player.fallAttackRecoveryTimer).toBeGreaterThan(0);
    expect(onGround(state.player, state.player.onPlatform)).toBe(true);
  });

  it("renders a running basic attack from the movement-specific sheet", () => {
    const context = createMockContext();
    installMockContext(context);
    state.player.attackFromRun = true;
    state.player.attackTimer = state.player.attackDuration;

    drawPlayer();

    expect(context.drawImage.mock.calls[0]?.[0]).toBe(MOVING_ATTACK_IMAGE);
  });

  it.each([
    {
      stateName: PLAYER_ANIMATION_STATES.idle,
      configure: () => {},
    },
    {
      stateName: PLAYER_ANIMATION_STATES.run,
      configure: () => {
        state.player.vx = state.player.speed;
      },
    },
    {
      stateName: PLAYER_ANIMATION_STATES.jump,
      configure: () => {
        state.player.y -= 100;
      },
    },
    {
      stateName: PLAYER_ANIMATION_STATES.attack,
      configure: () => {
        state.player.attackTimer = state.player.attackDuration;
      },
    },
    {
      stateName: PLAYER_ANIMATION_STATES.movingAttack,
      configure: () => {
        state.player.attackFromRun = true;
        state.player.attackTimer = state.player.attackDuration;
      },
    },
    {
      stateName: PLAYER_ANIMATION_STATES.fallAttack,
      configure: () => {
        state.player.y -= 100;
        state.player.fallAttackTimer = 1;
      },
    },
  ])("renders the $stateName-specific Moon Tide sheet during the active buff", ({ stateName, configure }) => {
    const context = createMockContext();
    installMockContext(context);
    state.player.ultimateLevel = 1;
    state.player.ultimateTimer = 30;
    configure();

    drawPlayer();

    expect(context.drawImage.mock.calls[0]?.[0]).toBe(MOON_TIDE_IMAGES[stateName]);
  });

  it("locks the run frame to traveled distance instead of global elapsed", () => {
    const context = createMockContext();
    installMockContext(context);
    const runSheet = PLAYER_SHEETS[PLAYER_ANIMATION_STATES.run];
    const expectedFrame = 3;
    state.elapsed = 99;
    state.player.vx = state.player.speed;
    state.player.runStepDistance = PLAYER_COMBAT.runAnimationCycleDistance * expectedFrame / runSheet.count;

    drawPlayer();

    expect(context.drawImage.mock.calls[0]?.[0]).toBe(RUN_IMAGE);
    expect(context.drawImage.mock.calls[0]?.[1]).toBe(runSheet.frameW * expectedFrame);
  });
});
