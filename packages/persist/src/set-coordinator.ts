import type { NextValue } from "@zhuangtai-js/core";

type QueuedSet<Value> = {
  readonly nextValue: NextValue<Value>;
};

type Commit<Value> = (value: Value) => void;

function isUpdater<Value>(nextValue: NextValue<Value>): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

export class PersistSetCoordinator<Value> {
  private active = false;
  private readonly queued: QueuedSet<Value>[] = [];

  run(nextValue: NextValue<Value>, getCurrent: () => Value, commit: Commit<Value>): void {
    if (this.active) {
      this.queued.push({ nextValue });
      return;
    }

    this.active = true;
    this.queued.push({ nextValue });
    const failures: unknown[] = [];

    try {
      while (this.queued.length > 0) {
        const queued = this.queued.shift();
        if (queued === undefined) {
          continue;
        }

        try {
          const prevValue = getCurrent();
          const value = isUpdater(queued.nextValue)
            ? queued.nextValue(prevValue)
            : queued.nextValue;

          if (!Object.is(value, prevValue)) {
            commit(value);
          }
        } catch (cause) {
          failures.push(cause);
        }
      }
    } finally {
      this.queued.length = 0;
      this.active = false;
    }

    if (failures.length === 1) {
      throw failures[0];
    }
    if (failures.length > 1) {
      throw new AggregateError(
        failures,
        "[@zhuangtai-js/persist] Multiple synchronous set operations failed.",
      );
    }
  }
}
