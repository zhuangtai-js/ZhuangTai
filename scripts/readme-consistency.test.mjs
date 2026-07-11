import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const rootPath = fileURLToPath(new URL("..", import.meta.url));
const rootReadmePaths = ["README.md", "docs/guide/README.en.md"];

function readText(relativePath) {
  return readFileSync(join(rootPath, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function collectMarkdown(relativeDirectory) {
  const files = [];

  for (const entry of readdirSync(join(rootPath, relativeDirectory), { withFileTypes: true })) {
    const relativePath = join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectMarkdown(relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath);
    }
  }

  return files.toSorted((left, right) => left.localeCompare(right));
}

function discoverPublishablePackages() {
  const packages = [];

  for (const entry of readdirSync(join(rootPath, "packages"), { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const manifestPath = `packages/${entry.name}/package.json`;
    if (!existsSync(join(rootPath, manifestPath))) {
      continue;
    }

    const manifest = readJson(manifestPath);
    if (manifest.private === true) {
      continue;
    }

    assert.match(manifest.name, /^@zhuangtai-js\//u, `${manifestPath} uses an invalid npm scope`);
    packages.push({
      directory: entry.name,
      manifest,
      readmePath: `packages/${entry.name}/README.md`,
    });
  }

  return packages.toSorted((left, right) => left.manifest.name.localeCompare(right.manifest.name));
}

const publishablePackages = discoverPublishablePackages();
const packageReadmePaths = publishablePackages.map(({ readmePath }) => readmePath);
const readmePaths = [...rootReadmePaths, ...packageReadmePaths];
const docsSitePaths = collectMarkdown("packages/docs/src/content/docs");
const skillDocumentationPaths = collectMarkdown("skills");
const packageDocumentationPaths = publishablePackages.flatMap(({ directory, readmePath }) => {
  const paths = [readmePath];
  const changelogPath = `packages/${directory}/CHANGELOG.md`;
  const docsPath = `packages/${directory}/docs`;

  if (existsSync(join(rootPath, changelogPath))) {
    paths.push(changelogPath);
  }
  if (existsSync(join(rootPath, docsPath))) {
    paths.push(...collectMarkdown(docsPath));
  }

  return paths;
});
const currentDocumentationPaths = [
  ...new Set([
    ...readmePaths,
    ...collectMarkdown("docs/guide"),
    ...docsSitePaths,
    ...skillDocumentationPaths,
  ]),
].toSorted((left, right) => left.localeCompare(right));
const publicDocumentationPaths = [
  ...new Set([...currentDocumentationPaths, ...packageDocumentationPaths]),
].toSorted((left, right) => left.localeCompare(right));

function visibleMarkdownLines(markdown, source = "Markdown") {
  const visibleLines = [];
  let fence;

  for (const line of markdown.split(/\r?\n/u)) {
    const opening = /^( {0,3})(`{3,}|~{3,})(.*)$/u.exec(line);

    if (fence === undefined) {
      if (opening !== null && !(opening[2][0] === "`" && opening[3].includes("`"))) {
        fence = opening[2];
        continue;
      }

      visibleLines.push(line);
      continue;
    }

    const closing = /^( {0,3})(`{3,}|~{3,})\s*$/u.exec(line);
    if (closing !== null && closing[2][0] === fence[0] && closing[2].length >= fence.length) {
      fence = undefined;
    }
  }

  assert.equal(fence, undefined, `${source} contains an unclosed code fence`);
  return visibleLines;
}

function releaseLine(version) {
  const match = /^(\d+)\.(\d+)\.\d+(?:-.+)?$/u.exec(version);
  assert.notEqual(match, null, `Expected a semantic version, received ${version}`);
  return `${match[1]}.${match[2]}.x`;
}

function installPackages(manifest) {
  if (manifest.name === "@zhuangtai-js/core") {
    return [manifest.name];
  }

  const extraPeers = Object.keys(manifest.peerDependencies ?? {}).filter(
    (name) => name !== "@zhuangtai-js/core",
  );
  return ["@zhuangtai-js/core", manifest.name, ...extraPeers];
}

function commands(markdown, prefix) {
  return markdown
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(`${prefix} `));
}

function markdownSection(markdown, title, source) {
  const lines = markdown.split(/\r?\n/u);
  const matches = [];
  let fence;
  let start;
  let level;

  for (const [index, line] of lines.entries()) {
    const opening = /^( {0,3})(`{3,}|~{3,})(.*)$/u.exec(line);
    if (
      fence === undefined &&
      opening !== null &&
      !(opening[2][0] === "`" && opening[3].includes("`"))
    ) {
      fence = opening[2];
      continue;
    }
    if (fence !== undefined) {
      const closing = /^( {0,3})(`{3,}|~{3,})\s*$/u.exec(line);
      if (closing !== null && closing[2][0] === fence[0] && closing[2].length >= fence.length) {
        fence = undefined;
      }
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
    if (heading === null) {
      continue;
    }
    if (start !== undefined && heading[1].length <= level) {
      matches.push(lines.slice(start, index).join("\n"));
      start = undefined;
      level = undefined;
    }
    if (heading[2] === title) {
      assert.equal(start, undefined, `${source} nests duplicate ${title} sections`);
      start = index + 1;
      level = heading[1].length;
    }
  }

  if (start !== undefined) {
    matches.push(lines.slice(start).join("\n"));
  }
  assert.equal(matches.length, 1, `${source} must contain exactly one ${title} section`);
  return matches[0];
}

function assertInstallSection(section, manifest, source) {
  const packageList = installPackages(manifest).join(" ");
  assert.deepEqual(
    commands(section, "npm install"),
    [`npm install ${packageList}`],
    `${source} npm command drifted`,
  );
  assert.deepEqual(
    commands(section, "pnpm add"),
    [`pnpm add ${packageList}`],
    `${source} pnpm command drifted`,
  );
}

function compatibilityRows(markdown, source) {
  const rows = new Map();

  for (const line of visibleMarkdownLines(markdown, source)) {
    const match =
      /^\|\s*`(@zhuangtai-js\/[^`@]+)@([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|$/u.exec(line);
    if (match === null) {
      continue;
    }

    assert.equal(
      rows.has(match[1]),
      false,
      `${source} has duplicate compatibility rows for ${match[1]}`,
    );
    rows.set(match[1], { release: match[2], corePeer: match[3], otherPeers: match[4] });
  }

  return rows;
}

function assertCompatibilityMatrix(markdown, source) {
  const extensions = publishablePackages.filter(
    ({ manifest }) => manifest.name !== "@zhuangtai-js/core",
  );
  const rows = compatibilityRows(markdown, source);

  assert.equal(
    rows.size,
    extensions.length,
    `${source} compatibility matrix has missing or extra rows`,
  );

  for (const { manifest } of extensions) {
    const row = rows.get(manifest.name);
    assert.notEqual(row, undefined, `${source} omits ${manifest.name}`);
    assert.equal(
      row.release,
      releaseLine(manifest.version),
      `${source} has a stale release line for ${manifest.name}`,
    );
    assert.equal(
      row.corePeer,
      manifest.peerDependencies?.["@zhuangtai-js/core"],
      `${source} has a stale core peer for ${manifest.name}`,
    );

    const extraPeers = Object.entries(manifest.peerDependencies ?? {}).filter(
      ([name]) => name !== "@zhuangtai-js/core",
    );
    let expectedOtherPeers = "—";
    if (extraPeers.length > 0) {
      expectedOtherPeers = extraPeers
        .map(([name, range]) => `${name[0].toUpperCase()}${name.slice(1)} \`${range}\``)
        .join(", ");
    } else if (manifest.name === "@zhuangtai-js/immer") {
      expectedOtherPeers = source.includes("README.en.md")
        ? "— (Immer is a regular dependency)"
        : "—（Immer 是普通 dependency）";
    }
    assert.equal(
      row.otherPeers,
      expectedOtherPeers,
      `${source} has stale or extra peers for ${manifest.name}`,
    );
  }
}

function installationGuideRows(markdown) {
  const rows = new Map();

  for (const line of visibleMarkdownLines(markdown, "docs/guide/installation.md")) {
    const match = /^\|\s*`(@zhuangtai-js\/[^`]+)`\s*\|.*\|\s*`(pnpm add [^`]+)`\s*\|$/u.exec(line);
    if (match !== null) {
      rows.set(match[1], match[2]);
    }
  }

  return rows;
}

function markdownSlug(heading) {
  return heading
    .toLowerCase()
    .replace(/<[^>]+>/gu, "")
    .replace(/[`*_~]/gu, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");
}

function markdownAnchors(markdown, source) {
  const anchors = new Set();
  const slugCounts = new Map();

  for (const line of visibleMarkdownLines(markdown, source)) {
    const heading = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/u.exec(line)?.[1];
    if (heading !== undefined) {
      const baseSlug = markdownSlug(heading);
      const count = slugCounts.get(baseSlug) ?? 0;
      anchors.add(count === 0 ? baseSlug : `${baseSlug}-${count}`);
      slugCounts.set(baseSlug, count + 1);
    }

    for (const match of line.matchAll(/\b(?:id|name)=["']([^"']+)["']/gu)) {
      anchors.add(match[1]);
    }
  }

  return anchors;
}

function localDocumentationTargets(markdown, source) {
  const visible = visibleMarkdownLines(markdown, source).join("\n");
  const targets = [];

  for (const match of visible.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)) {
    targets.push(
      match[1]
        .trim()
        .replace(/^<|>$/gu, "")
        .split(/\s+["']/u, 1)[0],
    );
  }
  for (const match of visible.matchAll(/^ {0,3}\[[^\]]+\]:\s*(\S+)/gmu)) {
    targets.push(match[1].replace(/^<|>$/gu, ""));
  }
  for (const match of visible.matchAll(/\b(?:href|src)=["']([^"']+)["']/gu)) {
    targets.push(match[1]);
  }

  return targets.filter((target) => {
    if (target.length === 0 || target.startsWith("/")) {
      return false;
    }
    return target.startsWith("#") || !/^[a-z][a-z\d+.-]*:/iu.test(target);
  });
}

function assertLocalTarget(sourcePath, target) {
  const [rawPath, rawFragment] = target.split("#", 2);
  const pathOnly = decodeURIComponent(rawPath.split("?", 1)[0]);
  const targetPath = pathOnly.length === 0 ? sourcePath : join(dirname(sourcePath), pathOnly);
  const absoluteTarget = resolve(rootPath, targetPath);

  assert.ok(existsSync(absoluteTarget), `${sourcePath} links to missing path ${target}`);

  if (rawFragment !== undefined && rawFragment.length > 0 && extname(absoluteTarget) === ".md") {
    const fragment = decodeURIComponent(rawFragment);
    const anchors = markdownAnchors(readFileSync(absoluteTarget, "utf8"), targetPath);
    assert.ok(anchors.has(fragment), `${sourcePath} links to missing fragment ${target}`);
  }
}

function assertContainsAll(text, expected, source) {
  for (const value of expected) {
    assert.ok(text.includes(value), `${source} omits required contract text: ${value}`);
  }
}

function supportedReactMajors(range) {
  const match = /^>=(\d+)\s+<(\d+)$/u.exec(range);
  assert.notEqual(match, null, `Unsupported React peer range format: ${range}`);
  return Array.from(
    { length: Number(match[2]) - Number(match[1]) },
    (_, index) => Number(match[1]) + index,
  );
}

describe("README consistency", () => {
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

    assert.deepEqual(
      visibleMarkdownLines(markdown).filter((line) => /^#{1,6} /u.test(line)),
      ["# Title", "## Section"],
    );
    assert.deepEqual(localDocumentationTargets(markdown, "fixture.md"), []);
    assert.throws(
      () => visibleMarkdownLines("```sh\ncommand", "fixture.md"),
      /unclosed code fence/u,
    );
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
    for (const relativePath of rootReadmePaths) {
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
      assertInstallSection(
        markdownSection(sections[1], "Install", `${readmePath} English section`),
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

  it("keeps docs-site package reference install commands manifest-driven", () => {
    for (const { directory, manifest } of publishablePackages) {
      const expected = [`pnpm add ${installPackages(manifest).join(" ")}`];
      for (const relativePath of [
        `packages/docs/src/content/docs/reference/${directory}.md`,
        `packages/docs/src/content/docs/en/reference/${directory}.md`,
      ]) {
        assert.ok(
          existsSync(join(rootPath, relativePath)),
          `${manifest.name} is missing ${relativePath}`,
        );
        assert.deepEqual(
          commands(readText(relativePath), "pnpm add"),
          expected,
          `${relativePath} install command drifted`,
        );
      }
    }

    const reactPackage = publishablePackages.find(
      ({ manifest }) => manifest.name === "@zhuangtai-js/react",
    );
    assert.notEqual(reactPackage, undefined);
    const expectedReact = [`pnpm add ${installPackages(reactPackage.manifest).join(" ")}`];
    for (const relativePath of [
      "packages/docs/src/content/docs/guides/react.md",
      "packages/docs/src/content/docs/en/guides/react.md",
    ]) {
      assert.deepEqual(
        commands(readText(relativePath), "pnpm add"),
        expectedReact,
        `${relativePath} install command drifted`,
      );
    }
  });

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
    const reactPackage = publishablePackages.find(
      ({ manifest }) => manifest.name === "@zhuangtai-js/react",
    );
    assert.notEqual(reactPackage, undefined);
    const range = reactPackage.manifest.peerDependencies.react;
    const majors = supportedReactMajors(range);
    const chineseGuide = readText("packages/docs/src/content/docs/guides/react.md");
    const englishGuide = readText("packages/docs/src/content/docs/en/guides/react.md");
    const reactSkill = readText("skills/zhuangtai-react/SKILL.md");

    assert.ok(chineseGuide.includes(majors.map((major) => `React ${major}`).join(" 和 ")));
    const englishSupport = majors.map((major) => `React ${major}`).join(" and ");
    assert.ok(englishGuide.includes(englishSupport));
    assert.ok(reactSkill.includes(englishSupport));
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
});
