import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const rootPath = new URL("..", import.meta.url).pathname;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  return result;
}

function readManifest(packagePath) {
  return JSON.parse(readFileSync(join(rootPath, packagePath, "package.json"), "utf8"));
}

function assertPackedFiles(tarballPath) {
  const files = run("tar", ["-tzf", tarballPath]).stdout.trim().split("\n");

  assert.equal(
    files.some((file) => file.endsWith(".js.map")),
    false,
  );
  assert.equal(
    files.some((file) => file.endsWith("dist/index.js")),
    true,
  );
  assert.equal(
    files.some((file) => file.endsWith("dist/index.d.ts")),
    true,
  );
  assert.equal(
    files.some((file) => file.endsWith("CHANGELOG.md")),
    true,
  );
  assert.equal(
    files.some((file) => file.endsWith("LICENSE")),
    true,
  );
}

function packWorkspacePackage(packagePath, destinationPath) {
  const manifest = readManifest(packagePath);
  run("pnpm", ["--filter", manifest.name, "pack", "--pack-destination", destinationPath]);
  const tarballPath = join(
    destinationPath,
    `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`,
  );

  assert.equal(existsSync(tarballPath), true);
  assertPackedFiles(tarballPath);

  return { manifest, tarballPath };
}

const adapterCompatibilityCases = [
  {
    adapter: "preact",
    framework: "preact",
    versions: ["10.9.0", "10.29.7"],
    runtime: `import { atom, computed } from "@zhuangtai-js/core";
import {
  createAtomHook,
  createComputedHook,
  useAtom,
  useAtomValue,
  useSetAtom,
} from "@zhuangtai-js/preact";
import { createElement } from "preact";
const count = atom(1);
const useCount = createAtomHook(count);
const useDouble = createComputedHook(computed(() => count.get() * 2));
for (const exported of [
  createAtomHook,
  createComputedHook,
  useAtom,
  useAtomValue,
  useSetAtom,
  createElement,
  useCount,
  useDouble,
]) {
  if (typeof exported !== "function") throw new Error("Preact export smoke failed");
}`,
    types: `import { atom, computed, type Atom } from "@zhuangtai-js/core";
import { createAtomHook, createComputedHook, useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/preact";
const count: Atom<number> = atom(1);
const useCount: () => readonly [number, (nextValue: number | ((previousValue: number) => number)) => void] = createAtomHook(count);
const useDouble: () => number = createComputedHook(computed(() => count.get() * 2));
const pair: readonly [number, (nextValue: number | ((previousValue: number) => number)) => void] = useAtom(count);
const value: number = useAtomValue(count);
const setValue: (nextValue: number | ((previousValue: number) => number)) => void = useSetAtom(count);
void useCount;
void useDouble;
void pair;
void value;
void setValue;`,
  },
  {
    adapter: "svelte",
    framework: "svelte",
    versions: ["4.2.0", "5.56.4"],
    runtime: `import { atom, computed } from "@zhuangtai-js/core";
import { toReadable, toWritable } from "@zhuangtai-js/svelte";
import { get } from "svelte/store";
const count = atom(1);
const writable = toWritable(count);
if (get(writable) !== 1) throw new Error("Svelte initial value smoke failed");
writable.update((value) => value + 2);
if (count.get() !== 3 || get(writable) !== 3) throw new Error("Svelte writable smoke failed");
const readable = toReadable(computed(() => count.get() * 2));
if (get(readable) !== 6) throw new Error("Svelte readable smoke failed");`,
    types: `import { atom, computed, type Atom } from "@zhuangtai-js/core";
import { toReadable, toWritable } from "@zhuangtai-js/svelte";
import type { Readable, Writable } from "svelte/store";
const count: Atom<number> = atom(1);
const readable: Readable<number> = toReadable(computed(() => count.get() * 2));
const writable: Writable<number> = toWritable(count);
void readable;
void writable;`,
  },
  {
    adapter: "vue",
    framework: "vue",
    versions: ["3.2.0", "3.5.39"],
    runtime: `import { atom } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/vue";
import { effectScope, isReadonly, isRef } from "vue";
const count = atom(1);
const scope = effectScope();
const result = scope.run(() => {
  const [value, setValue] = useAtom(count);
  const readOnlyValue = useAtomValue(count);
  const setOnly = useSetAtom(count);
  if (!isRef(value) || !isReadonly(value) || !isRef(readOnlyValue)) {
    throw new Error("Vue ref smoke failed");
  }
  setValue((current) => current + 1);
  setOnly(4);
  return [value.value, readOnlyValue.value];
});
if (result === undefined || result[0] !== 4 || result[1] !== 4) {
  throw new Error("Vue update smoke failed");
}
scope.stop();`,
    types: `import { atom, type Atom } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/vue";
import type { ComputedRef } from "vue";
const count: Atom<number> = atom(1);
const pair: readonly [ComputedRef<number>, (nextValue: number | ((previousValue: number) => number)) => void] = useAtom(count);
const value: ComputedRef<number> = useAtomValue(count);
const setValue: (nextValue: number | ((previousValue: number) => number)) => void = useSetAtom(count);
void pair;
void value;
void setValue;`,
  },
  {
    adapter: "solid",
    framework: "solid-js",
    versions: ["1.5.0", "1.5.9", "1.6.16", "1.7.12", "1.8.22", "1.9.14"],
    runtime: `import { createAtomValue } from "@zhuangtai-js/solid";
import { renderToString, ssr } from "solid-js/web";
let watchCalls = 0;
let activeWatchers = 0;
const source = {
  get: () => 1,
  watch: (watcher) => {
    watchCalls += 1;
    activeWatchers += 1;
    watcher(1, undefined);
    return () => {
      activeWatchers -= 1;
    };
  },
};
const html = renderToString(() => {
  const value = createAtomValue(source);
  return ssr(["<span>", "</span>"], value());
});
if (html !== "<span>1</span>") throw new Error("Solid SSR HTML smoke failed");
if (watchCalls !== 0) throw new Error("Solid SSR watch call smoke failed");
if (activeWatchers !== 0) throw new Error("Solid SSR watcher leak smoke failed");`,
    types: `import { atom, type Atom } from "@zhuangtai-js/core";
import { createAtomSignal, createAtomValue, createSetAtom } from "@zhuangtai-js/solid";
import type { Accessor } from "solid-js";
const count: Atom<number> = atom(1);
const pair: readonly [Accessor<number>, (nextValue: number | ((previousValue: number) => number)) => void] = createAtomSignal(count);
const value: Accessor<number> = createAtomValue(count);
const setValue: (nextValue: number | ((previousValue: number) => number)) => void = createSetAtom(count);
void pair;
void value;
void setValue;`,
  },
];

describe("packed package consumer", () => {
  it("installs packed core, persist, react, freeze, immer, and sync tarballs in a fresh consumer", () => {
    const tempPath = mkdtempSync(join(tmpdir(), "zhuangtai-pack-consumer-"));

    try {
      const coreManifest = readManifest("packages/core");
      const persistManifest = readManifest("packages/persist");
      const reactManifest = readManifest("packages/react");
      const freezeManifest = readManifest("packages/freeze");
      const immerManifest = readManifest("packages/immer");
      const syncManifest = readManifest("packages/sync");

      run("pnpm", ["--filter", coreManifest.name, "pack", "--pack-destination", tempPath]);
      run("pnpm", ["--filter", persistManifest.name, "pack", "--pack-destination", tempPath]);
      run("pnpm", ["--filter", reactManifest.name, "pack", "--pack-destination", tempPath]);
      run("pnpm", ["--filter", freezeManifest.name, "pack", "--pack-destination", tempPath]);
      run("pnpm", ["--filter", immerManifest.name, "pack", "--pack-destination", tempPath]);
      run("pnpm", ["--filter", syncManifest.name, "pack", "--pack-destination", tempPath]);

      const coreTarballPath = join(tempPath, `zhuangtai-js-core-${coreManifest.version}.tgz`);
      const persistTarballPath = join(
        tempPath,
        `zhuangtai-js-persist-${persistManifest.version}.tgz`,
      );
      const reactTarballPath = join(tempPath, `zhuangtai-js-react-${reactManifest.version}.tgz`);
      const freezeTarballPath = join(tempPath, `zhuangtai-js-freeze-${freezeManifest.version}.tgz`);
      const immerTarballPath = join(tempPath, `zhuangtai-js-immer-${immerManifest.version}.tgz`);
      const syncTarballPath = join(tempPath, `zhuangtai-js-sync-${syncManifest.version}.tgz`);

      assert.equal(existsSync(coreTarballPath), true);
      assert.equal(existsSync(persistTarballPath), true);
      assert.equal(existsSync(reactTarballPath), true);
      assert.equal(existsSync(freezeTarballPath), true);
      assert.equal(existsSync(immerTarballPath), true);
      assert.equal(existsSync(syncTarballPath), true);
      assertPackedFiles(coreTarballPath);
      assertPackedFiles(persistTarballPath);
      assertPackedFiles(reactTarballPath);
      assertPackedFiles(freezeTarballPath);
      assertPackedFiles(immerTarballPath);
      assertPackedFiles(syncTarballPath);

      writeFileSync(
        join(tempPath, "package.json"),
        `${JSON.stringify(
          {
            name: "zhuangtai-pack-consumer",
            private: true,
            type: "module",
            dependencies: {
              "@zhuangtai-js/core": `file:${coreTarballPath}`,
              "@zhuangtai-js/persist": `file:${persistTarballPath}`,
              "@zhuangtai-js/react": `file:${reactTarballPath}`,
              "@zhuangtai-js/freeze": `file:${freezeTarballPath}`,
              "@zhuangtai-js/immer": `file:${immerTarballPath}`,
              "@zhuangtai-js/sync": `file:${syncTarballPath}`,
              "@types/react": "^19.2.0",
              react: "^19.2.0",
              typescript: "rc",
            },
          },
          null,
          2,
        )}\n`,
      );
      writeFileSync(
        join(tempPath, "pnpm-workspace.yaml"),
        `overrides:\n  "@zhuangtai-js/core": "file:${coreTarballPath}"\n`,
      );

      run("pnpm", ["install"], { cwd: tempPath });

      run(
        "node",
        [
          "--input-type=module",
          "-e",
          `import { atom, computed, createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";
import { freeze } from "@zhuangtai-js/freeze";
import { immer } from "@zhuangtai-js/immer";
import { sync } from "@zhuangtai-js/sync";
import {
  useAtom,
  useAtomValue,
  useSetAtom,
  createAtomHook,
  createComputedHook,
} from "@zhuangtai-js/react";

const count = atom(1);
const double = computed(() => count.get() * 2);
count.set((value) => value + 1);
if (double.get() !== 4) throw new Error("core smoke failed");

const data = new Map();
const storage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
  removeItem: (key) => data.delete(key),
};
const createState = createAtom().use(persist);
const persisted = createState(1, { persist: { key: "count", storage } });
persisted.set(3);
if (data.get("count") !== "3") throw new Error("persist smoke failed");

const frozenCreate = createAtom().use(freeze);
const frozen = frozenCreate({ n: 1 }, { freeze: { enabled: true } });
if (!Object.isFrozen(frozen.get())) throw new Error("freeze smoke failed");

const immerCreate = createAtom().use(immer);
const withImmer = immerCreate({ items: [{ done: false }] });
withImmer.set((draft) => {
  draft.items[0].done = true;
});
if (withImmer.get().items[0].done !== true) throw new Error("immer smoke failed");

const syncCreate = createAtom().use(sync);
const broadcasts = [];
const syncChannel = { postMessage: (message) => broadcasts.push(message), addEventListener: () => {} };
const synced = syncCreate(1, { sync: { key: "count", channel: syncChannel } });
synced.set(2);
if (synced.get() !== 2) throw new Error("sync smoke failed");
if (broadcasts[0] !== "2") throw new Error("sync broadcast smoke failed");

// React hooks require a renderer to invoke; verify the module exports and that
// the bound-hook factories return hook functions without calling any hook.
for (const hook of [useAtom, useAtomValue, useSetAtom, createAtomHook, createComputedHook]) {
  if (typeof hook !== "function") throw new Error("react export smoke failed");
}
const useCount = createAtomHook(atom(0));
const useDouble = createComputedHook(computed(() => count.get() * 2));
if (typeof useCount !== "function") throw new Error("react createAtomHook smoke failed");
if (typeof useDouble !== "function") throw new Error("react createComputedHook smoke failed");`,
        ],
        { cwd: tempPath },
      );

      writeFileSync(
        join(tempPath, "smoke.ts"),
        `import { atom, computed, createAtom, type Atom, type ReadableAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { freeze, type FreezeOptions } from "@zhuangtai-js/freeze";
import { immer, type ImmerAtom } from "@zhuangtai-js/immer";
import { sync, type SyncChannel } from "@zhuangtai-js/sync";
import {
  useAtom,
  useAtomValue,
  useSetAtom,
  createAtomHook,
  createComputedHook,
} from "@zhuangtai-js/react";

const count: Atom<number> = atom(1);
count.set((value) => value + 1);

const storage: PersistStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const double: ReadableAtom<number> = computed(() => count.get() * 2);
const useCount: () => readonly [number, (nextValue: number | ((prev: number) => number)) => void] =
  createAtomHook(count);
const useDouble: () => number = createComputedHook(double);
const freezeOptions: FreezeOptions = { enabled: true };
const immerState: ImmerAtom<{ count: number }> = createAtom().use(immer)({ count: 0 });
immerState.set((draft) => {
  draft.count += 1;
});

const syncChannel: SyncChannel = {
  postMessage: () => {},
  addEventListener: () => {},
};
const syncedState: Atom<{ count: number }> = createAtom().use(sync)(
  { count: 0 },
  { sync: { key: "count", channel: syncChannel } },
);
syncedState.set((prev) => ({ count: prev.count + 1 }));

void persist;
void storage;
void useAtom;
void useAtomValue;
void useSetAtom;
void useCount;
void useDouble;
void freeze;
void freezeOptions;
void immer;
void immerState;
void sync;
void syncChannel;
void syncedState;
`,
      );

      run(
        "pnpm",
        [
          "exec",
          "tsc",
          "--module",
          "NodeNext",
          "--moduleResolution",
          "NodeNext",
          "--target",
          "ES2022",
          "--strict",
          "--noEmit",
          "smoke.ts",
        ],
        { cwd: tempPath },
      );
    } finally {
      rmSync(tempPath, { force: true, recursive: true });
    }
  });

  it("verifies minimum and current framework peers in isolated consumers", () => {
    const packPath = mkdtempSync(join(tmpdir(), "zhuangtai-adapter-packs-"));

    try {
      const corePackage = packWorkspacePackage("packages/core", packPath);
      const adapterPackages = new Map(
        adapterCompatibilityCases.map(({ adapter }) => [
          adapter,
          packWorkspacePackage(`packages/${adapter}`, packPath),
        ]),
      );

      for (const compatibilityCase of adapterCompatibilityCases) {
        const adapterPackage = adapterPackages.get(compatibilityCase.adapter);
        assert.ok(adapterPackage);

        for (const frameworkVersion of compatibilityCase.versions) {
          const consumerPath = mkdtempSync(
            join(tmpdir(), `zhuangtai-${compatibilityCase.adapter}-${frameworkVersion}-`),
          );

          try {
            const dependencies = {
              "@zhuangtai-js/core": `file:${corePackage.tarballPath}`,
              [`@zhuangtai-js/${compatibilityCase.adapter}`]: `file:${adapterPackage.tarballPath}`,
              [compatibilityCase.framework]: frameworkVersion,
            };
            const expectedDependencies = [
              "@zhuangtai-js/core",
              `@zhuangtai-js/${compatibilityCase.adapter}`,
              compatibilityCase.framework,
            ].toSorted();

            assert.deepEqual(Object.keys(dependencies).toSorted(), expectedDependencies);
            writeFileSync(
              join(consumerPath, "package.json"),
              `${JSON.stringify(
                {
                  name: `zhuangtai-${compatibilityCase.adapter}-${frameworkVersion}-consumer`,
                  private: true,
                  type: "module",
                  dependencies,
                },
                null,
                2,
              )}\n`,
            );
            writeFileSync(
              join(consumerPath, "pnpm-workspace.yaml"),
              `overrides:\n  "@zhuangtai-js/core": "file:${corePackage.tarballPath}"\n`,
            );

            run("pnpm", ["install", "--strict-peer-dependencies"], { cwd: consumerPath });
            run(
              "node",
              [
                ...(compatibilityCase.nodeArgs ?? []),
                "--input-type=module",
                "--eval",
                compatibilityCase.runtime,
              ],
              { cwd: consumerPath },
            );
            writeFileSync(join(consumerPath, "smoke.ts"), `${compatibilityCase.types}\n`);
            run(
              join(rootPath, "node_modules/.bin/tsc"),
              [
                "--module",
                "NodeNext",
                "--moduleResolution",
                "NodeNext",
                "--target",
                "ES2022",
                "--strict",
                "--skipLibCheck",
                "--noEmit",
                "smoke.ts",
              ],
              { cwd: consumerPath },
            );
          } finally {
            rmSync(consumerPath, { force: true, recursive: true });
          }
        }
      }
    } finally {
      rmSync(packPath, { force: true, recursive: true });
    }
  });
});
