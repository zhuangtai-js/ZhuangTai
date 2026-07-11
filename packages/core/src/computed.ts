import {
  enqueueNotification,
  getCurrentEpoch,
  registerReadableInternals,
  subscribeToChanges,
  throwErrors,
} from "./internals.js";
import type { Computed, ReadableAtom, StopWatch, Watcher } from "./types.js";
import { collectDependencies, trackDependency, type DependencyCollection } from "./tracking.js";

type Dependency = ReadableAtom<unknown>;
type LifecycleJob = () => void;

const lifecycleQueue: LifecycleJob[] = [];
let isFlushingLifecycle = false;
let computedReadDepth = 0;

function enqueueLifecycle(job: LifecycleJob): void {
  lifecycleQueue.push(job);

  if (isFlushingLifecycle) {
    return;
  }

  isFlushingLifecycle = true;

  try {
    for (;;) {
      const nextJob = lifecycleQueue.shift();

      if (!nextJob) {
        break;
      }

      nextJob();
    }
  } catch (error) {
    lifecycleQueue.length = 0;
    throw error;
  } finally {
    isFlushingLifecycle = false;
  }
}

export function computed<Value>(derive: () => Value): Computed<Value> {
  const watchers = new Set<Watcher<Value>>();
  const changeListeners = new Set<() => void>();
  const dependencyStops = new Map<Dependency, StopWatch>();
  let isComputing = false;
  let isActive = false;
  let cachedEpoch = -1;
  let cachedResult: DependencyCollection<Value> | undefined;
  let notifiedValue: Value;

  function hasObservers(): boolean {
    return watchers.size > 0 || changeListeners.size > 0;
  }

  function readTracked(): DependencyCollection<Value> {
    if (isComputing) {
      throw new Error("[@zhuangtai-js/core] Cannot read a computed while it is deriving itself.");
    }

    isComputing = true;
    computedReadDepth += 1;

    try {
      return collectDependencies(derive);
    } finally {
      computedReadDepth -= 1;
      isComputing = false;
    }
  }

  function reconcileDependencies(nextDependencies: ReadonlySet<Dependency>): void {
    if (nextDependencies.has(self)) {
      throw new Error("[@zhuangtai-js/core] A computed cannot depend on itself.");
    }

    const addedStops = new Map<Dependency, StopWatch>();

    try {
      for (const dependency of nextDependencies) {
        if (!dependencyStops.has(dependency)) {
          addedStops.set(dependency, subscribeToChanges(dependency, enqueueSelfNotification));
        }
      }
    } catch (error) {
      for (const stopWatch of addedStops.values()) {
        stopWatch();
      }

      throw error;
    }

    for (const [dependency, stopWatch] of dependencyStops) {
      if (!nextDependencies.has(dependency)) {
        stopWatch();
        dependencyStops.delete(dependency);
      }
    }

    for (const [dependency, stopWatch] of addedStops) {
      dependencyStops.set(dependency, stopWatch);
    }
  }

  function stopWatchingDependencies(): void {
    for (const stopWatch of dependencyStops.values()) {
      stopWatch();
    }

    dependencyStops.clear();
  }

  function activate(): void {
    if (isActive || !hasObservers()) {
      return;
    }

    isActive = true;

    try {
      const result = cachedResult;

      if (result) {
        reconcileDependencies(result.dependencies);
      }
    } catch (error) {
      isActive = false;
      stopWatchingDependencies();
      throw error;
    }
  }

  function deactivate(): void {
    if (!isActive || hasObservers()) {
      return;
    }

    isActive = false;
    stopWatchingDependencies();
  }

  function updateActiveState(wasObserved: boolean): void {
    const isObserved = hasObservers();

    if (!wasObserved && isObserved) {
      enqueueLifecycle(activate);
    } else if (wasObserved && !isObserved) {
      enqueueLifecycle(deactivate);
    }
  }

  function readCurrent(force: boolean): Value {
    const epoch = getCurrentEpoch();
    let result = cachedResult;

    if (force || !result || cachedEpoch !== epoch) {
      result = readTracked();
      cachedResult = result;
      cachedEpoch = epoch;

      if (isActive) {
        reconcileDependencies(result.dependencies);
      }
    }

    if (result.dependencies.has(self)) {
      if (result.status === "failure") {
        throw result.error;
      }

      throw new Error("[@zhuangtai-js/core] A computed cannot depend on itself.");
    }

    if (result.status === "failure") {
      throw result.error;
    }

    return result.value;
  }

  function notifyIfChanged(): void {
    const errors: unknown[] = [];

    try {
      const value = readCurrent(false);
      const prevValue = notifiedValue;

      if (Object.is(value, prevValue)) {
        return;
      }

      notifiedValue = value;

      for (const watcher of Array.from(watchers)) {
        try {
          watcher(value, prevValue);
        } catch (error) {
          errors.push(error);
        }
      }

      for (const listener of Array.from(changeListeners)) {
        try {
          listener();
        } catch (error) {
          errors.push(error);
        }
      }
    } catch (error) {
      errors.push(error);
    }

    throwErrors(errors, "[@zhuangtai-js/core] One or more computed watchers threw.");
  }

  function enqueueSelfNotification(): void {
    enqueueNotification(notifyIfChanged);
  }

  function get(): Value {
    trackDependency(self);

    if (isComputing) {
      throw new Error("[@zhuangtai-js/core] Cannot read a computed while it is deriving itself.");
    }

    const isTopLevelRead = computedReadDepth === 0;

    return readCurrent(isTopLevelRead);
  }

  function watch(watcher: Watcher<Value>): StopWatch {
    const value = readCurrent(true);
    const wasObserved = hasObservers();
    const isFirstWatcher = watchers.size === 0;

    if (isFirstWatcher) {
      notifiedValue = value;
    }

    watchers.add(watcher);

    try {
      updateActiveState(wasObserved);
      watcher(value, undefined);
    } catch (error) {
      const wasObservedBeforeRemoval = hasObservers();
      watchers.delete(watcher);
      updateActiveState(wasObservedBeforeRemoval);
      throw error;
    }

    return () => {
      const wasObservedBeforeRemoval = hasObservers();
      watchers.delete(watcher);
      updateActiveState(wasObservedBeforeRemoval);
    };
  }

  const self: Computed<Value> = { get, watch };

  registerReadableInternals(self, {
    subscribe(listener) {
      const wasObserved = hasObservers();
      changeListeners.add(listener);

      try {
        updateActiveState(wasObserved);
      } catch (error) {
        const wasObservedBeforeRemoval = hasObservers();
        changeListeners.delete(listener);
        updateActiveState(wasObservedBeforeRemoval);
        throw error;
      }

      return () => {
        const wasObservedBeforeRemoval = hasObservers();
        changeListeners.delete(listener);
        updateActiveState(wasObservedBeforeRemoval);
      };
    },
  });

  notifiedValue = readCurrent(true);

  return self;
}
