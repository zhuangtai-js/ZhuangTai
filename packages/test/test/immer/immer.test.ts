import { createAtom } from "@zhuangtai-js/core";
import { immer } from "@zhuangtai-js/immer";
import { describe, expect, it } from "vitest";

describe("immer", () => {
  it("applies draft mutations as an immutable update", () => {
    // Given
    const createState = createAtom().use(immer);
    const state = createState([{ text: "a", done: false }]);
    const before = state.get();

    // When
    state.set((draft) => {
      draft[0]!.done = true;
    });

    // Then
    expect(state.get()[0]?.done).toBe(true);
    // The previous reference is not mutated in place.
    expect(before[0]?.done).toBe(false);
    expect(state.get()).not.toBe(before);
  });

  it("supports pushing through a draft", () => {
    // Given
    const createState = createAtom().use(immer);
    const state = createState<{ text: string }[]>([{ text: "a" }]);

    // When
    state.set((draft) => {
      draft.push({ text: "b" });
    });

    // Then
    expect(state.get().map((todo) => todo.text)).toEqual(["a", "b"]);
  });

  it("supports returning a new value from the recipe", () => {
    // Given
    const createState = createAtom().use(immer);
    const state = createState([
      { text: "a", done: true },
      { text: "b", done: false },
    ]);

    // When
    state.set((draft) => draft.filter((todo) => !todo.done));

    // Then
    expect(state.get().map((todo) => todo.text)).toEqual(["b"]);
  });

  it("commits concrete values without Immer", () => {
    // Given
    const createState = createAtom().use(immer);
    const next = [{ text: "c", done: false }];
    const state = createState<{ text: string; done: boolean }[]>([]);

    // When
    state.set(next);

    // Then
    expect(state.get()).toBe(next);
  });

  it("does not re-run the update as a core updater", () => {
    // Given
    const createState = createAtom().use(immer);
    const state = createState({ count: 0 });
    let calls = 0;

    // When
    state.set((draft) => {
      calls += 1;
      draft.count += 1;
    });

    // Then
    expect(calls).toBe(1);
    expect(state.get().count).toBe(1);
  });

  it("keeps the immer atom type distinct from a plain atom", () => {
    // Given
    const createImmer = createAtom().use(immer);
    const plainCreate = createAtom();
    const immerState = createImmer({ count: 0 });
    const plainState = plainCreate({ count: 0 });

    // When
    immerState.set((draft) => {
      draft.count += 1;
    });
    plainState.set((prev) => ({ count: prev.count + 1 }));

    // Then
    expect(immerState.get().count).toBe(1);
    expect(plainState.get().count).toBe(1);
  });

  it("notifies watchers with the produced value", () => {
    // Given
    const createState = createAtom().use(immer);
    const state = createState({ count: 0 });
    const seen: number[] = [];
    state.watch((value) => {
      seen.push(value.count);
    });

    // When
    state.set((draft) => {
      draft.count = 5;
    });

    // Then
    // watch fires once synchronously on subscribe (0), then on the update (5).
    expect(seen).toEqual([0, 5]);
  });
});
