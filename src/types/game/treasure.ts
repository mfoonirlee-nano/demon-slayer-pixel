import type {
  EquipmentChoiceState,
  EquipmentItemId,
  SegmentKind,
} from "./domain";
import type { PlatformState } from "./entities";

export type TreasureResourceKind =
  | "health"
  | "skillEnergy"
  | "ultimateEnergy"
  | "residualSpirit"
  | "runXp";

export type TreasureRewardKind = TreasureResourceKind | "equipment";

export type TreasureResourceChoiceState = {
  id: string;
  kind: TreasureResourceKind;
  amount: number;
  nominalAmount?: number;
  before: number;
  after: number;
};

export type TreasureEquipmentChoiceState = {
  id: string;
  kind: "equipment";
  equipment: EquipmentChoiceState;
  replacedEquippedId: EquipmentItemId | null;
};

export type TreasureChoiceState =
  | TreasureResourceChoiceState
  | TreasureEquipmentChoiceState;

export type TreasurePityState = Record<TreasureRewardKind, number>;

export type TreasureCandidateDebugState = {
  id: string;
  kind: TreasureRewardKind;
  weight: number;
  eligibleMisses: number;
  pityMultiplier: number;
  nominalAmount?: number;
  effectiveAmount?: number;
};

export type TreasureChoiceGenerationState = {
  choices: TreasureChoiceState[];
  candidates: TreasureCandidateDebugState[];
  nextPity: TreasurePityState;
};

export type TreasureOpportunityStatus =
  | "idle"
  | "armed"
  | "attached"
  | "claimed"
  | "missed";

export type TreasureOpportunityState = {
  act: number;
  status: TreasureOpportunityStatus;
  armAt: number;
  armedElapsed: number;
  observedSegments: number;
  forceRouteRequested: boolean;
  serial: number;
};

export type HighPlatformTreasureState = {
  host: PlatformState;
  segmentKind: SegmentKind;
  forced: boolean;
  dismissElapsed: number | null;
  unlockElapsed: number;
  claimHoldElapsed: number;
  phase: number;
  arrivalGlowElapsed: number | null;
  seen: boolean;
  climbStarted: boolean;
};

export type TreasureRevealState = {
  elapsed: number;
  duration: number;
  queued: boolean;
  x: number;
  y: number;
  choices: TreasureChoiceState[];
};

export type TreasureDebugState = {
  act: number;
  elapsedInAct: number;
  serial: number;
  seed: number;
  hostLayer: "high" | "top";
  segmentKind: SegmentKind;
  forced: boolean;
  seen: boolean;
  climbStarted: boolean;
  outcome: "claimed" | "missed";
  candidates: TreasureCandidateDebugState[];
  choices: TreasureChoiceState[];
  selectedChoiceId: string | null;
};
