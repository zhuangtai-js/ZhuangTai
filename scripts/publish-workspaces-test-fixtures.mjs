const packageScope = "@zhuangtai-js";

export const npmRegistry = "https://registry.npmjs.org";

export const releaseVersions = Object.freeze({
  stable: "0.1.0",
  beta: "0.2.0-beta.0",
  dev: "0.2.0-dev.0",
});

export const persistStableCandidate = Object.freeze({
  packagePath: "packages/persist",
  manifest: Object.freeze({
    name: "@zhuangtai-js/persist",
    version: "0.5.0",
    peerDependencies: Object.freeze({ "@zhuangtai-js/core": "^0.5.0" }),
  }),
});

export function commandRecorder(results = []) {
  const calls = [];

  return {
    calls,
    run: (command, args, options) => {
      calls.push({ command, args, options });
      return results.shift() ?? { status: 0, stdout: "", stderr: "" };
    },
  };
}

export function createWorkspacePackage(
  shortName,
  { version = releaseVersions.stable, ...manifestOverrides } = {},
) {
  const packageName = shortName.startsWith("@") ? shortName : `${packageScope}/${shortName}`;
  const packageShortName = packageName.slice(packageName.lastIndexOf("/") + 1);

  return {
    dir: `/repo/packages/${packageShortName}`,
    manifest: {
      name: packageName,
      version,
      ...manifestOverrides,
    },
  };
}

export function createPersistStableCandidate() {
  return createWorkspacePackage("persist", {
    version: persistStableCandidate.manifest.version,
    peerDependencies: { ...persistStableCandidate.manifest.peerDependencies },
  });
}

export function fixturePackageRef({ manifest }) {
  return `${manifest.name}@${manifest.version}`;
}

export function fixturePackedPackageName({ manifest }) {
  return `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`;
}

export function releaseNotes({ manifest }) {
  return `${manifest.name} ${manifest.version} notes`;
}

export function expectedStableRelease(workspacePackage) {
  const { manifest } = workspacePackage;
  const shortName = manifest.name.slice(manifest.name.lastIndexOf("/") + 1);

  return {
    npmTag: "latest",
    packageName: manifest.name,
    peerDependencies: manifest.peerDependencies ?? {},
    prerelease: false,
    tag: `${shortName}-v${manifest.version}`,
    notes: releaseNotes(workspacePackage),
    title: `${shortName} v${manifest.version}`,
    version: manifest.version,
  };
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
