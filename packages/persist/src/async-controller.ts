import type { Atom, NextValue } from "@zhuangtai-js/core";
import { createNonErrorCause } from "./errors.js";
import { PersistFailureTracker } from "./failure-tracker.js";
import { PersistOperationQueue } from "./operation-queue.js";
import { waitForAllOperations, waitForHydrationAndWrites } from "./operation-waits.js";
import { PersistHydrationTracker, queueStaleRepair } from "./stale-repair.js";
import { isPromiseLike } from "./storage.js";
import type { MaybePromise, PersistOptions, PersistStorage } from "./types.js";
import type { MigrationPlan, RestorePlan } from "./versioned-plan.js";

type PersistControllerParams<Value> = {
  readonly state: Atom<Value>;
  readonly storage: PersistStorage;
  readonly key: string;
  readonly read: () => MaybePromise<string | null>;
  readonly restore: (rawValue: string) => RestorePlan<Value>;
  readonly encode: (value: Value) => string;
  readonly write: (encodedValue: string) => MaybePromise<void>;
  readonly onError: PersistOptions["onError"];
};

function isUpdater<Value>(nextValue: NextValue<Value>): nextValue is (prevValue: Value) => Value {
  return typeof nextValue === "function";
}

export class AsyncPersistController<Value> {
  readonly atom: Atom<Value>;
  private readonly failures: PersistFailureTracker;
  private readonly queue: PersistOperationQueue;
  private hydrationGeneration = 0;
  private localRevision = 0;
  private latestLocalEncoded: string | undefined;
  private readonly hydrations = new PersistHydrationTracker();
  private readonly pendingControls = new Set<Promise<void>>();

  constructor(private readonly params: PersistControllerParams<Value>) {
    this.failures = new PersistFailureTracker(params.key, params.onError);
    this.queue = new PersistOperationQueue((operation, cause) =>
      this.failures.record(operation, cause),
    );
    this.atom = {
      get: params.state.get,
      set: (nextValue) => this.set(nextValue),
      watch: params.state.watch,
    };
  }

  readonly startInitialHydration = (result: PromiseLike<string | null>): void => {
    const readSequence = this.queue.readBarrier().sequence;
    void this.startHydration(
      result,
      "hydrate",
      this.nextHydrationGeneration(),
      this.localRevision,
      () => readSequence,
    );
  };

  startInitialMigration(plan: MigrationPlan<Value>, result: PromiseLike<void>): void {
    const generation = this.nextHydrationGeneration();
    const revision = this.localRevision;
    const task = Promise.resolve(result).then(
      () => this.finishMigration(plan, generation, revision),
      (cause: unknown) => {
        if (generation === this.hydrationGeneration) {
          throw this.failures.record("hydrate", cause);
        }
      },
    );
    this.queue.trackRegistration(task, revision);
    this.trackHydration(generation, task, () => -1);
  }

  readonly ready = (): Promise<void> => this.hydrations.latest().promise;

  async flush(): Promise<void> {
    await waitForAllOperations(
      () => this.hydrations.latest(),
      this.pendingControls,
      () => this.queue.wait(),
    );
    const firstFailure = this.failures.consumeFirst();

    if (firstFailure !== undefined) {
      throw firstFailure;
    }
  }

  rehydrate(): Promise<void> {
    const generation = this.nextHydrationGeneration();
    const revision = this.localRevision;
    const read = this.queue.runRead(
      this.params.read,
      revision,
      this.hydrations.successful().applied(),
    );
    return this.startHydration(read.result, "rehydrate", generation, revision, read.sequence);
  }

  clear(): Promise<void> {
    const task = this.performClear();
    this.trackPending(task);
    return task;
  }

  private set(nextValue: NextValue<Value>): void {
    const prevValue = this.params.state.get();
    const value = isUpdater(nextValue) ? nextValue(prevValue) : nextValue;

    if (Object.is(value, prevValue)) {
      return;
    }

    const encodedValue = this.params.encode(value);
    this.queue.runLocalWrite(() => this.params.write(encodedValue));
    this.localRevision += 1;
    this.latestLocalEncoded = encodedValue;
    this.params.state.set(value);
  }

  private startHydration(
    result: MaybePromise<string | null>,
    operation: "hydrate" | "rehydrate",
    generation = this.nextHydrationGeneration(),
    revision = this.localRevision,
    readSequence: () => number | undefined = () => -1,
  ): Promise<void> {
    if (!isPromiseLike(result)) {
      return this.completeSynchronousHydration(
        result,
        operation,
        generation,
        revision,
        readSequence,
      );
    }
    const task = Promise.resolve(result)
      .then((rawValue) => {
        if (generation !== this.hydrationGeneration) return;
        return this.applyHydration(rawValue, generation, revision);
      })
      .catch((cause: unknown) => {
        if (generation === this.hydrationGeneration) {
          const failureCause = cause instanceof Error ? cause : createNonErrorCause(cause);
          throw this.failures.record(operation, failureCause);
        }
      });
    this.trackHydration(generation, task, readSequence);
    return task;
  }

  private completeSynchronousHydration(
    rawValue: string | null,
    operation: "hydrate" | "rehydrate",
    generation: number,
    revision: number,
    readSequence: () => number | undefined,
  ): Promise<void> {
    let task: Promise<void>;
    try {
      const hydration = this.applyHydration(rawValue, generation, revision);
      task = isPromiseLike(hydration)
        ? Promise.resolve(hydration).catch((cause: unknown) => {
            if (generation === this.hydrationGeneration) {
              const failureCause = cause instanceof Error ? cause : createNonErrorCause(cause);
              throw this.failures.record(operation, failureCause);
            }
          })
        : Promise.resolve();
    } catch (cause) {
      const failureCause = cause instanceof Error ? cause : createNonErrorCause(cause);
      task = Promise.reject(this.failures.record(operation, failureCause));
    }
    this.trackHydration(generation, task, readSequence);
    return task;
  }

  private applyHydration(
    rawValue: string | null,
    generation: number,
    revision: number,
  ): MaybePromise<void> {
    if (generation !== this.hydrationGeneration) return;
    if (revision !== this.localRevision) {
      this.persistLatestLocalValue();
      return;
    }
    if (rawValue === null) {
      return;
    }
    const plan = this.params.restore(rawValue);
    if (plan.kind === "value") {
      this.commitHydratedValue(plan.value, generation, revision);
      return;
    }
    const writeBack = this.params.write(plan.writeBack);
    if (isPromiseLike(writeBack)) {
      const task = Promise.resolve(writeBack).then(() =>
        this.finishMigration(plan, generation, revision),
      );
      this.queue.trackRegistration(task, revision);
      return task;
    }
    this.finishMigration(plan, generation, revision);
  }

  private commitHydratedValue(value: Value, generation: number, revision: number): void {
    if (generation === this.hydrationGeneration && revision === this.localRevision) {
      this.hydrations.markApplied(generation);
      this.params.state.set(value);
    } else if (generation === this.hydrationGeneration) {
      this.persistLatestLocalValue();
    }
  }

  private finishMigration(plan: MigrationPlan<Value>, gen: number, rev: number): void {
    if (rev !== this.localRevision) {
      this.persistLatestLocalValue();
      return;
    }
    if (gen === this.hydrationGeneration) {
      this.hydrations.markApplied(gen);
      this.params.state.set(plan.finalize());
      return;
    }
    const successful = this.hydrations.successful();
    queueStaleRepair({
      latestHydration: () => this.hydrations.latest(),
      latestSuccessfulHydration: () => this.hydrations.successful(),
      hydration: successful.applied() ? successful : this.hydrations.latest(),
      encodeCurrent: () => this.params.encode(this.params.state.get()),
      write: (encodedValue) => this.params.write(encodedValue),
      runBackgroundWrite: (operation) => this.queue.runBackgroundWrite(operation),
    });
  }

  private persistLatestLocalValue(): void {
    const encodedValue = this.latestLocalEncoded;

    if (encodedValue !== undefined) {
      this.queue.runBackgroundWrite(() => this.params.write(encodedValue));
    }
  }

  private trackHydration(
    generation: number,
    task: Promise<void>,
    readSequence: () => number | undefined,
  ): void {
    this.trackPending(task);
    this.hydrations.track(generation, task, readSequence, generation === this.hydrationGeneration);
  }

  private trackPending(task: Promise<void>): void {
    this.pendingControls.add(task);
    void task.then(
      () => this.pendingControls.delete(task),
      () => this.pendingControls.delete(task),
    );
  }

  private readonly nextHydrationGeneration = (): number => (this.hydrationGeneration += 1);

  private async performClear(): Promise<void> {
    await Promise.allSettled(Array.from(this.pendingControls));
    await waitForHydrationAndWrites(
      () => this.hydrations.latest(),
      () => this.queue.wait(),
    );
    await this.queue.enqueueObserved(
      () => this.params.storage.removeItem(this.params.key),
      "clear",
    );
  }
}
