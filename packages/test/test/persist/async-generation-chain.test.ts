import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import { Deferred, envelope, NUMBER_MIGRATION, waitUntil } from "./async-migration-fixtures.js";

type ChainObservation = {
  readonly memory: number;
  readonly storage: string;
  readonly writes: readonly string[];
};

async function runGenerationChain(newerValues: readonly number[]): Promise<ChainObservation> {
  if (newerValues.length < 2) {
    throw new Error("A generation chain needs at least B and C hydrations.");
  }

  const oldWrite = new Deferred<void>();
  const reads = newerValues.map(() => new Deferred<string | null>());
  const writes: string[] = [];
  let storedValue = "1";
  let readCount = 0;
  const storage: PersistStorage = {
    getItem() {
      readCount += 1;
      if (readCount === 1) {
        return Promise.resolve("1");
      }

      const index = readCount - 2;
      const read = reads[index];
      const value = newerValues[index];
      if (read === undefined || value === undefined) {
        throw new Error(`Unexpected hydration read ${readCount}.`);
      }
      storedValue = envelope(1, String(value));
      return read.promise;
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
    removeItem: () => undefined,
  };
  const state = createAtom().use(persist)(0, {
    persist: { key: "generation-chain", storage, version: 1, migrations: { 0: NUMBER_MIGRATION } },
  });

  await waitUntil(() => writes.length === 1);
  const firstNewerHydration = persist.rehydrate(state);

  oldWrite.resolve(undefined);
  await waitUntil(() => storedValue === envelope(1, "2"));
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }

  const laterHydrations = newerValues.slice(1).map(() => persist.rehydrate(state));
  const firstRead = reads[0];
  const firstValue = newerValues[0];
  if (firstRead === undefined || firstValue === undefined) {
    throw new Error("Missing generation B hydration.");
  }
  firstRead.resolve(envelope(1, String(firstValue)));
  await firstNewerHydration;
  await Promise.resolve();

  for (let index = 1; index < newerValues.length; index += 1) {
    const read = reads[index];
    const value = newerValues[index];
    const hydration = laterHydrations[index - 1];
    if (read === undefined || value === undefined || hydration === undefined) {
      throw new Error(`Missing generation ${index + 2} hydration.`);
    }
    read.resolve(envelope(1, String(value)));
    await hydration;
  }
  await persist.flush(state);

  return { memory: state.get(), storage: storedValue, writes };
}

describe("persist stale repair generation chains", () => {
  it("does not let repair A bound to hydration B overwrite latest hydration C", async () => {
    const observation = await runGenerationChain([7, 9]);

    expect(observation.memory).toBe(9);
    expect(observation.storage).toBe(envelope(1, "9"));
    expect(observation.writes).toEqual([envelope(1, "2")]);
  });

  it("keeps repair A stale across hydration generations B, C, and D", async () => {
    const observation = await runGenerationChain([7, 9, 11]);

    expect(observation.memory).toBe(11);
    expect(observation.storage).toBe(envelope(1, "11"));
    expect(observation.writes).toEqual([envelope(1, "2")]);
  });
});
