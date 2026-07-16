import {
  createNonErrorCause,
  PersistOnErrorCallbackError,
  PersistOperationError,
  type PersistOperation,
} from "./errors.js";
import { isPromiseLike } from "./storage.js";
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
        const result = this.onError(failure);
        if (isPromiseLike(result)) {
          void Promise.resolve(result).catch((callbackCause: unknown) => {
            this.retainCallbackFailure(callbackCause);
          });
        }
      } catch (callbackCause) {
        this.retainCallbackFailure(callbackCause);
      }
    }

    return failure;
  }

  consumeFirst(): Error | undefined {
    const firstFailure = this.retainedFailures[0];
    this.retainedFailures.length = 0;
    return firstFailure;
  }

  private retainCallbackFailure(cause: unknown): void {
    const failureCause = cause instanceof Error ? cause : createNonErrorCause(cause);
    this.retainedFailures.push(new PersistOnErrorCallbackError(this.key, failureCause));
  }
}
