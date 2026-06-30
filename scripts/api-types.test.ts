import { atom, computed, createAtom, type Atom, type AtomValue, type AtomValues, type Computed } from "@zhuangtai-js/core";
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
const tupleSources = [atom(1), stringAtom] as const;

type _NumberAtom = Expect<Equal<typeof numberAtom, Atom<number>>>;
type _NumberAtomValue = Expect<Equal<AtomValue<typeof numberAtom>, number>>;
type _TupleAtomValues = Expect<Equal<AtomValues<typeof tupleSources>, readonly [number, string]>>;

numberAtom.set(1);
numberAtom.set((value) => value + 1);
// @ts-expect-error string should not be assignable to Atom<number>.set
numberAtom.set("nope");

const singleComputed = computed(numberAtom, (value) => String(value));
const tupleComputed = computed([atom(1), atom("x")] as const, (n, s) => {
  type _N = Expect<Equal<typeof n, number>>;
  type _S = Expect<Equal<typeof s, string>>;

  return `${n}${s}`;
});

type _SingleComputed = Expect<Equal<typeof singleComputed, Computed<string>>>;
type _SingleComputedValue = Expect<Equal<AtomValue<typeof singleComputed>, string>>;
type _TupleComputed = Expect<Equal<typeof tupleComputed, Computed<string>>>;

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

// @ts-expect-error persist key is required
createPersistedAtom(0, { persist: {} });

// @ts-expect-error storage shape must match PersistStorage
createPersistedAtom(0, { persist: { key: "counter", storage: {} } });

// @ts-expect-error codec shape must match PersistCodec
createPersistedAtom(0, { persist: { key: "counter", codec: {} } });

// @ts-expect-error plugin options namespace should be named persist
createPersistedAtom(0, { wrong: { key: "counter" } });
