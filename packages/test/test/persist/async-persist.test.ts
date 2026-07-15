import { atom, createAtom } from "@zhuangtai-js/core";
import { definePersistMigration, persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";

class Deferred<Value> {
  readonly promise: Promise<Value>;
  private resolvePromise: ((value: Value | PromiseLike<Value>) => void) | undefined;
  private rejectPromise: ((reason?: unknown) => void) | undefined;

  constructor() {
    this.promise = new Promise<Value>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });
  }

  resolve(value: Value): void {
    const resolve = this.resolvePromise;

    if (resolve === undefined) {
      throw new TypeError("[test] Deferred promise was already settled.");
    }

    this.resolvePromise = undefined;
    this.rejectPromise = undefined;
    resolve(value);
  }

  reject(error: unknown): void {
    const reject = this.rejectPromise;

    if (reject === undefined) {
      throw new TypeError("[test] Deferred promise was already settled.");
    }

    this.resolvePromise = undefined;
    this.rejectPromise = undefined;
    reject(error);
  }
}

async function rejectionOf(promise: Promise<void>): Promise<unknown> {
  return promise.then<unknown, unknown>(
    () => {
      throw new TypeError("[test] Expected the promise to reject.");
    },
    (error: unknown) => error,
  );
}

function expectOperationError(error: unknown, operation: string, key: string): void {
  expect(error).toBeInstanceOf(Error);
  const message = error instanceof Error ? error.message : "";
  expect(message.toLowerCase()).toContain(operation);
  expect(message).toContain(key);
}

async function expectNoUnhandled(run: () => Promise<void>): Promise<void> {
  const unhandled: unknown[] = [];
  function listener(reason: unknown): void {
    unhandled.push(reason);
  }
  process.on("unhandledRejection", listener);

  try {
    await run();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  } finally {
    process.off("unhandledRejection", listener);
  }

  expect(unhandled).toEqual([]);
}

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

  it("ignores a stale hydration generation after a newer rehydrate", async () => {
    const initialRead = new Deferred<string | null>();
    const rehydrateRead = new Deferred<string | null>();
    let readCount = 0;
    const writes: string[] = [];
    const storage: PersistStorage = {
      getItem() {
        readCount += 1;
        return readCount === 1 ? initialRead.promise : rehydrateRead.promise;
      },
      setItem(_key, value) {
        writes.push(value);
      },
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    const rehydrated = persist.rehydrate(state);
    rehydrateRead.resolve("2");
    await rehydrated;

    expect(state.get()).toBe(2);

    initialRead.resolve("1");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(state.get()).toBe(2);
    expect(writes).toEqual([]);
    await expect(persist.ready(state)).resolves.toBeUndefined();
  });

  it("serializes mixed sync-read async writes in logical invocation and byte order", async () => {
    const firstWrite = new Deferred<void>();
    const secondWrite = new Deferred<void>();
    const invoked: string[] = [];
    const committed: string[] = [];
    const physicalResolution: string[] = [];
    let writeCount = 0;
    const storage: PersistStorage = {
      getItem: () => null,
      setItem(_key, value) {
        writeCount += 1;
        invoked.push(value);
        const gate = writeCount === 1 ? firstWrite : secondWrite;
        return gate.promise.then(() => {
          committed.push(value);
        });
      },
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    const values: number[] = [];
    state.watch((value) => values.push(value));

    state.set(1);
    state.set(2);

    expect(state.get()).toBe(2);
    expect(values).toEqual([0, 1, 2]);
    expect(invoked).toEqual(["1"]);

    physicalResolution.push("second");
    secondWrite.resolve(undefined);
    await Promise.resolve();
    expect(invoked).toEqual(["1"]);

    physicalResolution.push("first");
    firstWrite.resolve(undefined);
    await persist.flush(state);

    expect(physicalResolution).toEqual(["second", "first"]);
    expect(invoked).toEqual(["1", "2"]);
    expect(committed).toEqual(["1", "2"]);
  });

  it("waits for queued writes before clear and leaves memory unchanged", async () => {
    const write = new Deferred<void>();
    const stored = new Map<string, string>();
    let removeCalls = 0;
    const storage: PersistStorage = {
      getItem: () => null,
      setItem(key, value) {
        return write.promise.then(() => {
          stored.set(key, value);
        });
      },
      removeItem(key) {
        removeCalls += 1;
        stored.delete(key);
      },
    };
    const state = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    state.set(4);
    const cleared = persist.clear(state);

    expect(state.get()).toBe(4);
    expect(removeCalls).toBe(0);

    write.resolve(undefined);
    await cleared;

    expect(removeCalls).toBe(1);
    expect(stored.has("count")).toBe(false);
    expect(state.get()).toBe(4);
    await expect(persist.flush(state)).resolves.toBeUndefined();
  });

  it("throws the exact misuse error for every control", () => {
    const plain = atom(0);
    const message = "[@zhuangtai-js/persist] Expected a persisted atom created by this package.";

    expect(() => persist.ready(plain)).toThrow(new TypeError(message));
    expect(() => persist.flush(plain)).toThrow(new TypeError(message));
    expect(() => persist.rehydrate(plain)).toThrow(new TypeError(message));
    expect(() => persist.clear(plain)).toThrow(new TypeError(message));
  });
});

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
