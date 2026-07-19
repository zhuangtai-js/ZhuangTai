import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adapterCompatibilityCases } from "./pack-consumer-adapter-fixtures.mjs";
import { packWorkspacePackage, rootPath, run } from "./pack-consumer-harness.mjs";

export function runAdapterCompatibilityCase() {
  const packPath = mkdtempSync(join(tmpdir(), "zhuangtai-adapter-packs-"));

  try {
    const corePackage = packWorkspacePackage("packages/core", packPath);
    const adapterPackages = new Map(
      adapterCompatibilityCases.map(({ adapter }) => [
        adapter,
        packWorkspacePackage(`packages/${adapter}`, packPath),
      ]),
    );

    for (const compatibilityCase of adapterCompatibilityCases) {
      const adapterPackage = adapterPackages.get(compatibilityCase.adapter);
      assert.ok(adapterPackage);

      for (const frameworkVersion of compatibilityCase.versions) {
        const consumerPath = mkdtempSync(
          join(tmpdir(), `zhuangtai-${compatibilityCase.adapter}-${frameworkVersion}-`),
        );

        try {
          const dependencies = {
            "@zhuangtai-js/core": `file:${corePackage.tarballPath}`,
            [`@zhuangtai-js/${compatibilityCase.adapter}`]: `file:${adapterPackage.tarballPath}`,
            [compatibilityCase.framework]: frameworkVersion,
          };
          const expectedDependencies = [
            "@zhuangtai-js/core",
            `@zhuangtai-js/${compatibilityCase.adapter}`,
            compatibilityCase.framework,
          ].toSorted();

          assert.deepEqual(Object.keys(dependencies).toSorted(), expectedDependencies);
          writeFileSync(
            join(consumerPath, "package.json"),
            `${JSON.stringify(
              {
                name: `zhuangtai-${compatibilityCase.adapter}-${frameworkVersion}-consumer`,
                private: true,
                type: "module",
                dependencies,
              },
              null,
              2,
            )}\n`,
          );
          writeFileSync(
            join(consumerPath, "pnpm-workspace.yaml"),
            `overrides:\n  "@zhuangtai-js/core": "file:${corePackage.tarballPath}"\n`,
          );

          run("pnpm", ["install", "--strict-peer-dependencies"], { cwd: consumerPath });
          run(
            "node",
            [
              ...(compatibilityCase.nodeArgs ?? []),
              "--input-type=module",
              "--eval",
              compatibilityCase.runtime,
            ],
            { cwd: consumerPath },
          );
          writeFileSync(join(consumerPath, "smoke.ts"), `${compatibilityCase.types}\n`);
          run(
            join(rootPath, "node_modules/.bin/tsc"),
            [
              "--module",
              "NodeNext",
              "--moduleResolution",
              "NodeNext",
              "--target",
              "ES2022",
              "--strict",
              "--skipLibCheck",
              "--noEmit",
              "smoke.ts",
            ],
            { cwd: consumerPath },
          );
        } finally {
          rmSync(consumerPath, { force: true, recursive: true });
        }
      }
    }
  } finally {
    rmSync(packPath, { force: true, recursive: true });
  }
}
