import { getCoverProgress } from "../game/coverProgress";
import type { MoonState } from "./types";

export function createInitialMoonState(): MoonState {
  return {
    bloodLerp: 0,
    coverProgress: getCoverProgress(),
  };
}
