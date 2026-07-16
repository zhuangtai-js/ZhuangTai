import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { basename, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const tscPath = join(repoRoot, "node_modules/typescript/bin/tsc");
const fixtureDirectory = join(repoRoot, "scripts/api-types-negative");
const compilerArguments = [
  "--noEmit",
  "--strict",
  "--skipLibCheck",
  "--module",
  "NodeNext",
  "--moduleResolution",
  "NodeNext",
  "--target",
  "ES2022",
  "--lib",
  "ES2022,DOM",
  "--verbatimModuleSyntax",
];
const fixtures = [
  ["core-computed-argument.invalid.ts", "2345"],
  ["core-function-value.invalid.ts", "2345"],
  ["core-internal-atom-creator-args.invalid.ts", "2724"],
  ["core-internal-atom-creator-options.invalid.ts", "2724"],
  ["core-set-wrong-value.invalid.ts", "2345"],
  ["persist-function-value.invalid.ts", "2345"],
  ["persist-invalid-codec.invalid.ts", "2739"],
  ["persist-invalid-storage.invalid.ts", "2739"],
  ["persist-missing-key.invalid.ts", "2741"],
  ["persist-wrong-options-namespace.invalid.ts", "2353"],
];

for (const [fixture, expectedDiagnostic] of fixtures) {
  test(`rejects invalid API fixture: ${fixture}`, (context) => {
    const fixturePath = join(fixtureDirectory, fixture);
    const result = spawnSync(process.execPath, [tscPath, ...compilerArguments, fixturePath], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(result.error, undefined);

    const output = `${result.stdout}\n${result.stderr}`;
    const diagnostics = [...output.matchAll(/error TS(\d+):/gu)].map((match) => match[1]);
    assert.equal(result.status, 1, output);
    assert.deepEqual(diagnostics, [expectedDiagnostic], output);
    assert.ok(output.includes(basename(fixturePath)), output);
    context.diagnostic(`${fixture}: tsc exit 1 with TS${expectedDiagnostic}`);
  });
}
