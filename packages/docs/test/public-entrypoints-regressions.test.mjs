import { describe, expect, it } from "vitest";
import { readPublicContents, validatePublicEntryPoints } from "./public-entrypoints-fixtures.mjs";
import { homepageCardLinks } from "./public-entrypoints-parser.mjs";

const contents = readPublicContents();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function guardErrorMessage(fixture) {
  try {
    validatePublicEntryPoints({ contents: fixture });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected public entrypoint guard to fail");
}

describe("public entrypoint guard regressions", () => {
  it("maps literal Card labels or headings to anchors and ignores bait", () => {
    const source = [
      '<!-- <Card title="React"><a href="/guides/comment-bait/"></a></Card> -->',
      "```mdx",
      '<Card title="React"><a href="/guides/fence-bait/"></a></Card>',
      "```",
      '<Card label="React"><a href="/guides/react/"></a></Card>',
      '<Card><h3>Preact</h3><a href="/guides/preact/"></a></Card>',
      '<Card data-title="React"><a href="/guides/data-bait/"></a></Card>',
      '<Card title="React">unrelated href="/guides/text-bait/"</Card>',
      '`<Card title="React"><a href="/guides/inline-bait/"></a></Card>`',
    ].join("\n");

    expect(homepageCardLinks(source)).toEqual(
      new Map([
        ["React", "/guides/react/"],
        ["Preact", "/guides/preact/"],
      ]),
    );
  });

  it.each([
    [
      "zh",
      "packages/docs/src/content/docs/index.mdx",
      "/guides/react/",
      "/guides/preact/",
      "{/* unrelated guard bait: /guides/react/ */}\n```text\n/guides/react/\n```",
    ],
    [
      "en",
      "packages/docs/src/content/docs/en/index.mdx",
      "/en/guides/react/",
      "/en/guides/preact/",
      "<!-- unrelated guard bait: /en/guides/react/ -->\n```text\n/en/guides/react/\n```",
    ],
  ])("rejects a homepage card href mutation for %s", (_locale, source, expected, actual, bait) => {
    const fixture = {
      ...contents,
      [source]: contents[source].replace(expected, actual).concat(`\n${bait}\n`),
    };

    expect(guardErrorMessage(fixture)).toMatch(
      new RegExp(
        [source, 'card "React"', `expected href ${expected}`, `actual href ${actual}`]
          .map(escapeRegExp)
          .join(".*"),
      ),
    );
  });

  it("does not accept a stale package name hidden in comments or code", () => {
    const source = "packages/react/README.md";
    const expected = "@zhuangtai-js/react";
    const fixture = {
      ...contents,
      [source]: contents[source]
        .replaceAll(expected, "@zhuangtai/react")
        .concat(
          [
            "",
            `<!-- ${expected} -->`,
            "```sh",
            `pnpm add @zhuangtai-js/core ${expected} react`,
            "```",
            "",
          ].join("\n"),
        ),
    };

    expect(guardErrorMessage(fixture)).toMatch(
      new RegExp([source, `missing package target ${expected}`].map(escapeRegExp).join(".*")),
    );
  });

  it("ignores nonexistent examples that appear only in comments or code", () => {
    const source = "packages/docs/src/content/docs/examples.md";
    const fixture = {
      ...contents,
      [source]: contents[source].concat(
        "\n<!-- [Missing](examples/vite-not-real) -->\n```text\n[Missing](examples/vite-not-real)\n```\n",
      ),
    };

    expect(() => validatePublicEntryPoints({ contents: fixture })).not.toThrow();
  });

  it("reports a real nonexistent example even with comment and code bait", () => {
    const source = "packages/docs/src/content/docs/examples.md";
    const missing = "examples/vite-not-real";
    const fixture = {
      ...contents,
      [source]: contents[source].concat(
        [
          "",
          `[Missing](${missing})`,
          "<!-- examples/vite-vanilla -->",
          "```text",
          "examples/vite-vanilla",
          "```",
          "",
        ].join("\n"),
      ),
    };

    expect(guardErrorMessage(fixture)).toMatch(
      new RegExp([source, `missing example target ${missing}`].map(escapeRegExp).join(".*")),
    );
  });

  it("does not accept a missing runnable example hidden in comments or code", () => {
    const source = "packages/docs/src/content/docs/examples.md";
    const expectedExample = "examples/vite-react";
    const expectedPackage = "@zhuangtai-js/example-vite-react";
    const fixture = {
      ...contents,
      [source]: contents[source]
        .replaceAll(expectedExample, "examples/vite-vanilla")
        .replaceAll(expectedPackage, "@zhuangtai-js/example-vite-vanilla")
        .concat(
          [
            "",
            `<!-- ${expectedExample} ${expectedPackage} -->`,
            "```text",
            expectedExample,
            expectedPackage,
            "```",
            "",
          ].join("\n"),
        ),
    };

    expect(guardErrorMessage(fixture)).toMatch(
      new RegExp(
        [source, `missing runnable example target ${expectedExample}`].map(escapeRegExp).join(".*"),
      ),
    );
  });
});
