import {
  atom,
  computed,
  createAtom,
  type Atom,
  type AtomKind,
  type AtomOf,
  type AtomValue,
  type Computed,
  type NextValue,
  type StopWatch,
  type Watcher,
} from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";
import { immer, type ImmerAtom, type ImmerNextValue } from "@zhuangtai-js/immer";
import { persist } from "@zhuangtai-js/persist";
import { sync } from "@zhuangtai-js/sync";
import { describe, expectTypeOf, it } from "vitest";

// These tests pin the public type surface. expectTypeOf assertions are
// verified by tsc through `pnpm typecheck`; the runtime pass is a no-op.

describe("core value types", () => {
  it("types atom() as Atom<Value> with widened literals", () => {
    expectTypeOf(atom(0)).toEqualTypeOf<Atom<number>>();
    expectTypeOf(atom("a")).toEqualTypeOf<Atom<string>>();
    expectTypeOf(atom({ count: 0 })).toEqualTypeOf<Atom<{ count: number }>>();
  });

  it("types set() as accepting a value or an updater", () => {
    expectTypeOf(atom(0).set).parameter(0).toEqualTypeOf<NextValue<number>>();
    expectTypeOf<NextValue<number>>().toEqualTypeOf<number | ((prevValue: number) => number)>();
  });

  it("types watch() with the previous value and a stopper", () => {
    expectTypeOf(atom(0).watch).parameter(0).toEqualTypeOf<Watcher<number>>();
    expectTypeOf<Watcher<number>>().toEqualTypeOf<
      (value: number, prevValue: number | undefined) => void
    >();
    expectTypeOf(atom(0).watch).returns.toEqualTypeOf<StopWatch>();
  });

  it("types computed() as a read-only atom", () => {
    const double = computed(() => 2);

    expectTypeOf(double).toEqualTypeOf<Computed<number>>();
    expectTypeOf(double).not.toHaveProperty("set");
  });

  it("rejects function values at the atom() boundary", () => {
    expectTypeOf(atom<number>)
      .parameter(0)
      .toEqualTypeOf<number>();
    expectTypeOf(atom<() => void>)
      .parameter(0)
      .not.toEqualTypeOf<() => void>();
    expectTypeOf(atom<() => void>)
      .parameter(0)
      .toExtend<string>();
  });

  it("extracts values with AtomValue", () => {
    expectTypeOf<AtomValue<Atom<number>>>().toEqualTypeOf<number>();
    expectTypeOf<AtomValue<Computed<string>>>().toEqualTypeOf<string>();
  });
});

describe("atom kinds", () => {
  it("maps registered kinds through AtomOf", () => {
    expectTypeOf<AtomKind>().toEqualTypeOf<"default" | "immer">();
    expectTypeOf<AtomOf<"default", number>>().toEqualTypeOf<Atom<number>>();
    expectTypeOf<AtomOf<"immer", number>>().toEqualTypeOf<ImmerAtom<number>>();
  });

  it("creates default-kind atoms without plugins", () => {
    const createState = createAtom();

    expectTypeOf(createState(0)).toEqualTypeOf<Atom<number>>();
  });

  it("keeps kindless plugins on the default atom shape", () => {
    const createState = createAtom().use(sync).use(freeze);

    expectTypeOf(createState(0)).toEqualTypeOf<Atom<number>>();
  });

  it("switches the creator to the immer shape through use(immer)", () => {
    const createState = createAtom().use(immer);
    const state = createState({ count: 0 });

    expectTypeOf(state).toEqualTypeOf<ImmerAtom<{ count: number }>>();
    expectTypeOf(state.set).parameter(0).toEqualTypeOf<ImmerNextValue<{ count: number }>>();
  });

  it("keeps the immer shape distinct from the plain atom shape", () => {
    expectTypeOf<ImmerAtom<number>>().not.toEqualTypeOf<Atom<number>>();
  });

  it("uses the outer default-kind plugin shape when it follows immer", () => {
    expectTypeOf(createAtom().use(immer).use(persist)({ count: 0 })).toEqualTypeOf<
      Atom<{ count: number }>
    >();
    expectTypeOf(createAtom().use(immer).use(sync)({ count: 0 })).toEqualTypeOf<
      Atom<{ count: number }>
    >();
    expectTypeOf(createAtom().use(immer).use(freeze)({ count: 0 })).toEqualTypeOf<
      Atom<{ count: number }>
    >();
  });

  it("uses the outer immer shape when immer follows a default-kind plugin", () => {
    expectTypeOf(createAtom().use(persist).use(immer)({ count: 0 })).toEqualTypeOf<
      ImmerAtom<{ count: number }>
    >();
    expectTypeOf(createAtom().use(sync).use(immer)({ count: 0 })).toEqualTypeOf<
      ImmerAtom<{ count: number }>
    >();
    expectTypeOf(createAtom().use(freeze).use(immer)({ count: 0 })).toEqualTypeOf<
      ImmerAtom<{ count: number }>
    >();
  });
});
