import assert from "node:assert/strict";
import { persist } from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import { createPreferencesStore } from "../src/components/interactive-examples/stores";

const initialPreferences = { theme: "light", density: "comfortable" } as const;

describe("preferences store", () => {
  it("falls back to session state when persistent writes fail", () => {
    const writes: Array<readonly [string, string]> = [];
    const storage = {
      getItem() {
        return JSON.stringify(initialPreferences);
      },
      setItem(key: string, value: string) {
        writes.push([key, value]);
        throw new DOMException("blocked", "SecurityError");
      },
      removeItem() {},
    };
    const store = createPreferencesStore(storage);
    const nextPreferences = { theme: "dark", density: "compact" } as const;

    expect(() => store.value.set(nextPreferences)).not.toThrow();
    expect(store.value.get()).toEqual(nextPreferences);
    expect(store.persisted.get()).toBe(false);
    assert.equal(writes.length, 1);
  });

  it("hydrates persisted preferences from asynchronous storage", async () => {
    const storedPreferences = { theme: "dark", density: "compact" } as const;
    const storage = {
      getItem: async () => JSON.stringify(storedPreferences),
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    const store = createPreferencesStore(storage);

    await persist.ready(store.value);

    expect(store.value.get()).toEqual(storedPreferences);
    expect(store.persisted.get()).toBe(true);
  });

  it.each(["null", '{"theme":"sepia","density":"compact"}', "[]", "{"])(
    "ignores malformed stored preferences: %s",
    (storedValue) => {
      const storage = {
        getItem() {
          return storedValue;
        },
        setItem() {},
        removeItem() {},
      };
      const store = createPreferencesStore(storage);

      expect(store.value.get()).toEqual(initialPreferences);
      expect(store.persisted.get()).toBe(true);
    },
  );

  it("falls back to session state when persistent reads fail", () => {
    const storage = {
      getItem() {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem() {},
      removeItem() {},
    };
    const store = createPreferencesStore(storage);

    expect(store.value.get()).toEqual(initialPreferences);
    expect(store.persisted.get()).toBe(false);
  });
});
