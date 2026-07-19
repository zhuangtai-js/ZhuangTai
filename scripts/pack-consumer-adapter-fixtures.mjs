export const adapterCompatibilityCases = [
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
