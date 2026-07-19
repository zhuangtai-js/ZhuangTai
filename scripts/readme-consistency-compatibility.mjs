import assert from "node:assert/strict";
import { publishablePackages } from "./readme-consistency-context.mjs";
import { commands, visibleMarkdownLines } from "./readme-consistency-markdown.mjs";

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

export {
  assertCompatibilityMatrix,
  assertContainsAll,
  assertInstallSection,
  installPackages,
  installationGuideRows,
  supportedReactMajors,
};
