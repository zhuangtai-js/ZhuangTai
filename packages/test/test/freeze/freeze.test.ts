import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";
import { describe, expect, it } from "vitest";

describe("freeze", () => {
  it("deep-freezes the initial value", () => {
    // Given
    const createState = createAtom().use(freeze);

    // When
    const state = createState({ name: "yuan", tags: ["a"] }, { freeze: { enabled: true } });

    // Then
    expect(Object.isFrozen(state.get())).toBe(true);
    expect(Object.isFrozen(state.get().tags)).toBe(true);
  });

  it("throws on mutation of a frozen value in strict mode", () => {
    // Given
    const createState = createAtom().use(freeze);
    const state = createState({ count: 0 }, { freeze: { enabled: true } });

    // When
    function mutate(): void {
      "use strict";
      state.get().count = 1;
    }

    // Then
    expect(mutate).toThrow(TypeError);
  });

  it("deep-freezes values committed through set", () => {
    // Given
    const createState = createAtom().use(freeze);
    const state = createState<{ value: number }>({ value: 0 }, { freeze: { enabled: true } });

    // When
    state.set({ value: 1 });

    // Then
    expect(state.get().value).toBe(1);
    expect(Object.isFrozen(state.get())).toBe(true);
  });

  it("freezes updater results", () => {
    // Given
    const createState = createAtom().use(freeze);
    const state = createState<{ value: number }>({ value: 0 }, { freeze: { enabled: true } });

    // When
    state.set((prev) => ({ value: prev.value + 1 }));

    // Then
    expect(state.get().value).toBe(1);
    expect(Object.isFrozen(state.get())).toBe(true);
  });

  it("recursively freezes nested structures", () => {
    // Given
    const createState = createAtom().use(freeze);

    // When
    const state = createState(
      { nested: { deep: { list: [1, 2] } } },
      { freeze: { enabled: true } },
    );

    // Then
    expect(Object.isFrozen(state.get().nested)).toBe(true);
    expect(Object.isFrozen(state.get().nested.deep)).toBe(true);
    expect(Object.isFrozen(state.get().nested.deep.list)).toBe(true);
  });

  it("terminates on cyclic references", () => {
    // Given
    const createState = createAtom().use(freeze);
    type Cyclic = { self?: Cyclic };
    const cyclic: Cyclic = {};
    cyclic.self = cyclic;

    // When
    const state = createState<Cyclic>(cyclic, { freeze: { enabled: true } });

    // Then
    expect(Object.isFrozen(state.get())).toBe(true);
    expect(state.get().self).toBe(state.get());
  });

  it("does not freeze when disabled", () => {
    // Given
    const createState = createAtom().use(freeze);

    // When
    const state = createState({ count: 0 }, { freeze: { enabled: false } });

    // Then
    expect(Object.isFrozen(state.get())).toBe(false);
  });

  it("leaves primitive values untouched", () => {
    // Given
    const createState = createAtom().use(freeze);
    const state = createState(1, { freeze: { enabled: true } });

    // When
    state.set(2);

    // Then
    expect(state.get()).toBe(2);
  });

  it("skips already-frozen values without error", () => {
    // Given
    const createState = createAtom().use(freeze);
    const frozen = Object.freeze({ value: 1 });

    // When
    const state = createState(frozen, { freeze: { enabled: true } });

    // Then
    expect(state.get()).toBe(frozen);
    expect(Object.isFrozen(state.get())).toBe(true);
  });
});
