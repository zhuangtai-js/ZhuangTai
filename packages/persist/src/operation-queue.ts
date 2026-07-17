import { createNonErrorCause, type PersistOperation } from "./errors.js";
import { isPromiseLike } from "./storage.js";
import type { MaybePromise } from "./types.js";

type StorageOperation = () => MaybePromise<void>;
type BackgroundOperation = (sequence: number) => MaybePromise<void>;
type FailureHandler = (operation: PersistOperation, cause: unknown) => Error;

export type PersistReadBarrier = {
  readonly sequence: number;
  readonly promise: Promise<void>;
};

export class PersistOperationQueue {
  private tail: Promise<void> = Promise.resolve();
  private busy = false;
  private sequence = 0;

  constructor(private readonly handleFailure: FailureHandler) {}

  runLocalWrite(operation: StorageOperation): void {
    if (this.busy) {
      this.enqueueHandledWrite(operation);
      return;
    }

    const result = operation();

    if (!isPromiseLike(result)) {
      return;
    }

    const task = Promise.resolve(result).then(
      () => undefined,
      (cause: unknown) => {
        this.handleFailure("write", cause);
      },
    );
    this.track(task, this.nextSequence());
  }

  runBackgroundWrite(operation: BackgroundOperation): void {
    const sequence = this.nextSequence();
    const task = this.busy
      ? this.tail.then(() => this.invokeHandledWrite(() => operation(sequence)))
      : Promise.resolve().then(() => this.invokeHandledWrite(() => operation(sequence)));
    this.track(task, sequence);
  }

  enqueueObserved(operation: StorageOperation, operationName: PersistOperation): Promise<void> {
    const sequence = this.nextSequence();
    const task = this.busy
      ? this.tail.then(() => this.invokeObserved(operation, operationName))
      : Promise.resolve().then(() => this.invokeObserved(operation, operationName));
    this.track(task, sequence);
    return task;
  }

  readBarrier(): PersistReadBarrier {
    return { sequence: this.sequence, promise: this.tail };
  }

  async wait(): Promise<void> {
    while (true) {
      const observed = this.tail;
      await observed;

      if (observed === this.tail) {
        return;
      }
    }
  }

  private enqueueHandledWrite(operation: StorageOperation): void {
    const task = this.tail.then(() => this.invokeHandledWrite(operation));
    this.track(task, this.nextSequence());
  }

  private invokeHandledWrite(operation: StorageOperation): Promise<void> {
    try {
      const result = operation();

      if (!isPromiseLike(result)) {
        return Promise.resolve();
      }

      return Promise.resolve(result).then(
        () => undefined,
        (cause: unknown) => {
          this.handleFailure("write", cause);
        },
      );
    } catch (cause) {
      const failureCause = cause instanceof Error ? cause : createNonErrorCause(cause);
      this.handleFailure("write", failureCause);
      return Promise.resolve();
    }
  }

  private async invokeObserved(
    operation: StorageOperation,
    operationName: PersistOperation,
  ): Promise<void> {
    try {
      const result = operation();

      if (isPromiseLike(result)) {
        await Promise.resolve(result);
      }
    } catch (cause) {
      const failureCause = cause instanceof Error ? cause : createNonErrorCause(cause);
      throw this.handleFailure(operationName, failureCause);
    }
  }

  private track(task: Promise<void>, _sequence: number): void {
    const normalized = task.then(
      () => undefined,
      () => undefined,
    );
    this.tail = normalized;
    this.busy = true;

    void normalized.then(() => {
      if (this.tail === normalized) {
        this.busy = false;
      }
    });
  }

  private nextSequence(): number {
    this.sequence += 1;
    return this.sequence;
  }
}
