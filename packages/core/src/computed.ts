import type { Computed, ReadableAtom, StopWatch, Watcher } from "./types.js";
import { collectDependencies, trackDependency, type DependencyCollection } from "./tracking.js";

type Dependency = ReadableAtom<unknown>;

function throwNotificationErrors(errors: readonly unknown[]): void {
  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, "[@zhuangtai-js/core] One or more computed watchers threw.");
  }
}

export function computed<Value>(derive: () => Value): Computed<Value> {
  const watchers = new Set<Watcher<Value>>();
  const dependencyStops = new Map<Dependency, StopWatch>();
  let isComputing = false;
  let isNotifying = false;
  let notificationPending = false;
  let notifiedValue: Value;

  function readTracked(): DependencyCollection<Value> {
    if (isComputing) {
      throw new Error("[@zhuangtai-js/core] Cannot read a computed while it is deriving itself.");
    }

    isComputing = true;

    try {
      return collectDependencies(derive);
    } finally {
      isComputing = false;
    }
  }

  function subscribeToDependency(dependency: Dependency): StopWatch {
    let skipInitialWatch = true;

    return dependency.watch(() => {
      if (skipInitialWatch) {
        skipInitialWatch = false;
        return;
      }

      notifyIfChanged();
    });
  }

  function reconcileDependencies(nextDependencies: ReadonlySet<Dependency>): void {
    if (nextDependencies.has(self)) {
      throw new Error("[@zhuangtai-js/core] A computed cannot depend on itself.");
    }

    const addedStops = new Map<Dependency, StopWatch>();

    try {
      for (const dependency of nextDependencies) {
        if (!dependencyStops.has(dependency)) {
          addedStops.set(dependency, subscribeToDependency(dependency));
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

  function readCurrent(reconcile: boolean): Value {
    const result = readTracked();

    if (result.dependencies.has(self)) {
      if (result.status === "failure") {
        throw result.error;
      }

      throw new Error("[@zhuangtai-js/core] A computed cannot depend on itself.");
    }

    if (reconcile) {
      reconcileDependencies(result.dependencies);
    }

    if (result.status === "failure") {
      throw result.error;
    }

    return result.value;
  }

  function notifyIfChanged(): void {
    notificationPending = true;

    if (isNotifying) {
      return;
    }

    isNotifying = true;
    const errors: unknown[] = [];

    try {
      while (notificationPending) {
        notificationPending = false;

        try {
          const value = readCurrent(true);
          const prevValue = notifiedValue;

          if (Object.is(value, prevValue)) {
            continue;
          }

          notifiedValue = value;

          for (const watcher of Array.from(watchers)) {
            try {
              watcher(value, prevValue);
            } catch (error) {
              errors.push(error);
            }
          }
        } catch (error) {
          errors.push(error);
        }
      }
    } finally {
      isNotifying = false;
    }

    throwNotificationErrors(errors);
  }

  function get(): Value {
    trackDependency(self);
    return readCurrent(watchers.size > 0);
  }

  function watch(watcher: Watcher<Value>): StopWatch {
    const isFirstWatcher = watchers.size === 0;
    const value = readCurrent(true);

    if (isFirstWatcher) {
      notifiedValue = value;
    }

    watchers.add(watcher);

    try {
      watcher(value, undefined);
    } catch (error) {
      watchers.delete(watcher);

      if (isFirstWatcher) {
        stopWatchingDependencies();
      }

      throw error;
    }

    return () => {
      watchers.delete(watcher);

      if (watchers.size === 0) {
        stopWatchingDependencies();
      }
    };
  }

  const self: Computed<Value> = { get, watch };

  notifiedValue = readCurrent(false);

  return self;
}
