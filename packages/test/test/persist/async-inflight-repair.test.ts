import { createAtom, type Atom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import {
  Deferred,
  envelope,
  expectErrorContext,
  expectNoUnhandled,
  NUMBER_MIGRATION,
  rejectionOf,
  waitUntil,
} from "./async-migration-fixtures.js";
import { expectOperationError } from "./async-persist-fixtures.js";

const KEY = "inflight-repair";
type InflightRepairFailures = {
  readonly repairCause?: Error;
  readonly compensationCause?: Error;
};

class InflightRepairDriver implements PersistStorage {
  readonly migrationWrite = new Deferred<void>();
  readonly repairWrite = new Deferred<void>();
  readonly pendingWrites = new Map<number, Deferred<void>>();
  readonly writes: string[] = [];
  private readonly pendingWriteNumbers: ReadonlySet<number>;
  private storedValue: string | null = "1";
  private readCount = 0;

  constructor(
    private readonly hydrationValues: readonly number[],
    private readonly failures: InflightRepairFailures = {},
    pendingWriteNumbers: readonly number[] = [],
  ) {
    this.pendingWriteNumbers = new Set(pendingWriteNumbers);
  }

  get stored(): string | null {
    return this.storedValue;
  }

  getItem(): Promise<string | null> {
    this.readCount += 1;
    if (this.readCount === 1) {
      return Promise.resolve("1");
    }

    const hydrationValue = this.hydrationValues[this.readCount - 2];
    if (hydrationValue === undefined) {
      return Promise.resolve(this.storedValue);
    }

    this.storedValue = envelope(1, String(hydrationValue));
    return Promise.resolve(this.storedValue);
  }

  setItem(_key: string, value: string): Promise<void> {
    const writeNumber = this.writes.push(value);
    if (writeNumber === 1) {
      return this.migrationWrite.promise.then(() => {
        this.storedValue = value;
      });
    }
    if (writeNumber === 2) {
      return this.repairWrite.promise.then(() => {
        if (this.failures.repairCause !== undefined) {
          throw this.failures.repairCause;
        }
        this.storedValue = value;
      });
    }
    if (writeNumber === 3 && this.failures.compensationCause !== undefined) {
      return Promise.reject(this.failures.compensationCause);
    }

    const pendingWrite = this.pendingWriteNumbers.has(writeNumber)
      ? new Deferred<void>()
      : undefined;
    if (pendingWrite !== undefined) {
      this.pendingWrites.set(writeNumber, pendingWrite);
      return pendingWrite.promise.then(() => {
        this.storedValue = value;
      });
    }

    this.storedValue = value;
    return Promise.resolve();
  }

  resolvePendingWrite(writeNumber: number): void {
    const pendingWrite = this.pendingWrites.get(writeNumber);
    if (pendingWrite === undefined) {
      throw new Error(`Write ${writeNumber} is not pending.`);
    }
    pendingWrite.resolve(undefined);
  }

  removeItem(): Promise<void> {
    this.storedValue = null;
    return Promise.resolve();
  }
}

async function prepareInflightRepair(
  driver: InflightRepairDriver,
  onError?: (error: unknown) => void,
): Promise<Atom<number>> {
  const state = createAtom().use(persist)(0, {
    persist: {
      key: KEY,
      storage: driver,
      version: 1,
      migrations: { 0: NUMBER_MIGRATION },
      ...(onError === undefined ? {} : { onError }),
    },
  });

  await waitUntil(() => driver.writes.length === 1);
  await persist.rehydrate(state);
  driver.migrationWrite.resolve(undefined);
  await waitUntil(() => driver.writes.length === 2);
  return state;
}

async function reopen(driver: PersistStorage): Promise<Atom<number>> {
  const state = createAtom().use(persist)(0, {
    persist: { key: KEY, storage: driver, version: 1, migrations: { 0: NUMBER_MIGRATION } },
  });
  await persist.ready(state);
  await persist.flush(state);
  return state;
}

const GENERATION_CHAINS = [
  { chain: "A→B→C", hydrationValues: [7, 9] },
  { chain: "A→B→C→D", hydrationValues: [7, 9, 11] },
] satisfies readonly {
  readonly chain: string;
  readonly hydrationValues: readonly number[];
}[];

describe("persist in-flight stale migration repair", () => {
  it.each(GENERATION_CHAINS)(
    "compensates repair A after its pending write is superseded by $chain",
    async ({ hydrationValues }) => {
      const driver = new InflightRepairDriver(hydrationValues);
      const state = await prepareInflightRepair(driver);

      for (let index = 1; index < hydrationValues.length; index += 1) {
        await persist.rehydrate(state);
      }
      const latestValue = hydrationValues[hydrationValues.length - 1];
      if (latestValue === undefined) {
        throw new TypeError("Expected a latest hydration value.");
      }
      expect(state.get()).toBe(latestValue);
      expect(driver.stored).toBe(envelope(1, String(latestValue)));

      driver.repairWrite.resolve(undefined);
      await persist.flush(state);
      const reopened = await reopen(driver);

      expect(state.get()).toBe(latestValue);
      expect(driver.stored).toBe(envelope(1, String(latestValue)));
      expect(reopened.get()).toBe(latestValue);
      expect(driver.writes).toEqual([
        envelope(1, "2"),
        envelope(1, "7"),
        envelope(1, String(latestValue)),
      ]);
    },
  );

  it("keeps the final value durable through nested pending compensations", async () => {
    const hydrationValues = [7, 9, 11, 13, 15, 17];
    const driver = new InflightRepairDriver(hydrationValues, {}, [3, 4, 5]);
    const state = await prepareInflightRepair(driver);

    await persist.rehydrate(state);
    await persist.rehydrate(state);
    driver.repairWrite.resolve(undefined);
    await waitUntil(() => driver.writes.length === 3);
    expect(driver.writes[2]).toBe(envelope(1, "11"));

    await persist.rehydrate(state);
    driver.resolvePendingWrite(3);
    await waitUntil(() => driver.writes.length === 4);
    expect(driver.writes[3]).toBe(envelope(1, "13"));

    await persist.rehydrate(state);
    driver.resolvePendingWrite(4);
    await waitUntil(() => driver.writes.length === 5);
    expect(driver.writes[4]).toBe(envelope(1, "15"));

    await persist.rehydrate(state);
    driver.resolvePendingWrite(5);
    await persist.flush(state);

    expect(state.get()).toBe(17);
    expect(driver.stored).toBe(envelope(1, "17"));
    expect(driver.writes).toEqual([
      envelope(1, "2"),
      envelope(1, "7"),
      envelope(1, "11"),
      envelope(1, "13"),
      envelope(1, "15"),
      envelope(1, "17"),
    ]);

    const reopened = await reopen(driver);
    expect(reopened.get()).toBe(17);

    await persist.clear(state);
    await persist.flush(state);
    const cleared = await reopen(driver);
    expect(driver.stored).toBeNull();
    expect(cleared.get()).toBe(0);
  });

  it("waits for a nested compensation before clear removes durable data", async () => {
    const driver = new InflightRepairDriver([7, 9, 11, 13], {}, [3]);
    const state = await prepareInflightRepair(driver);

    await persist.rehydrate(state);
    await persist.rehydrate(state);
    driver.repairWrite.resolve(undefined);
    await waitUntil(() => driver.writes.length === 3);
    await persist.rehydrate(state);

    let clearResolved = false;
    const cleared = persist.clear(state).then(() => {
      clearResolved = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(clearResolved).toBe(false);

    driver.resolvePendingWrite(3);
    await cleared;
    await persist.flush(state);

    expect(driver.writes).toEqual([
      envelope(1, "2"),
      envelope(1, "7"),
      envelope(1, "11"),
      envelope(1, "13"),
    ]);
    expect(driver.stored).toBeNull();
    const reopened = await reopen(driver);
    expect(reopened.get()).toBe(0);
  });

  it("reports a failed completion compensation and lets a later write recover", async () => {
    await expectNoUnhandled(async () => {
      const cause = new Error("compensation failed");
      const errors: unknown[] = [];
      const driver = new InflightRepairDriver([7, 9], { compensationCause: cause });
      const state = await prepareInflightRepair(driver, (error) => errors.push(error));

      await persist.rehydrate(state);
      driver.repairWrite.resolve(undefined);
      const error = await rejectionOf(persist.flush(state));

      expectOperationError(error, "write", KEY);
      expectErrorContext(error, KEY, 1, cause);
      expect(errors).toEqual([error]);
      expect(state.get()).toBe(9);
      expect(driver.stored).toBe(envelope(1, "7"));
      expect(driver.writes).toEqual([envelope(1, "2"), envelope(1, "7"), envelope(1, "9")]);

      state.set(10);
      await persist.flush(state);
      expect(driver.stored).toBe(envelope(1, "10"));
    });
  });

  it("reports a failed invoked stale repair and lets a later write recover", async () => {
    await expectNoUnhandled(async () => {
      const cause = new Error("repair failed");
      const errors: unknown[] = [];
      const driver = new InflightRepairDriver([7, 9], { repairCause: cause });
      const state = await prepareInflightRepair(driver, (error) => errors.push(error));

      await persist.rehydrate(state);
      driver.repairWrite.resolve(undefined);
      const error = await rejectionOf(persist.flush(state));

      expectOperationError(error, "write", KEY);
      expectErrorContext(error, KEY, 1, cause);
      expect(errors).toEqual([error]);
      expect(state.get()).toBe(9);
      expect(driver.stored).toBe(envelope(1, "9"));
      expect(driver.writes).toEqual([envelope(1, "2"), envelope(1, "7")]);

      state.set(10);
      await persist.flush(state);
      expect(driver.stored).toBe(envelope(1, "10"));
    });
  });

  it("keeps clear durable while an invoked stale repair is pending", async () => {
    const driver = new InflightRepairDriver([7, 9]);
    const state = await prepareInflightRepair(driver);

    await persist.rehydrate(state);
    let clearResolved = false;
    const cleared = persist.clear(state).then(() => {
      clearResolved = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(clearResolved).toBe(false);

    driver.repairWrite.resolve(undefined);
    await cleared;
    await persist.flush(state);
    const reopened = await reopen(driver);

    expect(driver.stored).toBeNull();
    expect(reopened.get()).toBe(0);
  });
});
