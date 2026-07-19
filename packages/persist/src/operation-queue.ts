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

type QueuedRead<Value> = {
  readonly result: Promise<Value>;
  readonly sequence: () => number | undefined;
};

type RegistrationFence = {
  readonly promise: Promise<void>;
  readonly revision: number;
};

export class PersistOperationQueue {
  private tail: Promise<void> = Promise.resolve();
  private busy = false;
  private sequence = 0;
  private readonly registrationFences = new Set<RegistrationFence>();

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

  runBackgroundWrite(operation: BackgroundOperation): number {
    const sequence = this.nextSequence();
    const task = this.busy
      ? this.tail.then(() => this.invokeHandledWrite(() => operation(sequence)))
      : Promise.resolve().then(() => this.invokeHandledWrite(() => operation(sequence)));
    this.track(task, sequence);
    return sequence;
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

  trackRegistration(task: Promise<void>, revision: number): void {
    const promise = task.then(
      () => undefined,
      () => undefined,
    );
    const fence = { promise, revision };
    this.registrationFences.add(fence);
    void promise.then(() => this.registrationFences.delete(fence));
  }

  runRead<Value>(
    operation: () => MaybePromise<Value>,
    revision: number,
    waitForCurrentRevision: boolean,
  ): QueuedRead<Value> {
    const registration = this.registrationBarrier(revision, waitForCurrentRevision);
    if (registration === undefined) {
      const barrier = this.readBarrier();
      return { result: barrier.promise.then(operation), sequence: () => barrier.sequence };
    }

    let sequence: number | undefined;
    const result = registration.then(() => {
      const barrier = this.readBarrier();
      sequence = barrier.sequence;
      return barrier.promise.then(operation);
    });
    return { result, sequence: () => sequence };
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

  private registrationBarrier(
    revision: number,
    waitForCurrentRevision: boolean,
  ): Promise<void> | undefined {
    const promises: Promise<void>[] = [];
    for (const fence of this.registrationFences) {
      if (fence.revision < revision || (waitForCurrentRevision && fence.revision === revision)) {
        promises.push(fence.promise);
      }
    }
    if (promises.length === 0) return undefined;
    return Promise.allSettled(promises).then(() => undefined);
  }

  private nextSequence(): number {
    this.sequence += 1;
    return this.sequence;
  }
}
