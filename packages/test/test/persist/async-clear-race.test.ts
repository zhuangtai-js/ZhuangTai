import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import {
  Deferred,
  envelope,
  NUMBER_MIGRATION,
  rejectionOf,
  waitUntil,
} from "./async-migration-fixtures.js";

describe("persist async clear and stale migration races", () => {
  it("keeps clear durable while an older migration write-back is pending", async () => {
    const oldWrite = new Deferred<void>();
    const writes: string[] = [];
    let storedValue: string | null = "1";
    let readCount = 0;
    const storage: PersistStorage = {
      getItem() {
        readCount += 1;
        if (readCount === 1) {
          return Promise.resolve("1");
        }
        if (readCount === 2) {
          return Promise.resolve(envelope(1, "7"));
        }
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
      removeItem() {
        storedValue = null;
        return Promise.resolve();
      },
    };
    const state = createAtom().use(persist)(0, {
      persist: { key: "count", storage, version: 1, migrations: { 0: NUMBER_MIGRATION } },
    });

    await waitUntil(() => writes.length === 1);
    await persist.rehydrate(state);
    expect(state.get()).toBe(7);

    let clearResolved = false;
    let storedWhenClearResolved: string | null | undefined;
    const cleared = persist.clear(state).then(() => {
      clearResolved = true;
      storedWhenClearResolved = storedValue;
    });
    await Promise.resolve();
    await Promise.resolve();
    const resolvedBeforeOldWrite = clearResolved;

    oldWrite.resolve(undefined);
    await cleared;
    await persist.flush(state);

    const reopened = createAtom().use(persist)(0, {
      persist: { key: "count", storage, version: 1, migrations: { 0: NUMBER_MIGRATION } },
    });
    await persist.ready(reopened);
    await persist.flush(reopened);

    expect(storedWhenClearResolved).toBeNull();
    expect(storedValue).toBeNull();
    expect(resolvedBeforeOldWrite).toBe(false);
    expect(reopened.get()).toBe(0);
  });

  it("linearizes local writes after removeItem without resetting memory", async () => {
    const events: string[] = [];
    let storedValue: string | null = null;
    const storage: PersistStorage = {
      getItem: () => storedValue,
      setItem(_key, value) {
        events.push(`set:${value}`);
        storedValue = value;
      },
      removeItem() {
        events.push("remove");
        storedValue = null;
      },
    };
    const state = createAtom().use(persist)(0, {
      persist: { key: "clear-linearization", storage },
    });

    state.set(1);
    const clearing = persist.clear(state);
    state.set(2);
    await clearing;

    const reopened = createAtom().use(persist)(0, {
      persist: { key: "clear-linearization", storage },
    });
    await persist.ready(reopened);

    expect(state.get()).toBe(2);
    expect(storedValue).toBe("2");
    expect(reopened.get()).toBe(2);
    expect(events).toEqual(["set:1", "remove", "set:2"]);
  });

  it("defers rehydrate during clear until post-clear writes settle", async () => {
    const removal = new Deferred<void>();
    const events: string[] = [];
    let storedValue: string | null = null;
    let readCount = 0;
    const storage: PersistStorage = {
      getItem() {
        readCount += 1;
        events.push(`get:${storedValue ?? "null"}`);
        return storedValue;
      },
      setItem(_key, value) {
        events.push(`set:${value}`);
        storedValue = value;
      },
      removeItem() {
        events.push("remove");
        return removal.promise.then(() => {
          storedValue = null;
        });
      },
    };
    const state = createAtom().use(persist)(0, {
      persist: { key: "clear-rehydrate-linearization", storage },
    });

    state.set(1);
    const clearing = persist.clear(state);
    state.set(2);
    const rehydrated = persist.rehydrate(state);

    await Promise.resolve();
    expect(readCount).toBe(1);
    removal.resolve(undefined);
    await Promise.all([clearing, rehydrated]);

    expect(state.get()).toBe(2);
    expect(storedValue).toBe("2");
    expect(events).toEqual(["get:null", "set:1", "remove", "set:2", "get:2"]);
  });

  it("does not repair a failed newer hydration with initial memory", async () => {
    const oldWrite = new Deferred<void>();
    const rehydrateCause = new Error("newer hydration failed");
    const writes: string[] = [];
    let storedValue = "1";
    let readCount = 0;
    const storage: PersistStorage = {
      getItem() {
        readCount += 1;
        return readCount === 1 ? Promise.resolve("1") : Promise.reject(rehydrateCause);
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
    const rehydrated = persist.rehydrate(state);
    const rehydrateError = await rejectionOf(rehydrated);
    expect(rehydrateError).toBeInstanceOf(Error);

    oldWrite.resolve(undefined);
    const flushError = await rejectionOf(persist.flush(state));

    expect(flushError).toBe(rehydrateError);
    expect(writes).toEqual([envelope(1, "2")]);
    expect(storedValue).toBe(envelope(1, "2"));
    expect(state.get()).toBe(0);
  });
});
