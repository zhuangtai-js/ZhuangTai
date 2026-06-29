import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const rootPath = new URL("..", import.meta.url).pathname;

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
  });
});
