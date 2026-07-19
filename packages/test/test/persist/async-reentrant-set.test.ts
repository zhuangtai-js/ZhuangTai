import { createAtom, type Atom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";

const REENTRANT_SET_ERROR =
  "[@zhuangtai-js/core] Cannot call set() on an atom while it is running watcher callbacks.";

describe("persist synchronous reentrant sets", () => {
  it("linearizes a direct synchronous storage callback reentry before the outer set returns", () => {
    let durable: string | null = null;
    let reentered = false;
    let state: Atom<number> | undefined;
    const events: string[] = [];
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        durable = value;
        const currentState = state;
        events.push(`storage:${value}:memory=${currentState?.get() ?? "unbound"}`);

        if (value === "1" && !reentered && currentState !== undefined) {
          reentered = true;
          events.push(`reenter:start:memory=${currentState.get()}`);
          currentState.set(2);
          events.push(`reenter:end:memory=${currentState.get()}`);
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
    events.push(`outer:return:memory=${state.get()}`);

    expect(events).toEqual([
      "storage:1:memory=0",
      "reenter:start:memory=0",
      "reenter:end:memory=0",
      "watch:1:0:memory=1",
      "storage:2:memory=1",
      "watch:2:1:memory=2",
      "outer:return:memory=2",
    ]);
    expect(state.get()).toBe(2);
    expect(durable).toBe("2");

    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    expect(reopened.get()).toBe(2);
  });

  it("rejects watcher reentry before the inner storage write while preserving the outer value", () => {
    let durable: string | null = null;
    const writes: string[] = [];
    const events: string[] = [];
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        durable = value;
        writes.push(value);
        events.push(`storage:${value}`);
      },
      removeItem() {
        durable = null;
      },
    };
    const state = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    state.watch((value, prevValue) => {
      events.push(`watch:${value}:${String(prevValue)}`);

      if (value === 1) {
        events.push("reenter:start");
        state.set(2);
        events.push("reenter:end");
      }
    });
    events.length = 0;

    expect(() => state.set(1)).toThrow(REENTRANT_SET_ERROR);
    events.push(`outer:throw:memory=${state.get()}`);

    expect(events).toEqual(["storage:1", "watch:1:0", "reenter:start", "outer:throw:memory=1"]);
    expect(writes).toEqual(["1"]);
    expect(state.get()).toBe(1);
    expect(durable).toBe("1");

    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    expect(reopened.get()).toBe(1);
  });

  it("propagates a queued reentry error synchronously and releases later sets", () => {
    const cause = new Error("inner write failed");
    let durable: string | null = null;
    let queued = false;
    let state: Atom<number> | undefined;
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        if (value === "2") {
          throw cause;
        }

        durable = value;
        const currentState = state;
        if (value === "1" && !queued && currentState !== undefined) {
          queued = true;
          currentState.set(2);
        }
      },
      removeItem() {
        durable = null;
      },
    };

    state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    let caught: unknown;
    try {
      state.set(1);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(cause);
    expect(state.get()).toBe(1);
    expect(durable).toBe("1");

    state.set(3);

    expect(state.get()).toBe(3);
    expect(durable).toBe("3");
    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    expect(reopened.get()).toBe(3);
  });

  it("aggregates all queued write failures and recovers on the next set", () => {
    const firstCause = new Error("queued write 2 failed");
    const secondCause = new Error("queued write 3 failed");
    let durable: string | null = null;
    let queued = false;
    let state: Atom<number> | undefined;
    const attemptedWrites: string[] = [];
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        attemptedWrites.push(value);
        if (value === "2") {
          throw firstCause;
        }
        if (value === "3") {
          throw secondCause;
        }

        durable = value;
        const currentState = state;
        if (value === "1" && !queued && currentState !== undefined) {
          queued = true;
          currentState.set(2);
          currentState.set(3);
        }
      },
      removeItem() {
        durable = null;
      },
    };

    state = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    let caught: unknown;
    try {
      state.set(1);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AggregateError);
    if (!(caught instanceof AggregateError)) {
      throw new Error("expected queued failures to throw AggregateError");
    }
    expect(caught.message).toContain("[@zhuangtai-js/persist]");
    expect(caught.errors).toEqual([firstCause, secondCause]);
    expect(attemptedWrites).toEqual(["1", "2", "3"]);
    expect(state.get()).toBe(1);
    expect(durable).toBe("1");

    state.set(4);

    expect(state.get()).toBe(4);
    expect(durable).toBe("4");
    expect(attemptedWrites).toEqual(["1", "2", "3", "4"]);
    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    expect(reopened.get()).toBe(4);
  });
});
