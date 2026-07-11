import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistCodec, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it, vi } from "vitest";

describe("persist default JSON codec", () => {
  it("rejects non-finite numbers without writing storage or memory", () => {
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const createState = createAtom().use(persist);
    const state = createState(0, { persist: { key: "count", storage } });
    const watcher = vi.fn<(value: number, prevValue: number | undefined) => void>();
    state.watch(watcher);
    watcher.mockClear();

    for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => state.set(invalid)).toThrow(/non-finite numbers/i);
      expect(state.get()).toBe(0);
    }

    expect(setItem).not.toHaveBeenCalled();
    expect(watcher).not.toHaveBeenCalled();
  });

  it("rejects nested non-finite numbers", () => {
    const storage = createStorage();
    const createState = createAtom().use(persist);
    const state = createState({ n: 1 }, { persist: { key: "payload", storage } });

    expect(() => state.set({ n: Number.NaN })).toThrow(/non-finite numbers/i);
    expect(state.get()).toEqual({ n: 1 });
    expect(storage.getItem("payload")).toBeNull();
  });

  it("rejects invalid Date values that JSON would turn into null", () => {
    const storage = createStorage();
    const createState = createAtom().use(persist);
    const valid = new Date("2020-01-01T00:00:00.000Z");
    const state = createState(valid, { persist: { key: "when", storage } });

    expect(() => state.set(new Date(Number.NaN))).toThrow(/invalid Date/i);
    expect(state.get()).toBe(valid);
  });

  it("still round-trips finite JSON values", () => {
    const storage = createStorage();
    const createState = createAtom().use(persist);
    const state = createState({ count: 1, ok: true }, { persist: { key: "payload", storage } });

    state.set({ count: 2, ok: false });

    expect(storage.getItem("payload")).toBe('{"count":2,"ok":false}');
    expect(state.get()).toEqual({ count: 2, ok: false });
  });

  it("allows a custom codec to encode non-finite numbers", () => {
    const storage = createStorage();
    const codec: PersistCodec = {
      encode(value) {
        return JSON.stringify(value, (_key, current) =>
          typeof current === "number" && !Number.isFinite(current)
            ? { $number: String(current) }
            : current,
        );
      },
      decode(rawValue) {
        return JSON.parse(rawValue, (_key, current) => {
          if (
            current &&
            typeof current === "object" &&
            "$number" in current &&
            typeof current.$number === "string"
          ) {
            return Number(current.$number);
          }

          return current;
        });
      },
    };
    const createState = createAtom().use(persist);
    const state = createState(0, { persist: { key: "count", storage, codec } });

    state.set(Number.NaN);

    expect(Number.isNaN(state.get())).toBe(true);
    expect(storage.getItem("count")).toBe('{"$number":"NaN"}');
  });

  it("still skips Object.is no-op sets for NaN without calling encode", () => {
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const createState = createAtom().use(persist);
    const state = createState(Number.NaN, { persist: { key: "count", storage } });

    state.set(Number.NaN);

    expect(setItem).not.toHaveBeenCalled();
    expect(Number.isNaN(state.get())).toBe(true);
  });
});

function createStorage(entries: readonly (readonly [string, string])[] = []): PersistStorage {
  const values = new Map(entries);

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}
