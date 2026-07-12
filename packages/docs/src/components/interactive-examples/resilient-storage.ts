import type { PersistStorage } from "@zhuangtai-js/persist";

export function createResilientStorage(
  storage: PersistStorage | undefined,
  onUnavailable: () => void,
): PersistStorage {
  const memory = new Map<string, string>();
  let persistentStorage = storage;

  function disablePersistence(): void {
    if (persistentStorage === undefined) return;
    persistentStorage = undefined;
    onUnavailable();
  }

  return {
    getItem(key) {
      if (persistentStorage === undefined) return memory.get(key) ?? null;

      try {
        const value = persistentStorage.getItem(key);
        if (value === null) memory.delete(key);
        else memory.set(key, value);
        return value;
      } catch {
        disablePersistence();
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      memory.set(key, value);
      if (persistentStorage === undefined) return;

      try {
        persistentStorage.setItem(key, value);
      } catch {
        disablePersistence();
      }
    },
    removeItem(key) {
      memory.delete(key);
      if (persistentStorage === undefined) return;

      try {
        persistentStorage.removeItem(key);
      } catch {
        disablePersistence();
      }
    },
  };
}
