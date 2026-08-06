import { describe, expect, it } from "vitest";
import {
  REWARD_OVERLAY_BACKDROP_CLASS,
  REWARD_OVERLAY_CARD_CLASS,
  REWARD_OVERLAY_PANEL_CLASS,
  isRewardCommitKey,
  shouldIgnoreRepeatedRewardCommit,
} from "./rewardOverlay";

describe("reward overlay animation hooks", () => {
  it("exposes the backdrop and panel animation classes used by the overlay", () => {
    expect(REWARD_OVERLAY_BACKDROP_CLASS).toBe("reward-overlay-backdrop");
    expect(REWARD_OVERLAY_PANEL_CLASS).toBe("reward-overlay-panel");
  });

  it("exposes the card animation class used for staggered rewards", () => {
    expect(REWARD_OVERLAY_CARD_CLASS).toBe("reward-overlay-card");
  });

  it("identifies commit keys so held input cannot spill into the next reward queue", () => {
    expect(isRewardCommitKey("Enter")).toBe(true);
    expect(isRewardCommitKey("1")).toBe(true);
    expect(isRewardCommitKey("ArrowRight")).toBe(false);
    expect(shouldIgnoreRepeatedRewardCommit("Enter", true)).toBe(true);
    expect(shouldIgnoreRepeatedRewardCommit("1", false)).toBe(false);
    expect(shouldIgnoreRepeatedRewardCommit("ArrowRight", true)).toBe(false);
  });
});
