import { createAtom } from "@zhuangtai-js/core";
import { definePersistMigration, persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import {
  Deferred,
  expectNoUnhandled,
  expectOperationError,
  rejectionOf,
} from "./async-persist-fixtures.js";

describe("persist async failures", () => {
  it("reports hydration rejection through ready, onError, and one retained flush error", async () => {
    await expectNoUnhandled(async () => {
      const read = new Deferred<string | null>();
      const errors: unknown[] = [];
      const storage: PersistStorage = {
        getItem: () => read.promise,
        setItem: () => undefined,
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: { key: "hydrate-key", storage, onError: (error) => errors.push(error) },
      });
      read.reject(new Error("read failed"));
      await Promise.resolve();
      const error = await rejectionOf(persist.ready(state));

      expectOperationError(error, "hydrate", "hydrate-key");
      expect(errors).toEqual([error]);
      expect(state.get()).toBe(0);

      const flushError = await rejectionOf(persist.flush(state));
      expect(flushError).toBe(error);

      state.set(2);
      await expect(persist.flush(state)).resolves.toBeUndefined();
      expect(state.get()).toBe(2);
    });
  });

  it("reports an async versioned migration write-back rejection before applying memory", async () => {
    await expectNoUnhandled(async () => {
      const cause = new Error("migration write-back failed");
      const errors: unknown[] = [];
      const stored = new Map<string, string>([["versioned-key", "1"]]);
      let writeCount = 0;
      const storage: PersistStorage = {
        getItem: (key) => stored.get(key) ?? null,
        setItem(key, value) {
          writeCount += 1;

          if (writeCount === 1) {
            return Promise.reject(cause);
          }

          stored.set(key, value);
          return Promise.resolve();
        },
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: {
          key: "versioned-key",
          storage,
          version: 1,
          migrations: {
            0: definePersistMigration<number>((value) => {
              if (typeof value !== "number") {
                throw new TypeError("Expected a number migration value.");
              }

              return value + 1;
            }),
          },
          onError: (error) => errors.push(error),
        },
      });

      const error = await rejectionOf(persist.ready(state));

      expectOperationError(error, "hydrate", "versioned-key");
      expect(errors).toEqual([error]);
      expect(state.get()).toBe(0);
      expect(stored.get("versioned-key")).toBe("1");
      expect(await rejectionOf(persist.flush(state))).toBe(error);

      await persist.rehydrate(state);
      await expect(persist.ready(state)).resolves.toBeUndefined();
      await expect(persist.flush(state)).resolves.toBeUndefined();
      expect(state.get()).toBe(2);
      expect(stored.get("versioned-key")).toBe(
        '{"__zhuangtai_persist__":true,"version":1,"payload":"2"}',
      );
    });
  });

  it("continues after the first write rejects and clears its retained error after flush", async () => {
    await expectNoUnhandled(async () => {
      const firstWrite = new Deferred<void>();
      const errors: unknown[] = [];
      const stored = new Map<string, string>();
      let writeCount = 0;
      const storage: PersistStorage = {
        getItem: () => null,
        setItem(key, value) {
          writeCount += 1;

          if (writeCount === 1) {
            return firstWrite.promise;
          }

          stored.set(key, value);
          return Promise.resolve();
        },
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: { key: "write-key", storage, onError: (error) => errors.push(error) },
      });
      const values: number[] = [];
      state.watch((value) => values.push(value));

      state.set(1);
      state.set(2);

      expect(state.get()).toBe(2);
      expect(values).toEqual([0, 1, 2]);
      expect(writeCount).toBe(1);

      firstWrite.reject(new Error("first write failed"));
      const error = await rejectionOf(persist.flush(state));

      expectOperationError(error, "write", "write-key");
      expect(errors).toEqual([error]);
      expect(writeCount).toBe(2);
      expect(stored.get("write-key")).toBe("2");
      expect(state.get()).toBe(2);

      state.set(3);
      await expect(persist.flush(state)).resolves.toBeUndefined();
      expect(stored.get("write-key")).toBe("3");
    });
  });

  it("reports clear rejection, preserves memory, and allows a later clear", async () => {
    await expectNoUnhandled(async () => {
      const errors: unknown[] = [];
      const stored = new Map<string, string>([["clear-key", "1"]]);
      let clearCount = 0;
      const storage: PersistStorage = {
        getItem: () => null,
        setItem(key, value) {
          stored.set(key, value);
        },
        removeItem(key) {
          clearCount += 1;

          if (clearCount === 1) {
            return Promise.reject(new Error("remove failed"));
          }

          stored.delete(key);
          return undefined;
        },
      };
      const state = createAtom().use(persist)(6, {
        persist: { key: "clear-key", storage, onError: (error) => errors.push(error) },
      });

      const error = await rejectionOf(persist.clear(state));

      expectOperationError(error, "clear", "clear-key");
      expect(errors).toEqual([error]);
      expect(state.get()).toBe(6);
      expect(stored.get("clear-key")).toBe("1");
      expect(await rejectionOf(persist.flush(state))).toBe(error);

      await persist.clear(state);
      await expect(persist.flush(state)).resolves.toBeUndefined();
      expect(stored.has("clear-key")).toBe(false);
      expect(state.get()).toBe(6);
    });
  });

  it("reports rehydrate rejection and retries only when explicitly requested", async () => {
    await expectNoUnhandled(async () => {
      const failedRead = new Deferred<string | null>();
      const errors: unknown[] = [];
      let readCount = 0;
      const storage: PersistStorage = {
        getItem() {
          readCount += 1;

          if (readCount === 1) {
            return null;
          }

          return readCount === 2 ? failedRead.promise : Promise.resolve("8");
        },
        setItem: () => undefined,
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(4, {
        persist: { key: "rehydrate-key", storage, onError: (error) => errors.push(error) },
      });
      const rehydrated = persist.rehydrate(state);
      const ready = persist.ready(state);

      failedRead.reject(new Error("retry read failed"));
      const error = await rejectionOf(rehydrated);
      const readyError = await rejectionOf(ready);

      expectOperationError(error, "rehydrate", "rehydrate-key");
      expect(readyError).toBe(error);
      expect(errors).toEqual([error]);
      expect(readCount).toBe(2);
      expect(state.get()).toBe(4);
      expect(await rejectionOf(persist.flush(state))).toBe(error);

      await persist.rehydrate(state);
      await expect(persist.ready(state)).resolves.toBeUndefined();
      await expect(persist.flush(state)).resolves.toBeUndefined();
      expect(readCount).toBe(3);
      expect(state.get()).toBe(8);
    });
  });
});
