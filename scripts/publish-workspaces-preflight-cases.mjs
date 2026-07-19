import assert from "node:assert/strict";
import { it } from "node:test";
import {
  commandRecorder,
  createWorkspacePackage,
  escapeRegExp,
  fixturePackedPackageName,
  fixturePackageRef,
  releaseNotes,
} from "./publish-workspaces-test-fixtures.mjs";
import { publishWorkspaces } from "./publish-workspaces.mjs";

export function registerPublishWorkspacePreflightCases() {
  it("validates channel versions before checking npm", () => {
    const corePackage = createWorkspacePackage("core");
    const recorder = commandRecorder([
      { status: 0, stdout: corePackage.manifest.version, stderr: "" },
    ]);

    assert.throws(
      () =>
        publishWorkspaces({
          workspacePackages: [corePackage],
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

  it("validates every selected package before running any command", () => {
    const corePackage = createWorkspacePackage("core");
    const invalidPackage = createWorkspacePackage("persist", { version: "banana" });
    const recorder = commandRecorder();

    assert.throws(
      () =>
        publishWorkspaces({
          workspacePackages: [corePackage, invalidPackage],
          channel: "stable",
          dryRun: false,
          env: { GITHUB_ACTIONS: "true" },
          runCommand: recorder.run,
          log: () => {},
          readReleaseNotes: releaseNotes,
        }),
      /valid release SemVer/,
    );

    assert.equal(recorder.calls.length, 0);
  });

  it("preflights every tarball before starting real publication", () => {
    const corePackage = createWorkspacePackage("core");
    const persistPackage = createWorkspacePackage("persist");
    const recorder = commandRecorder([
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: fixturePackedPackageName(corePackage), stderr: "" },
      { status: 0, stdout: fixturePackedPackageName(persistPackage), stderr: "" },
      { status: 0, stdout: "", stderr: "" },
      { status: 0, stdout: "", stderr: "" },
      { status: 0, stdout: "", stderr: "" },
      { status: 0, stdout: "", stderr: "" },
    ]);

    const summary = publishWorkspaces({
      workspacePackages: [corePackage, persistPackage],
      channel: "stable",
      dryRun: false,
      env: { GITHUB_ACTIONS: "true" },
      runCommand: recorder.run,
      log: () => {},
      readReleaseNotes: releaseNotes,
    });

    const publishCalls = recorder.calls.filter(
      ({ command, args }) => command === "npm" && args[0] === "publish",
    );
    assert.deepEqual(
      publishCalls.map(({ args }) => args.includes("--dry-run")),
      [true, true, false, false],
    );
    assert.deepEqual(summary.published, [
      fixturePackageRef(corePackage),
      fixturePackageRef(persistPackage),
    ]);
  });

  it("packs every unpublished package before publishing any package", () => {
    const corePackage = createWorkspacePackage("core");
    const persistPackage = createWorkspacePackage("persist");
    const recorder = commandRecorder([
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 1, stdout: "", stderr: "npm ERR! code E404" },
      { status: 0, stdout: "", stderr: fixturePackedPackageName(corePackage) },
      { status: 1, stdout: "", stderr: "pack failed" },
    ]);

    assert.throws(
      () =>
        publishWorkspaces({
          workspacePackages: [corePackage, persistPackage],
          channel: "stable",
          dryRun: false,
          env: { GITHUB_ACTIONS: "true" },
          runCommand: recorder.run,
          log: () => {},
          readReleaseNotes: releaseNotes,
        }),
      new RegExp(`Failed to pack ${escapeRegExp(fixturePackageRef(persistPackage))}`, "u"),
    );

    assert.equal(
      recorder.calls.filter(({ command, args }) => command === "npm" && args[0] === "publish")
        .length,
      0,
    );
  });
}
