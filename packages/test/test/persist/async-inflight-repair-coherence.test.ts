import { createAtom, type Atom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import { Deferred, envelope, NUMBER_MIGRATION, waitUntil } from "./async-migration-fixtures.js";

type CoherentDriver = PersistStorage & {
  readonly migrationWrite: Deferred<void>;
  readonly repairWrite: Deferred<void>;
  readonly writes: readonly string[];
  readonly stored: string | null;
  readonly reads: number;
};

function createCoherentDriver(): CoherentDriver {
  const migrationWrite = new Deferred<void>();
  const repairWrite = new Deferred<void>();
  const writes: string[] = [];
  let storedValue: string | null = "1";
  let reads = 0;
  return {
    migrationWrite,
    repairWrite,
    writes,
    get stored() {
      return storedValue;
    },
    get reads() {
      return reads;
    },
    getItem() {
      reads += 1;
      if (reads === 1) return Promise.resolve("1");
      if (reads === 2) {
        storedValue = envelope(1, "7");
        return Promise.resolve(storedValue);
      }
      return Promise.resolve(storedValue);
    },
    setItem(_key, value) {
      const writeNumber = writes.push(value);
      if (writeNumber === 1) {
        return migrationWrite.promise.then(() => {
          storedValue = value;
        });
      }
      if (writeNumber === 2) {
        return repairWrite.promise.then(() => {
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
}

function createState(storage: PersistStorage): Atom<number> {
  return createAtom().use(persist)(0, {
    persist: { key: "coherent-repair", storage, version: 1, migrations: { 0: NUMBER_MIGRATION } },
  });
}

async function reopen(storage: PersistStorage): Promise<Atom<number>> {
  const state = createState(storage);
  await persist.ready(state);
  await persist.flush(state);
  return state;
}

describe("persist coherent stale repair reads", () => {
  it("waits for an in-flight repair before reading the same storage", async () => {
    const driver = createCoherentDriver();
    const state = createState(driver);

    await waitUntil(() => driver.writes.length === 1);
    await persist.rehydrate(state);
    expect(state.get()).toBe(7);

    driver.migrationWrite.resolve(undefined);
    await waitUntil(() => driver.writes.length === 2);
    expect(driver.stored).toBe(envelope(1, "2"));

    const rehydration = persist.rehydrate(state);
    await Promise.resolve();
    expect(driver.reads).toBe(2);
    expect(state.get()).toBe(7);

    driver.repairWrite.resolve(undefined);
    await rehydration;
    await persist.flush(state);

    const reopened = await reopen(driver);
    expect(state.get()).toBe(7);
    expect(driver.stored).toBe(envelope(1, "7"));
    expect(reopened.get()).toBe(7);
    expect(driver.writes).toEqual([envelope(1, "2"), envelope(1, "7")]);
  });

  it("repairs after a finite chain supersedes the first applied hydration", async () => {
    const migrationWrite = new Deferred<void>();
    const repairWrite = new Deferred<void>();
    const values = Array.from({ length: 100 }, (_, index) => index + 3);
    const reads: Deferred<string | null>[] = [];
    const writes: string[] = [];
    let storedValue: string | null = "1";
    let readCount = 0;
    const storage: PersistStorage = {
      getItem() {
        readCount += 1;
        if (readCount === 1) return Promise.resolve("1");
        const index = readCount - 2;
        if (index >= values.length) return Promise.resolve(storedValue);
        const read = reads[index];
        if (read === undefined) throw new TypeError(`Missing generation read ${index + 1}.`);
        return read.promise;
      },
      setItem(_key, value) {
        const writeNumber = writes.push(value);
        if (writeNumber === 1) {
          return migrationWrite.promise.then(() => {
            storedValue = value;
          });
        }
        if (writeNumber === 2) {
          return repairWrite.promise.then(() => {
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
    const state = createState(storage);

    await waitUntil(() => writes.length === 1);
    const firstRead = new Deferred<string | null>();
    reads.push(firstRead);
    const firstHydration = persist.rehydrate(state);
    firstRead.resolve(envelope(1, String(values[0])));
    await firstHydration;
    expect(state.get()).toBe(values[0]);

    migrationWrite.resolve(undefined);
    await waitUntil(() => writes.length === 2);
    expect(storedValue).toBe(envelope(1, "2"));

    const laterHydrations = values.slice(1).map(() => {
      const read = new Deferred<string | null>();
      reads.push(read);
      return persist.rehydrate(state);
    });
    await Promise.resolve();
    expect(readCount).toBe(2);

    repairWrite.resolve(undefined);
    await waitUntil(() => readCount === values.length + 1);
    for (let index = 1; index < values.length; index += 1) {
      const read = reads[index];
      const hydration = laterHydrations[index - 1];
      const value = values[index];
      if (read === undefined || hydration === undefined || value === undefined) {
        throw new TypeError(`Missing generation ${index + 1}.`);
      }
      read.resolve(envelope(1, String(value)));
      await hydration;
    }

    await persist.flush(state);
    const reopened = await reopen(storage);
    const finalValue = values[values.length - 1];
    if (finalValue === undefined) throw new TypeError("Missing final generation value.");
    expect(state.get()).toBe(finalValue);
    expect(storedValue).toBe(envelope(1, String(finalValue)));
    expect(reopened.get()).toBe(finalValue);
    expect(writes).toEqual([
      envelope(1, "2"),
      envelope(1, String(values[0])),
      envelope(1, String(finalValue)),
    ]);
  });
});
