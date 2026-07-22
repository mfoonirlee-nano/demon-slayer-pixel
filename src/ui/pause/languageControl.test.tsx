import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "../../i18n/language";
import { LanguageControl } from "./languageControl";

describe("LanguageControl", () => {
  it("offers every supported language in a dropdown and marks the active option", () => {
    const markup = renderToStaticMarkup(
      <LanguageControl language="en" label="Language" onChange={() => undefined} />,
    );

    expect(markup.match(/<select/g)).toHaveLength(1);
    expect(markup.match(/<option/g)).toHaveLength(SUPPORTED_LANGUAGES.length);
    expect(markup).toContain('aria-label="Language"');
    expect(markup).toContain("中文");
    expect(markup).toContain("English");
    expect(markup).toMatch(/<option[^>]*value="en"[^>]*selected=""[^>]*>English<\/option>/);
  });
});
