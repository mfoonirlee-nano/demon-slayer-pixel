import { BOSS_CONFIG, GROUND_Y, WIDTH } from "../../constants";
import type { BossArchetypeId, BossState } from "../../types/game-state";
import {
  actForBossKills,
  bossHpForEncounter,
  isAwakenedBossEncounter,
} from "../../systems/runProgression";
import { BOSS_ARCHETYPE_IDS, bossArchetypeForId, bossArchetypeForKillCount } from "./registry";

export type LiveBossState = NonNullable<BossState>;

const AWAKENED_PHASE_THRESHOLD_VALUES = {
  first: 0.75,
  second: 0.5,
  third: 0.25,
} as const;
const AWAKENED_PHASE_THRESHOLDS = Object.values(AWAKENED_PHASE_THRESHOLD_VALUES);

export type BossEncounterInput = {
  id?: BossArchetypeId;
  bossKills: number;
  elapsedSeconds: number;
  animSeed?: number;
  awakened?: boolean;
};

export function createBossEncounter(input: BossEncounterInput): LiveBossState {
  const archetype = input.id
    ? bossArchetypeForId(input.id)
    : bossArchetypeForKillCount(input.bossKills);
  const act = actForBossKills(input.bossKills);
  const hp = bossHpForEncounter(archetype, input.bossKills, input.elapsedSeconds);
  const awakened = archetype.id !== BOSS_ARCHETYPE_IDS.bloodMoon
    && (input.awakened ?? isAwakenedBossEncounter(archetype, act));

  return {
    id: archetype.id,
    x: WIDTH + BOSS_CONFIG.spawnOffsetX,
    y: GROUND_Y - archetype.yOffsetFromGround,
    w: archetype.collisionW,
    h: archetype.collisionH,
    vx: BOSS_CONFIG.entryVelocityX,
    targetX: WIDTH - BOSS_CONFIG.targetXOffset,
    entering: true,
    hpMax: hp,
    hp,
    phase: 1,
    hitCd: 0,
    aiTimer: 0,
    jumpCd: 0,
    animSeed: input.animSeed ?? Math.floor(Math.random() * BOSS_CONFIG.animSeedMax),
    actionState: "move",
    actionTimer: 0,
    facing: -1,
    skillCd: archetype.skillInitialCooldown,
    castTimer: 0,
    skillEffectSpawned: false,
    castFacing: -1,
    skillHitDone: false,
    skillMode: archetype.skillMode,
    recoveryTimer: 0,
    awakened,
    spawnedAt: input.elapsedSeconds,
  };
}

export function bossPhaseForHp(boss: LiveBossState) {
  const archetype = bossArchetypeForId(boss.id);
  const phaseThresholds = boss.awakened
    ? AWAKENED_PHASE_THRESHOLDS
    : archetype.phaseThresholds;
  const hpRatio = boss.hp / boss.hpMax;
  let phase = 1;
  for (const threshold of phaseThresholds) {
    if (hpRatio < threshold) phase += 1;
  }
  return phase;
}
