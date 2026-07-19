import { describe, expect, it } from "vitest";
import {
  frameworkEntrypoints,
  readPublicContents,
  validatePublicEntryPoints,
} from "./public-entrypoints-fixtures.mjs";

const contents = readPublicContents();

function withReplacement(source, from, to) {
  const updated = { ...contents };
  updated[source] = updated[source].replaceAll(from, to);
  return updated;
}

describe("public framework entry points", () => {
  it("keeps public links, package names, manifests, and runnable examples aligned", () => {
    expect(() => validatePublicEntryPoints({ contents })).not.toThrow();
  });

  it("exposes all six framework entry points as one-hop homepage links", () => {
    for (const locale of ["zh", "en"]) {
      const source =
        locale === "zh"
          ? contents["packages/docs/src/content/docs/index.mdx"]
          : contents["packages/docs/src/content/docs/en/index.mdx"];
      const prefix = locale === "zh" ? "" : "/en";
      for (const guide of frameworkEntrypoints) {
        expect(source, `${locale} homepage`).toContain(`${prefix}/guides/${guide.slug}/`);
      }
    }
  });

  it("reports a stale route with its source and missing target", () => {
    const staleRoute = "/guides/react-native-expo/";
    const fixture = withReplacement(
      "packages/docs/src/content/docs/index.mdx",
      staleRoute,
      "/guides/not-a-real-framework/",
    );

    expect(() => validatePublicEntryPoints({ contents: fixture })).toThrow(
      /packages\/docs\/src\/content\/docs\/index\.mdx: missing route target \/guides\/react-native-expo\//,
    );
  });

  it("reports a stale package with its source and missing target", () => {
    const fixture = withReplacement(
      "packages/react/README.md",
      "@zhuangtai-js/react",
      "@zhuangtai/react",
    );

    expect(() => validatePublicEntryPoints({ contents: fixture })).toThrow(
      /packages\/react\/README\.md: missing package target @zhuangtai-js\/react/,
    );
  });

  it("reports a nonexistent example with its source and missing target", () => {
    const fixture = {
      ...contents,
      "packages/docs/src/content/docs/examples.md": `${contents["packages/docs/src/content/docs/examples.md"]}\n[Missing](https://github.com/zhuangtai-js/ZhuangTai/tree/main/examples/vite-not-real)\n`,
    };

    expect(() => validatePublicEntryPoints({ contents: fixture })).toThrow(
      /packages\/docs\/src\/content\/docs\/examples\.md: missing example target examples\/vite-not-real/,
    );
  });
});
