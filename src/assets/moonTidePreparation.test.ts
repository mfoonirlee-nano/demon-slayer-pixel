import { afterEach, expect, it, vi } from "vitest";
import { FALL_ATTACK, GROUND_Y, MOON_TIDE_PLAYER_SHEETS, PLAYER_ANIMATION_STATES, PLAYER_COMBAT, PLAYER_FALL_ATTACK_VISUAL, SKILLS } from "../constants";
import { resetState, state } from "../game/state";
import { drawPlayer } from "../entities/players/render";
import { drawUltimatePlayerGhosts } from "../entities/particles/ultimateEffects";
import { moonTideJumpMultiplier, moonTidePlayerAnimationFrameSpeed } from "../entities/players/moonTide";
import { playerSkillCastFrames } from "../entities/players/skillCasting";
import { setCanvas } from "../rendering/context";
import { loadSprites } from "./index";

vi.mock("../game/utils", async (importOriginal) => ({
  ...await importOriginal<typeof import("../game/utils")>(),
  loadImage: vi.fn(async () => ({} as HTMLImageElement)),
}));

const FPS = 60;
const GHOST_RECORD_TIMER = 180;
const MAX_PREPARED_RGBA_BYTES = 67108864;
const RGBA_BYTES_PER_PIXEL = 4;
const MAX_ULTIMATE_LEVEL = 3;
const JUMP_ASCENDING_RATIO = -0.5;
const JUMP_EARLY_DESCENT_RATIO = 0.4;
const JUMP_LATE_DESCENT_RATIO = 0.7;
const JUMP_VELOCITY_RATIOS = [-1, JUMP_ASCENDING_RATIO, 0, JUMP_EARLY_DESCENT_RATIO, JUMP_LATE_DESCENT_RATIO, 1];

function context() {
  const stack: { filter: string; globalAlpha: number; globalCompositeOperation: string }[] = [];
  const result = {
    filter: "none", globalAlpha: 1, globalCompositeOperation: "source-over",
    drawImage() {}, fillRect() {}, translate() {}, scale() {},
    save() { stack.push({ filter: result.filter, globalAlpha: result.globalAlpha, globalCompositeOperation: result.globalCompositeOperation }); },
    restore() { Object.assign(result, stack.pop()); },
  };
  return result;
}

afterEach(() => {
  resetState();
  setCanvas(null);
  vi.unstubAllGlobals();
});

it("finishes first-use moon-tide filter work before sprites become ready", async () => {
  const createCanvas = vi.fn(() => ({ width: 0, height: 0, getContext: () => context() }));
  vi.stubGlobal("document", { createElement: createCanvas });
  setCanvas({ getContext: () => context() } as unknown as HTMLCanvasElement);
  await loadSprites();
  expect(state.spritesReady).toBe(true);
  const preparedBytes = createCanvas.mock.results.reduce((total, { value }) => (
    total + value.width * value.height * RGBA_BYTES_PER_PIXEL
  ), 0);
  expect(preparedBytes).toBeGreaterThan(0);
  expect(preparedBytes).toBeLessThan(MAX_PREPARED_RGBA_BYTES);
  createCanvas.mockClear();
  for (const level of [1, 2, MAX_ULTIMATE_LEVEL] as const) {
    resetState();
    state.player.ultimateLevel = level;
    state.player.ultimateTimer = GHOST_RECORD_TIMER;
    for (const animation of Object.values(PLAYER_ANIMATION_STATES)) {
      const sheet = MOON_TIDE_PLAYER_SHEETS[animation];
      for (let frame = 0; frame < sheet.count; frame += 1) {
        const p = state.player;
        p.y = GROUND_Y - p.h;
        p.vx = 0;
        p.fallAttackTimer = 0;
        p.fallAttackRecoveryTimer = 0;
        state.elapsed = (frame + 0.5) * moonTidePlayerAnimationFrameSpeed("idle", sheet.animSpeed) / FPS;
        p.attackDuration = sheet.count;
        p.attackFromRun = animation === PLAYER_ANIMATION_STATES.movingAttack;
        p.attackTimer = animation === PLAYER_ANIMATION_STATES.attack || p.attackFromRun ? sheet.count - frame : 0;
        if (animation === PLAYER_ANIMATION_STATES.run) {
          p.vx = PLAYER_COMBAT.movementIdleThreshold + 1;
          p.runStepDistance = (frame + 0.5) * PLAYER_COMBAT.runAnimationCycleDistance / sheet.count;
        } else if (animation === PLAYER_ANIMATION_STATES.jump) {
          p.y -= 1;
          p.vy = JUMP_VELOCITY_RATIOS[frame] * p.jump * moonTideJumpMultiplier();
        } else if (animation === PLAYER_ANIMATION_STATES.fallAttack) {
          const airFrames = PLAYER_FALL_ATTACK_VISUAL.moonTideAirFrameCount;
          if (frame < airFrames) p.fallAttackTimer = frame * sheet.animSpeed + 1;
          else p.fallAttackRecoveryTimer = FALL_ATTACK.recoveryFrames
            * (1 - (frame - airFrames + 0.5) / (sheet.count - airFrames));
        }
        state.ultimatePlayerGhosts.length = 0;
        drawPlayer();
        expect(state.ultimatePlayerGhosts[0]).toMatchObject({ animationState: animation, frame });
        drawUltimatePlayerGhosts();
      }
    }
    state.player.fallAttackTimer = 0;
    state.player.fallAttackRecoveryTimer = 0;
    for (const skill of SKILLS.filter((skill) => skill.implemented)) {
      state.player.skillIndex = 0;
      state.player.equippedSkillIds[0] = skill.id;
      for (let timer = playerSkillCastFrames(skill); timer > 0; timer -= 1) {
        state.player.skillTimer = timer;
        state.ultimatePlayerGhosts.length = 0;
        drawPlayer();
        expect(state.ultimatePlayerGhosts[0]).toMatchObject({ source: "skill", skillId: skill.id });
        drawUltimatePlayerGhosts();
      }
    }
  }
  await loadSprites();
  expect(createCanvas.mock.calls.length).toBe(0);
});
