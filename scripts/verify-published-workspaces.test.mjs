import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseArgs,
  validateRelease,
  verifyInstall,
  verifyPublishedWorkspaces,
  waitForRegistryRelease,
} from "./verify-published-workspaces.mjs";

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

const release = {
  npmTag: "latest",
  packageName: "@zhuangtai-js/core",
  version: "0.4.2",
};

describe("validateRelease", () => {
  it("accepts scoped releases with a version and npm tag", () => {
    assert.doesNotThrow(() => validateRelease(release));
  });

  it("rejects malformed release summaries", () => {
    assert.throws(() => validateRelease({ ...release, packageName: "core" }), /@zhuangtai-js\//u);
    assert.throws(() => validateRelease({ ...release, npmTag: "" }), /npmTag/u);
  });
});

describe("waitForRegistryRelease", () => {
  it("verifies the exact version and dist-tag", async () => {
    const recorder = commandRecorder([
      { status: 0, stdout: '"0.4.2"\n', stderr: "" },
      { status: 0, stdout: '"0.4.2"\n', stderr: "" },
    ]);

    await waitForRegistryRelease(release, {
      attempts: 1,
      delayMs: 0,
      log: () => {},
      runCommand: recorder.run,
    });

    assert.deepEqual(recorder.calls[0].args.slice(0, 4), [
      "view",
      "@zhuangtai-js/core@0.4.2",
      "version",
      "--json",
    ]);
    assert.deepEqual(recorder.calls[1].args.slice(0, 4), [
      "view",
      "@zhuangtai-js/core",
      "dist-tags.latest",
      "--json",
    ]);
  });

  it("retries registry propagation failures", async () => {
    const recorder = commandRecorder([
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: '"0.4.2"\n', stderr: "" },
      { status: 0, stdout: '"0.4.2"\n', stderr: "" },
    ]);
    let sleeps = 0;

    await waitForRegistryRelease(release, {
      attempts: 2,
      delayMs: 0,
      log: () => {},
      runCommand: recorder.run,
      sleep: async () => {
        sleeps += 1;
      },
    });

    assert.equal(sleeps, 1);
    assert.equal(recorder.calls.length, 3);
  });

  it("rejects an incorrect dist-tag", async () => {
    const recorder = commandRecorder([
      { status: 0, stdout: '"0.4.2"\n', stderr: "" },
      { status: 0, stdout: '"0.4.1"\n', stderr: "" },
    ]);

    await assert.rejects(
      waitForRegistryRelease(release, {
        attempts: 1,
        delayMs: 0,
        log: () => {},
        runCommand: recorder.run,
      }),
      /resolve to 0\.4\.2/u,
    );
  });
});

describe("verifyInstall", () => {
  it("installs and imports the exact registry package", () => {
    const recorder = commandRecorder([
      { status: 0, stdout: "", stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);

    verifyInstall(release, { log: () => {}, runCommand: recorder.run });

    assert.equal(recorder.calls[0].command, "npm");
    assert.ok(recorder.calls[0].args.includes("@zhuangtai-js/core@0.4.2"));
    assert.equal(recorder.calls[1].command, "node");
    assert.match(recorder.calls[1].args.at(-1), /@zhuangtai-js\/core/u);
  });
});

describe("verifyPublishedWorkspaces", () => {
  it("rejects summaries without releases", async () => {
    await assert.rejects(
      verifyPublishedWorkspaces({
        summary: {},
        runCommand: () => ({ status: 0, stdout: "", stderr: "" }),
      }),
      /releases array/u,
    );
  });
});

describe("parseArgs", () => {
  it("requires a summary file", () => {
    assert.deepEqual(parseArgs(["--summary-file", "release-summary.json"]), {
      summaryFile: "release-summary.json",
    });
    assert.throws(() => parseArgs([]), /--summary-file/u);
  });
});
