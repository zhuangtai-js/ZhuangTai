import { createAtom } from "@zhuangtai-js/core";
import { freeze } from "@zhuangtai-js/freeze";
import { immer } from "@zhuangtai-js/immer";
import { describe, expect, it } from "vitest";

describe("freeze in a real browser", () => {
  it("throws on mutation of frozen state", () => {
    // Given
    const createState = createAtom().use(freeze);
    const user = createState({ name: "a" });

    // When / Then: module code runs in strict mode, so assigning to a frozen
    // object throws instead of failing silently.
    expect(() => {
      user.get().name = "b";
    }).toThrow(TypeError);

    expect(user.get().name).toBe("a");
  });

  it("freezes values committed through set", () => {
    // Given
    const createState = createAtom().use(freeze);
    const user = createState({ name: "a" });

    // When
    user.set({ name: "b" });

    // Then
    expect(Object.isFrozen(user.get())).toBe(true);
  });
});

describe("immer in a real browser", () => {
  it("applies draft mutations as an immutable update", () => {
    // Given
    const createState = createAtom().use(immer);
    const todos = createState([{ done: false, text: "a" }]);
    const before = todos.get();

    // When
    todos.set((draft) => {
      draft[0]!.done = true;
      draft.push({ done: false, text: "b" });
    });

    // Then: a new reference is committed and the previous value is untouched.
    expect(todos.get()).not.toBe(before);
    expect(todos.get()).toEqual([
      { done: true, text: "a" },
      { done: false, text: "b" },
    ]);
    expect(before).toEqual([{ done: false, text: "a" }]);
  });
});
