import {
  atom,
  computed,
  createAtom,
  type Atom,
  type AtomValue,
  type Computed,
  type NextValue,
  type ReadableAtom,
} from "@zhuangtai-js/core";
// @ts-expect-error AtomCreatorArgs is internal type plumbing, not public API.
import type { AtomCreatorArgs } from "@zhuangtai-js/core";
// @ts-expect-error AtomCreatorOptions is internal type plumbing, not public API.
import type { AtomCreatorOptions } from "@zhuangtai-js/core";
import {
  definePersistMigration,
  persist,
  type MaybePromise,
  type PersistCodec,
  type PersistControls,
  type PersistMigration,
  type PersistOptions,
  type PersistStorage,
} from "@zhuangtai-js/persist";
import {
  createAtomHook as createPreactAtomHook,
  createComputedHook as createPreactComputedHook,
  useAtom as usePreactAtom,
  useAtomValue as usePreactAtomValue,
  useSetAtom as usePreactSetAtom,
} from "../packages/preact/dist/index.js";
import {
  createAtomSignal as createSolidAtomSignal,
  createAtomValue as createSolidAtomValue,
  createSetAtom as createSolidSetAtom,
} from "../packages/solid/dist/index.js";
import {
  toReadable as toSvelteReadable,
  toWritable as toSvelteWritable,
} from "../packages/svelte/dist/index.js";
import {
  useAtom as useVueAtom,
  useAtomValue as useVueAtomValue,
  useSetAtom as useVueSetAtom,
} from "../packages/vue/dist/index.js";

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

const numberAtom = atom(0);
const stringAtom = atom("x");

type _NumberAtom = Expect<Equal<typeof numberAtom, Atom<number>>>;
type _NumberAtomValue = Expect<Equal<AtomValue<typeof numberAtom>, number>>;

numberAtom.set(1);
numberAtom.set((value) => value + 1);
// @ts-expect-error string should not be assignable to Atom<number>.set
numberAtom.set("nope");

// @ts-expect-error atom() does not support function values; wrap it in an object.
atom(() => 1);
const wrappedFunctionAtom = atom({ fn: (): number => 1 });
type _WrappedFunctionAtom = Expect<Equal<typeof wrappedFunctionAtom, Atom<{ fn: () => number }>>>;

const singleComputed = computed(() => String(numberAtom.get()));
const multiComputed = computed(() => `${numberAtom.get()}${stringAtom.get()}`);

type _SingleComputed = Expect<Equal<typeof singleComputed, Computed<string>>>;
type _SingleComputedValue = Expect<Equal<AtomValue<typeof singleComputed>, string>>;
type _MultiComputed = Expect<Equal<typeof multiComputed, Computed<string>>>;

// @ts-expect-error computed derive takes no arguments in the auto-tracking API.
computed((value: number) => value * 2);

const createPersistedAtom = createAtom().use(persist);

type _MaybePromise = Expect<
  Equal<MaybePromise<string>, string | PromiseLike<string>>
>;
type _PersistControls = Expect<
  Equal<
    PersistControls,
    {
      readonly ready: (atom: ReadableAtom<unknown>) => Promise<void>;
      readonly flush: (atom: ReadableAtom<unknown>) => Promise<void>;
      readonly rehydrate: (atom: ReadableAtom<unknown>) => Promise<void>;
      readonly clear: (atom: ReadableAtom<unknown>) => Promise<void>;
    }
  >
>;

type _PersistedCreatorOptions = Expect<
  Equal<
    NonNullable<Parameters<typeof createPersistedAtom>[1]>,
    { readonly persist?: PersistOptions }
  >
>;

type NarrowMigration = (value: string) => unknown;
type _NarrowMigrationCannotCrossStorageBoundary = Expect<
  Equal<NarrowMigration extends PersistMigration ? true : false, false>
>;
type NarrowReturningMigration = (value: string) => string;
type _HelperCannotAcceptNarrowMigration = Expect<
  Equal<
    NarrowReturningMigration extends Parameters<typeof definePersistMigration<string>>[0]
      ? true
      : false,
    false
  >
>;

const storage: PersistStorage = {
  getItem(key) {
    return key === "counter" ? "5" : null;
  },
  setItem() {},
  removeItem() {},
};

const codec: PersistCodec = {
  encode(value) {
    return JSON.stringify(value);
  },
  decode(rawValue, initialValue) {
    return JSON.parse(rawValue) as typeof initialValue;
  },
};

const persistedAtom = createPersistedAtom(5, { persist: { key: "counter", storage, codec } });

type _PersistedAtom = Expect<Equal<typeof persistedAtom, Atom<number>>>;

// @ts-expect-error creator atom() does not support function values; wrap it in an object.
createPersistedAtom(() => 1, { persist: { key: "fn" } });

// @ts-expect-error persist key is required
createPersistedAtom(0, { persist: {} });

// @ts-expect-error storage shape must match PersistStorage
createPersistedAtom(0, { persist: { key: "counter", storage: {} } });

// @ts-expect-error codec shape must match PersistCodec
createPersistedAtom(0, { persist: { key: "counter", codec: {} } });

// @ts-expect-error plugin options namespace should be named persist
createPersistedAtom(0, { wrong: { key: "counter" } });

type NumberSetter = (nextValue: NextValue<number>) => void;

const usePreactNumber = createPreactAtomHook(numberAtom);
const usePreactString = createPreactComputedHook(stringAtom);
const preactPair = usePreactAtom(numberAtom);
const preactValue = usePreactAtomValue(numberAtom);
const setPreactNumber = usePreactSetAtom(numberAtom);

type _PreactBoundAtom = Expect<
  Equal<ReturnType<typeof usePreactNumber>, readonly [number, NumberSetter]>
>;
type _PreactBoundComputed = Expect<Equal<ReturnType<typeof usePreactString>, string>>;
type _PreactAtomPair = Expect<Equal<typeof preactPair, readonly [number, NumberSetter]>>;
type _PreactAtomValue = Expect<Equal<typeof preactValue, number>>;
type _PreactSetAtom = Expect<Equal<typeof setPreactNumber, NumberSetter>>;

const svelteReadable = toSvelteReadable(numberAtom);
const svelteWritable = toSvelteWritable(numberAtom);
svelteReadable.subscribe((value) => {
  const numberValue: number = value;
  void numberValue;
});
svelteWritable.set(1);
svelteWritable.update((value) => value + 1);

const vuePair = useVueAtom(numberAtom);
const vueValue = useVueAtomValue(numberAtom);
const setVueNumber = useVueSetAtom(numberAtom);

type _VueAtomPairValue = Expect<Equal<(typeof vuePair)[0]["value"], number>>;
type _VueAtomPairSetter = Expect<Equal<(typeof vuePair)[1], NumberSetter>>;
type _VueAtomValue = Expect<Equal<(typeof vueValue)["value"], number>>;
type _VueSetAtom = Expect<Equal<typeof setVueNumber, NumberSetter>>;

const solidPair = createSolidAtomSignal(numberAtom);
const solidValue = createSolidAtomValue(numberAtom);
const setSolidNumber = createSolidSetAtom(numberAtom);

type _SolidAtomPairValue = Expect<Equal<ReturnType<(typeof solidPair)[0]>, number>>;
type _SolidAtomPairSetter = Expect<Equal<(typeof solidPair)[1], NumberSetter>>;
type _SolidAtomValue = Expect<Equal<ReturnType<typeof solidValue>, number>>;
type _SolidSetAtom = Expect<Equal<typeof setSolidNumber, NumberSetter>>;
