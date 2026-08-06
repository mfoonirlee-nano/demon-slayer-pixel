export const HIGH_PLATFORM_TREASURE_CONFIG = {
  opportunity: {
    earliestSeconds: 18,
    jitterSeconds: 8,
    maxObservedSegments: 2,
    maxArmedSeconds: 7,
    seedSalt: 10_007,
    routeSeedSalt: 12_277,
  },
  host: {
    minimumWidth: 120,
    unlockDelaySeconds: 0.6,
    claimHoldSeconds: 0.2,
    claimRadius: 56,
    beamHeight: 80,
    edgeWarningSeconds: 1.5,
  },
  reveal: {
    durationSeconds: 0.48,
  },
  dismiss: {
    durationSeconds: 0.28,
  },
  progression: {
    maxActProgressAct: 13,
  },
  amount: {
    minimumNeedScale: 0.75,
    deficitNeedScale: 0.5,
    minimumDeficitRatio: 0.08,
    minimumEffectiveRatio: 0.35,
    steppedRounding: 5,
    health: {
      earlyMaxHpRatio: 0.12,
      lateMaxHpRatioBonus: 0.06,
    },
    skillEnergy: {
      earlyCostMultiplier: 0.8,
      lateCostMultiplierBonus: 0.5,
    },
    ultimateEnergy: {
      earlyMaxRatio: 0.12,
      lateMaxRatioBonus: 0.08,
    },
    residualSpirit: {
      earlyHealCostMultiplier: 0.75,
      lateHealCostMultiplierBonus: 0.5,
    },
    runXp: {
      earlyRequirementRatio: 0.08,
      lateRequirementRatioBonus: 0.04,
      levelGapDivisor: 2,
      levelGapPaceBonus: 0.35,
    },
  },
  selection: {
    choiceCount: 3,
    needFullScaleDeficit: 0.8,
    needExponent: 1.4,
    actPressureBonus: {
      health: 0.6,
      skillEnergy: 0.25,
      ultimateEnergy: 0.35,
      residualSpirit: 0.45,
    },
    urgentState: {
      healthRatio: 0.35,
      healthMultiplier: 1.5,
      emptySkillMultiplier: 1.3,
      residualHealthRatio: 0.7,
      residualMultiplier: 1.35,
    },
    xp: {
      baseWeight: 0.75,
      progressWeight: 0.35,
      levelGapWeight: 0.6,
    },
    equipment: {
      baseWeight: 0.55,
      emptySlotWeight: 0.45,
      underbuiltSlotWeight: 0.3,
      actProgressWeight: 0.2,
      candidateNormalizationCount: 3,
      emptySlotCandidateBonus: 1,
    },
    pity: {
      maximumMisses: 5,
      resourceStep: 0.12,
      equipmentStep: 0.2,
    },
    seed: {
      actSalt: 7_919,
      serialSalt: 6_151,
    },
  },
} as const;
