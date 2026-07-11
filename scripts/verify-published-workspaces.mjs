import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const npmRegistry = "https://registry.npmjs.org";
const packageScope = "@zhuangtai-js/";

function commandOutput(result) {
  return [result.stderr, result.stdout]
    .filter((output) => typeof output === "string" && output.length > 0)
    .join("\n");
}

function parseJsonOutput(result, description) {
  if (result.status !== 0) {
    throw new Error(`${description} failed:\n${commandOutput(result)}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${description} returned invalid JSON:\n${commandOutput(result)}`);
  }
}

function validateRelease(release) {
  if (typeof release !== "object" || release === null) {
    throw new Error("Release summary entries must be objects");
  }

  if (typeof release.packageName !== "string" || !release.packageName.startsWith(packageScope)) {
    throw new Error(
      `Release package must use ${packageScope} scope: ${release.packageName ?? "<missing>"}`,
    );
  }

  for (const field of ["version", "npmTag"]) {
    if (typeof release[field] !== "string" || release[field].length === 0) {
      throw new Error(`Release ${release.packageName} must define ${field}`);
    }
  }
}

async function waitForRegistryRelease(
  release,
  {
    attempts = 6,
    delayMs = 5_000,
    log = console.log,
    runCommand,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  },
) {
  const reference = `${release.packageName}@${release.version}`;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const versionResult = runCommand(
        "npm",
        ["view", reference, "version", "--json", "--registry", npmRegistry],
        {},
      );
      const version = parseJsonOutput(versionResult, `npm view ${reference} version`);

      if (version !== release.version) {
        throw new Error(`Expected ${reference}, received version ${JSON.stringify(version)}`);
      }

      const tagResult = runCommand(
        "npm",
        [
          "view",
          release.packageName,
          `dist-tags.${release.npmTag}`,
          "--json",
          "--registry",
          npmRegistry,
        ],
        {},
      );
      const taggedVersion = parseJsonOutput(
        tagResult,
        `npm view ${release.packageName} dist-tags.${release.npmTag}`,
      );

      if (taggedVersion !== release.version) {
        throw new Error(
          `Expected ${release.packageName}@${release.npmTag} to resolve to ${release.version}, received ${JSON.stringify(taggedVersion)}`,
        );
      }

      log(`verified registry: ${reference} tag=${release.npmTag}`);
      return;
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        log(`registry pending: ${reference} attempt=${attempt}/${attempts}`);
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

function verifyInstall(release, { log = console.log, runCommand }) {
  const reference = `${release.packageName}@${release.version}`;
  const tempDir = mkdtempSync(join(tmpdir(), "zhuangtai-registry-smoke-"));

  try {
    writeFileSync(
      join(tempDir, "package.json"),
      `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
    );

    const installResult = runCommand(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        "--registry",
        npmRegistry,
        reference,
      ],
      { cwd: tempDir },
    );

    if (installResult.status !== 0) {
      throw new Error(`Failed to install ${reference} from npm:\n${commandOutput(installResult)}`);
    }

    const importResult = runCommand(
      "node",
      ["--input-type=module", "--eval", `await import(${JSON.stringify(release.packageName)})`],
      { cwd: tempDir },
    );

    if (importResult.status !== 0) {
      throw new Error(
        `Failed to import ${reference} after registry install:\n${commandOutput(importResult)}`,
      );
    }

    log(`verified install: ${reference}`);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

async function verifyPublishedWorkspaces({ summary, runCommand, attempts, delayMs, log, sleep }) {
  if (typeof summary !== "object" || summary === null || !Array.isArray(summary.releases)) {
    throw new Error("Release summary must contain a releases array");
  }

  for (const release of summary.releases) {
    validateRelease(release);
    await waitForRegistryRelease(release, { attempts, delayMs, log, runCommand, sleep });
    verifyInstall(release, { log, runCommand });
  }
}

function runCommand(command, args, options) {
  return spawnSync(command, args, {
    ...options,
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseArgs(args) {
  const summaryFileIndex = args.indexOf("--summary-file");
  const summaryFile = summaryFileIndex === -1 ? undefined : args[summaryFileIndex + 1];

  if (summaryFile === undefined) {
    throw new Error("Usage: node scripts/verify-published-workspaces.mjs --summary-file <path>");
  }

  return { summaryFile };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { summaryFile } = parseArgs(process.argv.slice(2));
  const summary = JSON.parse(readFileSync(summaryFile, "utf8"));
  await verifyPublishedWorkspaces({ summary, runCommand });
}

export {
  parseArgs,
  validateRelease,
  verifyInstall,
  verifyPublishedWorkspaces,
  waitForRegistryRelease,
};
