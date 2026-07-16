import assert from "node:assert/strict";
import { it } from "node:test";
import { supportedReactMajors } from "./readme-consistency-compatibility.mjs";
import {
  currentDocumentationPaths,
  docsSitePaths,
  publicDocumentationPaths,
  publishablePackages,
  readText,
} from "./readme-consistency-context.mjs";
import { assertLocalTarget } from "./readme-consistency-links.mjs";
import { localDocumentationTargets } from "./readme-consistency-markdown.mjs";

function reactPackage() {
  const entry = publishablePackages.find(({ manifest }) => manifest.name === "@zhuangtai-js/react");
  assert.notEqual(entry, undefined);
  return entry;
}

export function registerRouteAndIdentityTests() {
  it("keeps docs-site Chinese and English page sets mirrored", () => {
    const chinesePages = docsSitePaths
      .filter((path) => !path.includes("/docs/en/"))
      .map((path) => path.replace("packages/docs/src/content/docs/", ""));
    const englishPages = docsSitePaths
      .filter((path) => path.includes("/docs/en/"))
      .map((path) => path.replace("packages/docs/src/content/docs/en/", ""));
    assert.deepEqual(englishPages, chinesePages);
  });

  it("derives the documented React support range from peerDependencies", () => {
    const range = reactPackage().manifest.peerDependencies.react;
    const majors = supportedReactMajors(range);
    const chineseGuidePath = "packages/docs/src/content/docs/guides/react.md";
    const englishGuidePath = "packages/docs/src/content/docs/en/guides/react.md";
    const chineseReferencePath = "packages/docs/src/content/docs/reference/react.md";
    const englishReferencePath = "packages/docs/src/content/docs/en/reference/react.md";

    assert.ok(readText(chineseGuidePath).includes(`React ${range}`));
    assert.ok(readText(englishGuidePath).includes(`React ${range}`));
    assert.ok(
      readText(chineseReferencePath).includes(majors.map((major) => `React ${major}`).join(" 和 ")),
    );
    const englishSupport = majors.map((major) => `React ${major}`).join(" and ");
    assert.ok(readText(englishReferencePath).includes(englishSupport));
    assert.ok(readText("skills/zhuangtai-react/SKILL.md").includes(englishSupport));

    for (const relativePath of currentDocumentationPaths) {
      const text = readText(relativePath);
      assert.equal(
        /React 18\+|React 18 (?:and|or) later|React 18\s*(?:及以上|或更高)/u.test(text),
        false,
        `${relativePath} overstates React compatibility`,
      );
    }
  });

  it("keeps public documentation local paths and fragments resolvable", () => {
    for (const relativePath of publicDocumentationPaths) {
      const markdown = readText(relativePath);
      for (const target of localDocumentationTargets(markdown, relativePath)) {
        assertLocalTarget(relativePath, target);
      }
    }

    assert.throws(
      () => assertLocalTarget("README.md", "./packages/core/README.md#definitely-missing"),
      /missing fragment/u,
    );
    assert.throws(
      () =>
        assertLocalTarget(
          "packages/docs/src/content/docs/guides/react.md",
          "/definitely-missing-route/",
        ),
      /missing site route/u,
    );
  });

  it("rejects forbidden npm package identities across public documentation", () => {
    const forbiddenPackagePatterns = [
      /@zhuangtai\//u,
      /(?:npm install|pnpm add|yarn add|bun add)\s+zhuangtai(?:\s|$)/u,
      /(?:from\s+|require\()['"]zhuangtai['"]/u,
    ];

    for (const relativePath of publicDocumentationPaths) {
      const text = readText(relativePath);
      for (const pattern of forbiddenPackagePatterns) {
        assert.equal(
          pattern.test(text),
          false,
          `${relativePath} uses forbidden package identity ${pattern}`,
        );
      }
    }

    assert.equal(forbiddenPackagePatterns[0].test("npm install @zhuangtai/core"), true);
  });
}
