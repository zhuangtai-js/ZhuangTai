import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
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
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return result.status === 1 && output.includes("E404");
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

  throw new Error(`Failed to check ${packageRef(workspacePackage.manifest)} on npm:\n${result.stderr ?? result.stdout ?? ""}`);
}

function publishPackage(workspacePackage, { channel, dryRun, runCommand, env }) {
  validateChannel(channel, workspacePackage.manifest.version);

  const args = [
    "--dir",
    workspacePackage.dir,
    "publish",
    "--access",
    "public",
    "--tag",
    channels[channel].npmTag,
    "--no-git-checks",
  ];

  if (dryRun) {
    args.push("--dry-run");
  } else if (env.GITHUB_ACTIONS === "true") {
    args.push("--provenance");
  } else {
    throw new Error("Real publishing must run in GitHub Actions. Use --dry-run locally.");
  }

  const result = runCommand("pnpm", args, { cwd: workspacePackage.dir });

  if (result.status !== 0) {
    throw new Error(`Failed to publish ${packageRef(workspacePackage.manifest)}:\n${result.stderr ?? result.stdout ?? ""}`);
  }
}

function publishWorkspaces({ rootDir, channel, dryRun, runCommand, env = process.env, log = console.log }) {
  const workspacePackages = discoverWorkspacePackages(rootDir);
  const summary = { skipped: [], published: [] };

  for (const workspacePackage of workspacePackages) {
    validatePackage(workspacePackage);

    if (workspacePackage.manifest.private === true) {
      continue;
    }

    const ref = packageRef(workspacePackage.manifest);
    validateChannel(channel, workspacePackage.manifest.version);

    if (isAlreadyPublished(workspacePackage, runCommand)) {
      log(`skip: ${ref} already published`);
      summary.skipped.push(ref);
      continue;
    }

    publishPackage(workspacePackage, { channel, dryRun, runCommand, env });
    log(`${dryRun ? "dry-run" : "publish"}: ${ref} tag=${channels[channel].npmTag}`);
    summary.published.push(ref);
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

  if (channel === undefined) {
    throw new Error("Missing value for --channel");
  }

  if (channels[channel] === undefined) {
    throw new Error(`Unknown release channel: ${channel}`);
  }

  if (args.includes("--dry-run")) {
    return { channel, dryRun: true };
  }

  if (args.includes("--publish")) {
    return { channel, dryRun: false };
  }

  throw new Error("Usage: node scripts/publish-workspaces.mjs --channel dev|beta|stable --dry-run|--publish");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { channel, dryRun } = parseArgs(process.argv.slice(2));
  publishWorkspaces({ rootDir: resolve(import.meta.dirname, ".."), channel, dryRun, runCommand });
}

export {
  channels,
  discoverWorkspacePackages,
  isAlreadyPublished,
  packageRef,
  parseArgs,
  publishPackage,
  publishWorkspaces,
  validateChannel,
  validatePackage,
};
