import { createAtom } from "@zhuangtai-js/core";
import {
  definePersistMigration,
  persist,
  type PersistCodec,
  type PersistStorage,
} from "@zhuangtai-js/persist";
import { describe, expect, it, vi } from "vitest";

type LegacyValue = { readonly count: number };
type CurrentValue = { readonly count: number; readonly label: string };

describe("persist version migration", () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects version %s because it is not a positive safe integer",
    (version) => {
      const storage = createStorage();
      const createState = createAtom().use(persist);

      expect(() =>
        createState(0, {
          persist: { key: "count", storage, version },
        }),
      ).toThrow(/positive safe integer/);
    },
  );

  it("writes an exact marked JSON envelope when versioning is enabled", () => {
    const storage = createStorage();
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage, version: 1 } });

    state.set(2);

    expect(storage.getItem("count")).toBe(
      '{"__zhuangtai_persist__":true,"version":1,"payload":"2"}',
    );
  });

  it("preserves custom codec method this binding without versioning", () => {
    const codec = createThisAwareCodec();
    const storage = createStorage([["box", "box:2"]]);
    const createState = createAtom().use(persist);
    const initialValue = { value: 0 };
    const state = createState(initialValue, { persist: { key: "box", storage, codec } });

    expect(state.get()).toBe(initialValue);
    expect(state.get()).toEqual({ value: 2 });

    state.set({ value: 3 });

    expect(storage.getItem("box")).toBe("box:3");
  });

  it("preserves custom codec method this binding with versioning", () => {
    const codec = createThisAwareCodec();
    const storage = createStorage([
      ["box", '{"__zhuangtai_persist__":true,"version":1,"payload":"box:2"}'],
    ]);
    const createState = createAtom().use(persist);
    const initialValue = { value: 0 };
    const state = createState(initialValue, {
      persist: { key: "box", storage, codec, version: 1 },
    });

    expect(state.get()).toBe(initialValue);
    expect(state.get()).toEqual({ value: 2 });

    state.set({ value: 3 });

    expect(storage.getItem("box")).toBe(
      '{"__zhuangtai_persist__":true,"version":1,"payload":"box:3"}',
    );
  });

  it("keeps unversioned raw bytes and behavior unchanged", () => {
    const storage = createStorage([["count", "2"]]);
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage } });

    state.set(3);

    expect(state.get()).toBe(3);
    expect(storage.getItem("count")).toBe("3");
  });

  it("treats legacy raw storage as version zero and migrates each version synchronously", () => {
    const storage = createStorage([["settings", '{"count":1}']]);
    const calls: string[] = [];
    const migrations = {
      0: definePersistMigration<LegacyValue>((value) => {
        if (!isLegacyValue(value)) {
          throw new TypeError("Expected a legacy settings value.");
        }

        calls.push("migration:0");
        return { count: value.count, label: "one" };
      }),
      1: definePersistMigration<CurrentValue>((value) => {
        if (!isCurrentValue(value)) {
          throw new TypeError("Expected a current settings value.");
        }

        calls.push("migration:1");
        return { ...value, label: `${value.label}!` };
      }),
    };
    const createState = createAtom().use(persist);

    const state = createState<CurrentValue>(
      { count: 0, label: "fallback" },
      { persist: { key: "settings", storage, version: 2, migrations } },
    );

    expect(calls).toEqual(["migration:0", "migration:1"]);
    expect(state.get()).toEqual({ count: 1, label: "one!" });
    expect(storage.getItem("settings")).toBe(
      '{"__zhuangtai_persist__":true,"version":2,"payload":"{\\"count\\":1,\\"label\\":\\"one!\\"}"}',
    );
  });

  it("restores a current marked record without migrating or rewriting it", () => {
    const rawValue = '{"__zhuangtai_persist__":true,"version":2,"payload":"{\\"count\\":2}"}';
    const storage = createStorage([["settings", rawValue]]);
    const setItem = vi.spyOn(storage, "setItem");
    const migration = vi.fn<() => { readonly count: number }>(() => ({ count: 99 }));
    const createState = createAtom().use(persist);

    const state = createState(
      { count: 0 },
      {
        persist: {
          key: "settings",
          storage,
          version: 2,
          migrations: { 1: migration },
        },
      },
    );

    expect(state.get()).toEqual({ count: 2 });
    expect(migration).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(storage.getItem("settings")).toBe(rawValue);
  });

  it("supports custom codecs for migration and versioned write-back", () => {
    type Settings = { readonly count: number; readonly label: string };
    const codec: PersistCodec = {
      encode(value) {
        return `custom:${JSON.stringify(value)}`;
      },
      decode(rawValue) {
        return JSON.parse(rawValue.replace("custom:", ""));
      },
    };
    const storage = createStorage([["settings", 'custom:{"count":1,"label":"old"}']]);
    const createState = createAtom().use(persist);

    const state = createState<Settings>(
      { count: 0, label: "fallback" },
      {
        persist: {
          key: "settings",
          storage,
          codec,
          version: 1,
          migrations: {
            0: definePersistMigration<Settings>((value) => {
              if (!isCurrentValue(value)) {
                throw new TypeError("Expected a current settings value.");
              }

              return { ...value, label: "new" };
            }),
          },
        },
      },
    );

    expect(state.get()).toEqual({ count: 1, label: "new" });
    expect(storage.getItem("settings")).toBe(
      '{"__zhuangtai_persist__":true,"version":1,"payload":"custom:{\\"count\\":1,\\"label\\":\\"new\\"}"}',
    );
  });

  it("rejects a future record version with key and configured version context", () => {
    const storage = createStorage([
      ["count", '{"__zhuangtai_persist__":true,"version":3,"payload":"3"}'],
    ]);
    const createState = createAtom().use(persist);

    expect(() =>
      createState(0, {
        persist: { key: "count", storage, version: 2 },
      }),
    ).toThrow(/key "count".*version 3.*version 2/);
  });

  it("rejects a missing forward migration with source and target versions", () => {
    const storage = createStorage([["count", "1"]]);
    const createState = createAtom().use(persist);

    expect(() =>
      createState(0, {
        persist: { key: "count", storage, version: 2, migrations: {} },
      }),
    ).toThrow(/key "count".*version 0.*version 1.*target version 2/);
  });

  it.each([
    '{"__zhuangtai_persist__":false,"version":1,"payload":"1"}',
    '{"__zhuangtai_persist__":true,"payload":"1"}',
    '{"__zhuangtai_persist__":true,"version":0,"payload":"1"}',
    '{"__zhuangtai_persist__":true,"version":1,"payload":1}',
    '{"__zhuangtai_persist__":true,"version":1,"payload":"1","extra":true}',
  ])("rejects malformed marked record %s", (rawValue) => {
    const storage = createStorage([["count", rawValue]]);
    const createState = createAtom().use(persist);

    expect(() =>
      createState(0, {
        persist: { key: "count", storage, version: 1 },
      }),
    ).toThrow(/malformed marked record.*key "count".*version 1/);
  });

  it("wraps migration failures with key, versions, and the original cause", () => {
    const cause = new Error("migration failed");
    const storage = createStorage([["count", "1"]]);
    const createState = createAtom().use(persist);
    const migration = definePersistMigration<number>(() => {
      throw cause;
    });
    let caught: unknown;

    try {
      createState(0, {
        persist: { key: "count", storage, version: 1, migrations: { 0: migration } },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    const error = getError(caught);
    expect(error.message).toMatch(/key "count".*version 0.*version 1/);
    expect(error.cause).toBe(cause);
  });

  it("does not mutate caller initial data when migration write-back fails", () => {
    const initialValue = { count: 0 };
    const storage = createStorage([["count", "legacy"]]);
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const codec: PersistCodec = {
      encode(value) {
        const encodedValue = JSON.stringify(value);

        if (typeof encodedValue !== "string") {
          throw new TypeError("expected JSON value");
        }

        return encodedValue;
      },
      decode(_rawValue, decodeTarget) {
        if (typeof decodeTarget === "object" && decodeTarget !== null) {
          Reflect.set(decodeTarget, "count", 99);
        }

        return decodeTarget;
      },
    };
    const createState = createAtom().use(persist);

    expect(() =>
      createState(initialValue, {
        persist: {
          key: "count",
          storage,
          codec,
          version: 1,
          migrations: {
            0: definePersistMigration<unknown>(() => ({ count: 1 })),
          },
        },
      }),
    ).toThrow(/key "count".*version 1/);
    expect(initialValue).toEqual({ count: 0 });
  });

  it("keeps legacy storage unchanged when migration write-back fails", () => {
    const rawValue = "1";
    const cause = new Error("quota");
    const storage = createStorage([["count", rawValue]]);
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw cause;
    });
    const createState = createAtom().use(persist);
    let caught: unknown;

    try {
      createState(0, {
        persist: {
          key: "count",
          storage,
          version: 1,
          migrations: {
            0: definePersistMigration<number>((value) => {
              if (typeof value !== "number") {
                throw new TypeError("Expected a number migration value.");
              }

              return value + 1;
            }),
          },
        },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    const error = getError(caught);
    expect(error.message).toMatch(/key "count".*version 1/);
    expect(error.cause).toBe(cause);
    expect(storage.getItem("count")).toBe(rawValue);
  });

  it("keeps versioned in-memory state unchanged when persistence fails", () => {
    const cause = new Error("quota");
    const storage = createStorage();
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw cause;
    });
    const createState = createAtom().use(persist);
    const state = createState(1, { persist: { key: "count", storage, version: 1 } });
    const watcher = vi.fn<(value: number, previousValue: number | undefined) => void>();
    state.watch(watcher);
    watcher.mockClear();

    expect(() => state.set(2)).toThrow(/key "count".*version 1/);
    expect(state.get()).toBe(1);
    expect(watcher).not.toHaveBeenCalled();

    const calls = watcher.mock.calls;
    expect(calls).toHaveLength(0);
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLegacyValue(value: unknown): value is LegacyValue {
  return isRecord(value) && typeof value["count"] === "number";
}

function isCurrentValue(value: unknown): value is CurrentValue {
  return (
    isRecord(value) && typeof value["count"] === "number" && typeof value["label"] === "string"
  );
}

function createThisAwareCodec(): PersistCodec {
  const codec = {
    prefix: "box:",
    encode(value: unknown): string {
      if (typeof value !== "object" || value === null) {
        throw new TypeError("expected box object");
      }

      return `${this.prefix}${String(Reflect.get(value, "value"))}`;
    },
    decode<Value>(rawValue: string, initialValue: Value): Value {
      if (typeof initialValue === "object" && initialValue !== null) {
        Reflect.set(initialValue, "value", Number(rawValue.slice(this.prefix.length)));
      }

      return initialValue;
    },
  };

  return codec;
}

function getError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  throw new TypeError("Expected an Error instance.");
}

type StorageFixture = PersistStorage & {
  readonly values: Map<string, string>;
};

function createStorage(entries: readonly (readonly [string, string])[] = []): StorageFixture {
  const values = new Map(entries);

  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}
