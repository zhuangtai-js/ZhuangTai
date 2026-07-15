import {
  createNonErrorCause,
  PersistOnErrorCallbackError,
  PersistOperationError,
  type PersistOperation,
} from "./errors.js";
import type { PersistOptions } from "./types.js";

export class PersistFailureTracker {
  private readonly retainedFailures: Error[] = [];

  constructor(
    private readonly key: string,
    private readonly onError: PersistOptions["onError"],
  ) {}

  record(operation: PersistOperation, cause: unknown): Error {
    const failure = new PersistOperationError(operation, this.key, cause);
    this.retainedFailures.push(failure);

    if (this.onError !== undefined) {
      try {
        this.onError(failure);
      } catch (callbackCause) {
        const failureCause =
          callbackCause instanceof Error ? callbackCause : createNonErrorCause(callbackCause);
        this.retainedFailures.push(new PersistOnErrorCallbackError(this.key, failureCause));
      }
    }

    return failure;
  }

  consumeFirst(): Error | undefined {
    const firstFailure = this.retainedFailures[0];
    this.retainedFailures.length = 0;
    return firstFailure;
  }
}
