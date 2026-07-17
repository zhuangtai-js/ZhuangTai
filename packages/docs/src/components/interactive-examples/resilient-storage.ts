import type { MaybePromise, PersistStorage } from "@zhuangtai-js/persist";

export function isPromiseLike<Value>(value: MaybePromise<Value>): value is PromiseLike<Value> {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }

  return typeof Reflect.get(value, "then") === "function";
}

export function createResilientStorage(
  storage: PersistStorage | undefined,
  onUnavailable: () => void,
): PersistStorage {
  const memory = new Map<string, string>();
  let persistentStorage = storage;

  function readMemory(key: string): string | null {
    return memory.get(key) ?? null;
  }

  function disablePersistence(): void {
    if (persistentStorage === undefined) return;
    persistentStorage = undefined;
    onUnavailable();
  }

  function cacheValue(key: string, value: unknown): string | null {
    if (value !== null && typeof value !== "string") {
      disablePersistence();
      return readMemory(key);
    }

    if (value === null) memory.delete(key);
    else memory.set(key, value);
    return value;
  }

  function handleAsyncRead(key: string, value: PromiseLike<string | null>): Promise<string | null> {
    return Promise.resolve(value).then(
      (resolvedValue) => cacheValue(key, resolvedValue),
      () => {
        disablePersistence();
        return readMemory(key);
      },
    );
  }

  function handleAsyncWrite(value: PromiseLike<void>): Promise<void> {
    return Promise.resolve(value).then(
      () => undefined,
      () => {
        disablePersistence();
      },
    );
  }

  return {
    getItem(key) {
      if (persistentStorage === undefined) return readMemory(key);

      try {
        const value = persistentStorage.getItem(key);
        if (isPromiseLike(value)) return handleAsyncRead(key, value);
        return cacheValue(key, value);
      } catch {
        disablePersistence();
        return readMemory(key);
      }
    },
    setItem(key, value) {
      memory.set(key, value);
      if (persistentStorage === undefined) return undefined;

      try {
        const result = persistentStorage.setItem(key, value);
        if (isPromiseLike(result)) return handleAsyncWrite(result);
      } catch {
        disablePersistence();
      }
      return undefined;
    },
    removeItem(key) {
      memory.delete(key);
      if (persistentStorage === undefined) return undefined;

      try {
        const result = persistentStorage.removeItem(key);
        if (isPromiseLike(result)) return handleAsyncWrite(result);
      } catch {
        disablePersistence();
      }
      return undefined;
    },
  };
}
