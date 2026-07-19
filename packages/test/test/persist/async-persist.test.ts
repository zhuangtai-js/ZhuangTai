import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import {
  Deferred,
  expectNoUnhandled,
  expectOperationError,
  rejectionOf,
} from "./async-persist-fixtures.js";

describe("persist async lifecycle", () => {
  it("returns initial values immediately and hydrates empty and stored values through ready", async () => {
    const emptyRead = new Deferred<string | null>();
    const storedRead = new Deferred<string | null>();
    const emptyState = createAtom().use(persist)(7, {
      persist: {
        key: "empty",
        storage: {
          getItem: () => emptyRead.promise,
          setItem: () => undefined,
          removeItem: () => undefined,
        },
      },
    });
    const storedState = createAtom().use(persist)(0, {
      persist: {
        key: "stored",
        storage: {
          getItem: () => storedRead.promise,
          setItem: () => undefined,
          removeItem: () => undefined,
        },
      },
    });
    const emptyValues: number[] = [];
    const storedValues: number[] = [];

    emptyState.watch((value) => emptyValues.push(value));
    storedState.watch((value) => storedValues.push(value));

    expect(emptyState.get()).toBe(7);
    expect(storedState.get()).toBe(0);
    expect(emptyValues).toEqual([7]);
    expect(storedValues).toEqual([0]);

    emptyRead.resolve(null);
    storedRead.resolve("2");
    await Promise.all([persist.ready(emptyState), persist.ready(storedState)]);

    expect(emptyState.get()).toBe(7);
    expect(storedState.get()).toBe(2);
    expect(emptyValues).toEqual([7]);
    expect(storedValues).toEqual([0, 2]);
  });

  it("keeps local writes synchronous and wins an async hydration with a post-read write-back", async () => {
    const read = new Deferred<string | null>();
    const writes: { readonly value: string; readonly afterRead: boolean }[] = [];
    let readCompleted = false;
    const storage: PersistStorage = {
      getItem: () => read.promise,
      setItem(_key, value) {
        writes.push({ value, afterRead: readCompleted });
      },
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    const values: number[] = [];
    state.watch((value) => values.push(value));

    state.set(5);

    expect(state.get()).toBe(5);
    expect(values).toEqual([0, 5]);
    expect(writes).toEqual([{ value: "5", afterRead: false }]);

    readCompleted = true;
    read.resolve("1");
    await persist.ready(state);
    await persist.flush(state);

    expect(state.get()).toBe(5);
    expect(writes.at(-1)).toEqual({ value: "5", afterRead: true });
  });

  it("keeps a synchronous setItem throw fail-closed while async hydration is pending", async () => {
    const read = new Deferred<string | null>();
    const storage: PersistStorage = {
      getItem: () => read.promise,
      setItem() {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    const values: number[] = [];
    state.watch((value) => values.push(value));

    expect(() => state.set(1)).toThrow("quota");
    expect(state.get()).toBe(0);
    expect(values).toEqual([0]);

    read.resolve(null);
    await expect(persist.ready(state)).resolves.toBeUndefined();
    expect(state.get()).toBe(0);
  });

  it("reports a deferred synchronous throw asynchronously while preserving strict write order", async () => {
    await expectNoUnhandled(async () => {
      const firstWrite = new Deferred<void>();
      const cause = new Error("second write failed synchronously");
      const errors: unknown[] = [];
      const stored = new Map<string, string>();
      const values: number[] = [];
      let writeCount = 0;
      const storage: PersistStorage = {
        getItem: () => null,
        setItem(key, value) {
          writeCount += 1;

          if (writeCount === 1) {
            return firstWrite.promise.then(() => {
              stored.set(key, value);
            });
          }

          if (writeCount === 2) {
            throw cause;
          }

          stored.set(key, value);
          return undefined;
        },
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: { key: "mixed-write", storage, onError: (error) => errors.push(error) },
      });
      state.watch((value) => values.push(value));

      state.set(1);
      state.set(2);

      expect(writeCount).toBe(1);
      expect(state.get()).toBe(2);
      expect(values).toEqual([0, 1, 2]);
      expect(errors).toEqual([]);

      firstWrite.resolve(undefined);
      const error = await rejectionOf(persist.flush(state));

      expectOperationError(error, "write", "mixed-write");
      expect(error instanceof Error ? error.cause : undefined).toBe(cause);
      expect(errors).toEqual([error]);
      expect(writeCount).toBe(2);
      expect(stored.get("mixed-write")).toBe("1");
      expect(state.get()).toBe(2);
      expect(values).toEqual([0, 1, 2]);

      state.set(3);
      await expect(persist.flush(state)).resolves.toBeUndefined();
      expect(writeCount).toBe(3);
      expect(stored.get("mixed-write")).toBe("3");
      expect(state.get()).toBe(3);
      expect(values).toEqual([0, 1, 2, 3]);
    });
  });
});
