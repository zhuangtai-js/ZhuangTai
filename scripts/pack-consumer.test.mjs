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

  assert.equal(files.some((file) => file.endsWith(".js.map")), false);
  assert.equal(files.some((file) => file.endsWith("dist/index.js")), true);
  assert.equal(files.some((file) => file.endsWith("dist/index.d.ts")), true);
  assert.equal(files.some((file) => file.endsWith("CHANGELOG.md")), true);
  assert.equal(files.some((file) => file.endsWith("LICENSE")), true);
}

describe("packed package consumer", () => {
  it("installs packed core, persist, react, freeze, and immer tarballs in a fresh consumer", () => {
    const tempPath = mkdtempSync(join(tmpdir(), "zhuangtai-pack-consumer-"));

    try {
      const coreManifest = readManifest("packages/core");
      const persistManifest = readManifest("packages/persist");
      const reactManifest = readManifest("packages/react");
      const freezeManifest = readManifest("packages/freeze");
      const immerManifest = readManifest("packages/immer");

      run("pnpm", ["--filter", coreManifest.name, "pack", "--pack-destination", tempPath]);
      run("pnpm", ["--filter", persistManifest.name, "pack", "--pack-destination", tempPath]);
      run("pnpm", ["--filter", reactManifest.name, "pack", "--pack-destination", tempPath]);
      run("pnpm", ["--filter", freezeManifest.name, "pack", "--pack-destination", tempPath]);
      run("pnpm", ["--filter", immerManifest.name, "pack", "--pack-destination", tempPath]);

      const coreTarballPath = join(tempPath, `zhuangtai-js-core-${coreManifest.version}.tgz`);
      const persistTarballPath = join(tempPath, `zhuangtai-js-persist-${persistManifest.version}.tgz`);
      const reactTarballPath = join(tempPath, `zhuangtai-js-react-${reactManifest.version}.tgz`);
      const freezeTarballPath = join(tempPath, `zhuangtai-js-freeze-${freezeManifest.version}.tgz`);
      const immerTarballPath = join(tempPath, `zhuangtai-js-immer-${immerManifest.version}.tgz`);

      assert.equal(existsSync(coreTarballPath), true);
      assert.equal(existsSync(persistTarballPath), true);
      assert.equal(existsSync(reactTarballPath), true);
      assert.equal(existsSync(freezeTarballPath), true);
      assert.equal(existsSync(immerTarballPath), true);
      assertPackedFiles(coreTarballPath);
      assertPackedFiles(persistTarballPath);
      assertPackedFiles(reactTarballPath);
      assertPackedFiles(freezeTarballPath);
      assertPackedFiles(immerTarballPath);

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
});
