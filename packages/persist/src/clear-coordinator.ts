import type { PersistOperationQueue } from "./operation-queue.js";
import { waitForHydrationAndWrites } from "./operation-waits.js";
import type { PersistHydrationTask } from "./stale-repair.js";
import type { MaybePromise } from "./types.js";

type StorageOperation = () => MaybePromise<void>;

type ClearWork = {
  readonly removalBarrier: Promise<void>;
  readonly writes: Set<Promise<void>>;
};

type ActiveClear = ClearWork & {
  readonly completionBarrier: Promise<void>;
};

function settle(task: Promise<void>): Promise<void> {
  return task.then(
    () => undefined,
    () => undefined,
  );
}

export class PersistClearCoordinator {
  private active: ActiveClear | undefined;

  clear(
    pendingControls: ReadonlySet<Promise<void>>,
    latestHydration: () => PersistHydrationTask,
    queue: PersistOperationQueue,
    remove: StorageOperation,
  ): Promise<void> {
    const removal = this.removeAfterPriorOperations(
      pendingControls,
      latestHydration,
      queue,
      remove,
    );
    const work = { removalBarrier: settle(removal), writes: new Set<Promise<void>>() };
    const task = this.completeClear(removal, work);
    const active = { ...work, completionBarrier: settle(task) };
    this.active = active;
    void active.completionBarrier.then(() => {
      if (this.active === active) this.active = undefined;
    });
    return task;
  }

  write(queue: PersistOperationQueue, operation: StorageOperation): void {
    const active = this.active;
    if (active === undefined) {
      queue.runLocalWrite(operation);
      return;
    }

    const task = active.removalBarrier.then(async () => {
      queue.runBackgroundWrite(() => operation());
      await queue.wait();
    });
    active.writes.add(task);
    void settle(task).then(() => active.writes.delete(task));
  }

  afterClear(operation: () => Promise<void>): Promise<void> {
    const active = this.active;
    return active === undefined ? operation() : active.completionBarrier.then(operation);
  }

  private async removeAfterPriorOperations(
    pendingControls: ReadonlySet<Promise<void>>,
    latestHydration: () => PersistHydrationTask,
    queue: PersistOperationQueue,
    remove: StorageOperation,
  ): Promise<void> {
    await Promise.allSettled(Array.from(pendingControls));
    await waitForHydrationAndWrites(latestHydration, () => queue.wait());
    await queue.enqueueObserved(remove, "clear");
  }

  private async completeClear(removal: Promise<void>, work: ClearWork): Promise<void> {
    await work.removalBarrier;
    while (work.writes.size > 0) {
      await Promise.allSettled(Array.from(work.writes));
    }
    await removal;
  }
}
