import { PersistOperationError, type PersistOperation } from "./errors.js";
import { isPromiseLike } from "./storage.js";
import type { PersistOptions } from "./types.js";

export class PersistFailureTracker {
  private retainedFailure: Error | undefined;

  constructor(
    private readonly key: string,
    private readonly onError: PersistOptions["onError"],
  ) {}

  record(operation: PersistOperation, cause: unknown): Error {
    const failure = new PersistOperationError(operation, this.key, cause);
    if (this.retainedFailure === undefined) this.retainedFailure = failure;

    if (this.onError !== undefined) {
      try {
        const result = this.onError(failure);
        if (isPromiseLike(result)) {
          void Promise.resolve(result).catch(() => undefined);
        }
      } catch {
        return failure;
      }
    }

    return failure;
  }

  consumeFirst(): Error | undefined {
    const firstFailure = this.retainedFailure;
    this.retainedFailure = undefined;
    return firstFailure;
  }
}
