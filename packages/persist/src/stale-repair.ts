import type { MaybePromise } from "./types.js";

export type PersistHydrationTask = {
  readonly promise: Promise<void>;
  readonly readSequence: () => number | undefined;
  readonly applied: () => boolean;
};

type MutableHydrationTask = PersistHydrationTask & {
  readonly generation: number;
  readonly markApplied: () => void;
};

const EMPTY_HYDRATION: MutableHydrationTask = {
  generation: 0,
  promise: Promise.resolve(),
  readSequence: () => -1,
  applied: () => false,
  markApplied: () => undefined,
};

export class PersistHydrationTracker {
  private appliedBeforeTrackGeneration: number | undefined;
  private latestTask = EMPTY_HYDRATION;
  private latestSuccessfulTask = EMPTY_HYDRATION;
  private latestSuccessfulGeneration = 0;

  latest(): PersistHydrationTask {
    return this.latestTask;
  }

  successful(): PersistHydrationTask {
    return this.latestSuccessfulTask;
  }

  markApplied(generation: number): void {
    if (this.latestTask.generation === generation) {
      this.latestTask.markApplied();
      return;
    }
    this.appliedBeforeTrackGeneration = generation;
  }

  track(
    generation: number,
    promise: Promise<void>,
    readSequence: () => number | undefined,
    isLatest: boolean,
  ): void {
    let applied = this.appliedBeforeTrackGeneration === generation;
    if (applied) this.appliedBeforeTrackGeneration = undefined;
    const hydration: MutableHydrationTask = {
      generation,
      promise,
      readSequence,
      applied: () => applied,
      markApplied: () => {
        applied = true;
      },
    };
    void promise.then(
      () => {
        if (!hydration.applied() || generation <= this.latestSuccessfulGeneration) return;
        this.latestSuccessfulGeneration = generation;
        this.latestSuccessfulTask = hydration;
      },
      () => undefined,
    );
    if (isLatest) this.latestTask = hydration;
  }
}

type StaleRepairParams = {
  readonly hydration: PersistHydrationTask;
  readonly latestHydration: () => PersistHydrationTask;
  readonly latestSuccessfulHydration: () => PersistHydrationTask;
  readonly encodeCurrent: () => string;
  readonly write: (encodedValue: string) => MaybePromise<void>;
  readonly runBackgroundWrite: (operation: (sequence: number) => MaybePromise<void>) => number;
};

export function queueStaleRepair(params: StaleRepairParams): number {
  return params.runBackgroundWrite((sequence) =>
    repairUntilStable(params, sequence, params.hydration, undefined),
  );
}

function queueRepairAfter(
  params: StaleRepairParams,
  repairSequence: number,
  hydration: PersistHydrationTask,
  lastEncoded: string,
): void {
  params.runBackgroundWrite(() =>
    repairUntilStable(params, repairSequence, hydration, lastEncoded),
  );
}

async function repairUntilStable(
  params: StaleRepairParams,
  repairSequence: number,
  observed: PersistHydrationTask,
  lastEncoded: string | undefined,
): Promise<void> {
  try {
    await observed.promise;
  } catch {
    const successful = params.latestSuccessfulHydration();
    if (successful !== observed) {
      await repairUntilStable(params, repairSequence, successful, lastEncoded);
    }
    return;
  }

  if (!observed.applied()) {
    const successful = params.latestSuccessfulHydration();
    if (successful !== observed) {
      await repairUntilStable(params, repairSequence, successful, lastEncoded);
    }
    return;
  }

  const latest = params.latestHydration();
  if (latest !== observed) {
    const readSequence = latest.readSequence();
    if (readSequence === undefined) {
      if (lastEncoded === undefined) await writeCurrent(params);
      return;
    }
    if (readSequence < repairSequence) return;

    if (lastEncoded === undefined) {
      lastEncoded = await writeCurrent(params);
    }
    queueRepairAfter(params, repairSequence, latest, lastEncoded);
    return;
  }

  if (lastEncoded === undefined) {
    lastEncoded = await writeCurrent(params);
  } else {
    const encodedValue = params.encodeCurrent();
    if (encodedValue !== lastEncoded) {
      await params.write(encodedValue);
      lastEncoded = encodedValue;
    }
  }

  const settled = params.latestHydration();
  const settledSequence = settled.readSequence();
  if (settled === observed || settledSequence === undefined || settledSequence < repairSequence) {
    return;
  }
  queueRepairAfter(params, repairSequence, settled, lastEncoded);
}

async function writeCurrent(params: StaleRepairParams): Promise<string> {
  const encodedValue = params.encodeCurrent();
  await params.write(encodedValue);
  return encodedValue;
}
