import { atom, computed, createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";

describe("browser smoke", () => {
  it("uses core primitives in a real browser", () => {
    const count = atom(1);
    const double = computed(count, (value) => value * 2);

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
});
