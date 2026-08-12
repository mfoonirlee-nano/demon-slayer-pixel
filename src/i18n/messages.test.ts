import { describe, expect, it } from "vitest";
import { message } from "./messages";

describe("UI messages", () => {
  it("returns localized static and interpolated copy", () => {
    expect(message("zh-CN", "start.prompt")).toBe("按任意键或点击开始");
    expect(message("en", "start.prompt")).toBe("Press any key or click to start");
    expect(message("zh-CN", "start.kills", { kills: 12 })).toBe("击杀 12");
    expect(message("en", "start.kills", { kills: 12 })).toBe("12 kills");
  });
});
