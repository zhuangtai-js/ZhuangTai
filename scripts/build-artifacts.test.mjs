import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

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

describe("build artifacts", () => {
  it("emits package export targets", () => {
    // Given
    const expectedFiles = [
      "packages/core/dist/index.js",
      "packages/core/dist/index.d.ts",
      "packages/persist/dist/index.js",
      "packages/persist/dist/index.d.ts",
    ];

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
    const existingStaleFiles = staleFiles.filter((filePath) => existsSync(join(rootPath, filePath)));

    // Then
    assert.deepEqual(existingStaleFiles, []);
  });

  it("keeps core external in the persist runtime", () => {
    // Given
    const persistRuntime = readFileSync(join(rootPath, "packages/persist/dist/index.js"), "utf8");
    const persistDeclarations = readFileSync(join(rootPath, "packages/persist/dist/index.d.ts"), "utf8");

    // When
    const importsCoreTypes = persistDeclarations.includes("@zhuangtai-js/core");
    const inlinesCoreAtom = persistRuntime.includes("function atom(");
    const inlinesCoreCreator = persistRuntime.includes("function createAtom(");

    // Then
    assert.equal(importsCoreTypes, true);
    assert.equal(inlinesCoreAtom, false);
    assert.equal(inlinesCoreCreator, false);
  });

  it("keeps package manifests pointed at generated exports", () => {
    // Given
    const packages = ["packages/core", "packages/persist"];

    // When
    const missingTargets = packages.flatMap((packagePath) => {
      const manifest = JSON.parse(readFileSync(join(rootPath, packagePath, "package.json"), "utf8"));
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

  it("keeps the core runtime small and the README bundle-size badge present", () => {
    // Given
    const coreRuntime = readFileSync(join(rootPath, "packages/core/dist/index.js"));
    const readme = readFileSync(join(rootPath, "README.md"), "utf8");

    // Then
    assert.ok(coreRuntime.byteLength < 2000, `Expected core runtime below 2 kB, got ${coreRuntime.byteLength} B`);
    assert.ok(readme.includes(CORE_BUNDLE_BADGE_URL));
  });

  it("smokes core and persist consumer APIs from built outputs", async () => {
    const [{ atom, computed, createAtom }, { persist }] = await Promise.all([
      import("../packages/core/dist/index.js"),
      import("../packages/persist/dist/index.js"),
    ]);

    const state = atom(0);
    const derived = computed(state, (value) => String(value));
    const tupleDerived = computed([atom(1), atom("x")], (n, s) => `${n}${s}`);

    assert.equal(state.get(), 0);
    assert.equal(derived.get(), "0");
    assert.equal(tupleDerived.get(), "1x");

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
  });
});
