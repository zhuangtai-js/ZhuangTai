import type { Computed, ReadableAtom, StopWatch, Watcher } from "./types.js";
import { collectDependencies, trackDependency } from "./tracking.js";

type Dependency = ReadableAtom<unknown>;

export function computed<Value>(derive: () => Value): Computed<Value> {
  const watchers = new Set<Watcher<Value>>();
  const dependencyStops = new Map<Dependency, StopWatch>();
  let isComputing = false;
  let currentValue: Value;

  function readTracked(): {
    readonly value: Value;
    readonly dependencies: ReadonlySet<Dependency>;
  } {
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

  function notifyIfChanged(): void {
    const prevValue = currentValue;
    const result = readTracked();

    reconcileDependencies(result.dependencies);

    if (Object.is(result.value, prevValue)) {
      return;
    }

    currentValue = result.value;
    const errors: unknown[] = [];

    for (const watcher of Array.from(watchers)) {
      try {
        watcher(currentValue, prevValue);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, "[@zhuangtai-js/core] One or more computed watchers threw.");
    }
  }

  function get(): Value {
    trackDependency(self);
    const result = readTracked();

    if (watchers.size > 0) {
      reconcileDependencies(result.dependencies);
    }

    currentValue = result.value;
    return currentValue;
  }

  function watch(watcher: Watcher<Value>): StopWatch {
    const isFirstWatcher = watchers.size === 0;

    if (isFirstWatcher) {
      const result = readTracked();
      reconcileDependencies(result.dependencies);
      currentValue = result.value;
    }

    watchers.add(watcher);

    try {
      watcher(currentValue, undefined);
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

  currentValue = readTracked().value;

  return self;
}
