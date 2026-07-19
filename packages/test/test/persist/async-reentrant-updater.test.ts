import { atom, createAtom, type Atom } from "@zhuangtai-js/core";
import { persist, type PersistCodec, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import {
  CURRENT_STATE_REENTRY_CASES,
  runNumericReentry,
} from "./async-reentrant-updater-fixtures.js";

type Box = {
  value: number;
};

function isBox(value: unknown): value is Box {
  return (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof value.value === "number"
  );
}

describe("persist synchronous reentrant updater and codec sets", () => {
  it("matches Core when an updater reenters the same atom", () => {
    const coreEvents: string[] = [];
    const core = atom(0);
    let coreInnerValue = 0;
    core.watch((value, prevValue) => {
      coreEvents.push(`watch:${value}:${String(prevValue)}:memory=${core.get()}`);
    });
    coreEvents.length = 0;

    core.set((prevValue) => {
      coreEvents.push(`updater:before:${prevValue}:memory=${core.get()}`);
      core.set(2);
      coreInnerValue = core.get();
      coreEvents.push(`updater:after:${coreInnerValue}:memory=${core.get()}`);
      return 1;
    });

    let durable: string | null = null;
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        durable = value;
      },
      removeItem() {
        durable = null;
      },
    };
    const persisted = createAtom().use(persist)(0, { persist: { key: "count", storage } });
    const persistedEvents: string[] = [];
    let persistedInnerValue = 0;
    persisted.watch((value, prevValue) => {
      persistedEvents.push(`watch:${value}:${String(prevValue)}:memory=${persisted.get()}`);
    });
    persistedEvents.length = 0;

    persisted.set((prevValue) => {
      persistedEvents.push(`updater:before:${prevValue}:memory=${persisted.get()}`);
      persisted.set(2);
      persistedInnerValue = persisted.get();
      persistedEvents.push(`updater:after:${persistedInnerValue}:memory=${persisted.get()}`);
      return 1;
    });

    const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });

    expect(coreInnerValue).toBe(2);
    expect(persistedInnerValue).toBe(2);
    expect(persistedEvents).toEqual(coreEvents);
    expect(core.get()).toBe(1);
    expect(persisted.get()).toBe(1);
    expect(durable).toBe("1");
    expect(reopened.get()).toBe(1);
  });

  it("evaluates a storage reentry updater immediately and commits it FIFO", () => {
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
          currentState.set((prevValue) => {
            events.push(`updater:eval:${prevValue}:memory=${currentState.get()}`);
            return prevValue + 2;
          });
          events.push(`reenter:return:memory=${currentState.get()}`);
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
      "updater:eval:0:memory=0",
      "reenter:return:memory=0",
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

  it("linearizes synchronous codec reentry after the outer commit", () => {
    let durable: string | null = null;
    let reentered = false;
    let state: Atom<Box> | undefined;
    const events: string[] = [];
    const storage: PersistStorage = {
      getItem: () => durable,
      setItem(_key, value) {
        durable = value;
        events.push(`storage:${value}:memory=${state?.get().value ?? "unbound"}`);
      },
      removeItem() {
        durable = null;
      },
    };
    const codec: PersistCodec = {
      encode(value) {
        if (!isBox(value)) {
          throw new TypeError("expected a Box");
        }
        events.push(`encode:${value.value}:memory=${state?.get().value ?? "unbound"}`);
        if (value.value === 1 && !reentered && state !== undefined) {
          reentered = true;
          events.push("encode:reenter:start");
          state.set({ value: 2 });
          events.push(`encode:reenter:return:memory=${state.get().value}`);
        }
        return String(value.value);
      },
      decode(rawValue, initialValue) {
        if (!isBox(initialValue)) {
          throw new TypeError("expected a Box");
        }
        initialValue.value = Number(rawValue);
        return initialValue;
      },
    };

    state = createAtom().use(persist)({ value: 0 }, { persist: { key: "box", storage, codec } });
    state.watch((value, prevValue) => {
      events.push(
        `watch:${value.value}:${prevValue?.value ?? "undefined"}:memory=${state?.get().value ?? "unbound"}`,
      );
    });
    events.length = 0;

    state.set({ value: 1 });
    events.push(`outer:return:memory=${state.get().value}`);

    expect(events).toEqual([
      "encode:1:memory=0",
      "encode:reenter:start",
      "encode:reenter:return:memory=0",
      "storage:1:memory=0",
      "watch:1:0:memory=1",
      "encode:2:memory=1",
      "storage:2:memory=1",
      "watch:2:1:memory=2",
      "outer:return:memory=2",
    ]);
    expect(state.get().value).toBe(2);
    expect(durable).toBe("2");
    const reopened = createAtom().use(persist)(
      { value: 0 },
      { persist: { key: "box", storage, codec } },
    );
    expect(reopened.get().value).toBe(2);
  });
  it.each(CURRENT_STATE_REENTRY_CASES)(
    "$name",
    ({ resolve, expectedEvents, expectedValue, expectedWrites }) => {
      const result = runNumericReentry(resolve);

      expect(result.coreEvents).toEqual(expectedEvents);
      expect(result.persistedEvents).toEqual(result.coreEvents);
      expect(result.coreValue).toBe(expectedValue);
      expect(result.persistedValue).toBe(expectedValue);
      expect(result.durable).toBe(String(expectedValue));
      expect(result.reopenedValue).toBe(expectedValue);
      expect(result.writes).toEqual(expectedWrites);
    },
  );
});
