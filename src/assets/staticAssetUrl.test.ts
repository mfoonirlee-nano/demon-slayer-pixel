import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveStaticAssetUrl } from "./staticAssetUrl";

describe("resolveStaticAssetUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes repository assets through the directory beside dist", () => {
    expect(resolveStaticAssetUrl("assets/sprites/player/player_idle.png"))
      .toBe("../assets/sprites/player/player_idle.png");
  });

  it("returns an absolute browser URL that CSS variables cannot rebase", () => {
    vi.stubGlobal("document", {
      baseURI: "https://example.com/demon-slayer-pixel/dist/index.html",
    });

    expect(resolveStaticAssetUrl("assets/sprites/ui/ultimate_orb_charge_sheet.png"))
      .toBe(
        "https://example.com/demon-slayer-pixel/assets/sprites/ui/ultimate_orb_charge_sheet.png",
      );
  });

  it("leaves non-repository URLs unchanged", () => {
    expect(resolveStaticAssetUrl("https://cdn.example.com/player.png"))
      .toBe("https://cdn.example.com/player.png");
    expect(resolveStaticAssetUrl("../assets/sprites/player/player_idle.png"))
      .toBe("../assets/sprites/player/player_idle.png");
  });
});
