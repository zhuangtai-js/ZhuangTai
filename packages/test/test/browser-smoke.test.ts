import { atom, computed, createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";

describe("browser smoke", () => {
  it("uses core primitives in a real browser", () => {
    const count = atom(1);
    const double = computed(() => count.get() * 2);

    count.set((value) => value + 1);

    expect(double.get()).toBe(4);
  });

  it("uses persist with browser localStorage", () => {
    expect(globalThis.localStorage).toBe(localStorage);

    localStorage.clear();
    localStorage.setItem("count", "5");

    const createState = createAtom().use(persist);
    const count = createState(0, { persist: { key: "count" } });

    expect(count.get()).toBe(5);

    count.set(6);

    expect(localStorage.getItem("count")).toBe("6");
  });

  it("restores persisted state across atom instances like a reload", () => {
    localStorage.clear();

    const createState = createAtom().use(persist);
    const first = createState(0, { persist: { key: "reload-count" } });

    first.set(42);

    // A second instance with the same key stands in for the atom re-created
    // after a page reload: it must restore what the first instance wrote.
    const second = createState(0, { persist: { key: "reload-count" } });

    expect(second.get()).toBe(42);
  });
});
