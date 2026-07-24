/// <reference types="vite/client" />
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PlayerStatusId, PlayerStatusSnapshot } from "../types/game-state";
import {
  PLAYER_STATUS_ICON_ASSETS,
  PLAYER_STATUS_ICON_PATHS,
  PLAYER_STATUS_PRESENTATIONS,
  PLAYER_STATUS_ICON_SOURCES,
  PlayerStatusBar,
  statusRemainingRatio,
} from "./playerStatusBar";

const HALF_REMAINING_FRAMES = 50;
const FULL_DURATION_FRAMES = 100;
const CHARGE_PROGRESS = 0.5;
const ZERO_REMAINING_FRAMES = 0;
const AVAILABLE_STATUS_ICON_URLS = import.meta.glob<string>(
  "../../assets/sprites/ui/status/semantic/*.png",
  { eager: true, query: "?url", import: "default" },
);

const PERSISTENT_STATUS: PlayerStatusSnapshot = {
  id: "line_projectile_knockback",
  remainingFrames: null,
  durationFrames: null,
};

const HALF_DURATION_STATUS: PlayerStatusSnapshot = {
  id: "close_arc_basic_crescent",
  remainingFrames: HALF_REMAINING_FRAMES,
  durationFrames: FULL_DURATION_FRAMES,
};

describe("PlayerStatusBar", () => {
  it("leaves persistent effects clear and darkens only the remaining half of timed effects", () => {
    const markup = renderToStaticMarkup(
      <PlayerStatusBar
        statuses={[PERSISTENT_STATUS, HALF_DURATION_STATUS]}
        language="zh-CN"
        width={190}
      />,
    );

    expect(markup.match(/class="player-status-icon"/g)).toHaveLength(2);
    expect(markup.match(/player-status-duration-mask/g)).toHaveLength(1);
    expect(markup).toContain("--player-status-remaining-angle:180deg");
  });

  it("clamps duration ratios so malformed timers cannot overdraw the mask", () => {
    expect(statusRemainingRatio(PERSISTENT_STATUS)).toBeNull();
    expect(statusRemainingRatio({
      ...HALF_DURATION_STATUS,
      remainingFrames: FULL_DURATION_FRAMES * 2,
    })).toBe(1);
    expect(statusRemainingRatio({ ...HALF_DURATION_STATUS, remainingFrames: -1 })).toBe(0);
    expect(statusRemainingRatio({ ...HALF_DURATION_STATUS, durationFrames: 0 })).toBe(0);
  });

  it("renders the mask from a full circle to no circle as time expires", () => {
    const markup = renderToStaticMarkup(
      <PlayerStatusBar
        statuses={[
          { id: "moon_tide", remainingFrames: FULL_DURATION_FRAMES, durationFrames: FULL_DURATION_FRAMES },
          { ...HALF_DURATION_STATUS, id: "guard_counter" },
          {
            id: "spider_silk_slow",
            remainingFrames: ZERO_REMAINING_FRAMES,
            durationFrames: FULL_DURATION_FRAMES,
          },
        ]}
        language="zh-CN"
        width={190}
      />,
    );

    expect(markup).toContain("--player-status-remaining-angle:360deg");
    expect(markup).toContain("--player-status-remaining-angle:180deg");
    expect(markup).toContain("--player-status-remaining-angle:0deg");
  });

  it("marks debuffs and renders stack and preparation progress indicators", () => {
    const markup = renderToStaticMarkup(
      <PlayerStatusBar
        statuses={[
          {
            id: "shadowstep_blade_charge",
            remainingFrames: null,
            durationFrames: null,
            progress: CHARGE_PROGRESS,
          },
          {
            id: "spider_silk_slow",
            remainingFrames: HALF_REMAINING_FRAMES,
            durationFrames: FULL_DURATION_FRAMES,
            stacks: 2,
            maxStacks: 3,
          },
        ]}
        language="en"
        width={190}
      />,
    );

    expect(markup).toContain("player-status-progress");
    expect(markup).toContain("width:50%");
    expect(markup).toContain("player-status-icon--debuff");
    expect(markup).toContain("player-status-stacks");
    expect(markup).toContain("Spider Silk Slow");
    expect(markup).toContain("2/3 stacks");
    expect(markup).toContain("50% remaining");
    expect(markup).toContain("50% charged");
  });

  it("references only status icon assets that exist in the repository", () => {
    for (const path of PLAYER_STATUS_ICON_ASSETS) {
      expect(
        Object.prototype.hasOwnProperty.call(AVAILABLE_STATUS_ICON_URLS, `../../${path}`),
        path,
      ).toBe(true);
    }
  });

  it("uses blue buff art and red debuff art for every status presentation", () => {
    for (const [id, presentation] of Object.entries(PLAYER_STATUS_PRESENTATIONS)) {
      expect(presentation.icon, id)
        .toContain(`/semantic/${presentation.tone}_`);
    }

    expect(PLAYER_STATUS_ICON_PATHS.close_arc_basic_crescent).toContain("buff_attack");
    expect(PLAYER_STATUS_ICON_PATHS.guard_counter_damage_reduction).toContain("buff_defense");
    expect(PLAYER_STATUS_ICON_PATHS.dash_reposition_move_speed).toContain("buff_speed");
    expect(PLAYER_STATUS_ICON_PATHS.spider_silk_slow).toContain("debuff_slow");
  });

  it("renders Vite-managed URLs for regular and conditional status icons", () => {
    for (const id of Object.keys(PLAYER_STATUS_ICON_PATHS) as PlayerStatusId[]) {
      const path = PLAYER_STATUS_ICON_PATHS[id];
      expect(PLAYER_STATUS_ICON_SOURCES[id]).toBe(AVAILABLE_STATUS_ICON_URLS[`../../${path}`]);
    }

    const readyPath = "assets/sprites/ui/status/semantic/buff_attack.png";
    const markup = renderToStaticMarkup(
      <PlayerStatusBar
        statuses={[{
          id: "tempo_blade_chain",
          remainingFrames: null,
          durationFrames: null,
          stacks: 4,
          maxStacks: 4,
        }]}
        language="en"
        width={190}
      />,
    );

    expect(markup).toContain(`src="${AVAILABLE_STATUS_ICON_URLS[`../../${readyPath}`]}"`);
  });
});
