import { describe, expect, it } from "vitest";
import { createResilientStorage } from "../src/components/interactive-examples/resilient-storage";

async function waitForTurn(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("createResilientStorage", () => {
  it("keeps synchronous storage methods synchronous", () => {
    const unavailable: string[] = [];
    const storage = createResilientStorage(
      {
        getItem: () => "stored",
        setItem: () => undefined,
        removeItem: () => undefined,
      },
      () => unavailable.push("unavailable"),
    );

    expect(storage.getItem("key")).toBe("stored");
    expect(storage.setItem("key", "value")).toBeUndefined();
    expect(storage.removeItem("key")).toBeUndefined();
    expect(unavailable).toEqual([]);
  });

  it("preserves asynchronous getItem results and caches the resolved value", async () => {
    let reads = 0;
    const unavailable: string[] = [];
    const storage = createResilientStorage(
      {
        getItem: () => {
          reads += 1;
          return reads === 1 ? Promise.resolve("stored") : Promise.reject(new Error("read failed"));
        },
        setItem: () => undefined,
        removeItem: () => undefined,
      },
      () => unavailable.push("unavailable"),
    );

    const result = storage.getItem("key");
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
    await expect(result).resolves.toBe("stored");

    const fallbackResult = storage.getItem("key");
    expect(fallbackResult).not.toBeNull();
    expect(typeof fallbackResult).toBe("object");
    await expect(fallbackResult).resolves.toBe("stored");
    await waitForTurn();
    expect(unavailable).toEqual(["unavailable"]);
  });

  it("handles rejected asynchronous writes and removals without unhandled rejections", async () => {
    const reasons: unknown[] = [];
    const unavailable: string[] = [];
    function listener(reason: unknown): void {
      reasons.push(reason);
    }
    process.on("unhandledRejection", listener);

    try {
      const setStorage = createResilientStorage(
        {
          getItem: () => null,
          setItem: () => Promise.reject(new Error("set failed")),
          removeItem: () => undefined,
        },
        () => unavailable.push("set"),
      );
      const removeStorage = createResilientStorage(
        {
          getItem: () => null,
          setItem: () => undefined,
          removeItem: () => Promise.reject(new Error("remove failed")),
        },
        () => unavailable.push("remove"),
      );

      await expect(setStorage.setItem("key", "value")).resolves.toBeUndefined();
      await expect(removeStorage.removeItem("key")).resolves.toBeUndefined();
      await waitForTurn();

      expect(unavailable).toEqual(["set", "remove"]);
      expect(reasons).toEqual([]);
    } finally {
      process.off("unhandledRejection", listener);
    }
  });
});
