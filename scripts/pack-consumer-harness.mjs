import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fixturePackedPackageName } from "./publish-workspaces-test-fixtures.mjs";

export const rootPath = new URL("..", import.meta.url).pathname;

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  return result;
}

export function readManifest(packagePath) {
  return JSON.parse(readFileSync(join(rootPath, packagePath, "package.json"), "utf8"));
}

export function assertPackedFiles(tarballPath) {
  const files = run("tar", ["-tzf", tarballPath]).stdout.trim().split("\n");

  assert.equal(
    files.some((file) => file.endsWith(".js.map")),
    false,
  );
  assert.equal(
    files.some((file) => file.endsWith("dist/index.js")),
    true,
  );
  assert.equal(
    files.some((file) => file.endsWith("dist/index.d.ts")),
    true,
  );
  assert.equal(
    files.some((file) => file.endsWith("CHANGELOG.md")),
    true,
  );
  assert.equal(
    files.some((file) => file.endsWith("LICENSE")),
    true,
  );
}

export function assertPersistPackedFiles(tarballPath) {
  const files = run("tar", ["-tzf", tarballPath]).stdout.trim().split("\n").toSorted();

  assert.deepEqual(files, [
    "package/CHANGELOG.md",
    "package/LICENSE",
    "package/README.md",
    "package/dist/index.d.ts",
    "package/dist/index.js",
    "package/package.json",
  ]);

  const runtime = run("tar", ["-xOzf", tarballPath, "package/dist/index.js"]).stdout;
  const declarations = run("tar", ["-xOzf", tarballPath, "package/dist/index.d.ts"]).stdout;

  assert.equal(runtime.includes("function atom("), false);
  assert.equal(runtime.includes("function createAtom("), false);
  assert.equal(runtime.includes("AsyncStorage"), false);
  assert.equal(runtime.includes("async-storage"), false);
  assert.equal(declarations.includes("AsyncStorage"), false);
  assert.equal(declarations.includes("async-storage"), false);
}

export function packWorkspacePackage(packagePath, destinationPath) {
  const manifest = readManifest(packagePath);
  const workspacePackage = { manifest };
  run("pnpm", ["--filter", manifest.name, "pack", "--pack-destination", destinationPath]);
  const tarballPath = join(destinationPath, fixturePackedPackageName(workspacePackage));

  assert.equal(existsSync(tarballPath), true);
  assertPackedFiles(tarballPath);

  return { manifest, tarballPath };
}
