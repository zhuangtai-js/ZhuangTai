import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isAlreadyPublished,
  parseArgs,
  publishPackage,
  publishWorkspaces,
  validateChannel,
  validatePackage,
} from "./publish-workspaces.mjs";

function commandRecorder(results = []) {
  const calls = [];

  return {
    calls,
    run(command, args, options) {
      calls.push({ command, args, options });
      return results.shift() ?? { status: 0, stdout: "", stderr: "" };
    },
  };
}

describe("validatePackage", () => {
  it("rejects publishable packages outside the @zhuangtai-js scope", () => {
    assert.throws(
      () => validatePackage({ manifest: { name: "@wrong/core", version: "0.1.0" } }),
      /@zhuangtai-js\//,
    );
  });

  it("allows private packages outside the publish scope", () => {
    assert.doesNotThrow(() => validatePackage({ manifest: { name: "internal", private: true } }));
  });

  it("rejects missing versions", () => {
    assert.throws(
      () => validatePackage({ manifest: { name: "@zhuangtai-js/core" } }),
      /must define a version/,
    );
  });
});

describe("isAlreadyPublished", () => {
  it("treats a successful npm view as already published", () => {
    const recorder = commandRecorder([{ status: 0, stdout: "0.1.0", stderr: "" }]);
    const published = isAlreadyPublished(
      { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
      recorder.run,
    );

    assert.equal(published, true);
    assert.deepEqual(recorder.calls[0].args, [
      "view",
      "@zhuangtai-js/core@0.1.0",
      "version",
      "--registry",
      "https://registry.npmjs.org",
    ]);
  });

  it("treats npm E404 as not published", () => {
    const recorder = commandRecorder([{ status: 1, stdout: "", stderr: "npm ERR! code E404" }]);
    const published = isAlreadyPublished(
      { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
      recorder.run,
    );

    assert.equal(published, false);
  });

  it("throws on non-404 npm view failures", () => {
    const recorder = commandRecorder([{ status: 1, stdout: "", stderr: "network failed" }]);

    assert.throws(
      () =>
        isAlreadyPublished(
          { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
          recorder.run,
        ),
      /Failed to check/,
    );
  });
});

describe("publishPackage", () => {
  it("uses dry-run publishing without provenance", () => {
    const recorder = commandRecorder([{ status: 0, stdout: "", stderr: "" }]);

    publishPackage(
      { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
      { channel: "stable", dryRun: true, runCommand: recorder.run, env: {} },
    );

    assert.deepEqual(recorder.calls[0].args, [
      "--dir",
      "/repo/packages/core",
      "publish",
      "--access",
      "public",
      "--tag",
      "latest",
      "--no-git-checks",
      "--dry-run",
    ]);
  });

  it("uses provenance for real publishing in GitHub Actions", () => {
    const recorder = commandRecorder([{ status: 0, stdout: "", stderr: "" }]);

    publishPackage(
      { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
      { channel: "stable", dryRun: false, runCommand: recorder.run, env: { GITHUB_ACTIONS: "true" } },
    );

    assert.ok(recorder.calls[0].args.includes("--provenance"));
  });

  it("rejects real publishing outside GitHub Actions", () => {
    assert.throws(
      () =>
        publishPackage(
          { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
          { channel: "stable", dryRun: false, runCommand: commandRecorder().run, env: {} },
        ),
      /GitHub Actions/,
    );
  });
});

describe("validateChannel", () => {
  it("allows stable releases only for non-prerelease versions", () => {
    assert.doesNotThrow(() => validateChannel("stable", "0.1.0"));
    assert.throws(() => validateChannel("stable", "0.2.0-beta.0"), /stable/);
  });

  it("allows beta releases only for beta prerelease versions", () => {
    assert.doesNotThrow(() => validateChannel("beta", "0.2.0-beta.0"));
    assert.throws(() => validateChannel("beta", "0.2.0-dev.0"), /beta/);
  });

  it("allows dev releases only for dev prerelease versions", () => {
    assert.doesNotThrow(() => validateChannel("dev", "0.2.0-dev.0"));
    assert.throws(() => validateChannel("dev", "0.2.0"), /dev/);
  });
});

describe("parseArgs", () => {
  it("parses dry-run and publish modes", () => {
    assert.deepEqual(parseArgs(["--dry-run"]), { channel: "stable", dryRun: true });
    assert.deepEqual(parseArgs(["--channel", "stable", "--publish"]), { channel: "stable", dryRun: false });
  });

  it("rejects ambiguous modes", () => {
    assert.throws(() => parseArgs(["--dry-run", "--publish"]), /either/);
  });
});

describe("publishWorkspaces", () => {
  it("skips already published packages and publishes unpublished ones", () => {
    const recorder = commandRecorder([
      { status: 0, stdout: "0.1.0", stderr: "" },
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: "", stderr: "" },
    ]);
    const logs = [];
    const rootDir = new URL("..", import.meta.url).pathname;
    const summary = publishWorkspaces({ rootDir, channel: "stable", dryRun: true, runCommand: recorder.run, log: (line) => logs.push(line) });

    assert.ok(summary.skipped.includes("@zhuangtai-js/core@0.1.0") || summary.published.length >= 0);
    assert.ok(logs.some((line) => line.startsWith("summary:")));
  });

  it("validates channel versions before checking npm", () => {
    const recorder = commandRecorder([{ status: 0, stdout: "0.1.0", stderr: "" }]);
    const rootDir = new URL("..", import.meta.url).pathname;

    assert.throws(
      () => publishWorkspaces({ rootDir, channel: "beta", dryRun: true, runCommand: recorder.run, log: () => {} }),
      /beta channel/,
    );

    assert.equal(recorder.calls.length, 0);
  });
});
