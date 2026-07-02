import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

const npmRegistry = "https://registry.npmjs.org";
const packageScope = "@zhuangtai-js/";
const channels = {
  beta: {
    npmTag: "beta",
    prerelease: true,
    versionPattern: /-beta\.\d+$/u,
  },
  dev: {
    npmTag: "dev",
    prerelease: true,
    versionPattern: /-dev\.\d+$/u,
  },
  stable: {
    npmTag: "latest",
    prerelease: false,
    versionPattern: /^[^-]+$/u,
  },
};

function readJson(path, fs = { readFileSync }) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function discoverWorkspacePackages(rootDir, fs = { readdirSync, readFileSync, statSync }) {
  const packagesDir = join(rootDir, "packages");

  return fs
    .readdirSync(packagesDir)
    .filter((entry) => fs.statSync(join(packagesDir, entry)).isDirectory())
    .map((entry) => {
      const dir = join(packagesDir, entry);
      return {
        dir,
        manifest: readJson(join(dir, "package.json"), fs),
      };
    });
}

function validatePackage({ manifest }) {
  if (manifest.private === true) {
    return;
  }

  if (typeof manifest.name !== "string" || !manifest.name.startsWith(packageScope)) {
    throw new Error(`Publishable workspace package must use ${packageScope} scope: ${manifest.name ?? "<missing>"}`);
  }

  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error(`Package ${manifest.name} must define a version`);
  }
}

function packageRef(manifest) {
  return `${manifest.name}@${manifest.version}`;
}

function packedPackageName(manifest) {
  return `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`;
}

function packageShortName(manifest) {
  return manifest.name.slice(packageScope.length);
}

function normalizePackageName(value) {
  if (value === undefined || value === "all") {
    return undefined;
  }

  return value.startsWith(packageScope) ? value : `${packageScope}${value}`;
}

function githubReleaseForPackage(manifest, channel) {
  return {
    prerelease: channels[channel].prerelease,
    tag: `${packageShortName(manifest)}-v${manifest.version}`,
    title: `${manifest.name} v${manifest.version}`,
  };
}

function validateChannel(channel, version) {
  const config = channels[channel];

  if (config === undefined) {
    throw new Error(`Unknown release channel: ${channel}`);
  }

  if (!config.versionPattern.test(version)) {
    throw new Error(`Version ${version} does not match ${channel} channel requirements`);
  }
}

function isNotFoundError(result) {
  const output = commandOutput(result);
  return result.status === 1 && output.includes("E404");
}

function commandOutput(result) {
  return [result.stderr, result.stdout].filter((output) => typeof output === "string" && output.length > 0).join("\n");
}

function isAlreadyPublished(workspacePackage, runCommand) {
  const result = runCommand("npm", ["view", packageRef(workspacePackage.manifest), "version", "--registry", npmRegistry], {
    cwd: workspacePackage.dir,
  });

  if (result.status === 0) {
    return true;
  }

  if (isNotFoundError(result)) {
    return false;
  }

  throw new Error(`Failed to check ${packageRef(workspacePackage.manifest)} on npm:\n${commandOutput(result)}`);
}

function publishPackage(workspacePackage, { channel, dryRun, runCommand, env }) {
  validateChannel(channel, workspacePackage.manifest.version);
  const tempDir = mkdtempSync(join(tmpdir(), "zhuangtai-publish-"));

  try {
    const packResult = runCommand("pnpm", ["--dir", workspacePackage.dir, "pack", "--pack-destination", tempDir], {
      cwd: workspacePackage.dir,
    });

    if (packResult.status !== 0) {
      throw new Error(`Failed to pack ${packageRef(workspacePackage.manifest)}:\n${commandOutput(packResult)}`);
    }

    if (!dryRun && env.GITHUB_ACTIONS !== "true") {
      throw new Error("Real publishing must run in GitHub Actions. Use --dry-run locally.");
    }

    const tarballPath = join(tempDir, packedPackageName(workspacePackage.manifest));
    const publishArgs = [
      "publish",
      tarballPath,
      "--access",
      "public",
      "--tag",
      channels[channel].npmTag,
      "--registry",
      npmRegistry,
    ];

    if (dryRun) {
      publishArgs.push("--dry-run");
    }

    const publishResult = runCommand("npm", publishArgs, { cwd: workspacePackage.dir });

    if (publishResult.status !== 0) {
      throw new Error(`Failed to publish ${packageRef(workspacePackage.manifest)}:\n${commandOutput(publishResult)}`);
    }
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function publishWorkspaces({
  rootDir,
  channel,
  dryRun,
  runCommand,
  env = process.env,
  log = console.log,
  packageName,
  workspacePackages,
}) {
  if (rootDir === undefined && workspacePackages === undefined) {
    throw new Error("publishWorkspaces requires rootDir or workspacePackages");
  }

  const packagesToPublish = workspacePackages ?? discoverWorkspacePackages(rootDir);
  const summary = { releases: [], skipped: [], published: [] };
  let foundRequestedPackage = packageName === undefined;

  for (const workspacePackage of packagesToPublish) {
    validatePackage(workspacePackage);

    if (workspacePackage.manifest.private === true) {
      continue;
    }

    if (packageName !== undefined && workspacePackage.manifest.name !== packageName) {
      continue;
    }

    foundRequestedPackage = true;

    const ref = packageRef(workspacePackage.manifest);
    validateChannel(channel, workspacePackage.manifest.version);

    if (isAlreadyPublished(workspacePackage, runCommand)) {
      log(`skip: ${ref} already published`);
      summary.skipped.push(ref);
      summary.releases.push(githubReleaseForPackage(workspacePackage.manifest, channel));
      continue;
    }

    publishPackage(workspacePackage, { channel, dryRun, runCommand, env });
    log(`${dryRun ? "dry-run" : "publish"}: ${ref} tag=${channels[channel].npmTag}`);
    summary.published.push(ref);
    summary.releases.push(githubReleaseForPackage(workspacePackage.manifest, channel));
  }

  if (!foundRequestedPackage) {
    throw new Error(`No publishable workspace package found for ${packageName}`);
  }

  log(`summary: ${summary.published.length} publishable, ${summary.skipped.length} skipped`);
  return summary;
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
  if (args.includes("--dry-run") && args.includes("--publish")) {
    throw new Error("Use either --dry-run or --publish, not both");
  }

  const channelIndex = args.indexOf("--channel");
  const channel = channelIndex === -1 ? "stable" : args[channelIndex + 1];
  const packageIndex = args.indexOf("--package");
  const packageValue = packageIndex === -1 ? undefined : args[packageIndex + 1];
  const packageName = normalizePackageName(packageValue);
  const summaryFileIndex = args.indexOf("--summary-file");
  const summaryFile = summaryFileIndex === -1 ? undefined : args[summaryFileIndex + 1];

  if (channel === undefined) {
    throw new Error("Missing value for --channel");
  }

  if (packageIndex !== -1 && packageValue === undefined) {
    throw new Error("Missing value for --package");
  }

  if (summaryFileIndex !== -1 && summaryFile === undefined) {
    throw new Error("Missing value for --summary-file");
  }

  if (channels[channel] === undefined) {
    throw new Error(`Unknown release channel: ${channel}`);
  }

  if (args.includes("--dry-run")) {
    return { channel, dryRun: true, packageName, summaryFile };
  }

  if (args.includes("--publish")) {
    return { channel, dryRun: false, packageName, summaryFile };
  }

  throw new Error("Usage: node scripts/publish-workspaces.mjs --channel dev|beta|stable --dry-run|--publish");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { channel, dryRun, packageName, summaryFile } = parseArgs(process.argv.slice(2));
  const summary = publishWorkspaces({ rootDir: resolve(import.meta.dirname, ".."), channel, dryRun, packageName, runCommand });

  if (summaryFile !== undefined) {
    writeFileSync(summaryFile, `${JSON.stringify(summary, null, 2)}\n`);
  }
}

export {
  channels,
  commandOutput,
  discoverWorkspacePackages,
  githubReleaseForPackage,
  isAlreadyPublished,
  normalizePackageName,
  packageRef,
  packageShortName,
  packedPackageName,
  parseArgs,
  publishPackage,
  publishWorkspaces,
  validateChannel,
  validatePackage,
};
