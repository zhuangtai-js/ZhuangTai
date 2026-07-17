import type { MaybePromise } from "./types.js";

type StaleRepairParams = {
  readonly hydration: Promise<void>;
  readonly latestHydration: () => Promise<void>;
  readonly encodeCurrent: () => string;
  readonly write: (encodedValue: string) => MaybePromise<void>;
  readonly runBackgroundWrite: (operation: () => MaybePromise<void>) => void;
};

export function queueStaleRepair(params: StaleRepairParams): void {
  params.runBackgroundWrite(() => repairUntilStable(params, params.hydration, true));
}

async function repairUntilStable(
  params: StaleRepairParams,
  hydration: Promise<void>,
  skipIfSuperseded: boolean,
): Promise<void> {
  try {
    await hydration;
  } catch {
    return;
  }

  const latest = params.latestHydration();
  if (hydration !== latest) {
    if (skipIfSuperseded) {
      return;
    }
    await repairUntilStable(params, latest, false);
    return;
  }

  await params.write(params.encodeCurrent());
  const settledLatest = params.latestHydration();
  if (hydration === settledLatest) {
    return;
  }
  await repairUntilStable(params, settledLatest, false);
}
