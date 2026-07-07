import type { AtomValues, Computed, ReadableAtom, StopWatch, Watcher } from "./types.js";

export function computed<Source extends ReadableAtom<unknown>, Value>(
  source: Source,
  derive: (value: Source extends ReadableAtom<infer SourceValue> ? SourceValue : never) => Value,
): Computed<Value>;

export function computed<Sources extends readonly ReadableAtom<unknown>[], Value>(
  sources: Sources,
  derive: (...values: AtomValues<Sources>) => Value,
): Computed<Value>;

export function computed<Value>(
  sourceOrSources: ReadableAtom<unknown> | readonly ReadableAtom<unknown>[],
  derive: (...values: readonly unknown[]) => Value,
): Computed<Value> {
  const sources = Array.isArray(sourceOrSources) ? sourceOrSources : [sourceOrSources];
  const watchers = new Set<Watcher<Value>>();
  let stopSourceWatches: readonly StopWatch[] = [];
  let currentValue = read();

  function read(): Value {
    return derive(...sources.map((source) => source.get()));
  }

  function notifyIfChanged(): void {
    const value = read();

    if (Object.is(value, currentValue)) {
      return;
    }

    const prevValue = currentValue;
    currentValue = value;
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

  function startWatchingSources(): void {
    stopSourceWatches = sources.map((source) => {
      let skipInitialWatch = true;

      return source.watch(() => {
        if (skipInitialWatch) {
          skipInitialWatch = false;
          return;
        }

        notifyIfChanged();
      });
    });
  }

  function stopWatchingSources(): void {
    for (const stopWatch of stopSourceWatches) {
      stopWatch();
    }

    stopSourceWatches = [];
  }

  function get(): Value {
    currentValue = read();
    return currentValue;
  }

  function watch(watcher: Watcher<Value>): StopWatch {
    const isFirstWatcher = watchers.size === 0;

    if (isFirstWatcher) {
      currentValue = read();
      startWatchingSources();
    }

    watchers.add(watcher);

    try {
      watcher(currentValue, undefined);
    } catch (error) {
      watchers.delete(watcher);

      if (isFirstWatcher) {
        stopWatchingSources();
      }

      throw error;
    }

    return () => {
      watchers.delete(watcher);

      if (watchers.size === 0) {
        stopWatchingSources();
      }
    };
  }

  return { get, watch };
}
