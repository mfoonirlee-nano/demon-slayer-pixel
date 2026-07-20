import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageControl } from "./languageControl";

describe("LanguageControl", () => {
  it("offers only Chinese and English and marks the active language", () => {
    const markup = renderToStaticMarkup(
      <LanguageControl language="en" label="Language" onChange={() => undefined} />,
    );

    expect(markup.match(/type="button"/g)).toHaveLength(2);
    expect(markup).toContain("中文");
    expect(markup).toContain("English");
    expect(markup).toContain('aria-pressed="true">English');
    expect(markup).toContain('aria-pressed="false">中文');
  });
});
