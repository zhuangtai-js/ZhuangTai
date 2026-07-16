import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";
import {
  assertCompatibilityMatrix,
  assertContainsAll,
  assertInstallSection,
  installPackages,
  installationGuideRows,
} from "./readme-consistency-compatibility.mjs";
import {
  collectMarkdown,
  publicDocumentationPaths,
  publishablePackages,
  readText,
  rootPath,
  rootReadmePaths,
  skillDocumentationPaths,
} from "./readme-consistency-context.mjs";
import {
  commands,
  localDocumentationTargets,
  markdownSection,
  visibleMarkdownLines,
} from "./readme-consistency-markdown.mjs";

export function registerCoreReadmeTests() {
  it("discovers every publishable workspace package", () => {
    assert.ok(publishablePackages.length > 0);
    for (const { directory, manifest, readmePath } of publishablePackages) {
      assert.match(manifest.name, /^@zhuangtai-js\//u);
      assert.ok(existsSync(join(rootPath, readmePath)), `${manifest.name} is missing README.md`);

      const changelogPath = `packages/${directory}/CHANGELOG.md`;
      if (existsSync(join(rootPath, changelogPath))) {
        assert.ok(publicDocumentationPaths.includes(changelogPath));
      }

      const docsPath = `packages/${directory}/docs`;
      if (existsSync(join(rootPath, docsPath))) {
        for (const documentationPath of collectMarkdown(docsPath)) {
          assert.ok(publicDocumentationPaths.includes(documentationPath));
        }
      }
    }

    for (const documentationPath of skillDocumentationPaths) {
      assert.ok(publicDocumentationPaths.includes(documentationPath));
    }
  });

  it("parses CommonMark fences without treating code examples as documentation", () => {
    const markdown = "# Title\n\n```sh\n# comment\n[example](./missing.md)\n```\n\n## Section";
    const blockquote = "> ```md\n> [example](./missing.md)\n> ````";
    const blockquoteExit = "> ```md\n> [hidden](./missing.md)\n\n[visible](/missing-route/)";
    const quotedFenceMarker = "````md\n> ````\n[hidden](./missing.md)\n````";

    assert.deepEqual(
      visibleMarkdownLines(markdown).filter((line) => /^#{1,6} /u.test(line)),
      ["# Title", "## Section"],
    );
    assert.deepEqual(localDocumentationTargets(markdown, "fixture.md"), []);
    assert.deepEqual(localDocumentationTargets(blockquote, "fixture.md"), []);
    assert.deepEqual(localDocumentationTargets(blockquoteExit, "fixture.md"), ["/missing-route/"]);
    assert.deepEqual(localDocumentationTargets(quotedFenceMarker, "fixture.md"), []);
    assert.deepEqual(visibleMarkdownLines("# Title\n\n```sh\ncommand"), ["# Title", ""]);
  });

  it("keeps Chinese and English root README structures and core contracts aligned", () => {
    const [chineseReadme, englishReadme] = rootReadmePaths.map(readText);
    const headingLevels = rootReadmePaths.map((relativePath) =>
      visibleMarkdownLines(readText(relativePath), relativePath)
        .filter((line) => /^#{1,6} /u.test(line))
        .map((line) => line.indexOf(" ")),
    );

    assert.deepEqual(headingLevels[1], headingLevels[0]);
    assertContainsAll(
      chineseReadme,
      ["`set` 立即生效", "`watch` 回调同步执行", "`Object.is`", "对象和数组按引用", "没有隐藏调度"],
      rootReadmePaths[0],
    );
    assertContainsAll(
      englishReadme,
      [
        "`set` applies immediately",
        "`watch` callbacks run synchronously",
        "`Object.is`",
        "Objects and arrays are compared by reference",
        "hidden scheduling",
      ],
      rootReadmePaths[1],
    );
  });

  it("derives each compatibility matrix row from its package manifest", () => {
    const compatibilityPaths = [
      ...rootReadmePaths,
      "packages/docs/src/content/docs/integrations.md",
      "packages/docs/src/content/docs/en/integrations.md",
    ];

    for (const relativePath of compatibilityPaths) {
      const readme = readText(relativePath);
      assertCompatibilityMatrix(readme, relativePath);

      for (const { manifest } of publishablePackages) {
        assert.ok(readme.includes(manifest.name), `${relativePath} omits ${manifest.name}`);
      }
    }

    const original = readText("README.md");
    const mutated = original.replace(
      /(`@zhuangtai-js\/react@[^`]+`\s*\|\s*)`[^`]+`/u,
      "$1`^9.9.9`",
    );
    assert.notEqual(mutated, original);
    assert.throws(
      () => assertCompatibilityMatrix(mutated, "mutated README.md"),
      /stale core peer/u,
    );

    const extraPeer = original.replace("React `>=18 <20`", "React `>=18 <20`, Vue `^3.0.0`");
    assert.notEqual(extraPeer, original);
    assert.throws(
      () => assertCompatibilityMatrix(extraPeer, "README.md with an extra peer"),
      /stale or extra peers/u,
    );
  });

  it("keeps both languages of every package README installable", () => {
    for (const { manifest, readmePath } of publishablePackages) {
      const readme = readText(readmePath);
      const anchor = '<a id="english"></a>';
      const sections = readme.split(anchor);

      assert.equal(sections.length, 2, `${readmePath} must contain exactly one English anchor`);
      assert.ok(
        sections[0].includes('<a href="#english">English</a>'),
        `${readmePath} lacks English navigation`,
      );
      assertInstallSection(
        markdownSection(sections[0], "安装", `${readmePath} Chinese section`),
        manifest,
        `${readmePath} Chinese install section`,
      );
      const englishInstallHeading = sections[1].includes("## Installation")
        ? "Installation"
        : "Install";
      assertInstallSection(
        markdownSection(sections[1], englishInstallHeading, `${readmePath} English section`),
        manifest,
        `${readmePath} English install section`,
      );
    }

    const reactPackage = publishablePackages.find(
      ({ manifest }) => manifest.name === "@zhuangtai-js/react",
    );
    assert.notEqual(reactPackage, undefined);
    const sections = readText(reactPackage.readmePath).split('<a id="english"></a>');
    const expectedNpm = "npm install @zhuangtai-js/core @zhuangtai-js/react react";
    const mutatedEnglish = sections[1].replace(
      expectedNpm,
      "npm install @zhuangtai-js/core @zhuangtai-js/react",
    );
    assert.notEqual(mutatedEnglish, sections[1]);
    assert.throws(
      () =>
        assertInstallSection(
          markdownSection(mutatedEnglish, "Install", "mutated React README English section"),
          reactPackage.manifest,
          "mutated React README English install section",
        ),
      /npm command drifted/u,
    );

    const commandOutsideInstall = sections[1]
      .replace(expectedNpm, "")
      .replace("## API", `## Unrelated example\n\n${expectedNpm}\n\n## API`);
    assert.notEqual(commandOutsideInstall, sections[1]);
    assert.throws(
      () =>
        assertInstallSection(
          markdownSection(commandOutsideInstall, "Install", "relocated React README command"),
          reactPackage.manifest,
          "relocated React README English install section",
        ),
      /npm command drifted/u,
    );
  });

  it("keeps root quick-start commands and the installation guide manifest-driven", () => {
    const expectedRootCommands = [
      "@zhuangtai-js/core",
      "@zhuangtai-js/core @zhuangtai-js/react react",
    ];

    for (const relativePath of rootReadmePaths) {
      const readme = readText(relativePath);
      assert.deepEqual(
        commands(readme, "npm install"),
        expectedRootCommands.map((value) => `npm install ${value}`),
      );
      assert.deepEqual(
        commands(readme, "pnpm add"),
        expectedRootCommands.map((value) => `pnpm add ${value}`),
      );
    }

    const rows = installationGuideRows(readText("docs/guide/installation.md"));
    assert.equal(rows.size, publishablePackages.length);
    for (const { manifest } of publishablePackages) {
      assert.equal(rows.get(manifest.name), `pnpm add ${installPackages(manifest).join(" ")}`);
    }
  });
}
