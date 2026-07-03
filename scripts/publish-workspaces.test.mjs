import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  changelogNotesForPackage,
  commandOutput,
  isAlreadyPublished,
  normalizePackageName,
  packedPackageName,
  parseArgs,
  publishPackage,
  publishWorkspaces,
  validateChannel,
  validatePackage,
} from "./publish-workspaces.mjs";

describe("commandOutput", () => {
  it("keeps stdout when stderr is empty", () => {
    assert.equal(commandOutput({ stdout: "stdout failure", stderr: "" }), "stdout failure");
  });

  it("keeps stderr and stdout when both exist", () => {
    assert.equal(commandOutput({ stdout: "stdout failure", stderr: "stderr failure" }), "stderr failure\nstdout failure");
  });
});

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

function releaseNotes({ manifest }) {
  return `${manifest.name} ${manifest.version} notes`;
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
  it("packs before dry-run publishing", () => {
    const recorder = commandRecorder([
      { status: 0, stdout: "zhuangtai-js-core-0.1.0.tgz", stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);

    publishPackage(
      { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
      { channel: "stable", dryRun: true, runCommand: recorder.run, env: {} },
    );

    assert.deepEqual(recorder.calls[0].args.slice(0, 4), ["--dir", "/repo/packages/core", "pack", "--pack-destination"]);
    assert.equal(recorder.calls[1].command, "npm");
    assert.equal(recorder.calls[1].args[0], "publish");
    assert.match(recorder.calls[1].args[1], /zhuangtai-js-core-0\.1\.0\.tgz$/u);
    assert.deepEqual(recorder.calls[1].args.slice(2), [
      "--access",
      "public",
      "--tag",
      "latest",
      "--registry",
      "https://registry.npmjs.org",
      "--dry-run",
    ]);
  });

  it("uses npm tarball publishing in GitHub Actions", () => {
    const recorder = commandRecorder([
      { status: 0, stdout: "zhuangtai-js-core-0.1.0.tgz", stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);

    publishPackage(
      { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
      { channel: "stable", dryRun: false, runCommand: recorder.run, env: { GITHUB_ACTIONS: "true" } },
    );

    assert.deepEqual(recorder.calls.map((call) => call.command), ["pnpm", "npm"]);
    assert.deepEqual(recorder.calls[1].args.slice(0, 1), ["publish"]);
    assert.ok(!recorder.calls[1].args.includes("--dry-run"));
  });

  it("uses package manager compatible tarball names", () => {
    assert.equal(packedPackageName({ name: "@zhuangtai-js/core", version: "0.1.0" }), "zhuangtai-js-core-0.1.0.tgz");
  });

  it("rejects real publishing outside GitHub Actions after packing", () => {
    const recorder = commandRecorder([{ status: 0, stdout: "zhuangtai-js-core-0.1.0.tgz", stderr: "" }]);

    assert.throws(
      () =>
        publishPackage(
          { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
          { channel: "stable", dryRun: false, runCommand: recorder.run, env: {} },
        ),
      /GitHub Actions/,
    );
    assert.deepEqual(recorder.calls[0].args.slice(0, 4), [
      "--dir",
      "/repo/packages/core",
      "pack",
      "--pack-destination",
    ]);
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
    assert.deepEqual(parseArgs(["--dry-run"]), {
      channel: "stable",
      dryRun: true,
      packageName: undefined,
      summaryFile: undefined,
    });
    assert.deepEqual(parseArgs(["--channel", "stable", "--publish"]), {
      channel: "stable",
      dryRun: false,
      packageName: undefined,
      summaryFile: undefined,
    });
  });

  it("parses package and summary options", () => {
    assert.deepEqual(parseArgs(["--channel", "beta", "--package", "persist", "--summary-file", "summary.json", "--dry-run"]), {
      channel: "beta",
      dryRun: true,
      packageName: "@zhuangtai-js/persist",
      summaryFile: "summary.json",
    });
  });

  it("rejects ambiguous modes", () => {
    assert.throws(() => parseArgs(["--dry-run", "--publish"]), /either/);
  });
});

describe("normalizePackageName", () => {
  it("accepts all, short names, and scoped names", () => {
    assert.equal(normalizePackageName("all"), undefined);
    assert.equal(normalizePackageName("core"), "@zhuangtai-js/core");
    assert.equal(normalizePackageName("@zhuangtai-js/persist"), "@zhuangtai-js/persist");
  });
});

describe("changelogNotesForPackage", () => {
  it("reads the matching package changelog entry", () => {
    const notes = changelogNotesForPackage(
      { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.3.1" } },
      {
        readFileSync() {
          return [
            "# core 更新日志 / Changelog",
            "",
            "## 0.3.1 - 2026-07-03",
            "",
            "### 变更",
            "",
            "- 中文说明。",
            "",
            "### Changed",
            "",
            "- English notes.",
            "",
            "## 0.3.0 - 2026-07-02",
            "",
            "- Older notes.",
          ].join("\n");
        },
      },
    );

    assert.equal(notes, "### 变更\n\n- 中文说明。\n\n### Changed\n\n- English notes.");
  });

  it("requires a matching package changelog entry", () => {
    assert.throws(
      () =>
        changelogNotesForPackage(
          { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.3.1" } },
          { readFileSync: () => "# core 更新日志 / Changelog\n" },
        ),
      /Missing @zhuangtai-js\/core 0.3.1 changelog entry/,
    );
  });
});

describe("publishWorkspaces", () => {
  it("skips already published packages and publishes unpublished ones", () => {
    const recorder = commandRecorder([
      { status: 0, stdout: "0.1.0", stderr: "" },
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: "zhuangtai-js-persist-0.1.0.tgz", stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);
    const logs = [];
    const summary = publishWorkspaces({
      workspacePackages: [
        { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
        { dir: "/repo/packages/persist", manifest: { name: "@zhuangtai-js/persist", version: "0.1.0" } },
      ],
      channel: "stable",
      dryRun: true,
      runCommand: recorder.run,
      log: (line) => logs.push(line),
      readReleaseNotes: releaseNotes,
    });

    assert.deepEqual(summary.skipped, ["@zhuangtai-js/core@0.1.0"]);
    assert.deepEqual(summary.published, ["@zhuangtai-js/persist@0.1.0"]);
    assert.deepEqual(summary.releases, [
      {
        prerelease: false,
        tag: "core-v0.1.0",
        notes: "@zhuangtai-js/core 0.1.0 notes",
        title: "core v0.1.0",
      },
      {
        prerelease: false,
        tag: "persist-v0.1.0",
        notes: "@zhuangtai-js/persist 0.1.0 notes",
        title: "persist v0.1.0",
      },
    ]);
    assert.ok(logs.some((line) => line.startsWith("summary:")));
  });

  it("publishes only the requested package", () => {
    const recorder = commandRecorder([
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: "zhuangtai-js-persist-0.1.0.tgz", stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);
    const summary = publishWorkspaces({
      workspacePackages: [
        { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } },
        { dir: "/repo/packages/persist", manifest: { name: "@zhuangtai-js/persist", version: "0.1.0" } },
      ],
      channel: "stable",
      dryRun: true,
      packageName: "@zhuangtai-js/persist",
      runCommand: recorder.run,
      log: () => {},
      readReleaseNotes: releaseNotes,
    });

    assert.deepEqual(summary.published, ["@zhuangtai-js/persist@0.1.0"]);
    assert.equal(recorder.calls[0].args[1], "@zhuangtai-js/persist@0.1.0");
  });

  it("allows workspace package versions to release independently", () => {
    const recorder = commandRecorder([
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: "zhuangtai-js-core-0.3.1.tgz", stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);
    const summary = publishWorkspaces({
      workspacePackages: [
        { dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.3.1" } },
        { dir: "/repo/packages/persist", manifest: { name: "@zhuangtai-js/persist", version: "0.2.1" } },
      ],
      channel: "stable",
      dryRun: true,
      packageName: "@zhuangtai-js/core",
      runCommand: recorder.run,
      log: () => {},
      readReleaseNotes: releaseNotes,
    });

    assert.deepEqual(summary.published, ["@zhuangtai-js/core@0.3.1"]);
    assert.deepEqual(summary.releases, [
      {
        prerelease: false,
        tag: "core-v0.3.1",
        notes: "@zhuangtai-js/core 0.3.1 notes",
        title: "core v0.3.1",
      },
    ]);
  });

  it("rejects unknown requested packages", () => {
    assert.throws(
      () =>
        publishWorkspaces({
          workspacePackages: [{ dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } }],
          channel: "stable",
          dryRun: true,
          packageName: "@zhuangtai-js/persist",
          runCommand: commandRecorder().run,
          log: () => {},
          readReleaseNotes: releaseNotes,
        }),
      /No publishable workspace package/,
    );
  });

  it("validates channel versions before checking npm", () => {
    const recorder = commandRecorder([{ status: 0, stdout: "0.1.0", stderr: "" }]);

    assert.throws(
      () =>
        publishWorkspaces({
          workspacePackages: [{ dir: "/repo/packages/core", manifest: { name: "@zhuangtai-js/core", version: "0.1.0" } }],
          channel: "beta",
          dryRun: true,
          runCommand: recorder.run,
          log: () => {},
          readReleaseNotes: releaseNotes,
        }),
      /beta channel/,
    );

    assert.equal(recorder.calls.length, 0);
  });
});
