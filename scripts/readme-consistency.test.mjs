import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const rootPath = fileURLToPath(new URL("..", import.meta.url));
const packageDirectories = ["core", "freeze", "immer", "persist", "react", "sync"];
const rootReadmePaths = ["README.md", "docs/guide/README.en.md"];
const packageReadmePaths = packageDirectories.map((name) => `packages/${name}/README.md`);
const readmePaths = [...rootReadmePaths, ...packageReadmePaths];

function readText(relativePath) {
  return readFileSync(join(rootPath, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function visibleMarkdownLines(markdown, source = "Markdown") {
  const visibleLines = [];
  let fence;

  for (const line of markdown.split(/\r?\n/u)) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/u)?.[1];

    if (marker !== undefined) {
      if (fence === undefined) {
        fence = marker;
      } else if (marker[0] === fence[0] && marker.length >= fence.length) {
        fence = undefined;
      }
      continue;
    }

    if (fence === undefined) {
      visibleLines.push(line);
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

function localMarkdownTargets(markdown) {
  return [...markdown.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/gu)]
    .map((match) => match[1].trim().replace(/^<|>$/gu, ""))
    .map((target) => target.split(/\s+["']/u, 1)[0])
    .filter((target) => target.length > 0 && !target.startsWith("#"))
    .filter((target) => !/^[a-z][a-z\d+.-]*:/iu.test(target));
}

describe("README consistency", () => {
  it("parses headings outside code fences and rejects unclosed fences", () => {
    const markdown = "# Title\n\n```sh\n# command comment\n```\n\n## Section";

    assert.deepEqual(
      visibleMarkdownLines(markdown).filter((line) => /^#{1,6} /u.test(line)),
      ["# Title", "## Section"],
    );
    assert.throws(
      () => visibleMarkdownLines("```sh\ncommand", "fixture.md"),
      /unclosed code fence/u,
    );
  });

  it("keeps Chinese and English root README structures aligned", () => {
    const headingLevels = rootReadmePaths.map((relativePath) =>
      visibleMarkdownLines(readText(relativePath), relativePath)
        .filter((line) => /^#{1,6} /u.test(line))
        .map((line) => line.indexOf(" ")),
    );

    assert.deepEqual(headingLevels[1], headingLevels[0]);
  });

  it("derives the compatibility matrix from package manifests", () => {
    const manifests = packageDirectories.map((name) => readJson(`packages/${name}/package.json`));
    const extensions = manifests.filter((manifest) => manifest.name !== "@zhuangtai-js/core");

    for (const relativePath of rootReadmePaths) {
      const readme = readText(relativePath);

      for (const manifest of manifests) {
        assert.ok(
          readme.includes(`@zhuangtai-js/${manifest.name.split("/")[1]}`),
          `${relativePath} omits ${manifest.name}`,
        );
      }

      for (const manifest of extensions) {
        const coreRange = manifest.peerDependencies?.["@zhuangtai-js/core"];
        assert.equal(typeof coreRange, "string", `${manifest.name} must declare a core peer range`);
        assert.ok(
          readme.includes(`${manifest.name}@${releaseLine(manifest.version)}`),
          `${relativePath} has a stale release line for ${manifest.name}`,
        );
        assert.ok(
          readme.includes(`\`${coreRange}\``),
          `${relativePath} omits ${manifest.name}'s core peer range`,
        );
      }

      const react = manifests.find((manifest) => manifest.name === "@zhuangtai-js/react");
      assert.notEqual(react, undefined);
      assert.ok(readme.includes(`React \`${react.peerDependencies.react}\``));
    }
  });

  it("keeps package README navigation and install commands complete", () => {
    for (const name of packageDirectories) {
      const relativePath = `packages/${name}/README.md`;
      const readme = readText(relativePath);
      const manifest = readJson(`packages/${name}/package.json`);
      const packages = installPackages(manifest).join(" ");

      assert.ok(
        readme.includes('<a href="#english">English</a>'),
        `${relativePath} lacks English navigation`,
      );
      assert.ok(
        readme.includes('<a id="english"></a>'),
        `${relativePath} lacks the English anchor`,
      );
      assert.ok(
        readme.includes(`npm install ${packages}`),
        `${relativePath} has a stale npm command`,
      );
      assert.ok(
        readme.includes(`pnpm add ${packages}`),
        `${relativePath} has a stale pnpm command`,
      );
    }

    const immerReadme = readText("packages/immer/README.md");
    assert.equal(/(?:npm install|pnpm add)[^\n]*\simmer(?:\s|$)/u.test(immerReadme), false);
  });

  it("keeps all local Markdown links resolvable", () => {
    for (const relativePath of readmePaths) {
      const markdown = readText(relativePath);

      for (const target of localMarkdownTargets(markdown)) {
        const pathOnly = decodeURIComponent(target.split(/[?#]/u, 1)[0]);
        const resolvedPath = resolve(rootPath, dirname(relativePath), pathOnly);
        assert.ok(existsSync(resolvedPath), `${relativePath} links to missing path ${target}`);
      }
    }
  });

  it("rejects stale package names and known incorrect claims", () => {
    const forbiddenPatterns = [
      /@zhuangtai\//u,
      /@zhuangtai\/core/u,
      /(?:npm install|pnpm add)\s+zhuangtai(?:\s|$)/u,
      /`zhuangtai`/u,
      /\^0\.4\.0/u,
      /React 18 or later/u,
      /React 18 或更高版本/u,
      /always produces a brand-new/u,
      /全新的不可变引用/u,
      /重复安装同一个插件会返回行为相同/u,
    ];

    for (const relativePath of readmePaths) {
      const readme = readText(relativePath);

      for (const pattern of forbiddenPatterns) {
        assert.equal(
          pattern.test(readme),
          false,
          `${relativePath} matches forbidden pattern ${pattern}`,
        );
      }
    }
  });
});
