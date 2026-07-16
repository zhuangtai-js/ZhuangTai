import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createWorkspacePackage,
  escapeRegExp,
  releaseVersions,
} from "./publish-workspaces-test-fixtures.mjs";
import {
  changelogNotesForPackage,
  normalizePackageName,
  parseArgs,
  validateChannel,
} from "./publish-workspaces.mjs";

const changelogPackage = createWorkspacePackage("core", { version: "0.3.1" });

export function registerPublishContractCases() {
  describe("validateChannel", () => {
    it("allows stable releases only for non-prerelease versions", () => {
      assert.doesNotThrow(() => validateChannel("stable", releaseVersions.stable));
      assert.throws(() => validateChannel("stable", releaseVersions.beta), /stable/);
    });

    it("allows beta releases only for beta prerelease versions", () => {
      assert.doesNotThrow(() => validateChannel("beta", releaseVersions.beta));
      assert.throws(() => validateChannel("beta", releaseVersions.dev), /beta/);
    });

    it("allows dev releases only for dev prerelease versions", () => {
      assert.doesNotThrow(() => validateChannel("dev", releaseVersions.dev));
      assert.throws(() => validateChannel("dev", releaseVersions.stable), /dev/);
    });

    it("rejects versions that are not valid release SemVer", () => {
      for (const version of ["banana", "1.2", "01.2.3", "1.2.3.4", "1.2.3+build.1"]) {
        assert.throws(() => validateChannel("stable", version), /valid release SemVer/);
      }

      assert.throws(() => validateChannel("beta", "1.2.3-beta.01"), /valid release SemVer/);
      assert.throws(() => validateChannel("dev", "1.2.3-dev.01"), /valid release SemVer/);
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
      assert.deepEqual(
        parseArgs([
          "--channel",
          "beta",
          "--package",
          "persist",
          "--summary-file",
          "summary.json",
          "--dry-run",
        ]),
        {
          channel: "beta",
          dryRun: true,
          packageName: "@zhuangtai-js/persist",
          summaryFile: "summary.json",
        },
      );
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
      const notes = changelogNotesForPackage(changelogPackage, {
        readFileSync() {
          return [
            "# core 更新日志 / Changelog",
            "",
            `## ${changelogPackage.manifest.version} - 2026-07-03`,
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
      });

      assert.equal(notes, "### 变更\n\n- 中文说明。\n\n### Changed\n\n- English notes.");
    });

    it("requires a matching package changelog entry", () => {
      const releaseLabel = `${changelogPackage.manifest.name} ${changelogPackage.manifest.version}`;

      assert.throws(
        () =>
          changelogNotesForPackage(changelogPackage, {
            readFileSync: () => "# core 更新日志 / Changelog\n",
          }),
        new RegExp(`Missing ${escapeRegExp(releaseLabel)} changelog entry`, "u"),
      );
    });
  });
}
