import { persistStableCandidate } from "./publish-workspaces-test-fixtures.mjs";

export const primaryPackagePaths = [
  "packages/core",
  persistStableCandidate.packagePath,
  "packages/react",
  "packages/freeze",
  "packages/immer",
  "packages/sync",
];

export const primaryConsumerRuntime = `import { atom, computed, createAtom } from "@zhuangtai-js/core";
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

const asyncData = new Map();
const asyncStorage = {
  getItem: async (key) => asyncData.get(key) ?? null,
  setItem: async (key, value) => {
    asyncData.set(key, value);
  },
  removeItem: async (key) => {
    asyncData.delete(key);
  },
};
const asyncPersisted = createState(1, { persist: { key: "async-count", storage: asyncStorage } });
await persist.ready(asyncPersisted);
asyncPersisted.set(4);
await persist.flush(asyncPersisted);
if (asyncData.get("async-count") !== "4") throw new Error("async persist smoke failed");

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
if (typeof useDouble !== "function") throw new Error("react createComputedHook smoke failed");`;

export const primaryConsumerTypes = `import { atom, computed, createAtom, type Atom, type ReadableAtom } from "@zhuangtai-js/core";
import { persist, type MaybePromise, type PersistControls, type PersistStorage } from "@zhuangtai-js/persist";
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
const asyncStorage: PersistStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};
const controls: PersistControls = persist;
const maybeValue: MaybePromise<string> = Promise.resolve("ready");

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
void asyncStorage;
void controls;
void maybeValue;
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
`;
