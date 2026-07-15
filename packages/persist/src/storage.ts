import type { MaybePromise, PersistStorage } from "./types.js";

const PACKAGE_NAME = "@zhuangtai-js/persist";

export function isPromiseLike<Value>(value: MaybePromise<Value>): value is PromiseLike<Value> {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }

  return typeof Reflect.get(value, "then") === "function";
}

export function resolveStorage(storage: PersistStorage | undefined): PersistStorage {
  if (storage !== undefined) {
    return storage;
  }

  let localStorage: PersistStorage | undefined;
  try {
    localStorage = globalThis.localStorage;
  } catch (error) {
    throw new Error(
      `[${PACKAGE_NAME}] Reading globalThis.localStorage threw. Pass an explicit storage option instead.`,
      { cause: error },
    );
  }

  if (localStorage === undefined) {
    throw new Error(
      `[${PACKAGE_NAME}] No persist storage was provided, and globalThis.localStorage is unavailable.`,
    );
  }

  return localStorage;
}
