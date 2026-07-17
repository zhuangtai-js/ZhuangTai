import { createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import { Deferred, expectNoUnhandled, rejectionOf } from "./async-migration-fixtures.js";

function waitForUnhandledTurn(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("persist async onError", () => {
  it("observes a rejected callback Promise without hiding the persist failure", async () => {
    const storageCause = new Error("read failed");
    const callbackCause = new Error("async onError failed");
    const unhandled: unknown[] = [];
    function listener(reason: unknown): void {
      unhandled.push(reason);
    }
    process.on("unhandledRejection", listener);

    try {
      const storage: PersistStorage = {
        getItem: () => Promise.reject(storageCause),
        setItem: () => undefined,
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: {
          key: "async-on-error",
          storage,
          onError: () => Promise.reject(callbackCause),
        },
      });

      const readyError = await rejectionOf(persist.ready(state));
      await waitForUnhandledTurn();
      const flushError = await rejectionOf(persist.flush(state));
      await waitForUnhandledTurn();

      expect(readyError).toBeInstanceOf(Error);
      if (!(readyError instanceof Error)) {
        throw new TypeError("Expected ready to reject with an Error.");
      }
      expect(readyError.cause).toBe(storageCause);
      expect(flushError).toBe(readyError);
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", listener);
    }
  });

  it("keeps synchronous onError throws from replacing the persist failure", async () => {
    await expectNoUnhandled(async () => {
      const storageCause = new Error("read failed");
      const callbackCause = new Error("sync callback failed");
      const storage: PersistStorage = {
        getItem: () => Promise.reject(storageCause),
        setItem: () => undefined,
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: {
          key: "sync-on-error",
          storage,
          onError: () => {
            throw callbackCause;
          },
        },
      });

      const readyError = await rejectionOf(persist.ready(state));
      expect(readyError).toBeInstanceOf(Error);
      if (!(readyError instanceof Error)) {
        throw new TypeError("Expected ready to reject with an Error.");
      }
      expect(readyError.cause).toBe(storageCause);
      expect(await rejectionOf(persist.flush(state))).toBe(readyError);
      await expect(persist.flush(state)).resolves.toBeUndefined();
    });
  });

  it("does not retain a late rejected callback Promise for a future flush", async () => {
    const storageCause = new Error("read failed");
    const callbackCause = new Error("late callback failed");
    const callback = new Deferred<void>();
    const unhandled: unknown[] = [];
    function listener(reason: unknown): void {
      unhandled.push(reason);
    }
    process.on("unhandledRejection", listener);

    try {
      const storage: PersistStorage = {
        getItem: () => Promise.reject(storageCause),
        setItem: () => undefined,
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: {
          key: "late-async-on-error",
          storage,
          onError: () => callback.promise,
        },
      });

      const readyError = await rejectionOf(persist.ready(state));
      const firstFlushError = await rejectionOf(persist.flush(state));
      expect(firstFlushError).toBe(readyError);

      callback.reject(callbackCause);
      await waitForUnhandledTurn();

      await expect(persist.flush(state)).resolves.toBeUndefined();
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", listener);
    }
  });
});
