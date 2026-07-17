import type { MaybePromise } from "./types.js";

export type PersistHydrationTask = {
  readonly promise: Promise<void>;
  readonly readSequence: number;
  readonly applied: () => boolean;
};

type StaleRepairParams = {
  readonly hydration: PersistHydrationTask;
  readonly latestHydration: () => PersistHydrationTask;
  readonly encodeCurrent: () => string;
  readonly write: (encodedValue: string) => MaybePromise<void>;
  readonly runBackgroundWrite: (operation: (sequence: number) => MaybePromise<void>) => void;
};

export function queueStaleRepair(params: StaleRepairParams): void {
  params.runBackgroundWrite((sequence) =>
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
    return;
  }

  if (!observed.applied()) {
    return;
  }

  const latest = params.latestHydration();
  if (latest !== observed) {
    if (latest.readSequence < repairSequence) {
      return;
    }

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
  if (settled === observed || settled.readSequence < repairSequence) {
    return;
  }
  queueRepairAfter(params, repairSequence, settled, lastEncoded);
}

async function writeCurrent(params: StaleRepairParams): Promise<string> {
  const encodedValue = params.encodeCurrent();
  await params.write(encodedValue);
  return encodedValue;
}
