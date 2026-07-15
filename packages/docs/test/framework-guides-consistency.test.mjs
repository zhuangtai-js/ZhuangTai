import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sidebar } from "../src/config/sidebar.mjs";
import {
  chooserErrors,
  extractHeadings,
  guidePath,
  guides,
  readChooser,
  readGuide,
  verifyGuidePair,
} from "./framework-guides-fixtures.mjs";

const chooser = {
  zh: readChooser("zh"),
  en: readChooser("en"),
};

describe("framework guide files and locale routes", () => {
  it.each(guides)("has reciprocal zh/en routes for $slug", (guide) => {
    expect(existsSync(guidePath("zh", guide.slug))).toBe(true);
    expect(existsSync(guidePath("en", guide.slug))).toBe(true);
  });

  it.each(guides)("keeps $slug content and headings mirrored", (guide) => {
    expect(() =>
      verifyGuidePair(guide, readGuide("zh", guide.slug), readGuide("en", guide.slug)),
    ).not.toThrow();
  });

  it("keeps the chooser and framework sidebar bilingual", () => {
    expect(chooserErrors("zh", chooser.zh)).toEqual([]);
    expect(chooserErrors("en", chooser.en)).toEqual([]);
    expect(extractHeadings(chooser.zh).map(({ level }) => level)).toEqual(
      extractHeadings(chooser.en).map(({ level }) => level),
    );

    const frameworkSection = sidebar.find(({ label }) => label === "框架");
    expect(frameworkSection?.translations?.en).toBe("Frameworks");
    expect(frameworkSection?.items?.map(({ slug }) => slug)).toEqual([
      "guides/framework-adapters",
      "guides/react",
      "guides/react-native-expo",
      "guides/preact",
      "guides/vue",
      "guides/svelte",
      "guides/solid",
    ]);
  });

  it("rejects a missing English heading fixture", () => {
    const guide = guides[0];
    const en = readGuide("en", guide.slug).replace("## Next steps", "## Follow-up");
    expect(() => verifyGuidePair(guide, readGuide("zh", guide.slug), en)).toThrow(
      /en heading structure mismatch/,
    );
  });

  it("rejects a stale package-name fixture", () => {
    const guide = guides[0];
    const zh = readGuide("zh", guide.slug).replaceAll("@zhuangtai-js/react", "@zhuangtai/react");
    expect(() => verifyGuidePair(guide, zh, readGuide("en", guide.slug))).toThrow(
      /stale package name|missing @zhuangtai-js\/react/,
    );
  });
});
