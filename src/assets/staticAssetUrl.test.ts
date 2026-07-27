import { describe, expect, it } from "vitest";
import { resolveStaticAssetUrl } from "./staticAssetUrl";

describe("resolveStaticAssetUrl", () => {
  it("routes repository assets through the directory beside dist", () => {
    expect(resolveStaticAssetUrl("assets/sprites/player/player_idle.png"))
      .toBe("../assets/sprites/player/player_idle.png");
  });

  it("leaves non-repository URLs unchanged", () => {
    expect(resolveStaticAssetUrl("https://cdn.example.com/player.png"))
      .toBe("https://cdn.example.com/player.png");
    expect(resolveStaticAssetUrl("../assets/sprites/player/player_idle.png"))
      .toBe("../assets/sprites/player/player_idle.png");
  });
});
