import { persist } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import {
  InflightRepairDriver,
  prepareInflightRepair,
  reopen,
} from "./async-inflight-repair-fixtures.js";
import { envelope, waitUntil } from "./async-migration-fixtures.js";

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
        const hydration = persist.rehydrate(state);
        if (index === 1) {
          driver.repairWrite.resolve(undefined);
        }
        await hydration;
      }
      const latestValue = hydrationValues[hydrationValues.length - 1];
      if (latestValue === undefined) {
        throw new TypeError("Expected a latest hydration value.");
      }
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

    const firstHydration = persist.rehydrate(state);
    const secondHydration = persist.rehydrate(state);
    driver.repairWrite.resolve(undefined);
    await Promise.all([firstHydration, secondHydration]);
    await waitUntil(() => driver.writes.length === 3);
    expect(driver.writes[2]).toBe(envelope(1, "11"));

    for (const [writeNumber, expectedValue] of [
      [3, 13],
      [4, 15],
    ] as const) {
      const hydration = persist.rehydrate(state);
      driver.resolvePendingWrite(writeNumber);
      await hydration;
      await waitUntil(() => driver.writes.length === writeNumber + 1);
      expect(driver.writes[writeNumber]).toBe(envelope(1, String(expectedValue)));
    }

    const finalHydration = persist.rehydrate(state);
    driver.resolvePendingWrite(5);
    await finalHydration;

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

    const firstHydration = persist.rehydrate(state);
    const secondHydration = persist.rehydrate(state);
    driver.repairWrite.resolve(undefined);
    await Promise.all([firstHydration, secondHydration]);
    await waitUntil(() => driver.writes.length === 3);

    const thirdHydration = persist.rehydrate(state);
    let clearResolved = false;
    const cleared = persist.clear(state).then(() => {
      clearResolved = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(clearResolved).toBe(false);

    driver.resolvePendingWrite(3);
    await thirdHydration;
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
});
