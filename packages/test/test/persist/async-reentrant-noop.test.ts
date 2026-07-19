import { createAtom, type Atom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";

describe("persist synchronous reentrant Object.is no-ops", () => {
  it("skips a storage reentry duplicate at dequeue time", () => {
    let durable: string | null = null;
    let reentered = false;
    let state: Atom<number> | undefined;
    const writes: string[] = [];
    const events: string[] = [];
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        writes.push(value);
        durable = value;
        events.push(`storage:${value}:memory=${state?.get() ?? "unbound"}`);
        if (value === "1" && !reentered && state !== undefined) {
          reentered = true;
          state.set(1);
        }
      },
      removeItem() {
        durable = null;
      },
    };

    state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    state.watch((value, prevValue) => {
      events.push(`watch:${value}:${String(prevValue)}:memory=${state?.get() ?? "unbound"}`);
    });
    events.length = 0;

    state.set(1);
    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    expect(writes).toEqual(["1"]);
    expect(events).toEqual(["storage:1:memory=0", "watch:1:0:memory=1"]);
    expect(state.get()).toBe(1);
    expect(durable).toBe("1");
    expect(reopened.get()).toBe(1);
  });

  it("skips an updater reentry duplicate at dequeue time", () => {
    let durable: string | null = null;
    let reentered = false;
    let state: Atom<number> | undefined;
    const writes: string[] = [];
    const events: string[] = [];
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        writes.push(value);
        durable = value;
        events.push(`storage:${value}:memory=${state?.get() ?? "unbound"}`);
        if (value === "1" && !reentered && state !== undefined) {
          reentered = true;
          state.set(() => 1);
        }
      },
      removeItem() {
        durable = null;
      },
    };

    state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    state.watch((value, prevValue) => {
      events.push(`watch:${value}:${String(prevValue)}:memory=${state?.get() ?? "unbound"}`);
    });
    events.length = 0;

    state.set(1);
    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    expect(writes).toEqual(["1"]);
    expect(events).toEqual(["storage:1:memory=0", "watch:1:0:memory=1"]);
    expect(state.get()).toBe(1);
    expect(durable).toBe("1");
    expect(reopened.get()).toBe(1);
  });

  it("skips the second of two queued equal values", () => {
    let durable: string | null = null;
    let queued = false;
    let state: Atom<number> | undefined;
    const writes: string[] = [];
    const events: string[] = [];
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        writes.push(value);
        durable = value;
        events.push(`storage:${value}:memory=${state?.get() ?? "unbound"}`);
        if (value === "1" && !queued && state !== undefined) {
          queued = true;
          state.set(2);
          state.set(2);
        }
      },
      removeItem() {
        durable = null;
      },
    };

    state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    state.watch((value, prevValue) => {
      events.push(`watch:${value}:${String(prevValue)}:memory=${state?.get() ?? "unbound"}`);
    });
    events.length = 0;

    state.set(1);
    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    expect(writes).toEqual(["1", "2"]);
    expect(events).toEqual([
      "storage:1:memory=0",
      "watch:1:0:memory=1",
      "storage:2:memory=1",
      "watch:2:1:memory=2",
    ]);
    expect(state.get()).toBe(2);
    expect(durable).toBe("2");
    expect(reopened.get()).toBe(2);
  });

  it("repairs durable storage after a partial queued write failure", () => {
    let durable: string | null = null;
    let state: Atom<number> | undefined;
    const writes: string[] = [];
    const events: string[] = [];
    const partialWriteError = new Error("partial write 2");
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        writes.push(value);
        durable = value;
        events.push(`storage:${value}:memory=${state?.get() ?? "unbound"}`);
        if (value === "1" && state !== undefined && writes.length === 1) {
          state.set(2);
          state.set(1);
          state.set(1);
        }
        if (value === "2") throw partialWriteError;
      },
      removeItem() {
        durable = null;
      },
    };

    state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    state.watch((value, prevValue) => {
      events.push(`watch:${value}:${String(prevValue)}:memory=${state?.get() ?? "unbound"}`);
    });
    events.length = 0;

    let thrownError: Error | undefined;
    try {
      state.set(1);
    } catch (cause) {
      if (cause instanceof Error) thrownError = cause;
    }
    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    expect(thrownError).toBe(partialWriteError);
    expect(writes).toEqual(["1", "2", "1"]);
    expect(events).toEqual([
      "storage:1:memory=0",
      "watch:1:0:memory=1",
      "storage:2:memory=1",
      "storage:1:memory=1",
    ]);
    expect(state.get()).toBe(1);
    expect(durable).toBe("1");
    expect(reopened.get()).toBe(1);
  });
});
