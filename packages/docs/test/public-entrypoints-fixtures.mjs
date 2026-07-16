import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifestAlignment } from "./public-entrypoints-manifest.mjs";
import {
  exampleTargets,
  homepageCardLinks,
  internalLinks,
  stripNonSemanticMarkdown,
} from "./public-entrypoints-parser.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const docsRoot = join(repositoryRoot, "packages/docs/src/content/docs");

export const frameworkEntrypoints = Object.freeze([
  { label: "React", slug: "react", packageName: "@zhuangtai-js/react", peerPackage: "react" },
  { label: "Preact", slug: "preact", packageName: "@zhuangtai-js/preact", peerPackage: "preact" },
  { label: "Vue", slug: "vue", packageName: "@zhuangtai-js/vue", peerPackage: "vue" },
  { label: "Svelte", slug: "svelte", packageName: "@zhuangtai-js/svelte", peerPackage: "svelte" },
  { label: "Solid", slug: "solid", packageName: "@zhuangtai-js/solid", peerPackage: "solid-js" },
  {
    label: "React Native / Expo",
    slug: "react-native-expo",
    packageName: "@zhuangtai-js/react",
    peerPackage: "react",
  },
]);

export const publicEntryPointFiles = Object.freeze([
  "packages/docs/src/content/docs/index.mdx",
  "packages/docs/src/content/docs/en/index.mdx",
  "packages/docs/src/content/docs/getting-started.md",
  "packages/docs/src/content/docs/en/getting-started.md",
  "packages/docs/src/content/docs/examples.md",
  "packages/docs/src/content/docs/en/examples.md",
  "packages/docs/src/content/docs/integrations.md",
  "packages/docs/src/content/docs/en/integrations.md",
  "README.md",
  "docs/guide/README.en.md",
  "docs/guide/installation.md",
  "packages/persist/README.md",
  ...frameworkEntrypoints
    .filter(({ slug }) => slug !== "react-native-expo")
    .map(({ slug }) => `packages/${slug}/README.md`),
]);

const requiredPackageFiles = Object.freeze([
  {
    source: "README.md",
    packages: [
      "@zhuangtai-js/core",
      "@zhuangtai-js/react",
      "@zhuangtai-js/preact",
      "@zhuangtai-js/vue",
      "@zhuangtai-js/svelte",
      "@zhuangtai-js/solid",
      "@zhuangtai-js/persist",
    ],
  },
  {
    source: "docs/guide/README.en.md",
    packages: [
      "@zhuangtai-js/core",
      "@zhuangtai-js/react",
      "@zhuangtai-js/preact",
      "@zhuangtai-js/vue",
      "@zhuangtai-js/svelte",
      "@zhuangtai-js/solid",
      "@zhuangtai-js/persist",
    ],
  },
  {
    source: "docs/guide/installation.md",
    packages: [
      "@zhuangtai-js/core",
      "@zhuangtai-js/react",
      "@zhuangtai-js/preact",
      "@zhuangtai-js/vue",
      "@zhuangtai-js/svelte",
      "@zhuangtai-js/solid",
      "@zhuangtai-js/persist",
    ],
  },
  { source: "packages/persist/README.md", packages: ["@zhuangtai-js/persist"] },
  ...frameworkEntrypoints
    .filter(({ slug }) => slug !== "react-native-expo")
    .map(({ slug, packageName }) => ({
      source: `packages/${slug}/README.md`,
      packages: [packageName],
    })),
]);

function readText(relativePath) {
  return readFileSync(join(repositoryRoot, relativePath), "utf8");
}

function readManifest(relativePath) {
  return JSON.parse(readText(relativePath));
}

function routeForSource(relativePath) {
  const source = relativePath.replace("packages/docs/src/content/docs/", "");
  if (source === "index.mdx") return "/";
  const localized = source.startsWith("en/");
  const page = localized ? source.slice(3) : source;
  return `/${localized ? "en/" : ""}${page.replace(/\.(?:md|mdx)$/u, "")}/`;
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function collectRoutes() {
  return new Set(
    listFiles(docsRoot)
      .filter((path) => /\.(?:md|mdx)$/u.test(path))
      .map((path) => routeForSource(path.replace(`${repositoryRoot}/`, ""))),
  );
}

function runnableExamples() {
  return readdirSync(join(repositoryRoot, "examples"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .filter((name) => existsSync(join(repositoryRoot, "examples", name, "package.json")))
    .map((name) => ({
      name,
      manifest: readManifest(`examples/${name}/package.json`),
    }))
    .filter(
      ({ manifest }) =>
        typeof manifest.scripts?.dev === "string" && typeof manifest.scripts?.build === "string",
    );
}

function buildContents(overrides = {}) {
  return Object.fromEntries(
    publicEntryPointFiles.map((path) => [path, overrides[path] ?? readText(path)]),
  );
}

function addMissing(errors, source, content, target, kind = "route") {
  if (!stripNonSemanticMarkdown(content).includes(target)) {
    errors.push(`${source}: missing ${kind} target ${target}`);
  }
}

export function validatePublicEntryPoints(overrides = {}) {
  const contents = buildContents(overrides.contents);
  const routes = collectRoutes();
  const errors = [];

  for (const locale of ["zh", "en"]) {
    const prefix = locale === "zh" ? "" : "/en";
    const homepageSource = `packages/docs/src/content/docs/${locale === "zh" ? "index.mdx" : "en/index.mdx"}`;
    const homepage = contents[homepageSource];
    const cards = homepageCardLinks(homepage);
    for (const guide of frameworkEntrypoints) {
      const expected = `${prefix}/guides/${guide.slug}/`;
      addMissing(errors, homepageSource, homepage, expected);
      const actual = cards.get(guide.label) ?? "<missing>";
      if (actual !== expected) {
        errors.push(
          `${homepageSource}: card "${guide.label}" expected href ${expected} actual href ${actual}`,
        );
      }
    }

    for (const page of ["getting-started.md", "examples.md", "integrations.md"]) {
      const source = `packages/docs/src/content/docs/${locale === "zh" ? page : `en/${page}`}`;
      for (const guide of frameworkEntrypoints) {
        addMissing(errors, source, contents[source], `${prefix}/guides/${guide.slug}/`);
      }
    }
  }

  for (const [source, content] of Object.entries(contents)) {
    for (const target of internalLinks(content)) {
      if (!routes.has(target)) errors.push(`${source}: missing route target ${target}`);
    }
  }

  for (const { source, packages } of requiredPackageFiles) {
    for (const packageName of packages)
      addMissing(errors, source, contents[source], packageName, "package");
  }

  for (const [source, prefix] of [
    ["README.md", ""],
    ["docs/guide/README.en.md", "/en"],
  ]) {
    for (const guide of frameworkEntrypoints) {
      addMissing(errors, source, contents[source], `${prefix}/guides/${guide.slug}/`);
    }
  }

  for (const guide of frameworkEntrypoints.filter(({ slug }) => slug !== "react-native-expo")) {
    const source = `packages/${guide.slug}/README.md`;
    addMissing(errors, source, contents[source], `/guides/${guide.slug}/`);
    addMissing(errors, source, contents[source], `/en/guides/${guide.slug}/`);
  }
  for (const target of ["/guides/react-native-expo/", "/en/guides/react-native-expo/"]) {
    addMissing(
      errors,
      "packages/persist/README.md",
      contents["packages/persist/README.md"],
      target,
    );
  }

  errors.push(...validateManifestAlignment(contents));

  for (const locale of ["zh", "en"]) {
    const source =
      locale === "zh"
        ? "packages/docs/src/content/docs/examples.md"
        : "packages/docs/src/content/docs/en/examples.md";
    const content = contents[source];
    const expectedLanguage =
      locale === "zh"
        ? ["计数器", "任务清单", "偏好设置"]
        : ["counter", "task list", "preferences"];
    for (const phrase of expectedLanguage)
      addMissing(errors, source, content.toLowerCase(), phrase.toLowerCase(), "copy-ready example");
    addMissing(
      errors,
      source,
      content,
      locale === "zh" ? "/playground/" : "/en/playground/",
      "copy-ready example",
    );
    for (const example of runnableExamples()) {
      addMissing(errors, source, content, `examples/${example.name}`, "runnable example");
      addMissing(errors, source, content, example.manifest.name, "runnable example package");
    }
    for (const name of exampleTargets(content)) {
      const directory = join(repositoryRoot, "examples", name);
      if (!statSync(directory, { throwIfNoEntry: false })) {
        errors.push(`${source}: missing example target examples/${name}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`public entrypoint guard failed:\n- ${errors.join("\n- ")}`);
  }
}

export function readPublicContents() {
  return buildContents();
}
