import { createAtom } from "@zhuangtai-js/core";
import { definePersistMigration, persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import { Deferred, envelope, NUMBER_MIGRATION, waitUntil } from "./async-migration-fixtures.js";

describe("persist async migration durable order", () => {
  it("awaits a two-step raw-v0 migration write-back before applying memory", async () => {
    const read = new Deferred<string | null>();
    const write = new Deferred<void>();
    const migrationCalls: number[] = [];
    const writes: string[] = [];
    let storedValue = "1";
    const storage: PersistStorage = {
      getItem: () => read.promise,
      setItem(_key, value) {
        writes.push(value);
        return write.promise.then(() => {
          storedValue = value;
        });
      },
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, {
      persist: {
        key: "count",
        storage,
        version: 2,
        migrations: {
          0: definePersistMigration<number>((value) => {
            migrationCalls.push(0);
            return NUMBER_MIGRATION(value);
          }),
          1: definePersistMigration<number>((value) => {
            migrationCalls.push(1);
            return NUMBER_MIGRATION(value);
          }),
        },
      },
    });
    const ready = persist.ready(state);
    let readySettled = false;
    void ready.then(
      () => {
        readySettled = true;
      },
      () => {
        readySettled = true;
      },
    );

    read.resolve("1");
    await waitUntil(() => writes.length === 1);

    expect(migrationCalls).toEqual([0, 1]);
    expect(writes).toEqual([envelope(2, "3")]);
    expect(state.get()).toBe(0);
    expect(readySettled).toBe(false);

    write.resolve(undefined);
    await expect(ready).resolves.toBeUndefined();
    expect(state.get()).toBe(3);
    expect(storedValue).toBe(envelope(2, "3"));
  });
});
