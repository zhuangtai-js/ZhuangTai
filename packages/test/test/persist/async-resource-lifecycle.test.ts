import { readFile } from "node:fs/promises";
import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import { rejectionOf } from "./async-persist-fixtures.js";

describe("persist async resource lifecycle", () => {
  it("keeps applied state bounded across 10,000 public rehydrate calls", async () => {
    const source = await readFile(
      new URL("../../../persist/src/stale-repair.ts", import.meta.url),
      "utf8",
    );
    let reads = 0;
    const storage: PersistStorage = {
      getItem() {
        reads += 1;
        return "0";
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, {
      persist: { key: "bounded-hydration", storage },
    });

    for (let generation = 0; generation < 10_000; generation += 1) {
      await persist.rehydrate(state);
    }
    await persist.flush(state);

    expect(state.get()).toBe(0);
    expect(reads).toBe(10_001);
    expect(source).not.toContain("appliedGenerations");
    expect(source).toContain("let applied =");
  });

  it("reports every failure while retaining only the first one for flush", async () => {
    const source = await readFile(
      new URL("../../../persist/src/failure-tracker.ts", import.meta.url),
      "utf8",
    );
    const reported: unknown[] = [];
    let rejectWrites = true;
    const storage: PersistStorage = {
      getItem: () => null,
      setItem: () =>
        rejectWrites ? Promise.reject(new Error(`failure-${reported.length + 1}`)) : undefined,
      removeItem: () => undefined,
    };
    const state = createAtom().use(persist)(0, {
      persist: {
        key: "bounded-failures",
        storage,
        onError(error) {
          reported.push(error);
        },
      },
    });

    for (let value = 1; value <= 10_000; value += 1) state.set(value);
    const firstFailure = await rejectionOf(persist.flush(state));

    expect(reported).toHaveLength(10_000);
    expect(firstFailure).toBe(reported.at(0));
    expect(source).not.toContain("retainedFailures");
    expect(source).toContain("private retainedFailure: Error | undefined");
    await expect(persist.flush(state)).resolves.toBeUndefined();

    rejectWrites = false;
    state.set(10_001);
    await expect(persist.flush(state)).resolves.toBeUndefined();
  });
});
