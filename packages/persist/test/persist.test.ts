import { createAtom } from "@zhuangtai-js/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { persist } from "../src/index.js";
import type { PersistCodec, PersistStorage } from "../src/index.js";

describe("persist", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing when persist options are omitted", () => {
    // Given
    const storage = createStorage();
    const createState = createAtom().use(persist);

    // When
    const state = createState(1);
    state.set(2);

    // Then
    expect(state.get()).toBe(2);
    expect(storage.values.size).toBe(0);
  });

  it("restores a stored value before the atom is created", () => {
    // Given
    const storage = createStorage([["count", "2"]]);
    const createState = createAtom().use(persist);

    // When
    const state = createState(1, { persist: { key: "count", storage } });

    // Then
    expect(state.get()).toBe(2);
  });

  it("writes the final value synchronously after set", () => {
    // Given
    const storage = createStorage();
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage } });

    // When
    state.set(2);

    // Then
    expect(storage.getItem("count")).toBe("2");
  });

  it("writes updater results", () => {
    // Given
    const storage = createStorage();
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage } });

    // When
    state.set((value) => value + 1);

    // Then
    expect(storage.getItem("count")).toBe("2");
  });

  it("does not write Object.is no-op sets", () => {
    // Given
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const createState = createAtom().use(persist);
    const state = createState(Number.NaN, { persist: { key: "count", storage } });

    // When
    state.set(Number.NaN);

    // Then
    expect(setItem).not.toHaveBeenCalled();
  });

  it("uses global localStorage when storage is omitted", () => {
    // Given
    const storage = createStorage([["count", "2"]]);
    vi.stubGlobal("localStorage", storage);
    const createState = createAtom().use(persist);

    // When
    const state = createState(1, { persist: { key: "count" } });

    // Then
    expect(state.get()).toBe(2);
  });

  it("throws when storage and global localStorage are unavailable", () => {
    // Given
    vi.stubGlobal("localStorage", undefined);
    const createState = createAtom().use(persist);

    // When
    function createPersistedState(): ReturnType<typeof createState<number>> {
      return createState(1, { persist: { key: "count" } });
    }

    // Then
    expect(createPersistedState).toThrow("No persist storage was provided");
  });

  it("throws decode errors", () => {
    // Given
    const storage = createStorage([["count", "not-json"]]);
    const createState = createAtom().use(persist);

    // When
    function createPersistedState(): ReturnType<typeof createState<number>> {
      return createState(1, { persist: { key: "count", storage } });
    }

    // Then
    expect(createPersistedState).toThrow(SyntaxError);
  });

  it("uses a custom codec", () => {
    // Given
    const codec: PersistCodec = {
      encode(value) {
        return `value:${String(value)}`;
      },
      decode(rawValue, initialValue) {
        expect(initialValue).toBe(1);

        return Number.parseInt(rawValue.replace("value:", ""), 10);
      },
    };
    const storage = createStorage([["count", "value:2"]]);
    const createState = createAtom().use(persist);

    // When
    const state = createState(1, { persist: { key: "count", storage, codec } });
    state.set(3);

    // Then
    expect(state.get()).toBe(3);
    expect(storage.getItem("count")).toBe("value:3");
  });
});

type StorageFixture = PersistStorage & {
  readonly values: Map<string, string>;
};

function createStorage(entries: readonly (readonly [string, string])[] = []): StorageFixture {
  const values = new Map(entries);

  return {
    values,
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
