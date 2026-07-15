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

function collectFiles(relativeDirectory) {
  const files = [];

  for (const entry of readdirSync(join(rootPath, relativeDirectory), { withFileTypes: true })) {
    const relativePath = join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.toSorted((left, right) => left.localeCompare(right));
}

function collectMarkdown(relativeDirectory) {
  return collectFiles(relativeDirectory).filter((relativePath) =>
    [".md", ".mdx"].includes(extname(relativePath)),
  );
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
const docsSiteRoutes = new Map(
  docsSitePaths.map((relativePath) => [documentationRoute(relativePath), relativePath]),
);
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
const positioningDocumentationPaths = publicDocumentationPaths.filter(
  (relativePath) => !relativePath.endsWith("/CHANGELOG.md"),
);
const generatedSiteRoutes = new Set(["/llms.txt", "/llms-full.txt", "/llms-small.txt"]);

function blockquoteContent(line, maximumDepth = Number.POSITIVE_INFINITY) {
  let content = line;
  let depth = 0;
  let marker;

  while (depth < maximumDepth && (marker = /^ {0,3}>[ \t]?/u.exec(content)) !== null) {
    content = content.slice(marker[0].length);
    depth += 1;
  }

  return { content, depth };
}

function visibleMarkdownLines(markdown) {
  const visibleLines = [];
  let fence;

  for (const line of markdown.split(/\r?\n/u)) {
    if (fence !== undefined) {
      const container = blockquoteContent(line, fence.blockquoteDepth);
      if (container.depth === fence.blockquoteDepth) {
        const closing = /^( {0,3})(`{3,}|~{3,})\s*$/u.exec(container.content);
        if (
          closing !== null &&
          closing[2][0] === fence.marker[0] &&
          closing[2].length >= fence.marker.length
        ) {
          fence = undefined;
        }
        continue;
      }

      fence = undefined;
    }

    const container = blockquoteContent(line);
    const opening = /^( {0,3})(`{3,}|~{3,})(.*)$/u.exec(container.content);
    if (opening !== null && !(opening[2][0] === "`" && opening[3].includes("`"))) {
      fence = { marker: opening[2], blockquoteDepth: container.depth };
      continue;
    }

    visibleLines.push(line);
  }

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

function peerDisplayName(packageName) {
  const displayNames = {
    preact: "Preact",
    react: "React",
    "solid-js": "Solid",
    svelte: "Svelte",
    vue: "Vue",
  };

  return displayNames[packageName] ?? packageName;
}

function isEnglishDocumentation(source) {
  return source.includes("README.en.md") || source.includes("/en/");
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
        .map(([name, range]) => `${peerDisplayName(name)} \`${range}\``)
        .join(", ");
    } else if (manifest.name === "@zhuangtai-js/immer") {
      expectedOtherPeers = isEnglishDocumentation(source)
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

  return targets
    .map((target) => {
      if (target.startsWith("https://zhuangtai.yojigen.cn/")) {
        const url = new URL(target);
        return `${url.pathname}${url.search}${url.hash}`;
      }

      return target;
    })
    .filter(
      (target) =>
        target.length > 0 && (target.startsWith("#") || !/^[a-z][a-z\d+.-]*:/iu.test(target)),
    );
}

function normalizeDocumentationRoute(route) {
  const normalized = route.replace(/\/{2,}/gu, "/");
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function documentationRoute(relativePath) {
  const contentRoot = "packages/docs/src/content/docs/";
  assert.ok(relativePath.startsWith(contentRoot));

  const slug = relativePath.slice(contentRoot.length, -extname(relativePath).length);
  return normalizeDocumentationRoute(`/${slug.replace(/(?:^|\/)index$/u, "")}`);
}

function assertMarkdownFragment(sourcePath, targetPath, rawFragment, target) {
  if (rawFragment === undefined || rawFragment.length === 0) {
    return;
  }

  const fragment = decodeURIComponent(rawFragment);
  const anchors = markdownAnchors(readText(targetPath), targetPath);
  assert.ok(anchors.has(fragment), `${sourcePath} links to missing fragment ${target}`);
}

function assertLocalTarget(sourcePath, target) {
  const [rawPath, rawFragment] = target.split("#", 2);
  const pathOnly = decodeURIComponent(rawPath.split("?", 1)[0]);

  if (pathOnly.startsWith("/")) {
    if (generatedSiteRoutes.has(pathOnly)) {
      assert.equal(rawFragment, undefined, `${sourcePath} links to a fragment on ${target}`);
      return;
    }

    const route = normalizeDocumentationRoute(pathOnly);
    const targetPath = docsSiteRoutes.get(route);
    assert.notEqual(targetPath, undefined, `${sourcePath} links to missing site route ${target}`);
    assertMarkdownFragment(sourcePath, targetPath, rawFragment, target);
    return;
  }

  const targetPath = pathOnly.length === 0 ? sourcePath : join(dirname(sourcePath), pathOnly);
  const absoluteTarget = resolve(rootPath, targetPath);

  assert.ok(existsSync(absoluteTarget), `${sourcePath} links to missing path ${target}`);

  if ([".md", ".mdx"].includes(extname(absoluteTarget))) {
    assertMarkdownFragment(sourcePath, targetPath, rawFragment, target);
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

  it("documents framework adapters with manifest-derived ranges and lifecycle boundaries", () => {
    const frameworkAdapters = [
      {
        directory: "preact",
        peer: "preact",
        api: ["useAtomValue", "useSetAtom", "useAtom", "createAtomHook", "createComputedHook"],
      },
      { directory: "svelte", peer: "svelte", api: ["toReadable", "toWritable"] },
      { directory: "vue", peer: "vue", api: ["useAtomValue", "useSetAtom", "useAtom"] },
      {
        directory: "solid",
        peer: "solid-js",
        api: ["createAtomValue", "createSetAtom", "createAtomSignal"],
      },
    ];
    const guidePaths = [
      "packages/docs/src/content/docs/guides/framework-adapters.md",
      "packages/docs/src/content/docs/en/guides/framework-adapters.md",
    ];

    for (const adapter of frameworkAdapters) {
      const packageEntry = publishablePackages.find(
        ({ directory }) => directory === adapter.directory,
      );
      assert.notEqual(packageEntry, undefined);
      const range = packageEntry.manifest.peerDependencies?.[adapter.peer];
      assert.equal(typeof range, "string");

      for (const relativePath of [
        `packages/docs/src/content/docs/reference/${adapter.directory}.md`,
        `packages/docs/src/content/docs/en/reference/${adapter.directory}.md`,
        ...guidePaths,
      ]) {
        const source = readText(relativePath);
        assert.ok(
          source.includes(packageEntry.manifest.name),
          `${relativePath} omits package name`,
        );
        assert.ok(source.includes(range), `${relativePath} omits ${adapter.peer} range ${range}`);
        assertContainsAll(source, adapter.api, relativePath);
      }
    }

    for (const relativePath of guidePaths) {
      assertContainsAll(
        readText(relativePath),
        ["Object.is", "immutable", "Core", "SSR"],
        relativePath,
      );
    }

    const chineseFrameworkGuide = readText(
      "packages/docs/src/content/docs/guides/framework-adapters.md",
    );
    assertContainsAll(
      chineseFrameworkGuide,
      [
        "每个请求",
        "createSSRApp",
        "renderToString",
        "只读取 `atom.get()` snapshot",
        "不安装 Core watcher",
        "只有客户端活动 effect scope 中的读取 API 才会订阅 Core",
        "scope cleanup 自动释放",
      ],
      "packages/docs/src/content/docs/guides/framework-adapters.md",
    );
    assert.ok(
      !chineseFrameworkGuide.includes("renderToString` 完成后会停止组件 scope"),
      "Chinese Vue SSR contract must not claim that SSR installs and then releases a subscription",
    );

    const englishFrameworkGuide = readText(
      "packages/docs/src/content/docs/en/guides/framework-adapters.md",
    );
    assertContainsAll(
      englishFrameworkGuide,
      [
        "per request",
        "createSSRApp",
        "renderToString",
        "only reads an `atom.get()` snapshot",
        "does not install a Core watcher",
        "Only read APIs in an active client effect scope subscribe to Core",
        "scope cleanup registered with `onScopeDispose` releases them",
      ],
      "packages/docs/src/content/docs/en/guides/framework-adapters.md",
    );
    assert.ok(
      !englishFrameworkGuide.includes(
        "renderToString` provides the active component scope and stops that scope after rendering",
      ),
      "English Vue SSR contract must not claim that SSR installs and then releases a subscription",
    );

    const sidebar = readText("packages/docs/astro.config.mjs");
    assertContainsAll(
      sidebar,
      [
        'slug: "guides/framework-adapters"',
        'slug: "reference/preact"',
        'slug: "reference/svelte"',
        'slug: "reference/vue"',
        'slug: "reference/solid"',
      ],
      "packages/docs/astro.config.mjs",
    );

    const frameworkSkill = readText("skills/zhuangtai-framework-adapters/SKILL.md");
    assertContainsAll(
      frameworkSkill,
      [
        "@zhuangtai-js/preact",
        "@zhuangtai-js/svelte",
        "@zhuangtai-js/vue",
        "@zhuangtai-js/solid",
        "per request",
        "Object.is",
      ],
      "skills/zhuangtai-framework-adapters/SKILL.md",
    );
  });

  it("documents Persist sync/async lifecycle, migration, and failure semantics", () => {
    const persistReferencePaths = [
      "packages/docs/src/content/docs/reference/persist.md",
      "packages/docs/src/content/docs/en/reference/persist.md",
    ];

    for (const relativePath of persistReferencePaths) {
      assertContainsAll(
        readText(relativePath),
        [
          "version",
          "migrations",
          "definePersistMigration",
          "version 0",
          "cause",
          "Object.is",
          "PersistMigration",
          "PersistStorage",
          "PersistControls",
          "ready",
          "flush",
          "rehydrate",
          "clear",
          "PromiseLike",
          "SSR",
        ],
        relativePath,
      );
    }

    assertContainsAll(
      readText("packages/docs/src/content/docs/reference/persist.md"),
      [
        "正安全整数",
        "逐步",
        "同步抛错",
        "写回",
        "内存状态保持不变",
        "异步",
        "hydration",
        "const state = createAtom().use(persist)(0",
        "`set()` 同步 fail-closed",
        "`rehydrate()` 和 `clear()` 始终是 lifecycle Promise",
        "queued deferred write error",
      ],
      "packages/docs/src/content/docs/reference/persist.md",
    );
    assertContainsAll(
      readText("packages/docs/src/content/docs/en/reference/persist.md"),
      [
        "positive safe integer",
        "step by step",
        "throws synchronously",
        "write-back",
        "in-memory state stays unchanged",
        "asynchronous",
        "hydration",
        "const state = createAtom().use(persist)(0",
        "fails closed synchronously",
        "`rehydrate()` and `clear()` are always lifecycle Promises",
        "queued deferred write error",
      ],
      "packages/docs/src/content/docs/en/reference/persist.md",
    );

    assertContainsAll(
      readText("skills/zhuangtai-plugins/SKILL.md"),
      ["definePersistMigration", "version 0", "write-back", "future version", "cause"],
      "skills/zhuangtai-plugins/SKILL.md",
    );
    assert.ok(
      readText("skills/zhuangtai/SKILL.md").includes("zhuangtai-framework-adapters"),
      "skills/zhuangtai/SKILL.md must reference the framework adapter skill",
    );
  });

  it("keeps the public playground interactive, bilingual, and Tailwind-only", () => {
    const playgroundPaths = [
      "packages/docs/src/content/docs/playground.mdx",
      "packages/docs/src/content/docs/en/playground.mdx",
    ];

    for (const relativePath of playgroundPaths) {
      const source = readText(relativePath);
      assert.ok(
        source.includes("tableOfContents: true"),
        `${relativePath} must enable the page TOC`,
      );
      assert.ok(
        source.includes("<InteractiveExamples"),
        `${relativePath} must render the interactive React examples`,
      );
    }

    const docsSourcePaths = collectFiles("packages/docs/src");
    const stylesheetPaths = docsSourcePaths.filter((relativePath) =>
      [".css", ".less", ".sass", ".scss"].includes(extname(relativePath)),
    );
    assert.deepEqual(stylesheetPaths, ["packages/docs/src/styles/tailwind.css"]);

    const customUiPaths = docsSourcePaths.filter((relativePath) =>
      [".astro", ".md", ".mdx", ".ts", ".tsx"].includes(extname(relativePath)),
    );
    for (const relativePath of customUiPaths) {
      const source = readText(relativePath);
      assert.equal(
        source.includes("<style"),
        false,
        `${relativePath} adds a handwritten style block`,
      );
      assert.equal(
        /\sstyle\s*=/u.test(source),
        false,
        `${relativePath} adds an inline style attribute`,
      );
    }

    const publicPlaygroundSources = [
      "DESIGN.md",
      ...publicDocumentationPaths,
      ...customUiPaths.filter((relativePath) => relativePath.includes("/components/")),
      "packages/docs/astro.config.mjs",
    ];
    const forbiddenPublicPhrases = [
      "State Lab",
      "直接运行工作区",
      "real workspace packages",
      "调用时间线",
      "同步时间线",
      "进入 CI",
      "built in CI",
      "fixture",
      "探索性验证",
      "exploratory Bun and Deno verification",
    ];
    for (const relativePath of publicPlaygroundSources) {
      const source = readText(relativePath);
      for (const phrase of forbiddenPublicPhrases) {
        assert.equal(
          source.includes(phrase),
          false,
          `${relativePath} exposes internal copy: ${phrase}`,
        );
      }
    }
  });

  it("keeps public positioning focused on shipped capabilities", () => {
    const forbiddenPhrases = [
      "Zustand",
      "zustand",
      "Jotai",
      "jotai",
      "尚无官方指南",
      "暂时没有官方",
      "仍在规划",
      "No official guide",
      "no official adapter",
      "still planned",
    ];

    for (const relativePath of positioningDocumentationPaths) {
      const source = readText(relativePath);
      for (const phrase of forbiddenPhrases) {
        assert.equal(
          source.includes(phrase),
          false,
          `${relativePath} exposes internal or competitor-focused positioning: ${phrase}`,
        );
      }
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
});
