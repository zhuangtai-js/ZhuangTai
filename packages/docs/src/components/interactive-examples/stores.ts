import { atom, computed, createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";
import type { PersistStorage } from "@zhuangtai-js/persist";
import { createResilientStorage, isPromiseLike } from "./resilient-storage";
import type { Locale, Preferences, Task, TaskFilter } from "./types";

export const countState = atom(3);
export const doubledCountState = computed(() => countState.get() * 2);

function createTaskStore(initialTasks: Task[]) {
  const tasks = atom(initialTasks);
  const filter = atom<TaskFilter>("all");
  const visibleTasks = computed(() => {
    const mode = filter.get();
    return tasks
      .get()
      .filter((task) => (mode === "all" ? true : mode === "done" ? task.done : !task.done));
  });
  const completedCount = computed(() => tasks.get().filter((task) => task.done).length);

  return { completedCount, filter, tasks, visibleTasks };
}

type TaskStore = ReturnType<typeof createTaskStore>;

export const taskStores = {
  zh: createTaskStore([
    { id: 1, title: "阅读核心概念", done: true },
    { id: 2, title: "创建第一个 atom", done: false },
    { id: 3, title: "接入 React 组件", done: false },
  ]),
  en: createTaskStore([
    { id: 1, title: "Read the core concepts", done: true },
    { id: 2, title: "Create the first atom", done: false },
    { id: 3, title: "Connect a React component", done: false },
  ]),
} as const satisfies Record<Locale, TaskStore>;

type PreferencesStore = {
  readonly persisted: ReturnType<typeof atom<boolean>>;
  readonly value: ReturnType<typeof atom<Preferences>>;
};

function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== "object" || value === null) return false;
  if (!("theme" in value) || !("density" in value)) return false;

  const theme = value.theme;
  const density = value.density;
  return (
    (theme === "light" || theme === "dark") && (density === "comfortable" || density === "compact")
  );
}

function decodePreferences(rawValue: unknown): string | null {
  if (typeof rawValue !== "string") return null;

  try {
    const decoded: unknown = JSON.parse(rawValue);
    return isPreferences(decoded) ? rawValue : null;
  } catch {
    return null;
  }
}

function createPreferencesStorage(storage: PersistStorage): PersistStorage {
  return {
    getItem(key) {
      const rawValue = storage.getItem(key);
      if (isPromiseLike(rawValue)) {
        return Promise.resolve(rawValue).then((resolvedValue) => decodePreferences(resolvedValue));
      }
      return decodePreferences(rawValue);
    },
    setItem: storage.setItem,
    removeItem: storage.removeItem,
  };
}

function resolveBrowserStorage(): PersistStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function createPreferencesStore(
  storage: PersistStorage | undefined = resolveBrowserStorage(),
): PreferencesStore {
  const initialValue: Preferences = { theme: "light", density: "comfortable" };
  const persisted = atom(storage !== undefined);
  const resilientStorage = createResilientStorage(storage, () => persisted.set(false));
  const preferencesStorage = createPreferencesStorage(resilientStorage);

  try {
    return {
      value: createAtom().use(persist)(initialValue, {
        persist: { key: "zhuangtai-docs-preferences", storage: preferencesStorage },
      }),
      persisted,
    };
  } catch (error) {
    if (error instanceof Error) {
      persisted.set(false);
      return { value: atom(initialValue), persisted };
    }
    throw error;
  }
}

export const preferencesStore = createPreferencesStore();
