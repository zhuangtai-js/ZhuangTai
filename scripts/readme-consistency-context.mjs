import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
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

export {
  collectFiles,
  collectMarkdown,
  currentDocumentationPaths,
  docsSitePaths,
  docsSiteRoutes,
  generatedSiteRoutes,
  normalizeDocumentationRoute,
  positioningDocumentationPaths,
  publicDocumentationPaths,
  publishablePackages,
  readText,
  rootPath,
  rootReadmePaths,
  skillDocumentationPaths,
};
