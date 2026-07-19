import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistCodec, type PersistStorage } from "@zhuangtai-js/persist";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("persist reliability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("propagates storage getItem errors during creation", () => {
    const storage = createStorage();
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("get failed");
    });
    const createState = createAtom().use(persist);

    expect(() => createState(1, { persist: { key: "count", storage } })).toThrow("get failed");
  });

  it("keeps state unchanged and does not notify when setItem throws", () => {
    const storage = createStorage([["count", "1"]]);
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage } });
    const watcher = vi.fn<(value: number, prevValue: number | undefined) => void>();
    state.watch(watcher);
    watcher.mockClear();

    expect(() => state.set(2)).toThrow("quota");
    expect(state.get()).toBe(1);
    expect(storage.values.get("count")).toBe("1");
    expect(watcher).not.toHaveBeenCalled();
  });

  it("keeps state unchanged when codec encode throws", () => {
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const codec: PersistCodec = {
      encode() {
        throw new Error("encode failed");
      },
      decode(_rawValue, initialValue) {
        return initialValue;
      },
    };
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage, codec } });

    expect(() => state.set(2)).toThrow("encode failed");
    expect(state.get()).toBe(1);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("leaves state and storage unchanged when an updater throws", () => {
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage } });

    expect(() =>
      state.set(() => {
        throw new Error("bad updater");
      }),
    ).toThrow("bad updater");

    expect(state.get()).toBe(1);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("persists and updates state even when a later watcher throws", () => {
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage } });
    state.watch((value) => {
      if (value === 2) {
        throw new Error("watch failed");
      }
    });

    expect(() => state.set(2)).toThrow("watch failed");
    expect(state.get()).toBe(2);
    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith("count", "2");
  });

  it("preserves watcher and stop semantics", () => {
    const storage = createStorage();
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage } });
    const watcher = vi.fn<(value: number, prevValue: number | undefined) => void>();

    const stop = state.watch(watcher);
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(1, undefined);

    watcher.mockClear();
    state.set(2);
    expect(watcher).toHaveBeenCalledOnce();
    expect(watcher).toHaveBeenCalledWith(2, 1);

    watcher.mockClear();
    stop();
    state.set(3);
    expect(watcher).not.toHaveBeenCalled();
  });

  it("writes signed-zero changes", () => {
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const createState = createAtom().use(persist);
    const state = createState(0, { persist: { key: "count", storage } });

    state.set(-0);

    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith("count", "0");
  });

  it("does not read global localStorage when explicit storage is provided", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("should not access global storage");
      },
    });
    const storage = createStorage();
    const createState = createAtom().use(persist);

    const state = createState(1, { persist: { key: "count", storage } });

    expect(state.get()).toBe(1);
  });

  it("wraps global localStorage getter errors with a clear message when storage is omitted", () => {
    const getterError = new Error("storage denied");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw getterError;
      },
    });
    const createState = createAtom().use(persist);

    // The raw getter failure is wrapped with guidance to pass an explicit storage,
    // and the original error is preserved as `cause`.
    let caught: unknown;
    try {
      createState(1, { persist: { key: "count" } });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain("Pass an explicit storage option");
    expect((caught as Error).cause).toBe(getterError);
  });

  it.each([
    ["null", null],
    ["false", false],
    ["0", 0],
    ['""', ""],
  ] as const)("restores JSON value %s", (rawValue, expectedValue) => {
    const storage = createStorage([["value", rawValue]]);
    const createState = createAtom().use(persist);

    const state = createState<unknown>("fallback", { persist: { key: "value", storage } });

    expect(state.get()).toBe(expectedValue);
  });

  it("lets custom codecs use the initial value for migration", () => {
    type Value = { readonly a: number; readonly b: number };
    const storage = createStorage([["settings", '{"a":9}']]);
    const codec: PersistCodec = {
      encode(value) {
        return JSON.stringify(value);
      },
      decode<DecodedValue>(rawValue: string, initialValue: DecodedValue) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- PersistCodec.decode is intentionally generic so custom codecs can restore/migrate values.
        return { ...initialValue, ...JSON.parse(rawValue) } as DecodedValue;
      },
    };
    const createState = createAtom().use(persist);

    const state = createState<Value>(
      { a: 1, b: 2 },
      { persist: { key: "settings", storage, codec } },
    );

    expect(state.get()).toEqual({ a: 9, b: 2 });
  });

  it.each([
    ["undefined", undefined],
    ["function", () => "value"],
    ["symbol", Symbol("value")],
  ] as const)("rejects non-JSON-serializable %s values with the default codec", (_label, value) => {
    const storage = createStrictStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const createState = createAtom().use(persist);
    const state = createState<unknown>("initial", { persist: { key: "value", storage } });

    expect(() => state.set(() => value)).toThrow("JSON-serializable values");
    expect(state.get()).toBe("initial");
    expect(setItem).not.toHaveBeenCalled();
    expect(storage.values.size).toBe(0);
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

function createStrictStorage(entries: readonly (readonly [string, string])[] = []): StorageFixture {
  const values = new Map(entries);

  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (typeof value !== "string") {
        throw new TypeError("value must be string");
      }

      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}
