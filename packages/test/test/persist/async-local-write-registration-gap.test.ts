import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import { Deferred, envelope, NUMBER_MIGRATION, waitUntil } from "./async-migration-fixtures.js";

describe("persist local-write migration registration gap", () => {
  it("keeps a local write after an older migration resolves before same-turn rehydrate", async () => {
    const oldWrite = new Deferred<void>();
    const writes: string[] = [];
    let storedValue: string | null = "1";
    let reads = 0;
    const storage: PersistStorage = {
      getItem() {
        reads += 1;
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
    const options = {
      persist: {
        key: "local-gap",
        storage,
        version: 1,
        migrations: { 0: NUMBER_MIGRATION },
      },
    };
    const state = createAtom().use(persist)(0, options);

    await waitUntil(() => writes.length === 1);
    state.set(7);
    expect(state.get()).toBe(7);

    oldWrite.resolve(undefined);
    await persist.rehydrate(state);
    await persist.flush(state);

    const reopened = createAtom().use(persist)(0, options);
    await persist.ready(reopened);
    await persist.flush(reopened);

    expect({
      memory: state.get(),
      stored: storedValue,
      reopened: reopened.get(),
      writes,
      reads,
    }).toEqual({
      memory: 7,
      stored: envelope(1, "7"),
      reopened: 7,
      writes: [envelope(1, "2"), envelope(1, "7"), envelope(1, "7")],
      reads: 3,
    });
  });
});
