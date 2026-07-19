import type { NextValue } from "@zhuangtai-js/core";

export function isUpdater<Value>(
  nextValue: NextValue<Value>,
): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

export function resolveNextValue<Value>(nextValue: NextValue<Value>, prevValue: Value): Value {
  return isUpdater(nextValue) ? nextValue(prevValue) : nextValue;
}

export type PersistSetContext = {
  readonly requiresStorageRepair: boolean;
  readonly writeStorage: (operation: () => void) => void;
};

type CommitOperation = (context: PersistSetContext) => void;

export class PersistSetCoordinator {
  private active = false;
  private readonly queued: CommitOperation[] = [];

  run(operation: CommitOperation): void {
    if (this.active) {
      this.queued.push(operation);
      return;
    }

    this.active = true;
    this.queued.push(operation);
    const failures: unknown[] = [];
    let storageUncertain = false;

    try {
      while (this.queued.length > 0) {
        const queuedOperation = this.queued.shift();
        if (queuedOperation === undefined) {
          continue;
        }

        try {
          queuedOperation({
            requiresStorageRepair: storageUncertain,
            writeStorage: (storageOperation) => {
              try {
                storageOperation();
              } catch (cause) {
                storageUncertain = true;
                throw cause;
              }
              storageUncertain = false;
            },
          });
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
