import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

const targets = Object.freeze([
  { directory: "react", slug: "react", packageName: "@zhuangtai-js/react", peer: "react" },
  { directory: "preact", slug: "preact", packageName: "@zhuangtai-js/preact", peer: "preact" },
  { directory: "vue", slug: "vue", packageName: "@zhuangtai-js/vue", peer: "vue" },
  { directory: "svelte", slug: "svelte", packageName: "@zhuangtai-js/svelte", peer: "svelte" },
  { directory: "solid", slug: "solid", packageName: "@zhuangtai-js/solid", peer: "solid-js" },
  { directory: "persist", packageName: "@zhuangtai-js/persist" },
]);

function readText(relativePath) {
  return readFileSync(join(repositoryRoot, relativePath), "utf8");
}

function hasInstallCommand(content, packages) {
  return content.split(/\r?\n/u).some((line) => {
    if (!line.includes("pnpm add ")) return false;
    return packages.every((packageName) => line.includes(packageName));
  });
}

function checkTarget(target, contents) {
  const errors = [];
  const manifestPath = `packages/${target.directory}/package.json`;
  const manifest = JSON.parse(readText(manifestPath));
  if (manifest.name !== target.packageName) {
    errors.push(`${manifestPath}: missing package target ${target.packageName}`);
  }
  if (!manifest.peerDependencies?.["@zhuangtai-js/core"]) {
    errors.push(`${manifestPath}: missing peer target @zhuangtai-js/core`);
  }
  if (target.peer && !manifest.peerDependencies?.[target.peer]) {
    errors.push(`${manifestPath}: missing peer target ${target.peer}`);
  }

  const installPackages = ["@zhuangtai-js/core", target.packageName];
  if (target.peer) installPackages.push(target.peer);
  const sources = [`packages/${target.directory}/README.md`, "docs/guide/installation.md"];
  if (target.slug) {
    sources.push(
      `packages/docs/src/content/docs/guides/${target.slug}.md`,
      `packages/docs/src/content/docs/en/guides/${target.slug}.md`,
    );
  }
  for (const source of sources) {
    const content = contents[source] ?? readText(source);
    if (!hasInstallCommand(content, installPackages)) {
      errors.push(`${source}: missing install command target ${installPackages.join(" ")}`);
    }
  }
  return errors;
}

export function validateManifestAlignment(contents) {
  return targets.flatMap((target) => checkTarget(target, contents));
}
