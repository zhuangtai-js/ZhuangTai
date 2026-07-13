import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

const rootPath = new URL("..", import.meta.url).pathname;
const adapterNames = ["preact", "svelte", "vue", "solid"];

function listTestFiles(directoryPath) {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return listTestFiles(entryPath);
    }

    return entry.name.includes(".test.") ? [entryPath] : [];
  });
}

function importsPackage(source, packageName) {
  const importSpecifiers = source.matchAll(
    /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(["'])([^"']+)\1/g,
  );

  return Array.from(importSpecifiers, (match) => match[2]).some(
    (specifier) => specifier === packageName || specifier?.startsWith(`${packageName}/`),
  );
}

describe("package-local adapter tests", () => {
  it("lists adapter sources in the composite test project", () => {
    const testConfig = JSON.parse(
      readFileSync(join(rootPath, "packages/test/tsconfig.json"), "utf8"),
    );
    const missingSources = adapterNames
      .map((adapterName) => `../${adapterName}/src`)
      .filter((sourcePath) => !testConfig.include.includes(sourcePath));

    assert.deepEqual(missingSources, []);
  });

  it("do not resolve generated self exports during clean checks", () => {
    const selfImports = adapterNames.flatMap((adapterName) => {
      const packageName = `@zhuangtai-js/${adapterName}`;
      const testPath = join(rootPath, "packages/test/test", adapterName);

      return listTestFiles(testPath)
        .filter((filePath) => importsPackage(readFileSync(filePath, "utf8"), packageName))
        .map((filePath) => relative(rootPath, filePath));
    });

    assert.deepEqual(
      selfImports,
      [],
      "Package-local adapter tests must import source directly instead of requiring dist first",
    );
  });
});
