import { createAtom, type Atom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";

describe("persist synchronous reentrant error phases", () => {
  it("does not duplicate an accepted write after a watcher error", () => {
    let durable: string | null = null;
    let queued = false;
    let state: Atom<number> | undefined;
    let watcherError: Error | undefined;
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
          state.set(1);
        }
      },
      removeItem() {
        durable = null;
      },
    };

    state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    state.watch((value, previous) => {
      events.push(`watch:${value}:${String(previous)}:memory=${state?.get() ?? "unbound"}`);
      if (value !== 1) return;
      try {
        state?.set(2);
      } catch (cause) {
        if (cause instanceof Error) watcherError = cause;
        throw cause;
      }
    });
    events.length = 0;

    let thrown: Error | undefined;
    try {
      state.set(1);
    } catch (cause) {
      if (cause instanceof Error) thrown = cause;
    }
    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    expect(thrown).toBe(watcherError);
    expect(writes).toEqual(["1"]);
    expect(events).toEqual(["storage:1:memory=0", "watch:1:0:memory=1"]);
    expect(state.get()).toBe(1);
    expect(durable).toBe("1");
    expect(reopened.get()).toBe(1);
  });

  it("keeps a duplicate-write failure from replacing the watcher error", () => {
    let durable: string | null = null;
    let queued = false;
    let state: Atom<number> | undefined;
    let watcherError: Error | undefined;
    const duplicateWriteError = new Error("duplicate write");
    const writes: string[] = [];
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        writes.push(value);
        if (writes.length > 1) throw duplicateWriteError;
        durable = value;
        if (value === "1" && !queued && state !== undefined) {
          queued = true;
          state.set(1);
        }
      },
      removeItem() {
        durable = null;
      },
    };

    state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    state.watch((value) => {
      if (value !== 1) return;
      try {
        state?.set(2);
      } catch (cause) {
        if (cause instanceof Error) watcherError = cause;
        throw cause;
      }
    });

    let thrown: Error | undefined;
    try {
      state.set(1);
    } catch (cause) {
      if (cause instanceof Error) thrown = cause;
    }
    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    expect(thrown).toBe(watcherError);
    expect(thrown).not.toBeInstanceOf(AggregateError);
    expect(writes).toEqual(["1"]);
    expect(durable).toBe("1");
    expect(state.get()).toBe(1);
    expect(reopened.get()).toBe(1);
  });

  it("clears prior storage uncertainty before a later watcher error", () => {
    let durable: string | null = null;
    let queued = false;
    let state: Atom<number> | undefined;
    let watcherError: Error | undefined;
    const partialWriteError = new Error("partial write 2");
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
          state.set(3);
          state.set(3);
        }
        if (value === "2") throw partialWriteError;
      },
      removeItem() {
        durable = null;
      },
    };

    state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    state.watch((value, previous) => {
      events.push(`watch:${value}:${String(previous)}:memory=${state?.get() ?? "unbound"}`);
      if (value !== 3) return;
      try {
        state?.set(4);
      } catch (cause) {
        if (cause instanceof Error) watcherError = cause;
        throw cause;
      }
    });
    events.length = 0;

    let thrown: Error | AggregateError | undefined;
    try {
      state.set(1);
    } catch (cause) {
      if (cause instanceof Error || cause instanceof AggregateError) thrown = cause;
    }
    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    expect(thrown).toBeInstanceOf(AggregateError);
    expect(thrown instanceof AggregateError ? thrown.errors : undefined).toEqual([
      partialWriteError,
      watcherError,
    ]);
    expect(writes).toEqual(["1", "2", "3"]);
    expect(events).toEqual([
      "storage:1:memory=0",
      "watch:1:0:memory=1",
      "storage:2:memory=1",
      "storage:3:memory=1",
      "watch:3:1:memory=3",
    ]);
    expect(state.get()).toBe(3);
    expect(durable).toBe("3");
    expect(reopened.get()).toBe(3);
  });
});
