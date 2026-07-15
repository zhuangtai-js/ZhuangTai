import { createAtom } from "@zhuangtai-js/core";
import {
  definePersistMigration,
  persist,
  type PersistCodec,
  type PersistStorage,
} from "@zhuangtai-js/persist";
import { describe, expect, it } from "vitest";
import {
  envelope,
  expectErrorContext,
  expectNoUnhandled,
  NUMBER_MIGRATION,
  rejectionOf,
} from "./async-migration-fixtures.js";

describe("persist async migration error matrix", () => {
  it.each([
    ["future version", envelope(3, "1"), 2, { 0: NUMBER_MIGRATION, 1: NUMBER_MIGRATION }],
    ["missing migration", "1", 2, { 0: NUMBER_MIGRATION }],
    [
      "malformed envelope",
      JSON.stringify({ __zhuangtai_persist__: true, version: 1, payload: "1", extra: true }),
      2,
      { 0: NUMBER_MIGRATION, 1: NUMBER_MIGRATION },
    ],
  ])("rejects an async %s with versioned context", async (_name, rawValue, version, migrations) => {
    await expectNoUnhandled(async () => {
      const errors: unknown[] = [];
      const storage: PersistStorage = {
        getItem: () => Promise.resolve(rawValue),
        setItem: () => Promise.resolve(),
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: {
          key: "count",
          storage,
          version,
          migrations,
          onError: (error) => errors.push(error),
        },
      });

      const error = await rejectionOf(persist.ready(state));

      expectErrorContext(error, "count", version);
      expect(errors).toEqual([error]);
      expect(state.get()).toBe(0);
      expect(await rejectionOf(persist.flush(state))).toBe(error);
    });
  });

  it("rejects async decode failures with codec cause and version context", async () => {
    await expectNoUnhandled(async () => {
      const cause = new Error("decode failed");
      const codec: PersistCodec = {
        encode: (value) => JSON.stringify(value),
        decode: () => {
          throw cause;
        },
      };
      const storage: PersistStorage = {
        getItem: () => Promise.resolve("1"),
        setItem: () => Promise.resolve(),
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: {
          key: "count",
          storage,
          codec,
          version: 1,
          migrations: { 0: NUMBER_MIGRATION },
        },
      });

      const error = await rejectionOf(persist.ready(state));

      expectErrorContext(error, "count", 0, cause);
      expect(state.get()).toBe(0);
    });
  });

  it("rejects async encode failures with codec cause and version context", async () => {
    await expectNoUnhandled(async () => {
      const cause = new Error("encode failed");
      const codec: PersistCodec = {
        encode: () => {
          throw cause;
        },
        decode: (_rawValue, initialValue) => initialValue,
      };
      const storage: PersistStorage = {
        getItem: () => Promise.resolve("1"),
        setItem: () => Promise.resolve(),
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: {
          key: "count",
          storage,
          codec,
          version: 1,
          migrations: { 0: definePersistMigration<number>(() => 1) },
        },
      });

      const error = await rejectionOf(persist.ready(state));

      expectErrorContext(error, "count", 1, cause);
      expect(state.get()).toBe(0);
    });
  });

  it("rejects async migration callback failures with source and target context", async () => {
    await expectNoUnhandled(async () => {
      const cause = new Error("migration failed");
      const migration = definePersistMigration<number>(() => {
        throw cause;
      });
      const storage: PersistStorage = {
        getItem: () => Promise.resolve("1"),
        setItem: () => Promise.resolve(),
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: { key: "count", storage, version: 1, migrations: { 0: migration } },
      });

      const error = await rejectionOf(persist.ready(state));

      expectErrorContext(error, "count", 1, cause);
      expect(state.get()).toBe(0);
    });
  });

  it("retains async read rejection context for ready, onError, and flush", async () => {
    await expectNoUnhandled(async () => {
      const cause = new Error("read failed");
      const errors: unknown[] = [];
      const storage: PersistStorage = {
        getItem: () => Promise.reject(cause),
        setItem: () => Promise.resolve(),
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: {
          key: "count",
          storage,
          version: 2,
          migrations: { 0: NUMBER_MIGRATION, 1: NUMBER_MIGRATION },
          onError: (error) => errors.push(error),
        },
      });

      const error = await rejectionOf(persist.ready(state));

      expectErrorContext(error, "count", 2, cause);
      expect(errors).toEqual([error]);
      expect(state.get()).toBe(0);
      expect(await rejectionOf(persist.flush(state))).toBe(error);
    });
  });

  it("does not apply memory when async migration write-back rejects", async () => {
    await expectNoUnhandled(async () => {
      const cause = new Error("write failed");
      const errors: unknown[] = [];
      const storage: PersistStorage = {
        getItem: () => Promise.resolve("1"),
        setItem: () => Promise.reject(cause),
        removeItem: () => undefined,
      };
      const state = createAtom().use(persist)(0, {
        persist: {
          key: "count",
          storage,
          version: 1,
          migrations: { 0: NUMBER_MIGRATION },
          onError: (error) => errors.push(error),
        },
      });

      const error = await rejectionOf(persist.ready(state));

      expectErrorContext(error, "count", 1, cause);
      expect(errors).toEqual([error]);
      expect(state.get()).toBe(0);
      expect(await rejectionOf(persist.flush(state))).toBe(error);
    });
  });
});
