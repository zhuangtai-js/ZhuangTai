import { atom, computed, createAtom, type Atom, type AtomValue, type Computed } from "@zhuangtai-js/core";
// @ts-expect-error AtomCreatorArgs is internal type plumbing, not public API.
import type { AtomCreatorArgs } from "@zhuangtai-js/core";
// @ts-expect-error AtomCreatorOptions is internal type plumbing, not public API.
import type { AtomCreatorOptions } from "@zhuangtai-js/core";
import { persist, type PersistCodec, type PersistOptions, type PersistStorage } from "@zhuangtai-js/persist";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
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

type _PersistedCreatorOptions = Expect<
  Equal<NonNullable<Parameters<typeof createPersistedAtom>[1]>, { readonly persist?: PersistOptions }>
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
