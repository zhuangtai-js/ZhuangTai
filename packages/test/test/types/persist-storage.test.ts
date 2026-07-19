import type { MaybePromise, PersistStorage } from "@zhuangtai-js/persist";
import { describe, expectTypeOf, it } from "vitest";

type AsyncLikeStorage = {
  readonly getItem: (key: string) => PromiseLike<string | null>;
  readonly setItem: (key: string, value: string) => PromiseLike<void>;
  readonly removeItem: (key: string) => PromiseLike<void>;
};

type InvalidStorage = {
  readonly getItem: (key: string) => number;
  readonly setItem: (key: string, value: string) => string;
  readonly removeItem: (key: string) => string;
};

describe("persist public storage types", () => {
  it("accepts synchronous and PromiseLike storage results", () => {
    expectTypeOf<AsyncLikeStorage>().toExtend<PersistStorage>();
    expectTypeOf<InvalidStorage>().not.toExtend<PersistStorage>();
    expectTypeOf<MaybePromise<string | null>>().toEqualTypeOf<
      string | null | PromiseLike<string | null>
    >();
    expectTypeOf<MaybePromise<void>>().toEqualTypeOf<void | PromiseLike<void>>();
  });
});
