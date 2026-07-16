import { atom, createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import { Deferred } from "./async-persist-fixtures.js";

describe("persist async lifecycle", () => {
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
