import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { gzipSync } from "node:zlib";

const rootPath = new URL("..", import.meta.url).pathname;

function readManifest(packagePath) {
  return JSON.parse(readFileSync(join(rootPath, packagePath, "package.json"), "utf8"));
}

function assertPackageManifest(packagePath) {
  const manifest = readManifest(packagePath);

  assert.deepEqual(manifest.files, ["CHANGELOG.md", "dist/index.d.ts", "dist/index.js"]);
  assert.equal(manifest.module, "./dist/index.js");
  assert.equal(manifest.types, "./dist/index.d.ts");
  assert.equal(manifest.exports["."].import, manifest.module);
  assert.equal(manifest.exports["."].types, manifest.types);
}

const CORE_BUNDLE_BADGE_URL =
  "https://img.shields.io/bundlephobia/minzip/%40zhuangtai-js%2Fcore?label=bundle%20size&style=flat&colorA=000000&colorB=000000";

const publishablePackagePaths = [
  "packages/core",
  "packages/freeze",
  "packages/immer",
  "packages/persist",
  "packages/preact",
  "packages/react",
  "packages/solid",
  "packages/svelte",
  "packages/sync",
  "packages/vue",
];

describe("build artifacts", () => {
  it("emits package export targets", () => {
    // Given
    const expectedFiles = publishablePackagePaths.flatMap((packagePath) => [
      `${packagePath}/dist/index.js`,
      `${packagePath}/dist/index.d.ts`,
    ]);

    // When
    const missingFiles = expectedFiles.filter((filePath) => !existsSync(join(rootPath, filePath)));

    // Then
    assert.deepEqual(missingFiles, []);
  });

  it("removes stale bundleless core runtime files", () => {
    // Given
    const staleFiles = [
      "packages/core/dist/atom.js",
      "packages/core/dist/computed.js",
      "packages/core/dist/types.js",
    ];

    // When
    const existingStaleFiles = staleFiles.filter((filePath) =>
      existsSync(join(rootPath, filePath)),
    );

    // Then
    assert.deepEqual(existingStaleFiles, []);
  });

  it("keeps core external in the persist runtime", () => {
    // Given
    const persistRuntime = readFileSync(join(rootPath, "packages/persist/dist/index.js"), "utf8");
    const persistDeclarations = readFileSync(
      join(rootPath, "packages/persist/dist/index.d.ts"),
      "utf8",
    );

    // When
    const importsCoreTypes = persistDeclarations.includes("@zhuangtai-js/core");
    const inlinesCoreAtom = persistRuntime.includes("function atom(");
    const inlinesCoreCreator = persistRuntime.includes("function createAtom(");

    // Then
    assert.equal(importsCoreTypes, true);
    assert.equal(inlinesCoreAtom, false);
    assert.equal(inlinesCoreCreator, false);
  });

  it("keeps core and framework runtimes external in framework adapters", () => {
    const expectedRuntimeImports = {
      "packages/preact": ['from "preact/compat"', 'from "preact/hooks"'],
      "packages/solid": ['from "solid-js"'],
      "packages/svelte": [],
      "packages/vue": ['from "vue"'],
    };

    for (const [packagePath, runtimeImports] of Object.entries(expectedRuntimeImports)) {
      const runtime = readFileSync(join(rootPath, packagePath, "dist/index.js"), "utf8");
      const declarations = readFileSync(join(rootPath, packagePath, "dist/index.d.ts"), "utf8");

      assert.ok(declarations.includes("@zhuangtai-js/core"));
      assert.equal(runtime.includes("function atom("), false);
      assert.equal(runtime.includes("function createAtom("), false);

      for (const runtimeImport of runtimeImports) {
        assert.ok(runtime.includes(runtimeImport));
      }
    }
  });

  it("pins the persist 0.5.0 public release surface", () => {
    const manifest = readManifest("packages/persist");
    const runtime = readFileSync(join(rootPath, "packages/persist/dist/index.js"), "utf8");
    const declarations = readFileSync(join(rootPath, "packages/persist/dist/index.d.ts"), "utf8");

    assert.equal(manifest.version, "0.5.0");
    assert.equal(manifest.dependencies?.["@react-native-async-storage/async-storage"], undefined);
    assert.equal(manifest.peerDependencies?.["@react-native-async-storage/async-storage"], undefined);
    assert.equal(runtime.includes("AsyncStorage"), false);
    assert.equal(runtime.includes("async-storage"), false);
    assert.equal(declarations.includes("AsyncStorage"), false);
    assert.equal(declarations.includes("async-storage"), false);
  });

  it("keeps package manifests pointed at generated exports", () => {
    // Given
    const packages = publishablePackagePaths;

    // When
    const missingTargets = packages.flatMap((packagePath) => {
      const manifest = JSON.parse(
        readFileSync(join(rootPath, packagePath, "package.json"), "utf8"),
      );
      const importTarget = manifest.exports["."].import.slice(2);
      const typesTarget = manifest.exports["."].types.slice(2);

      return [importTarget, typesTarget]
        .map((targetPath) => join(packagePath, targetPath))
        .filter((targetPath) => !existsSync(join(rootPath, targetPath)));
    });

    // Then
    assert.deepEqual(missingTargets, []);
    packages.forEach(assertPackageManifest);
  });

  it("declares only the verified peer compatibility ranges", () => {
    // Given
    const expectedPeerDependencies = {
      "packages/freeze": { "@zhuangtai-js/core": "^0.5.0" },
      "packages/immer": { "@zhuangtai-js/core": "^0.5.0" },
      "packages/persist": { "@zhuangtai-js/core": "^0.5.0" },
      "packages/preact": {
        "@zhuangtai-js/core": "^0.5.0",
        preact: ">=10.9 <11",
      },
      "packages/react": {
        "@zhuangtai-js/core": "^0.5.0",
        react: ">=18 <20",
      },
      "packages/solid": {
        "@zhuangtai-js/core": "^0.5.0",
        "solid-js": ">=1.5 <2",
      },
      "packages/svelte": {
        "@zhuangtai-js/core": "^0.5.0",
        svelte: ">=4.2 <6",
      },
      "packages/sync": { "@zhuangtai-js/core": "^0.5.0" },
      "packages/vue": {
        "@zhuangtai-js/core": "^0.5.0",
        vue: ">=3.2 <4",
      },
    };

    // When / Then
    for (const [packagePath, expectedPeers] of Object.entries(expectedPeerDependencies)) {
      const manifest = readManifest(packagePath);

      assert.deepEqual(manifest.peerDependencies, expectedPeers);
      assert.equal(Object.values(manifest.peerDependencies).includes("*"), false);
    }
  });

  it("keeps the core runtime small and the README bundle-size badge present", () => {
    // Given: the runtime ships unminified (consumers' bundlers minify), so the
    // size guard measures gzipped transfer cost, matching the README badge.
    const coreRuntime = readFileSync(join(rootPath, "packages/core/dist/index.js"));
    const gzippedSize = gzipSync(coreRuntime).byteLength;
    const readme = readFileSync(join(rootPath, "README.md"), "utf8");

    // Then
    assert.ok(gzippedSize < 3000, `Expected gzipped core runtime below 3 kB, got ${gzippedSize} B`);
    assert.ok(readme.includes(CORE_BUNDLE_BADGE_URL));
  });

  it("smokes core, persist, and framework adapter APIs from built outputs", async () => {
    const [
      { atom, computed, createAtom },
      { persist },
      preactAdapter,
      solidAdapter,
      svelteAdapter,
      vueAdapter,
    ] = await Promise.all([
      import("../packages/core/dist/index.js"),
      import("../packages/persist/dist/index.js"),
      import("../packages/preact/dist/index.js"),
      import("../packages/solid/dist/index.js"),
      import("../packages/svelte/dist/index.js"),
      import("../packages/vue/dist/index.js"),
    ]);

    const state = atom(0);
    const derived = computed(() => String(state.get()));
    const multiDerived = computed(() => `${atom(1).get()}${atom("x").get()}`);

    assert.equal(state.get(), 0);
    assert.equal(derived.get(), "0");
    assert.equal(multiDerived.get(), "1x");

    state.set(1);
    assert.equal(derived.get(), "1");

    const data = new Map();
    const storage = {
      getItem(key) {
        return data.get(key) ?? null;
      },
      setItem(key, value) {
        data.set(key, value);
      },
      removeItem(key) {
        data.delete(key);
      },
    };

    const createPersistedAtom = createAtom().use(persist);
    const persisted = createPersistedAtom(5, { persist: { key: "counter", storage } });

    assert.equal(persisted.get(), 5);
    persisted.set(6);
    assert.equal(data.get("counter"), "6");

    const useCount = preactAdapter.createAtomHook(state);
    const useDerived = preactAdapter.createComputedHook(derived);
    assert.equal(typeof useCount, "function");
    assert.equal(typeof useDerived, "function");

    const svelteStore = svelteAdapter.toWritable(state);
    svelteStore.update((value) => value + 1);
    assert.equal(state.get(), 2);

    vueAdapter.useSetAtom(state)(3);
    assert.equal(state.get(), 3);

    solidAdapter.createSetAtom(state)(4);
    assert.equal(state.get(), 4);
  });

  it("builds docs workspace dependencies before deployment", () => {
    const workflow = readFileSync(join(rootPath, ".github/workflows/docs-deploy.yml"), "utf8");

    assert.match(workflow, /pnpm --filter ["']docs\.\.\.["'] build/u);
  });

  it("redirects removed public docs routes", () => {
    const redirects = {
      "benchmarks/index.html": "/why-zhuangtai/",
      "compare/index.html": "/why-zhuangtai/",
      "roadmap/index.html": "/integrations/",
      "en/benchmarks/index.html": "/en/why-zhuangtai/",
      "en/compare/index.html": "/en/why-zhuangtai/",
      "en/roadmap/index.html": "/en/integrations/",
    };

    for (const [relativePath, destination] of Object.entries(redirects)) {
      const redirectPage = readFileSync(join(rootPath, "packages/docs/dist", relativePath), "utf8");
      assert.ok(
        redirectPage.includes(destination),
        `${relativePath} does not redirect to ${destination}`,
      );
    }
  });
});
