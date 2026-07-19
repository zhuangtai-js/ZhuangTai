import { atom, createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";

export function runNumericReentry(resolve: (prevValue: number) => number) {
  const coreEvents: string[] = [];
  const core = atom(0);
  core.watch((value, prevValue) => {
    coreEvents.push(`watch:${value}:${String(prevValue)}:memory=${core.get()}`);
  });
  coreEvents.length = 0;
  core.set((prevValue) => {
    core.set(2);
    return resolve(prevValue);
  });

  let durable: string | null = null;
  const writes: string[] = [];
  const storage: PersistStorage = {
    getItem: () => durable,
    setItem(_key, value) {
      writes.push(value);
      durable = value;
    },
    removeItem() {
      durable = null;
    },
  };
  const persisted = createAtom().use(persist)(0, { persist: { key: "count", storage } });
  const persistedEvents: string[] = [];
  persisted.watch((value, prevValue) => {
    persistedEvents.push(`watch:${value}:${String(prevValue)}:memory=${persisted.get()}`);
  });
  persistedEvents.length = 0;
  persisted.set((prevValue) => {
    persisted.set(2);
    return resolve(prevValue);
  });

  const reopened = createAtom().use(persist)(0, { persist: { key: "count", storage } });
  return {
    coreEvents,
    persistedEvents,
    coreValue: core.get(),
    persistedValue: persisted.get(),
    durable,
    reopenedValue: reopened.get(),
    writes,
  };
}

export const CURRENT_STATE_REENTRY_CASES = [
  {
    name: "matches Core when the updater returns the original previous value",
    resolve: (prevValue: number) => prevValue,
    expectedEvents: ["watch:2:0:memory=2", "watch:0:2:memory=0"],
    expectedValue: 0,
    expectedWrites: ["2", "0"],
  },
  {
    name: "matches Core when the updater returns the inner value",
    resolve: (prevValue: number) => prevValue + 2,
    expectedEvents: ["watch:2:0:memory=2"],
    expectedValue: 2,
    expectedWrites: ["2"],
  },
] as const;
