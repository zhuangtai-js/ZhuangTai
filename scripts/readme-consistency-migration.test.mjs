import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const legacySuite = fileURLToPath(new URL("./readme-consistency.test.mjs", import.meta.url));
const migratedChecks = [
  "documents framework adapters with manifest-derived ranges and lifecycle boundaries",
  "derives the documented React support range from peerDependencies",
];
const focusedSuites = [
  "test/react-native-expo-framework-guard.test.mjs",
  "test/react-native-expo-semantics.test.mjs",
];

function summaryCount(output, label) {
  const match = output.match(new RegExp(`^# ${label} (\\d+)$`, "m"));
  assert.ok(match, `legacy TAP output must report ${label}`);
  return Number(match[1]);
}

test("audits the unchanged README suite and its complete focused replacement", (context) => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--test", "--test-reporter=tap", legacySuite], {
    encoding: "utf8",
    env,
  });
  assert.equal(result.error, undefined);

  const output = `${result.stdout}\n${result.stderr}`;
  const failedChecks = [...output.matchAll(/^    not ok \d+ - (.+)$/gm)].map(([, name]) => name);

  assert.equal(result.status, 1, output);
  assert.equal(summaryCount(output, "tests"), 15, output);
  assert.equal(summaryCount(output, "pass"), 13, output);
  assert.equal(summaryCount(output, "fail"), 2, output);
  assert.deepEqual(failedChecks, migratedChecks, output);

  const focusedResult = spawnSync(
    "pnpm",
    ["--filter", "docs", "exec", "vitest", "run", ...focusedSuites],
    { cwd: repoRoot, encoding: "utf8", env },
  );
  assert.equal(focusedResult.error, undefined);
  assert.equal(
    focusedResult.status,
    0,
    `${focusedResult.stdout}
${focusedResult.stderr}`,
  );
  context.diagnostic(
    `legacy suite remains 13/15; focused framework/React parity and Expo semantics passed: ${focusedSuites.join(" | ")}`,
  );
});
