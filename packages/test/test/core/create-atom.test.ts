import {
  atom,
  createAtom,
  type AtomCreatorPluginContext,
  type Atom,
  type AtomCreatorPlugin,
  type Watcher,
} from "@zhuangtai-js/core";
import { describe, expect, it, vi } from "vitest";

describe("createAtom", () => {
  it("creates normal atoms without plugins", () => {
    // Given
    const createState = createAtom();

    // When
    const state = createState(0);
    state.set(1);

    // Then
    expect(state.get()).toBe(1);
  });

  it("keeps the default atom API plugin-free", () => {
    // Given

    // When
    const hasUse = "use" in atom;

    // Then
    expect(hasUse).toBe(false);
  });

  it("rejects options before a plugin is installed", () => {
    // Given
    const createState = createAtom();

    // When
    type AcceptsOptionsBeforePlugin = Parameters<typeof createState>["length"] extends 1
      ? false
      : true;
    const acceptsOptionsBeforePlugin = false satisfies AcceptsOptionsBeforePlugin;

    // Then
    expect(acceptsOptionsBeforePlugin).toBe(false);
  });

  it("applies a plugin with namespaced options before creating the atom", () => {
    // Given
    type SeedOptions = { readonly value: number };
    const seed: AtomCreatorPlugin<"seed", SeedOptions> = {
      id: "seed",
      create<Value>(context: AtomCreatorPluginContext<Value, SeedOptions>) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this test plugin intentionally replaces the initial value from untyped plugin options.
        return context.next((context.options?.value ?? context.initialValue) as Value);
      },
    };
    const createState = createAtom().use(seed);

    // When
    const state = createState(1, { seed: { value: 2 } });

    // Then
    expect(state.get()).toBe(2);
  });

  it("passes undefined options when a plugin namespace is omitted", () => {
    // Given
    type SeedOptions = { readonly value: number };
    const seed: AtomCreatorPlugin<"seed", SeedOptions> = {
      id: "seed",
      create<Value>(context: AtomCreatorPluginContext<Value, SeedOptions>) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this test plugin intentionally replaces the initial value from untyped plugin options.
        return context.next((context.options?.value ?? context.initialValue) as Value);
      },
    };
    const createState = createAtom().use(seed);

    // When
    const state = createState(1);

    // Then
    expect(state.get()).toBe(1);
  });

  it("rejects installing the same plugin id twice", () => {
    // Given
    let calls = 0;
    function create<Value>(state: Atom<Value>): Atom<Value> {
      calls += 1;

      return state;
    }
    const tracking: AtomCreatorPlugin<"tracking", Record<never, never>> = {
      id: "tracking",
      create(context) {
        return create(context.next(context.initialValue));
      },
    };
    // When
    function installDuplicate() {
      return createAtom().use(tracking).use(tracking);
    }

    // Then
    expect(installDuplicate).toThrowError(
      '[@zhuangtai-js/core] Plugin id "tracking" is already installed.',
    );
    expect(calls).toBe(0);
  });

  it("rejects a different plugin that reuses an installed id", () => {
    // Given
    const first: AtomCreatorPlugin<"duplicate", Record<never, never>> = {
      id: "duplicate",
      create(context) {
        return context.next(context.initialValue);
      },
    };
    const second: AtomCreatorPlugin<"duplicate", Record<never, never>> = {
      id: "duplicate",
      create(context) {
        return context.next(context.initialValue);
      },
    };

    // When
    function installDuplicate() {
      return createAtom().use(first).use(second);
    }

    // Then
    expect(installDuplicate).toThrowError(
      '[@zhuangtai-js/core] Plugin id "duplicate" is already installed.',
    );
  });

  it("does not mutate previous creators when use is called", () => {
    // Given
    type SeedOptions = { readonly value: number };
    const seed: AtomCreatorPlugin<"seed", SeedOptions> = {
      id: "seed",
      create<Value>(context: AtomCreatorPluginContext<Value, SeedOptions>) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this test plugin intentionally replaces the initial value from untyped plugin options.
        return context.next((context.options?.value ?? context.initialValue) as Value);
      },
    };
    const baseCreateState = createAtom();
    const seededCreateState = baseCreateState.use(seed);

    // When
    const baseState = baseCreateState(1);
    const seededState = seededCreateState(1, { seed: { value: 2 } });

    // Then
    expect(baseState.get()).toBe(1);
    expect(seededState.get()).toBe(2);
  });

  it("keeps watcher semantics on plugin-created atoms", () => {
    // Given
    const createState = createAtom();
    const state = createState(1);
    const watcher = vi.fn<Watcher<number>>();

    // When
    state.watch(watcher);

    // Then
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(1, undefined);
  });
});
