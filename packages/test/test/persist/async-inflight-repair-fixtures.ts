import { createAtom, type Atom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { Deferred, envelope, NUMBER_MIGRATION, waitUntil } from "./async-migration-fixtures.js";

export const KEY = "inflight-repair";

export type InflightRepairFailures = {
  readonly repairCause?: Error;
  readonly compensationCause?: Error;
};

export class InflightRepairDriver implements PersistStorage {
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

export async function prepareInflightRepair(
  driver: InflightRepairDriver,
  onError?: (error: unknown) => void,
): Promise<Atom<number>> {
  const persistOptions = {
    key: KEY,
    storage: driver,
    version: 1,
    migrations: { 0: NUMBER_MIGRATION },
    ...(onError === undefined ? {} : { onError }),
  };
  const state = createAtom().use(persist)(0, { persist: persistOptions });

  await waitUntil(() => driver.writes.length === 1);
  await persist.rehydrate(state);
  driver.migrationWrite.resolve(undefined);
  await waitUntil(() => driver.writes.length === 2);
  return state;
}

export async function reopen(driver: PersistStorage): Promise<Atom<number>> {
  const state = createAtom().use(persist)(0, {
    persist: { key: KEY, storage: driver, version: 1, migrations: { 0: NUMBER_MIGRATION } },
  });
  await persist.ready(state);
  await persist.flush(state);
  return state;
}
