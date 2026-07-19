import { persist } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import {
  InflightRepairDriver,
  KEY,
  prepareInflightRepair,
  reopen,
} from "./async-inflight-repair-fixtures.js";
import {
  expectErrorContext,
  expectNoUnhandled,
  envelope,
  rejectionOf,
} from "./async-migration-fixtures.js";
import { expectOperationError } from "./async-persist-fixtures.js";

describe("persist in-flight stale migration repair errors", () => {
  it("reports a failed completion compensation and lets a later write recover", async () => {
    await expectNoUnhandled(async () => {
      const cause = new Error("compensation failed");
      const errors: unknown[] = [];
      const driver = new InflightRepairDriver([7, 9], { compensationCause: cause });
      const state = await prepareInflightRepair(driver, (error) => errors.push(error));

      const hydration = persist.rehydrate(state);
      driver.repairWrite.resolve(undefined);
      await hydration;
      const error = await rejectionOf(persist.flush(state));

      expectOperationError(error, "write", KEY);
      expectErrorContext(error, KEY, 1, cause);
      expect(errors).toEqual([error]);
      expect(state.get()).toBe(9);
      expect(driver.stored).toBe(envelope(1, "9"));
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

      const hydration = persist.rehydrate(state);
      driver.repairWrite.resolve(undefined);
      await hydration;
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

    const hydration = persist.rehydrate(state);
    let clearResolved = false;
    const cleared = persist.clear(state).then(() => {
      clearResolved = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(clearResolved).toBe(false);

    driver.repairWrite.resolve(undefined);
    await hydration;
    await cleared;
    await persist.flush(state);
    const reopened = await reopen(driver);

    expect(driver.stored).toBeNull();
    expect(reopened.get()).toBe(0);
  });
});
