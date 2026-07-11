import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HIT_BURST_CONFIG, PARTICLE_CONFIG } from "../../constants";
import { resetState, state } from "../../game/state";
import { emitHitBurst, emitSlash, updateHitBursts, updateParticles } from "./bursts";

const PARTICLE_OVERFLOW_EMISSIONS = 4;
const HIT_BURST_OVERFLOW_EMISSIONS = 5;
const TEST_EFFECT_Y = 100;

describe("combat visual budgets", () => {
  beforeEach(() => {
    resetState();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reuses fixed particle slots while keeping the latest slash feedback", () => {
    const capacityEmissions = Math.ceil(PARTICLE_CONFIG.maxActive / PARTICLE_CONFIG.slashCount);
    const emissions = capacityEmissions + PARTICLE_OVERFLOW_EMISSIONS;
    for (let index = 0; index < capacityEmissions; index += 1) {
      emitSlash(index, TEST_EFFECT_Y, "#fff");
    }
    const particleSlots = new Set(state.particles);
    for (let index = capacityEmissions; index < emissions; index += 1) {
      emitSlash(index, TEST_EFFECT_Y, "#fff");
    }

    expect(state.particles).toHaveLength(PARTICLE_CONFIG.maxActive);
    expect(state.particles.some((particle) => particle.x === emissions - 1)).toBe(true);
    expect(state.particles.every((particle) => particleSlots.has(particle))).toBe(true);
  });

  it("reuses fixed burst slots while keeping the latest hit feedback", () => {
    const emissions = HIT_BURST_CONFIG.maxActive + HIT_BURST_OVERFLOW_EMISSIONS;
    for (let index = 0; index < HIT_BURST_CONFIG.maxActive; index += 1) {
      emitHitBurst(index, TEST_EFFECT_Y);
    }
    const burstSlots = new Set(state.hitBursts);
    const sparkSlots = new Set(state.hitBursts.flatMap((burst) => burst.sparks));
    for (let index = HIT_BURST_CONFIG.maxActive; index < emissions; index += 1) {
      emitHitBurst(index, TEST_EFFECT_Y);
    }

    expect(state.hitBursts).toHaveLength(HIT_BURST_CONFIG.maxActive);
    expect(state.hitBursts.some((burst) => burst.x === emissions - 1)).toBe(true);
    expect(state.hitBursts.every((burst) => burstSlots.has(burst))).toBe(true);
    expect(state.hitBursts.every((burst) => burst.sparks.every((spark) => sparkSlots.has(spark)))).toBe(true);
  });

  it("recycles expired particle objects before allocating replacements", () => {
    const capacityEmissions = Math.ceil(PARTICLE_CONFIG.maxActive / PARTICLE_CONFIG.slashCount);
    for (let index = 0; index < capacityEmissions; index += 1) {
      emitSlash(index, TEST_EFFECT_Y, "#fff");
    }
    const particleSlots = new Set(state.particles);
    const slashLife = PARTICLE_CONFIG.slashLifeBase + PARTICLE_CONFIG.slashLifeVariance / 2;
    for (let frame = 0; frame < slashLife; frame += 1) updateParticles();

    expect(state.particles).toHaveLength(0);
    for (let index = 0; index < capacityEmissions; index += 1) {
      emitSlash(index, TEST_EFFECT_Y, "#fff");
    }
    expect(state.particles.every((particle) => particleSlots.has(particle))).toBe(true);
  });

  it("retains spark capacity across expired bursts with different power", () => {
    const highPower = 2.2;
    const lowPower = 0.7;
    emitHitBurst(0, TEST_EFFECT_Y, "#fff", highPower);
    const burst = state.hitBursts[0];
    const highPowerSparkSlots = new Set(burst.sparks);
    const highPowerLife = Math.floor(HIT_BURST_CONFIG.baseLife + HIT_BURST_CONFIG.lifeScale * highPower);
    for (let frame = 0; frame < highPowerLife; frame += 1) updateHitBursts();

    emitHitBurst(1, TEST_EFFECT_Y, "#fff", lowPower);
    const lowPowerSparkCount = Math.floor(HIT_BURST_CONFIG.baseSparks + HIT_BURST_CONFIG.sparkScale * lowPower);
    const inactiveSpark = state.hitBursts[0].sparks[lowPowerSparkCount];
    const inactiveSparkDistance = inactiveSpark.dist;
    updateHitBursts();
    expect(inactiveSpark.dist).toBe(inactiveSparkDistance);

    const lowPowerLife = Math.floor(HIT_BURST_CONFIG.baseLife + HIT_BURST_CONFIG.lifeScale * lowPower);
    for (let frame = 1; frame < lowPowerLife; frame += 1) updateHitBursts();
    expect(state.hitBursts).toHaveLength(0);

    emitHitBurst(2, TEST_EFFECT_Y, "#fff", highPower);
    expect(state.hitBursts[0]).toBe(burst);
    expect(state.hitBursts[0].sparks.every((spark) => highPowerSparkSlots.has(spark))).toBe(true);
  });
});
