import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it, vi } from "vitest";
import { Deferred, envelope, NUMBER_MIGRATION, waitUntil } from "./async-migration-fixtures.js";

describe("persist stale async migration", () => {
  it("never plans or writes an old migration after a local update wins", async () => {
    const read = new Deferred<string | null>();
    const migration = vi.fn<typeof NUMBER_MIGRATION>(NUMBER_MIGRATION);
    const writes: string[] = [];
    const storage: PersistStorage = {
      getItem: () => read.promise,
      setItem(_key, value) {
        writes.push(value);
      },
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, {
      persist: { key: "count", storage, version: 1, migrations: { 0: migration } },
    });

    state.set(9);
    read.resolve("1");
    await persist.ready(state);
    await persist.flush(state);

    expect(state.get()).toBe(9);
    expect(migration).not.toHaveBeenCalled();
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.every((value) => value === envelope(1, "9"))).toBe(true);
  });

  it("never plans or writes an old generation after a newer rehydrate wins", async () => {
    const initialRead = new Deferred<string | null>();
    const rehydrateRead = new Deferred<string | null>();
    const migration = vi.fn<typeof NUMBER_MIGRATION>(NUMBER_MIGRATION);
    const writes: string[] = [];
    let readCount = 0;
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
    const state = createAtom().use(persist)(0, {
      persist: { key: "count", storage, version: 1, migrations: { 0: migration } },
    });

    const rehydrated = persist.rehydrate(state);
    rehydrateRead.resolve(envelope(1, "7"));
    await rehydrated;
    initialRead.resolve("1");
    await Promise.resolve();
    await Promise.resolve();

    expect(state.get()).toBe(7);
    expect(migration).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });

  it("repairs an older pending migration write-back after newer rehydrate wins", async () => {
    const oldWrite = new Deferred<void>();
    const writes: string[] = [];
    let storedValue = "1";
    let readCount = 0;
    const storage: PersistStorage = {
      getItem() {
        readCount += 1;
        return readCount === 1 ? Promise.resolve("1") : Promise.resolve(envelope(1, "7"));
      },
      setItem(_key, value) {
        writes.push(value);
        if (writes.length === 1) {
          return oldWrite.promise.then(() => {
            storedValue = value;
          });
        }
        storedValue = value;
        return Promise.resolve();
      },
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, {
      persist: { key: "count", storage, version: 1, migrations: { 0: NUMBER_MIGRATION } },
    });

    await waitUntil(() => writes.length === 1);
    await persist.rehydrate(state);
    expect(state.get()).toBe(7);

    oldWrite.resolve(undefined);
    await persist.flush(state);

    expect(writes).toEqual([envelope(1, "2"), envelope(1, "7")]);
    expect(storedValue).toBe(envelope(1, "7"));
    expect(state.get()).toBe(7);
  });
  it("keeps migration repair visible to a same-turn rehydrate after write resolution", async () => {
    const oldWrite = new Deferred<void>();
    const writes: string[] = [];
    let storedValue = "1";
    let readCount = 0;
    const storage: PersistStorage = {
      getItem() {
        readCount += 1;
        if (readCount === 1) return Promise.resolve("1");
        if (readCount === 2) return Promise.resolve(envelope(1, "7"));
        return Promise.resolve(storedValue);
      },
      setItem(_key, value) {
        writes.push(value);
        if (writes.length === 1) {
          return oldWrite.promise.then(() => {
            storedValue = value;
          });
        }
        storedValue = value;
        return Promise.resolve();
      },
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, {
      persist: { key: "count", storage, version: 1, migrations: { 0: NUMBER_MIGRATION } },
    });

    await waitUntil(() => writes.length === 1);
    await persist.rehydrate(state);
    expect(state.get()).toBe(7);

    oldWrite.resolve(undefined);
    const immediateRehydrate = persist.rehydrate(state);
    await immediateRehydrate;
    await persist.flush(state);

    const reopened = createAtom().use(persist)(0, {
      persist: { key: "count", storage, version: 1, migrations: { 0: NUMBER_MIGRATION } },
    });
    await persist.ready(reopened);
    await persist.flush(reopened);

    expect({
      memory: state.get(),
      storage: storedValue,
      reopened: reopened.get(),
      writes,
    }).toEqual({
      memory: 7,
      storage: envelope(1, "7"),
      reopened: 7,
      writes: [envelope(1, "2"), envelope(1, "7")],
    });
  });

  it("repairs after the direct successor hydration fails and a later hydration succeeds", async () => {
    const oldWrite = new Deferred<void>();
    const failedRead = new Deferred<string | null>();
    const successfulRead = new Deferred<string | null>();
    const writes: string[] = [];
    let storedValue = "1";
    let readCount = 0;
    const storage: PersistStorage = {
      getItem() {
        readCount += 1;
        if (readCount === 1) return Promise.resolve("1");
        if (readCount === 2) return failedRead.promise;
        if (readCount === 3) return successfulRead.promise;
        return Promise.resolve(storedValue);
      },
      setItem(_key, value) {
        writes.push(value);
        if (writes.length === 1) {
          return oldWrite.promise.then(() => {
            storedValue = value;
          });
        }
        storedValue = value;
        return Promise.resolve();
      },
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, {
      persist: { key: "count", storage, version: 1, migrations: { 0: NUMBER_MIGRATION } },
    });

    await waitUntil(() => writes.length === 1);
    const failedHydration = persist.rehydrate(state);
    const successfulHydration = persist.rehydrate(state);
    await waitUntil(() => readCount === 3);
    failedRead.reject(new Error("superseded read failed"));
    await failedHydration;
    successfulRead.resolve(envelope(1, "9"));
    await successfulHydration;
    expect(state.get()).toBe(9);

    oldWrite.resolve(undefined);
    await persist.flush(state);

    const reopened = createAtom().use(persist)(0, {
      persist: { key: "count", storage, version: 1, migrations: { 0: NUMBER_MIGRATION } },
    });
    await persist.ready(reopened);
    await persist.flush(reopened);

    expect({
      memory: state.get(),
      storage: storedValue,
      reopened: reopened.get(),
      writes,
    }).toEqual({
      memory: 9,
      storage: envelope(1, "9"),
      reopened: 9,
      writes: [envelope(1, "2"), envelope(1, "9")],
    });
  });
});
