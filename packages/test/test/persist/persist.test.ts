import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistCodec, type PersistStorage } from "@zhuangtai-js/persist";
import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("writes before committing state and notifying watchers", () => {
    const events: string[] = [];
    const storage = createStorage();
    const createState = createAtom().use(persist);
    let observedState: ReturnType<typeof createState<number>> | undefined;

    vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
      if (observedState === undefined) {
        throw new Error("state not initialized");
      }

      events.push(`storage:${key}:${value}:state=${observedState.get()}`);
    });

    const state = createState(1, { persist: { key: "count", storage } });
    observedState = state;
    state.watch((value) => {
      events.push(`watch:${value}:state=${state.get()}`);
    });
    events.length = 0;

    state.set(2);

    expect(events).toEqual(["storage:count:2:state=1", "watch:2:state=2"]);
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
    expect(createPersistedState).toThrow(
      "[@zhuangtai-js/persist] No persist storage was provided, and globalThis.localStorage is unavailable.",
    );
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
    // The raw decode failure is wrapped with the offending key and preserved as `cause`.
    let caught: unknown;
    try {
      createPersistedState();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain('for key "count"');
    expect((caught as Error).cause).toBeInstanceOf(SyntaxError);
  });

  it("uses a custom codec", () => {
    // Given
    const codec: PersistCodec = {
      encode(value) {
        return `value:${String(value)}`;
      },
      decode: decodeValue,
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

function decodeValue(rawValue: string, initialValue: number): number;
function decodeValue<Value>(rawValue: string, initialValue: Value): Value;
function decodeValue(rawValue: string, initialValue: unknown): unknown {
  expect(initialValue).toBe(1);

  if (typeof initialValue !== "number") {
    return initialValue;
  }

  return Number.parseInt(rawValue.replace("value:", ""), 10);
}

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
