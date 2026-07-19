import assert from "node:assert/strict";
import { it } from "node:test";
import {
  commandRecorder,
  createPersistStableCandidate,
  createWorkspacePackage,
  expectedStableRelease,
  fixturePackedPackageName,
  fixturePackageRef,
  persistStableCandidate,
  releaseNotes,
} from "./publish-workspaces-test-fixtures.mjs";
import { publishWorkspaces } from "./publish-workspaces.mjs";

export function registerPublishWorkspaceSelectionCases() {
  it("skips already published packages and publishes unpublished ones", () => {
    const corePackage = createWorkspacePackage("core");
    const persistPackage = createWorkspacePackage("persist", {
      peerDependencies: { ...persistStableCandidate.manifest.peerDependencies },
    });
    const recorder = commandRecorder([
      { status: 0, stdout: corePackage.manifest.version, stderr: "" },
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: fixturePackedPackageName(persistPackage), stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);
    const logs = [];
    const summary = publishWorkspaces({
      workspacePackages: [corePackage, persistPackage],
      channel: "stable",
      dryRun: true,
      runCommand: recorder.run,
      log: (line) => logs.push(line),
      readReleaseNotes: releaseNotes,
    });

    assert.deepEqual(summary.skipped, [fixturePackageRef(corePackage)]);
    assert.deepEqual(summary.published, [fixturePackageRef(persistPackage)]);
    assert.deepEqual(summary.releases, [
      expectedStableRelease(corePackage),
      expectedStableRelease(persistPackage),
    ]);
    assert.ok(logs.some((line) => line.startsWith("summary:")));
  });

  it("publishes only the requested package", () => {
    const corePackage = createWorkspacePackage("core");
    const persistPackage = createWorkspacePackage("persist");
    const recorder = commandRecorder([
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: fixturePackedPackageName(persistPackage), stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);
    const summary = publishWorkspaces({
      workspacePackages: [corePackage, persistPackage],
      channel: "stable",
      dryRun: true,
      packageName: persistPackage.manifest.name,
      runCommand: recorder.run,
      log: () => {},
      readReleaseNotes: releaseNotes,
    });

    assert.deepEqual(summary.published, [fixturePackageRef(persistPackage)]);
    assert.equal(recorder.calls[0].args[1], fixturePackageRef(persistPackage));
  });

  it(`maps the persist ${persistStableCandidate.manifest.version} stable release to the latest tag`, () => {
    const persistPackage = createPersistStableCandidate();
    const recorder = commandRecorder([
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: fixturePackedPackageName(persistPackage), stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);
    const summary = publishWorkspaces({
      workspacePackages: [persistPackage],
      channel: "stable",
      dryRun: true,
      packageName: persistPackage.manifest.name,
      runCommand: recorder.run,
      log: () => {},
      readReleaseNotes: releaseNotes,
    });

    assert.deepEqual(summary.published, [fixturePackageRef(persistPackage)]);
    assert.deepEqual(summary.releases, [expectedStableRelease(persistPackage)]);
  });

  it("allows workspace package versions to release independently", () => {
    const corePackage = createWorkspacePackage("core", { version: "0.3.1" });
    const persistPackage = createWorkspacePackage("persist", { version: "0.2.1" });
    const recorder = commandRecorder([
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: fixturePackedPackageName(corePackage), stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);
    const summary = publishWorkspaces({
      workspacePackages: [corePackage, persistPackage],
      channel: "stable",
      dryRun: true,
      packageName: corePackage.manifest.name,
      runCommand: recorder.run,
      log: () => {},
      readReleaseNotes: releaseNotes,
    });

    assert.deepEqual(summary.published, [fixturePackageRef(corePackage)]);
    assert.deepEqual(summary.releases, [expectedStableRelease(corePackage)]);
  });

  it("rejects unknown requested packages", () => {
    const corePackage = createWorkspacePackage("core");
    const missingPackage = createWorkspacePackage("persist");

    assert.throws(
      () =>
        publishWorkspaces({
          workspacePackages: [corePackage],
          channel: "stable",
          dryRun: true,
          packageName: missingPackage.manifest.name,
          runCommand: commandRecorder().run,
          log: () => {},
          readReleaseNotes: releaseNotes,
        }),
      /No publishable workspace package/,
    );
  });
}
