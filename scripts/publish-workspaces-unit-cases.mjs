import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commandRecorder,
  createWorkspacePackage,
  fixturePackedPackageName,
  fixturePackageRef,
  npmRegistry,
  releaseVersions,
} from "./publish-workspaces-test-fixtures.mjs";
import {
  commandOutput,
  isAlreadyPublished,
  packedPackageName,
  publishPackage,
  validatePackage,
} from "./publish-workspaces.mjs";

const corePackage = createWorkspacePackage("core");

export function registerPublishUnitCases() {
  describe("commandOutput", () => {
    it("keeps stdout when stderr is empty", () => {
      assert.equal(commandOutput({ stdout: "stdout failure", stderr: "" }), "stdout failure");
    });

    it("keeps stderr and stdout when both exist", () => {
      assert.equal(
        commandOutput({ stdout: "stdout failure", stderr: "stderr failure" }),
        "stderr failure\nstdout failure",
      );
    });
  });

  describe("validatePackage", () => {
    it("rejects publishable packages outside the @zhuangtai-js scope", () => {
      assert.throws(
        () =>
          validatePackage({ manifest: { name: "@wrong/core", version: releaseVersions.stable } }),
        /@zhuangtai-js\//,
      );
    });

    it("allows private packages outside the publish scope", () => {
      assert.doesNotThrow(() => validatePackage({ manifest: { name: "internal", private: true } }));
    });

    it("rejects missing versions", () => {
      assert.throws(
        () => validatePackage({ manifest: { name: corePackage.manifest.name } }),
        /must define a version/,
      );
    });
  });

  describe("isAlreadyPublished", () => {
    it("treats a successful npm view as already published", () => {
      const recorder = commandRecorder([
        { status: 0, stdout: corePackage.manifest.version, stderr: "" },
      ]);
      const published = isAlreadyPublished(corePackage, recorder.run);

      assert.equal(published, true);
      assert.deepEqual(recorder.calls[0].args, [
        "view",
        fixturePackageRef(corePackage),
        "version",
        "--registry",
        npmRegistry,
      ]);
    });

    it("treats npm E404 as not published", () => {
      const recorder = commandRecorder([{ status: 1, stdout: "", stderr: "npm ERR! code E404" }]);
      const published = isAlreadyPublished(corePackage, recorder.run);

      assert.equal(published, false);
    });

    it("throws on non-404 npm view failures", () => {
      const recorder = commandRecorder([{ status: 1, stdout: "", stderr: "network failed" }]);

      assert.throws(() => isAlreadyPublished(corePackage, recorder.run), /Failed to check/);
    });
  });

  describe("publishPackage", () => {
    it("packs before dry-run publishing", () => {
      const recorder = commandRecorder([
        { status: 0, stdout: fixturePackedPackageName(corePackage), stderr: "" },
        { status: 0, stdout: "", stderr: "" },
      ]);

      publishPackage(corePackage, {
        channel: "stable",
        dryRun: true,
        runCommand: recorder.run,
        env: {},
      });

      assert.deepEqual(recorder.calls[0].args.slice(0, 4), [
        "--dir",
        corePackage.dir,
        "pack",
        "--pack-destination",
      ]);
      assert.equal(recorder.calls[1].command, "npm");
      assert.equal(recorder.calls[1].args[0], "publish");
      assert.equal(recorder.calls[1].args[1].endsWith(fixturePackedPackageName(corePackage)), true);
      assert.deepEqual(recorder.calls[1].args.slice(2), [
        "--access",
        "public",
        "--tag",
        "latest",
        "--registry",
        npmRegistry,
        "--dry-run",
      ]);
    });

    it("uses npm tarball publishing in GitHub Actions", () => {
      const recorder = commandRecorder([
        { status: 0, stdout: fixturePackedPackageName(corePackage), stderr: "" },
        { status: 0, stdout: "", stderr: "" },
      ]);

      publishPackage(corePackage, {
        channel: "stable",
        dryRun: false,
        runCommand: recorder.run,
        env: { GITHUB_ACTIONS: "true" },
      });

      assert.deepEqual(
        recorder.calls.map((call) => call.command),
        ["pnpm", "npm"],
      );
      assert.deepEqual(recorder.calls[1].args.slice(0, 1), ["publish"]);
      assert.ok(!recorder.calls[1].args.includes("--dry-run"));
    });

    it("uses package manager compatible tarball names", () => {
      assert.equal(packedPackageName(corePackage.manifest), fixturePackedPackageName(corePackage));
    });

    it("rejects real publishing outside GitHub Actions after packing", () => {
      const recorder = commandRecorder([
        { status: 0, stdout: fixturePackedPackageName(corePackage), stderr: "" },
      ]);

      assert.throws(
        () =>
          publishPackage(corePackage, {
            channel: "stable",
            dryRun: false,
            runCommand: recorder.run,
            env: {},
          }),
        /GitHub Actions/,
      );
      assert.deepEqual(recorder.calls[0].args.slice(0, 4), [
        "--dir",
        corePackage.dir,
        "pack",
        "--pack-destination",
      ]);
    });
  });
}
