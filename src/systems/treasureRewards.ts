import {
  HIGH_PLATFORM_TREASURE_CONFIG,
  RESIDUAL_SPIRIT_CONFIG,
  RUN_LEVEL_PACING,
} from "../constants";
import type {
  GameState,
  TreasureChoiceGenerationState,
  TreasureChoiceState,
  TreasureEquipmentChoiceState,
  TreasurePityState,
  TreasureResourceChoiceState,
  TreasureRewardKind,
  EquipmentSlot,
} from "../types/game-state";
import { clamp, seededRandom, weightedRandomPick } from "../game/utils";
import {
  addEquipmentToInventory,
  createTreasureEquipmentChoices,
  equipEquipment,
  equipmentSkillEnergyCost,
  grantSkillEnergy,
  grantUltimateEnergy,
  previewUltimateEnergyGain,
} from "./equipment";
import {
  compareEquipmentTiers,
  equipmentInventoryTier,
  equipmentTierForState,
} from "./equipmentState";
import { EQUIPMENT_SLOTS } from "./equipmentTuning";
import { selectedSkill } from "./loadout";
import {
  grantNonBossRunXp,
  nonBossRunXpHeadroom,
  xpToNextLevel,
} from "./progression";
import { storeResidualSpirit } from "./residualSpirit";

export type TreasureRewardPreview = {
  choice: TreasureResourceChoiceState;
  nominalAmount: number;
  deficit?: number;
  headroomRatio?: number;
  levelGap?: number;
};

export type TreasureRewardPreviewContext = {
  act: number;
  isPastActMidpoint: boolean;
};

const SMOOTHSTEP_COEFFICIENT = 3;

function roundToStep(value: number) {
  const step = HIGH_PLATFORM_TREASURE_CONFIG.amount.steppedRounding;
  return Math.round(value / step) * step;
}

function actProgress(act: number) {
  return clamp(
    (act - 1) / (HIGH_PLATFORM_TREASURE_CONFIG.progression.maxActProgressAct - 1),
    0,
    1,
  );
}

function resourceNeedScale(current: number, maximum: number) {
  const deficit = clamp((maximum - current) / maximum, 0, 1);
  return {
    deficit,
    scale: HIGH_PLATFORM_TREASURE_CONFIG.amount.minimumNeedScale
      + HIGH_PLATFORM_TREASURE_CONFIG.amount.deficitNeedScale * deficit,
  };
}

function resourcePreview(
  kind: Exclude<TreasureResourceChoiceState["kind"], "runXp">,
  before: number,
  maximum: number,
  nominalAmount: number,
  effectiveAmount = nominalAmount,
): TreasureRewardPreview | null {
  const { deficit } = resourceNeedScale(before, maximum);
  const amount = Math.min(Math.max(0, maximum - before), effectiveAmount);
  if (deficit <= HIGH_PLATFORM_TREASURE_CONFIG.amount.minimumDeficitRatio) return null;
  if (nominalAmount <= 0) return null;
  if (amount / nominalAmount < HIGH_PLATFORM_TREASURE_CONFIG.amount.minimumEffectiveRatio) return null;

  return {
    choice: {
      id: `treasure-${kind}`,
      kind,
      amount,
      nominalAmount,
      before,
      after: before + amount,
    },
    nominalAmount,
    deficit,
  };
}

export function previewTreasureRewards(
  state: GameState,
  context: TreasureRewardPreviewContext,
): TreasureRewardPreview[] {
  const player = state.player;
  const progress = actProgress(context.act);
  const healthNeed = resourceNeedScale(player.hp, player.maxHp);
  const healthNominal = Math.ceil(
    player.maxHp
    * (
      HIGH_PLATFORM_TREASURE_CONFIG.amount.health.earlyMaxHpRatio
      + HIGH_PLATFORM_TREASURE_CONFIG.amount.health.lateMaxHpRatioBonus * progress
    )
    * healthNeed.scale,
  );
  const skillNeed = resourceNeedScale(player.skillEnergy, player.skillEnergyMax);
  const skillCost = selectedSkill(state)?.energyCost ?? equipmentSkillEnergyCost(state);
  const skillNominal = roundToStep(
    skillCost
    * (
      HIGH_PLATFORM_TREASURE_CONFIG.amount.skillEnergy.earlyCostMultiplier
      + HIGH_PLATFORM_TREASURE_CONFIG.amount.skillEnergy.lateCostMultiplierBonus * progress
    )
    * skillNeed.scale,
  );
  const ultimateNeed = resourceNeedScale(player.ultimateEnergy, player.ultimateEnergyMax);
  const ultimateNominal = roundToStep(
    player.ultimateEnergyMax
    * (
      HIGH_PLATFORM_TREASURE_CONFIG.amount.ultimateEnergy.earlyMaxRatio
      + HIGH_PLATFORM_TREASURE_CONFIG.amount.ultimateEnergy.lateMaxRatioBonus * progress
    )
    * ultimateNeed.scale,
  );
  const residualNeed = resourceNeedScale(
    player.residualSpirit,
    RESIDUAL_SPIRIT_CONFIG.maxStored,
  );
  const residualNominal = roundToStep(
    RESIDUAL_SPIRIT_CONFIG.healCost
    * (
      HIGH_PLATFORM_TREASURE_CONFIG.amount.residualSpirit.earlyHealCostMultiplier
      + HIGH_PLATFORM_TREASURE_CONFIG.amount.residualSpirit.lateHealCostMultiplierBonus * progress
    )
    * residualNeed.scale,
  );
  const expectedActStartLevel = RUN_LEVEL_PACING.initialLevel
    + (context.act - 1) * RUN_LEVEL_PACING.levelsPerAct;
  const expectedLevel = expectedActStartLevel + (context.isPastActMidpoint ? 1 : 0);
  const levelGap = clamp(
    (expectedLevel - player.runLevel)
      / HIGH_PLATFORM_TREASURE_CONFIG.amount.runXp.levelGapDivisor,
    0,
    1,
  );
  const paceScale = 1
    + HIGH_PLATFORM_TREASURE_CONFIG.amount.runXp.levelGapPaceBonus * levelGap;
  const xpNominal = Math.ceil(
    xpToNextLevel(player.runLevel)
    * (
      HIGH_PLATFORM_TREASURE_CONFIG.amount.runXp.earlyRequirementRatio
      + HIGH_PLATFORM_TREASURE_CONFIG.amount.runXp.lateRequirementRatioBonus * progress
    )
    * paceScale,
  );
  const xpAmount = Math.min(nonBossRunXpHeadroom(state), xpNominal);
  const previews: Array<TreasureRewardPreview | null> = [
    resourcePreview("health", player.hp, player.maxHp, healthNominal),
    resourcePreview("skillEnergy", player.skillEnergy, player.skillEnergyMax, skillNominal),
    resourcePreview(
      "ultimateEnergy",
      player.ultimateEnergy,
      player.ultimateEnergyMax,
      ultimateNominal,
      previewUltimateEnergyGain(state, ultimateNominal),
    ),
    resourcePreview(
      "residualSpirit",
      player.residualSpirit,
      RESIDUAL_SPIRIT_CONFIG.maxStored,
      residualNominal,
    ),
    xpNominal > 0
      && xpAmount / xpNominal >= HIGH_PLATFORM_TREASURE_CONFIG.amount.minimumEffectiveRatio
      ? {
        choice: {
          id: "treasure-runXp",
          kind: "runXp",
          amount: xpAmount,
          before: player.runXp,
          after: player.runXp + xpAmount,
        },
        nominalAmount: xpNominal,
        headroomRatio: clamp(xpAmount / xpNominal, 0, 1),
        levelGap,
      }
      : null,
  ];

  return previews.filter((preview) => preview !== null);
}

const TREASURE_REWARD_KINDS: TreasureRewardKind[] = [
  "health",
  "skillEnergy",
  "ultimateEnergy",
  "residualSpirit",
  "runXp",
  "equipment",
];
const RECOVERY_KINDS = new Set<TreasureRewardKind>([
  "health",
  "skillEnergy",
  "ultimateEnergy",
  "residualSpirit",
]);
const GROWTH_KINDS = new Set<TreasureRewardKind>(["runXp", "equipment"]);

type WeightedTreasureOption = {
  key: string;
  kind: TreasureRewardKind;
  weight: number;
  choice?: TreasureResourceChoiceState;
};

export type TreasureChoiceContext = TreasureRewardPreviewContext & {
  runSeed: number;
  serial: number;
  pity: TreasurePityState;
};

function pityMultiplier(kind: TreasureRewardKind, pity: TreasurePityState) {
  const config = HIGH_PLATFORM_TREASURE_CONFIG.selection.pity;
  const misses = Math.min(config.maximumMisses, pity[kind]);
  return 1 + misses * (
    kind === "equipment" ? config.equipmentStep : config.resourceStep
  );
}

function smoothNeed(deficit: number) {
  const config = HIGH_PLATFORM_TREASURE_CONFIG.selection;
  const t = clamp(
    (deficit - HIGH_PLATFORM_TREASURE_CONFIG.amount.minimumDeficitRatio)
      / (config.needFullScaleDeficit - HIGH_PLATFORM_TREASURE_CONFIG.amount.minimumDeficitRatio),
    0,
    1,
  );
  return (t * t * (SMOOTHSTEP_COEFFICIENT - 2 * t)) ** config.needExponent;
}

function resourceStateBonus(state: GameState, kind: TreasureRewardKind) {
  const config = HIGH_PLATFORM_TREASURE_CONFIG.selection.urgentState;
  const hpRatio = state.player.hp / state.player.maxHp;
  if (kind === "health" && hpRatio < config.healthRatio) return config.healthMultiplier;
  if (kind === "skillEnergy" && state.player.skillCharges === 0) return config.emptySkillMultiplier;
  if (
    kind === "residualSpirit"
    && state.player.residualSpirit < RESIDUAL_SPIRIT_CONFIG.healCost
    && hpRatio < config.residualHealthRatio
  ) {
    return config.residualMultiplier;
  }
  return 1;
}

function weightedResourceOptions(
  state: GameState,
  context: TreasureChoiceContext,
  previews: TreasureRewardPreview[],
) {
  const progress = actProgress(context.act);
  const pressure = HIGH_PLATFORM_TREASURE_CONFIG.selection.actPressureBonus;
  const xpConfig = HIGH_PLATFORM_TREASURE_CONFIG.selection.xp;

  return previews.map((preview): WeightedTreasureOption => {
    const kind = preview.choice.kind;
    let weight: number;
    if (kind === "runXp") {
      const xpProgress = state.player.runXp / xpToNextLevel(state.player.runLevel);
      weight = (preview.headroomRatio ?? 0)
        * (
          xpConfig.baseWeight
          + xpConfig.progressWeight * xpProgress
          + xpConfig.levelGapWeight * (preview.levelGap ?? 0)
        )
        * pityMultiplier(kind, context.pity);
    } else {
      weight = smoothNeed(preview.deficit ?? 0)
        * (1 + pressure[kind] * progress)
        * resourceStateBonus(state, kind)
        * pityMultiplier(kind, context.pity);
    }
    return {
      key: kind,
      kind,
      weight,
      choice: {
        ...preview.choice,
        id: `${preview.choice.id}-${context.act}-${context.serial}`,
      },
    };
  });
}

function equipmentOptionWeight(state: GameState, candidateCount: number, context: TreasureChoiceContext) {
  const config = HIGH_PLATFORM_TREASURE_CONFIG.selection.equipment;
  const targetTier = equipmentTierForState(state);
  const emptySlots = EQUIPMENT_SLOTS.filter((slot) => state.equippedEquipment[slot] === null).length;
  const underbuiltSlots = EQUIPMENT_SLOTS.filter((slot) => {
    const itemId = state.equippedEquipment[slot];
    if (!itemId) return false;
    const tier = equipmentInventoryTier(state, itemId) ?? "common";
    return compareEquipmentTiers(tier, targetTier) < 0;
  }).length;
  const slotCount = EQUIPMENT_SLOTS.length;
  const candidateRatio = clamp(candidateCount / config.candidateNormalizationCount, 0, 1);

  return candidateRatio
    * (
      config.baseWeight
      + config.emptySlotWeight * emptySlots / slotCount
      + config.underbuiltSlotWeight * underbuiltSlots / slotCount
      + config.actProgressWeight * actProgress(context.act)
    )
    * pityMultiplier("equipment", context.pity);
}

function treasureEquipmentChoice(
  state: GameState,
  context: TreasureChoiceContext,
  equipment: ReturnType<typeof createTreasureEquipmentChoices>[number],
): TreasureEquipmentChoiceState {
  return {
    id: `treasure-equipment-${equipment.id}-${context.act}-${context.serial}`,
    kind: "equipment",
    equipment,
    replacedEquippedId: state.equippedEquipment[equipment.slot],
  };
}

function pickEquipmentChoice(
  state: GameState,
  context: TreasureChoiceContext,
  candidates: ReturnType<typeof createTreasureEquipmentChoices>,
  usedEquipmentIds: Set<string>,
  usedEquipmentSlots: Set<EquipmentSlot>,
  rng: () => number,
) {
  const available = candidates.filter((candidate) => !usedEquipmentIds.has(candidate.id));
  const unusedSlotCandidates = available.filter((candidate) => (
    !usedEquipmentSlots.has(candidate.slot)
  ));
  const picked = weightedRandomPick(
    unusedSlotCandidates.length > 0 ? unusedSlotCandidates : available,
    (candidate) => 1 + (
      state.equippedEquipment[candidate.slot] === null
        ? HIGH_PLATFORM_TREASURE_CONFIG.selection.equipment.emptySlotCandidateBonus
        : 0
    ),
    rng,
  );
  if (!picked) return null;
  usedEquipmentIds.add(picked.id);
  usedEquipmentSlots.add(picked.slot);
  return treasureEquipmentChoice(state, context, picked);
}

export function createTreasureChoices(
  state: GameState,
  context: TreasureChoiceContext,
): TreasureChoiceGenerationState {
  const resourcePreviews = previewTreasureRewards(state, context);
  const equipmentCandidates = createTreasureEquipmentChoices(state);
  const options = weightedResourceOptions(state, context, resourcePreviews);
  if (equipmentCandidates.length > 0) {
    options.push({
      key: "equipment",
      kind: "equipment",
      weight: equipmentOptionWeight(state, equipmentCandidates.length, context),
    });
  }
  const rng = seededRandom(
    context.runSeed
      + context.act * HIGH_PLATFORM_TREASURE_CONFIG.selection.seed.actSalt
      + context.serial * HIGH_PLATFORM_TREASURE_CONFIG.selection.seed.serialSalt,
  );
  const remaining = [...options];
  const choices: TreasureChoiceState[] = [];
  const usedEquipmentIds = new Set<string>();
  const usedEquipmentSlots = new Set<EquipmentSlot>();

  const chooseFrom = (predicate: (option: WeightedTreasureOption) => boolean) => {
    const candidates = remaining.filter(predicate);
    const option = weightedRandomPick(candidates, (candidate) => candidate.weight, rng);
    if (!option) return false;
    const remainingIndex = remaining.findIndex((candidate) => candidate.key === option.key);
    if (remainingIndex >= 0) remaining.splice(remainingIndex, 1);
    const choice = option.choice ?? pickEquipmentChoice(
      state,
      context,
      equipmentCandidates,
      usedEquipmentIds,
      usedEquipmentSlots,
      rng,
    );
    if (!choice) return false;
    choices.push(choice);
    return true;
  };

  chooseFrom((option) => RECOVERY_KINDS.has(option.kind));
  chooseFrom((option) => GROWTH_KINDS.has(option.kind));
  while (choices.length < HIGH_PLATFORM_TREASURE_CONFIG.selection.choiceCount) {
    if (!chooseFrom(() => true)) break;
  }
  while (choices.length < HIGH_PLATFORM_TREASURE_CONFIG.selection.choiceCount) {
    const equipmentChoice = pickEquipmentChoice(
      state,
      context,
      equipmentCandidates,
      usedEquipmentIds,
      usedEquipmentSlots,
      rng,
    );
    if (!equipmentChoice) break;
    choices.push(equipmentChoice);
  }

  const eligibleKinds = new Set(options.map((option) => option.kind));
  const displayedKinds = new Set(choices.map((choice) => choice.kind));
  const nextPity = { ...context.pity };
  for (const kind of TREASURE_REWARD_KINDS) {
    if (!eligibleKinds.has(kind)) continue;
    nextPity[kind] = displayedKinds.has(kind)
      ? 0
      : Math.min(
        HIGH_PLATFORM_TREASURE_CONFIG.selection.pity.maximumMisses,
        context.pity[kind] + 1,
      );
  }

  return {
    choices,
    candidates: options.map((option) => {
      const preview = resourcePreviews.find((candidate) => candidate.choice.kind === option.kind);
      return {
        id: option.key,
        kind: option.kind,
        weight: option.weight,
        eligibleMisses: context.pity[option.kind],
        pityMultiplier: pityMultiplier(option.kind, context.pity),
        nominalAmount: preview?.nominalAmount,
        effectiveAmount: preview?.choice.amount,
      };
    }),
    nextPity,
  };
}

export function applyTreasureChoice(state: GameState, index: number) {
  const choice = state.pendingTreasureChoices[index];
  if (!choice) return false;

  // Clear first so a level-up or another downstream reward can safely queue its own overlay.
  state.pendingTreasureChoices = [];
  if (state.treasureDebug?.choices.some((candidate) => candidate.id === choice.id)) {
    state.treasureDebug.selectedChoiceId = choice.id;
  }

  if (choice.kind === "health") {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + choice.amount);
    return true;
  }
  if (choice.kind === "skillEnergy") {
    grantSkillEnergy(state, choice.amount);
    return true;
  }
  if (choice.kind === "ultimateEnergy") {
    grantUltimateEnergy(state, choice.nominalAmount ?? choice.amount);
    return true;
  }
  if (choice.kind === "residualSpirit") {
    storeResidualSpirit(state.player, choice.amount);
    return true;
  }
  if (choice.kind === "runXp") {
    grantNonBossRunXp(state, choice.amount);
    return true;
  }
  if (choice.kind !== "equipment") return false;

  addEquipmentToInventory(
    state,
    choice.equipment.id,
    choice.equipment.tier,
  );
  return equipEquipment(
    state,
    choice.equipment.slot,
    choice.equipment.id,
  );
}
