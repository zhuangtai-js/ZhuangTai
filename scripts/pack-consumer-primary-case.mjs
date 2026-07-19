import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertPersistPackedFiles, packWorkspacePackage, run } from "./pack-consumer-harness.mjs";
import {
  primaryConsumerRuntime,
  primaryConsumerTypes,
  primaryPackagePaths,
} from "./pack-consumer-primary-fixtures.mjs";
import { persistStableCandidate } from "./publish-workspaces-test-fixtures.mjs";

function requiredPackedPackage(packages, packageName) {
  const packedPackage = packages.get(packageName);
  assert.ok(packedPackage);
  return packedPackage;
}

export function runPrimaryPackConsumerCase() {
  const tempPath = mkdtempSync(join(tmpdir(), "zhuangtai-pack-consumer-"));

  try {
    const packedPackages = new Map(
      primaryPackagePaths.map((packagePath) => {
        const packedPackage = packWorkspacePackage(packagePath, tempPath);
        return [packedPackage.manifest.name, packedPackage];
      }),
    );
    const corePackage = requiredPackedPackage(packedPackages, "@zhuangtai-js/core");
    const persistPackage = requiredPackedPackage(
      packedPackages,
      persistStableCandidate.manifest.name,
    );

    assert.deepEqual(
      {
        name: persistPackage.manifest.name,
        version: persistPackage.manifest.version,
        peerDependencies: persistPackage.manifest.peerDependencies,
      },
      persistStableCandidate.manifest,
    );
    assertPersistPackedFiles(persistPackage.tarballPath);

    const dependencies = Object.fromEntries(
      [...packedPackages].map(([packageName, packedPackage]) => [
        packageName,
        `file:${packedPackage.tarballPath}`,
      ]),
    );
    Object.assign(dependencies, {
      "@types/react": "^19.2.0",
      react: "^19.2.0",
      typescript: "rc",
    });

    writeFileSync(
      join(tempPath, "package.json"),
      `${JSON.stringify(
        {
          name: "zhuangtai-pack-consumer",
          private: true,
          type: "module",
          dependencies,
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      join(tempPath, "pnpm-workspace.yaml"),
      `overrides:\n  "@zhuangtai-js/core": "file:${corePackage.tarballPath}"\n`,
    );

    run("pnpm", ["install"], { cwd: tempPath });
    run("node", ["--input-type=module", "-e", primaryConsumerRuntime], { cwd: tempPath });
    writeFileSync(join(tempPath, "smoke.ts"), `${primaryConsumerTypes}\n`);
    run(
      "pnpm",
      [
        "exec",
        "tsc",
        "--module",
        "NodeNext",
        "--moduleResolution",
        "NodeNext",
        "--target",
        "ES2022",
        "--strict",
        "--noEmit",
        "smoke.ts",
      ],
      { cwd: tempPath },
    );
  } finally {
    rmSync(tempPath, { force: true, recursive: true });
  }
}
